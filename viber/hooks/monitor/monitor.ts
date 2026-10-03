/*
 * monitor.ts - the build monitor's pure logic, with no engine import, so
 * `node --test` loads it directly. It reads the stdout of viber's own scripts
 * (`plan-path.sh`, `plan-index.sh --split`) and a coder or reviewer dispatch,
 * and turns them into what the mod draws: the active run, the status line, the
 * panel rows, the events between two views and their toast texts. It runs no
 * process and touches no file; register.tsx does both.
 */

export type TaskState = 'done' | 'skipped' | 'todo';
export type Role = 'coder' | 'reviewer';
export type Tier = 'haiku' | 'sonnet' | 'opus' | 'fable';

export interface IndexTask { id: string; state: TaskState; title: string }
export interface RunIndex {
  plan: string;            // repo-relative plan.md path, as plan-index.sh prints it
  title: string;
  done: number;
  total: number;
  skipped: string[];       // task ids
  deferred: string[];      // "<id>:<path>" as printed
  decisions: string[];     // text after "decision: "
  rulings: string[];       // text after "ruling: "
  tasks: IndexTask[];
}
export interface RunList { newest?: string; open: string[] }     // plan.md paths
export interface Candidate { plan: string; changedMs: number; settled: boolean }
export interface Dispatch { plan: string; taskId: string; role: Role; tier?: Tier }
export interface Flight { agentId: string; dispatch: Dispatch }
export interface PanelRow {
  id: string;
  title: string;
  state: TaskState | 'coding' | 'reviewing';
  tier?: Tier;             // the last coder spawn's tier this session
  attempts: number;        // coder spawns this session
  deferred: string[];      // paths owed by this task
}
export type MonitorEvent =
  | { kind: 'task-done'; id: string; done: number; total: number }
  | { kind: 'ruling'; text: string }
  | { kind: 'build-end'; done: number; total: number }
  | { kind: 'question' };

const TASK_ROW = /^(T\d+) \| (done|skipped|todo) \| /;

/** The value of a `<label>: <value>` line, or undefined for another line. */
function valueOf(line: string, label: string): string | undefined {
  return line.startsWith(`${label}: `) ? line.slice(label.length + 2).trim() : undefined;
}

/** A space-separated status list as plan-index.sh prints it. */
function listOf(value: string): string[] {
  return value.split(/\s+/).filter((entry) => entry !== '');
}

/** The script's stdout as lines, CRLF read as LF. */
function linesOf(stdout: string): string[] {
  return stdout.split(/\r?\n/);
}

export function parseIndex(stdout: string): RunIndex | undefined {
  const index: RunIndex = {
    plan: '', title: '', done: 0, total: 0,
    skipped: [], deferred: [], decisions: [], rulings: [], tasks: [],
  };
  let progress = false;
  let inTasks = false;
  for (const line of linesOf(stdout)) {
    if (inTasks) {
      const row = TASK_ROW.exec(line);
      if (row) {
        // the title is the last column: every " | " after the seventh is its own
        index.tasks.push({ id: row[1], state: row[2] as TaskState, title: line.split(' | ').slice(7).join(' | ').trim() });
        continue;
      }
    }
    if (line.startsWith('tasks: ')) { inTasks = true; continue; }
    let value: string | undefined;
    if ((value = valueOf(line, 'plan')) !== undefined) index.plan = value;
    else if ((value = valueOf(line, 'title')) !== undefined) index.title = value;
    else if ((value = valueOf(line, 'progress')) !== undefined) {
      const counts = /^(\d+)\/(\d+)$/.exec(value);
      if (counts) {
        index.done = Number(counts[1]);
        index.total = Number(counts[2]);
        progress = true;
      }
    }
    else if ((value = valueOf(line, 'skipped')) !== undefined) index.skipped = listOf(value);
    else if ((value = valueOf(line, 'deferred')) !== undefined) index.deferred = listOf(value);
    else if ((value = valueOf(line, 'decision')) !== undefined) index.decisions.push(value);
    else if ((value = valueOf(line, 'ruling')) !== undefined) index.rulings.push(value);
  }
  return progress && index.plan !== '' ? index : undefined;
}

export function parseRunList(stdout: string): RunList {
  const list: RunList = { open: [] };
  for (const line of linesOf(stdout)) {
    let value: string | undefined;
    if ((value = valueOf(line, 'path')) !== undefined && value !== '') list.newest = value;
    else if ((value = valueOf(line, 'open')) !== undefined) {
      // "open: <plan> | <done>/<total>": the counter is the last column
      const plan = value.replace(/ \| \d+\/\d+$/, '').trim();
      if (plan !== '') list.open.push(plan);
    }
  }
  return list;
}

const ROLES: Record<string, Role> = { 'viber:task-coder': 'coder', 'viber:task-reviewer': 'reviewer' };
const TIERS: readonly string[] = ['haiku', 'sonnet', 'opus', 'fable'];
// "task: <run dir>/tasks/<id>.md" at the start of a prompt line
const TASK_LINE = /^task:[ \t]*(.*\S)[ \t]*$/m;
const TASK_FILE = /^(.+)\/tasks\/([^/]+)\.md$/;

