/*
 * register.test.tsx - proves viber/hooks/monitor/register.tsx, the build
 * monitor's engine layer: the switch read at session start, the coder and
 * reviewer spawns it tracks, the refreshes it starts and the status line it
 * pins, each hook passing its event on unchanged.
 *
 * Repo reality: run by `claude plugin test`, never by `node --test` (its
 * `.tsx` suffix keeps it out of the `*.test.ts` glob). tests/viber/
 * monitor-engine.test.ts copies the plugin and this folder under
 * `.temp/viber/monitor-engine/` and runs it there. The world beneath the mod
 * is in memory: `$.process.run` answers viber's scripts from canned stdout,
 * `$.fs.stat` answers change times, `$.ui.status` is recorded.
 */

import { expect, mock, test } from 'claude-code/testing'
import type { Engine, Plugin } from 'claude-code/testing'
import type { AgentSpawnInput, On, SessionStartInput, TurnCompleteInput } from 'claude-code'

const REPO = '/repo'
const PLAN_A = 'docs/_specs/2026-10-01-10-00-00_alpha/plan.md'
const PLAN_B = 'docs/_specs/2026-10-02-10-00-00_beta/plan.md'
const SESSION: SessionStartInput = { cwd: REPO, surface: 'terminal', isInteractive: true }

type Row = readonly [id: string, state: 'done' | 'skipped' | 'todo', title: string]
type Answer = { exitCode: number; stdout: string } | 'unstartable'

type Setup = {
  monitor?: boolean
  git?: Answer
  planPath?: Answer
  /** plan-index.sh's rows per plan; a plan absent here exits 1. */
  runs?: Record<string, readonly Row[]>
  /** plan-index.sh's own answer for every plan, over `runs`. */
  planIndex?: Answer
  /** Repo-relative path -> mtimeMs; a path absent here does not exist. */
  mtimes?: Record<string, number>
}

type World = {
  statuses: (string | undefined)[]
  toasts: string[]
  /** Every event the world beneath the mod received, in order. */
  received: unknown[]
  runs: { argv: readonly string[]; env: Record<string, string> | undefined }[]
  clock: ReturnType<typeof mock.clock>
  /** Rows plan-index.sh prints from now on, per plan. */
  rows: Record<string, readonly Row[]>
  /** Milliseconds of the mocked clock each script run waits before it answers. */
  lateMs: number
}

/** plan-index.sh's stdout for `plan` holding `rows`. */
function indexOut(plan: string, rows: readonly Row[]): string {
  const done = rows.filter(([, state]) => state === 'done').length
  return [
    `plan: ${plan}`,
    'title: A run',
    `progress: ${done}/${rows.length}`,
    'tasks: id | state | tdd | excl | deps | feeds | files | title',
    ...rows.map(([id, state, title]) => `${id} | ${state} | none | - | - | - | src/${id}.ts | ${title}`),
    '',
  ].join('\n')
}

/** plan-path.sh's stdout: the newest plan, then every other open one. */
function planPathOut(newest: string, open: readonly string[] = []): string {
  return [`path: ${newest}`, 'key: k', 'state: existing', ...open.map((plan) => `open: ${plan} | 0/2`), ''].join('\n')
}

