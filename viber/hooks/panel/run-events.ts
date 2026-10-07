const TASK_AGENTS = ["viber:task-coder", "viber:task-reviewer"];
const TASK_LINE = /^task:[ \t]*(?:\S*[\\/])?([^\\/\s]+)[\\/]tasks[\\/]([^\\/\s]+)\.md[ \t\r]*$/m;
const RUN_SCRIPT = /(?:plan-path|plan-index|commit-task|archive-run)\.sh/;
const CLAIMING_SCRIPT = /commit-task\.sh|plan-index\.sh(?=.*\s--split(?:\s|$))/s;
const RUN_PLAN = /([^\\/\s"']+)[\\/]plan\.md(?=["'\s]|$)/;

export type DispatchedTask = { run: string; id: string };

export function dispatchedTask(subagentType: string | undefined, prompt: string | undefined): DispatchedTask | null {
  if (subagentType === undefined || !TASK_AGENTS.includes(subagentType)) return null;
  if (prompt === undefined) return null;
  const line = TASK_LINE.exec(prompt);
  return line === null ? null : { run: line[1], id: line[2] };
}

export function isRunScriptCall(command: string): boolean {
  return RUN_SCRIPT.test(command);
}

// The run key a build's own script call names through `<key>/plan.md`: commit-task.sh, or plan-index.sh with --split.
export function claimedRunKey(command: string): string | null {
  if (!CLAIMING_SCRIPT.test(command)) return null;
  return RUN_PLAN.exec(command)?.[1] ?? null;
}