export function parseDispatch(subagentType: string, prompt: string, model?: string): Dispatch | undefined {
  if (!Object.hasOwn(ROLES, subagentType)) return undefined;
  const role = ROLES[subagentType];
  const line = TASK_LINE.exec(prompt.replace(/\r/g, ''));
  const file = line && TASK_FILE.exec(line[1].replace(/\\/g, '/'));
  if (!file) return undefined;
  const dispatch: Dispatch = { plan: `${file[1]}/plan.md`, taskId: file[2], role };
  if (model !== undefined && TIERS.includes(model)) dispatch.tier = model as Tier;
  return dispatch;
}

export function isSettled(index: RunIndex): boolean {
  return index.tasks.every((task) => task.state !== 'todo');
}

export function pickRun(candidates: Candidate[], lastDispatchPlan?: string): string | undefined {
  const open = candidates.filter((candidate) => !candidate.settled);
  if (lastDispatchPlan !== undefined && open.some((candidate) => candidate.plan === lastDispatchPlan)) return lastDispatchPlan;
  let newest: Candidate | undefined;
  for (const candidate of open) if (newest === undefined || candidate.changedMs > newest.changedMs) newest = candidate;
  return newest?.plan;
}

const DOING: Record<Role, 'coding' | 'reviewing'> = { coder: 'coding', reviewer: 'reviewing' };

export function statusLine(index: RunIndex | undefined, flights: Flight[]): string | undefined {
  if (index === undefined) return undefined;
  const parts = [`viber ${index.done}/${index.total}`];
  for (const { dispatch } of flights) {
    if (dispatch.plan !== index.plan) continue;
    parts.push([dispatch.taskId, DOING[dispatch.role], dispatch.tier].filter(Boolean).join(' '));
  }
  return parts.join(' | ');
}

/** The session-state key of one task of one run: "<plan>#<id>". */
function taskKey(plan: string, id: string): string {
  return `${plan}#${id}`;
}

export function panelRows(index: RunIndex, flights: Flight[], attempts: Record<string, number>, tiers: Record<string, Tier>): PanelRow[] {
  const doing = new Map<string, 'coding' | 'reviewing'>();
  for (const { dispatch } of flights) if (dispatch.plan === index.plan) doing.set(dispatch.taskId, DOING[dispatch.role]);
  return index.tasks.map((task) => {
    const key = taskKey(index.plan, task.id);
    const row: PanelRow = {
      id: task.id,
      title: task.title,
      state: doing.get(task.id) ?? task.state,
      attempts: Object.hasOwn(attempts, key) ? attempts[key] : 0,
      // "<id>:<path>": the path is everything after the first colon
      deferred: index.deferred.filter((entry) => entry.startsWith(`${task.id}:`)).map((entry) => entry.slice(task.id.length + 1)),
    };
    if (Object.hasOwn(tiers, key)) row.tier = tiers[key];
    return row;
  });
}

export function diffEvents(prev: RunIndex | undefined, next: RunIndex | undefined): MonitorEvent[] {
  if (prev === undefined || isSettled(prev)) return [];
  // the run's plan is gone: archived
  if (next === undefined) return [{ kind: 'build-end', done: prev.done, total: prev.total }];
  // another run took the view; this one neither ended nor moved as far as it shows
  if (next.plan !== prev.plan) return [];
  const events: MonitorEvent[] = [];
  const wasDone = new Set(prev.tasks.filter((task) => task.state === 'done').map((task) => task.id));
  for (const task of next.tasks) {
    if (task.state === 'done' && !wasDone.has(task.id)) events.push({ kind: 'task-done', id: task.id, done: next.done, total: next.total });
  }
  // rulings.md only grows: a text seen n times before is new from its (n+1)th time
  const seen = new Map<string, number>();
  for (const text of prev.rulings) seen.set(text, (seen.get(text) ?? 0) + 1);
  for (const text of next.rulings) {
    const left = seen.get(text) ?? 0;
    if (left > 0) seen.set(text, left - 1);
    else events.push({ kind: 'ruling', text });
  }
  if (isSettled(next)) events.push({ kind: 'build-end', done: next.done, total: next.total });
  return events;
}

// "<subject>: <ruling> | why: <why> | cost if wrong: <cost>", as rulings.md holds it
const RULING_LINE = /^(\S+): (.*?)(?: \| why: .*)?$/;

export function toastText(event: MonitorEvent): string {
  switch (event.kind) {
    case 'task-done':
      return `viber: ${event.id} done (${event.done}/${event.total})`;
    case 'ruling': {
      const ruling = RULING_LINE.exec(event.text);
      return ruling ? `viber ruling on ${ruling[1]}: ${ruling[2]}` : `viber ruling: ${event.text}`;
    }
    case 'build-end':
      return `viber build finished: ${event.done}/${event.total} done`;
    case 'question':
      return 'viber build is waiting for your answer';
  }
}