/** Seats the in-memory world beneath the mod. */
function worldOf(on: On, setup: Setup = {}): World {
  const world: World = {
    statuses: [],
    toasts: [],
    received: [],
    runs: [],
    clock: mock.clock(on, { now: 1_000 }),
    rows: { ...(setup.runs ?? { [PLAN_A]: [['T1', 'done', 'One'], ['T2', 'todo', 'Two']] }) },
    lateMs: 0,
  }
  const mtimes = setup.mtimes ?? {}
  const answer = (argv: readonly string[]): Answer => {
    if (argv[0] === 'git') return setup.git ?? { exitCode: 0, stdout: `${REPO}\n` }
    const script = (argv[1] ?? '').replace(/^.*\//, '')
    if (script === 'config.sh') return { exitCode: 0, stdout: `build.cleanup: true\nbuild.monitor: ${setup.monitor ?? true}\n` }
    if (script === 'plan-path.sh') return setup.planPath ?? { exitCode: 0, stdout: planPathOut(PLAN_A) }
    const plan = argv[2] ?? ''
    if (setup.planIndex !== undefined) return setup.planIndex
    const rows = world.rows[plan]
    return rows === undefined ? { exitCode: 1, stdout: '' } : { exitCode: 0, stdout: indexOut(plan, rows) }
  }

  on('process.run', async ($, e) => {
    world.runs.push({ argv: e.argv, env: e.init?.env })
    const late = world.lateMs
    if (late > 0) await world.clock.sleep(late)
    const given = answer(e.argv)
    if (given === 'unstartable') return { deny: `spawn ${e.argv[0]} ENOENT` }
    return { value: { exitCode: given.exitCode, stdout: given.stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('fs.stat', ($, e) => {
    const relative = e.path.startsWith(`${REPO}/`) ? e.path.slice(REPO.length + 1) : e.path
    const mtimeMs = mtimes[relative]
    return mtimeMs === undefined ? { deny: `ENOENT: ${e.path}` } : { value: { kind: 'file' as const, size: 1, mtimeMs, isLink: false } }
  })
  on('ui.status', ($, e) => {
    world.statuses.push(e.text)
    return { value: undefined }
  })
  on('ui.toast', ($, e) => {
    world.toasts.push(e.text)
    return { value: undefined }
  })
  on('session.start', ($, e) => {
    world.received.push(e)
    return { cwd: e.cwd }
  })
  on('agent.spawn', ($, e) => {
    world.received.push(e)
    return { model: e.model ?? 'sonnet', agentId: `agent-${e.tool_use_id}` }
  })
  on('turn.complete', ($, e) => {
    world.received.push(e)
    return { text: e.answer }
  })
  on('tool.call', ($, e) => {
    world.received.push(e)
    return { result: 'committed', text: 'progress: 2/3' }
  })
  return world
}

/** The Agent tool's spawn of a viber coder or reviewer for `taskId` of `plan`. */
function spawnOf(plan: string, taskId: string, subagentType: string, model: string, toolUseId: string): AgentSpawnInput {
  const runDir = plan.replace(/\/plan\.md$/, '')
  return {
    tool_use_id: toolUseId,
    prompt: `task: ${runDir}/tasks/${taskId}.md\nnotes: ${runDir}/work/${taskId}-coder.md\n`,
    description: `${taskId} ${subagentType}`,
    subagentType,
    provider: { plugin: 'viber', tier: 'user' },
    model,
    parentModel: 'claude-opus-5-5',
    background: true,
    fork: false,
  }
}

/** A plugin seated above viber that toasts how viber's session.start and
 *  agent.spawn links settled beneath it (`returned` for a hook that answered;
 *  `skipped` or `kept` for one that failed). */
const PROBE: Plugin = {
  name: 'probe',
  tier: 'prepend',
  register(on) {
    on('session.start', async ($, e, next) => {
      const started = await next(e)
      await $.ui.toast(`session.start: ${next.trace.filter((link) => link.plugin === 'viber').map((link) => link.outcome).join(',')}`)
      return started
    })
    on('agent.spawn', async ($, e, next) => {
      const started = await next(e)
      await $.ui.toast(`agent.spawn: ${next.trace.filter((link) => link.plugin === 'viber').map((link) => link.outcome).join(',')}`)
      return started
    })
  },
}

/** The end of the run of the subagent `agentId`. */
function endOf(agentId: string): TurnCompleteInput {
  return { answer: 'VERDICT: PASS', durationMs: 10, isAborted: false, turnId: `turn-${agentId}`, agentId, reason: 'answer' }
}

test('with build.monitor true a coder spawn for an unsettled run pins a status line naming that task, its role and tier', async ($, on) => {
  const world = worldOf(on)
  await $.session.start(SESSION)

  await $.agent.spawn(spawnOf(PLAN_A, 'T2', 'viber:task-coder', 'opus', 'tu1'))
  await world.clock.settle()

  expect(world.statuses.at(-1)).toBe('viber 1/2 | T2 coding opus')
})

test('the task leaves the status line when its subagent run completes', async ($, on) => {
  const world = worldOf(on)
  await $.session.start(SESSION)
  await $.agent.spawn(spawnOf(PLAN_A, 'T2', 'viber:task-coder', 'opus', 'tu1'))
  await world.clock.settle()

  await $.turn.complete(endOf('agent-tu1'))
  await world.clock.settle()

  expect(world.statuses.at(-1)).toBe('viber 1/2')
})

test('a Bash call running commit-task.sh refreshes the view once its result returns, and the status line shows the new progress', async ($, on) => {
  const world = worldOf(on, { runs: { [PLAN_A]: [['T1', 'done', 'One'], ['T2', 'todo', 'Two'], ['T3', 'todo', 'Three']] } })
  await $.session.start(SESSION)
  await world.clock.settle()
  world.rows[PLAN_A] = [['T1', 'done', 'One'], ['T2', 'done', 'Two'], ['T3', 'todo', 'Three']]

  await $.tool.call({ tool: 'Bash', command: `"/plugins/viber/scripts/commit-task.sh" ${PLAN_A} T2` })
  await world.clock.settle()

  expect(world.statuses.at(-1)).toBe('viber 2/3')
})

test('while a build is observed the view refreshes on the clock', async ($, on) => {
  const world = worldOf(on, { runs: { [PLAN_A]: [['T1', 'done', 'One'], ['T2', 'todo', 'Two'], ['T3', 'todo', 'Three']] } })
  await $.session.start(SESSION)
  await $.agent.spawn(spawnOf(PLAN_A, 'T2', 'viber:task-coder', 'opus', 'tu1'))
  await world.clock.settle()
  world.rows[PLAN_A] = [['T1', 'done', 'One'], ['T2', 'todo', 'Two'], ['T3', 'done', 'Three']]

  await world.clock.advance(60_000)

  expect(world.statuses.at(-1)).toBe('viber 2/3 | T2 coding opus')
})

test('with build.monitor false a coder spawn pins no status line', async ($, on) => {
  const world = worldOf(on, { monitor: false })
  await $.session.start(SESSION)

  await $.agent.spawn(spawnOf(PLAN_A, 'T2', 'viber:task-coder', 'opus', 'tu1'))
  await world.clock.settle()

  expect(world.statuses.filter((text) => text !== undefined)).toEqual([])
})

const NO_VIEW: readonly (readonly [condition: string, setup: Setup])[] = [
  ['git rev-parse failing (outside a repository)', { git: { exitCode: 128, stdout: '' } }],
  ['plan-path.sh exiting 3 (no plan)', { planPath: { exitCode: 3, stdout: '' } }],
  ['plan-index.sh exiting non-zero', { planIndex: { exitCode: 1, stdout: '' } }],
  ['a script failing to start', { planPath: 'unstartable' }],
]

for (const [condition, setup] of NO_VIEW) {
  test(`${condition} leaves no status line and no failed hook`, { plugins: [PROBE] }, async ($, on) => {
    const world = worldOf(on, setup)
    await $.session.start(SESSION)

    await $.agent.spawn(spawnOf(PLAN_A, 'T2', 'viber:task-coder', 'opus', 'tu1'))
    await world.clock.settle()

    expect(world.statuses.filter((text) => text !== undefined)).toEqual([])
    expect(world.toasts).toEqual(['session.start: returned', 'agent.spawn: returned'])
  })
}

test('a session start with no spawn seen shows the progress and no in-flight task', async ($, on) => {
  const world = worldOf(on)

  await $.session.start(SESSION)
  await world.clock.settle()

  expect(world.statuses.at(-1)).toBe('viber 1/2')
})

test('with no dispatch seen and two unsettled runs the one whose plan.md or status.md changed last is shown (a newer status.md outweighs an older plan.md)', async ($, on) => {
  const world = worldOf(on, {
    planPath: { exitCode: 0, stdout: planPathOut(PLAN_A, [PLAN_B]) },
    runs: {
      [PLAN_A]: [['T1', 'done', 'One'], ['T2', 'todo', 'Two']],
      [PLAN_B]: [['T1', 'todo', 'One'], ['T2', 'todo', 'Two'], ['T3', 'todo', 'Three']],
    },
    mtimes: {
      [PLAN_A]: 2_000,
      [PLAN_B]: 1_000,
      [PLAN_B.replace(/plan\.md$/, 'status.md')]: 3_000,
    },
  })

  await $.session.start(SESSION)
  await world.clock.settle()

  expect(world.statuses.at(-1)).toBe('viber 0/3')
})

test('every script run carries GIT_OPTIONAL_LOCKS=0 in its environment (a task commit must never meet the index lock)', async ($, on) => {
  const world = worldOf(on)
  await $.session.start(SESSION)

  await $.agent.spawn(spawnOf(PLAN_A, 'T2', 'viber:task-coder', 'opus', 'tu1'))
  await world.clock.settle()

  expect([...new Set(world.runs.map((ran) => ran.env?.GIT_OPTIONAL_LOCKS))]).toEqual(['0'])
})

// A hook that waited would hold until the mocked clock lets the held script
// run go at the hook budget (10 s): the timeout leaves room to see that as a
// failed assertion rather than a timeout.
test('the spawn hook returns what next returned without waiting for the refresh it starts', { timeoutMs: 20_000 }, async ($, on) => {
  const world = worldOf(on)
  await $.session.start(SESSION)
  await world.clock.settle()
  world.lateMs = 60_000

  const started = await $.agent.spawn(spawnOf(PLAN_A, 'T2', 'viber:task-coder', 'opus', 'tu1'))

  expect({ started, status: world.statuses.at(-1) }).toEqual({ started: { model: 'opus', agentId: 'agent-tu1' }, status: 'viber 1/2' })
})

test('the completion hook returns what next returned without waiting for the refresh it starts', { timeoutMs: 20_000 }, async ($, on) => {
  const world = worldOf(on)
  await $.session.start(SESSION)
  await $.agent.spawn(spawnOf(PLAN_A, 'T2', 'viber:task-coder', 'opus', 'tu1'))
  await world.clock.settle()
  world.lateMs = 60_000

  const ended = await $.turn.complete(endOf('agent-tu1'))

  expect({ ended, status: world.statuses.at(-1) }).toEqual({ ended: { text: 'VERDICT: PASS' }, status: 'viber 1/2 | T2 coding opus' })
})

const SPAWN = spawnOf(PLAN_A, 'T2', 'viber:task-reviewer', 'sonnet', 'tu9')
const COMMIT = { tool: 'Bash' as const, command: `"/plugins/viber/scripts/commit-task.sh" ${PLAN_A} T2` }

const PASSED: readonly (readonly [hook: string, act: ($: Engine) => Promise<unknown>, sent: object, answered: object])[] = [
  ['session.start', ($) => $.session.start(SESSION), SESSION, { cwd: REPO }],
  ['agent.spawn', ($) => $.agent.spawn(SPAWN), SPAWN, { model: 'sonnet', agentId: 'agent-tu9' }],
  ['turn.complete', ($) => $.turn.complete(endOf('agent-tu9')), endOf('agent-tu9'), { text: 'VERDICT: PASS' }],
  ['tool.call on Bash', ($) => $.tool.call(COMMIT), COMMIT, { result: 'committed', text: 'progress: 2/3' }],
]

for (const [hook, act, sent, answered] of PASSED) {
  test(`the ${hook} hook passes its event on unchanged and resolves to what next returned`, async ($, on) => {
    const world = worldOf(on)
    await $.session.start(SESSION)
    await world.clock.settle()

    const result = await act($)
    await world.clock.settle()

    expect({ result, received: world.received.at(-1) }).toMatchObject({ result: answered, received: sent })
  })
}
