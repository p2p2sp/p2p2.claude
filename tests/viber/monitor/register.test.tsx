/*
 * register.test.tsx - proves viber/hooks/monitor/register.tsx, the build
 * monitor's engine layer: the switch read at session start, the coder and
 * reviewer spawns it tracks, the refreshes it starts and the status line it
 * pins, the toasts it raises for the build's events, each hook passing its
 * event on unchanged.
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
  /** Lines plan-index.sh prints after its tasks (`deferred: ...`, `decision: ...`, `ruling: ...`). */
  tail?: readonly string[]
}

type World = {
  statuses: (string | undefined)[]
  toasts: string[]
  /** Every slash command registered, in order. */
  commands: { name: string; description: string; immediate?: true }[]
  /** The id and title of every pane opened, in order. */
  panes: { id: string; title?: string }[]
  /** Every event the world beneath the mod received, in order. */
  received: unknown[]
  runs: { argv: readonly string[]; env: Record<string, string> | undefined }[]
  clock: ReturnType<typeof mock.clock>
  /** Rows plan-index.sh prints from now on, per plan. */
  rows: Record<string, readonly Row[]>
  /** Lines plan-index.sh prints after its tasks from now on. */
  tail: readonly string[]
  /** Milliseconds of the mocked clock each script run waits before it answers. */
  lateMs: number
}

/** plan-index.sh's stdout for `plan` holding `rows`. */
function indexOut(plan: string, rows: readonly Row[], tail: readonly string[] = []): string {
  const done = rows.filter(([, state]) => state === 'done').length
  return [
    `plan: ${plan}`,
    'title: A run',
    `progress: ${done}/${rows.length}`,
    'tasks: id | state | tdd | excl | deps | feeds | files | title',
    ...rows.map(([id, state, title]) => `${id} | ${state} | none | - | - | - | src/${id}.ts | ${title}`),
    ...tail,
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
    commands: [],
    panes: [],
    received: [],
    runs: [],
    clock: mock.clock(on, { now: 1_000 }),
    rows: { ...(setup.runs ?? { [PLAN_A]: [['T1', 'done', 'One'], ['T2', 'todo', 'Two']] }) },
    tail: setup.tail ?? [],
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
    return rows === undefined ? { exitCode: 1, stdout: '' } : { exitCode: 0, stdout: indexOut(plan, rows, world.tail) }
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
  on('command.register', ($, e) => {
    world.commands.push(e)
    return { value: { command: e.name } }
  })
  on('ui.open', ($, e) => {
    world.panes.push({ id: e.id, title: e.title })
    return { value: { isPlaced: true as const } }
  })
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>drawn beneath</Text>
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

test('with build.monitor true /viber-build is registered', async ($, on) => {
  const world = worldOf(on)

  await $.session.start(SESSION)

  expect(world.commands.map((command) => command.name)).toEqual(['viber-build'])
})

test('with build.monitor false no command is registered', async ($, on) => {
  const world = worldOf(on, { monitor: false })

  await $.session.start(SESSION)

  expect(world.commands).toEqual([])
})

test('/viber-build is registered to run during a turn', async ($, on) => {
  const world = worldOf(on)

  await $.session.start(SESSION)

  expect(world.commands.map((command) => command.immediate)).toEqual([true])
})

test('running /viber-build opens the viber-build pane', async ($, on) => {
  const world = worldOf(on)
  await $.session.start(SESSION)

  await $.command.run({ command: 'viber-build' })

  expect(world.panes).toEqual([{ id: 'viber-build', title: 'viber build' }])
})

const PANE_PROPS = { title: 'viber build', isFocused: false, bodyColumns: 80, placement: 'inline' as const, scroll: { offset: 0, bodyRows: 24 }, view: {} }

for (const surface of ['terminal', 'desktop'] as const) {
  test(`on ${surface} the pane draws every task row with state, tier, attempts and deferred paths, then the decisions and rulings`, async ($, on) => {
    const world = worldOf(on, {
      tail: ['deferred: T1:src/late.ts T1:src/more.ts', 'decision: T2: keep the cache', 'ruling: T2 | retry | gave up'],
    })
    await $.session.start(SESSION)
    await $.agent.spawn(spawnOf(PLAN_A, 'T2', 'viber:task-coder', 'opus', 'tu1'))
    await world.clock.settle()

    const ui = await $.ui.mount({ plugin: 'viber', surface, component: 'Pane', requestId: 'viber-build', props: PANE_PROPS })

    expect({
      done: (await ui.find({ type: 'Text', text: /^T1 \|/ }))?.text,
      deferred: (await ui.find({ type: 'Text', text: /^deferred:/ }))?.text,
      doing: (await ui.find({ type: 'Text', text: /^T2 \| coding/ }))?.text,
      decision: (await ui.find({ type: 'Text', text: /keep the cache/ }))?.text,
      ruling: (await ui.find({ type: 'Text', text: /gave up/ }))?.text,
    }).toEqual({
      done: 'T1 | done | - | attempts 0 | One',
      deferred: 'deferred: src/late.ts, src/more.ts',
      doing: 'T2 | coding | opus | attempts 1 | Two',
      decision: 'T2: keep the cache',
      ruling: 'T2 | retry | gave up',
    })
  })
}

const DOCKS = { columns: 160, rows: 40, isFullscreen: true }

/** The surface drawing a pane of another plugin and reporting its layout while it does. */
async function reportLayout($: Engine, viewport?: { columns: number; rows: number; isFullscreen?: boolean }): Promise<void> {
  await $.ui.mount({ plugin: 'viber', surface: 'terminal', component: 'Pane', requestId: 'elsewhere', props: PANE_PROPS, viewport })
}

test('the first coder dispatch opens the viber-build pane when the surface last reported a fullscreen layout', async ($, on) => {
  const world = worldOf(on)
  await $.session.start(SESSION)
  await reportLayout($, DOCKS)

  await $.agent.spawn(spawnOf(PLAN_A, 'T2', 'viber:task-coder', 'opus', 'tu1'))
  await world.clock.settle()

  expect(world.panes).toEqual([{ id: 'viber-build', title: 'viber build' }])
})

const NOT_DOCKED: readonly (readonly [report: string, viewport: { columns: number; rows: number; isFullscreen?: boolean } | undefined])[] = [
  ['a non-fullscreen layout', { columns: 200, rows: 40, isFullscreen: false }],
  ['a viewport saying nothing of the layout', { columns: 200, rows: 40 }],
  ['no viewport', undefined],
]

for (const [report, viewport] of NOT_DOCKED) {
  test(`the first coder dispatch opens no pane when the surface last reported ${report}`, async ($, on) => {
    const world = worldOf(on)
    await $.session.start(SESSION)
    await reportLayout($, viewport)

    await $.agent.spawn(spawnOf(PLAN_A, 'T2', 'viber:task-coder', 'opus', 'tu1'))
    await world.clock.settle()

    expect(world.panes).toEqual([])
  })
}

test('the first coder dispatch opens no pane when the surface reported no layout at all', async ($, on) => {
  const world = worldOf(on)
  await $.session.start(SESSION)

  await $.agent.spawn(spawnOf(PLAN_A, 'T2', 'viber:task-coder', 'opus', 'tu1'))
  await world.clock.settle()

  expect(world.panes).toEqual([])
})

test('a later coder dispatch in the same session opens no second pane', async ($, on) => {
  const world = worldOf(on)
  await $.session.start(SESSION)
  await reportLayout($, DOCKS)
  await $.agent.spawn(spawnOf(PLAN_A, 'T2', 'viber:task-coder', 'opus', 'tu1'))
  await world.clock.settle()

  await $.agent.spawn(spawnOf(PLAN_A, 'T2', 'viber:task-coder', 'opus', 'tu2'))
  await world.clock.settle()

  expect(world.panes.length).toBe(1)
})

test('with build.monitor false a first coder dispatch on a fullscreen layout opens no pane', async ($, on) => {
  const world = worldOf(on, { monitor: false })
  await $.session.start(SESSION)
  await reportLayout($, DOCKS)

  await $.agent.spawn(spawnOf(PLAN_A, 'T2', 'viber:task-coder', 'opus', 'tu1'))
  await world.clock.settle()

  expect(world.panes).toEqual([])
})

test('the drawing hook that learns the layout returns what next returned for a drawing it does not own', async ($, on) => {
  worldOf(on)
  await $.session.start(SESSION)

  const ui = await $.ui.mount({ plugin: 'viber', surface: 'terminal', component: 'Pane', requestId: 'elsewhere', props: PANE_PROPS, viewport: DOCKS })

  expect((await ui.find({ type: 'Text', text: 'drawn beneath' }))?.text).toBe('drawn beneath')
})

const THREE: readonly Row[] = [['T1', 'done', 'One'], ['T2', 'todo', 'Two'], ['T3', 'todo', 'Three']]
const ASK = {
  tool: 'AskUserQuestion' as const,
  questions: [{ question: 'Which way?', header: 'Way', multiSelect: false, options: [{ label: 'Left' }, { label: 'Right' }] }],
}

/** A world observing PLAN_A: T1 done of three, a coder dispatched for T2. */
async function observing($: Engine, on: On, setup: Setup = {}): Promise<World> {
  const world = worldOf(on, { runs: { [PLAN_A]: THREE }, ...setup })
  await $.session.start(SESSION)
  await $.agent.spawn(spawnOf(PLAN_A, 'T2', 'viber:task-coder', 'opus', 'tu1'))
  await world.clock.settle()
  world.toasts.length = 0
  return world
}

test('a refresh showing a newly done task toasts its id and the new progress', async ($, on) => {
  const world = await observing($, on)
  world.rows[PLAN_A] = [['T1', 'done', 'One'], ['T2', 'done', 'Two'], ['T3', 'todo', 'Three']]

  await $.tool.call(COMMIT)
  await world.clock.settle()

  expect(world.toasts).toEqual(['viber: T2 done (2/3)'])
})

test('a new ruling toasts its subject', async ($, on) => {
  const world = await observing($, on)
  world.tail = ['ruling: T2: retry | why: flaky | cost if wrong: a rerun']

  await $.tool.call(COMMIT)
  await world.clock.settle()

  expect(world.toasts).toEqual(['viber ruling on T2: retry'])
})

const ENDS: readonly (readonly [end: string, change: (world: World) => void, toast: string])[] = [
  ['turning settled', (world) => { world.rows[PLAN_A] = [['T1', 'done', 'One'], ['T2', 'done', 'Two'], ['T3', 'skipped', 'Three']] }, 'viber build finished: 2/3 done'],
  ['disappearing (archived)', (world) => { delete world.rows[PLAN_A] }, 'viber build finished: 1/3 done'],
]

for (const [end, change, toast] of ENDS) {
  test(`the run ${end} raises exactly one build-end toast`, async ($, on) => {
    const world = await observing($, on)
    change(world)

    await $.tool.call(COMMIT)
    await world.clock.settle()

    expect(world.toasts.filter((text) => text.startsWith('viber build finished'))).toEqual([toast])
  })
}

test('an AskUserQuestion call during an observed build toasts the question', async ($, on) => {
  const world = await observing($, on)

  await $.tool.call(ASK)
  await world.clock.settle()

  expect(world.toasts).toEqual(['viber build is waiting for your answer'])
})

test('an AskUserQuestion call during an observed build passes unchanged', async ($, on) => {
  const world = await observing($, on)

  const result = await $.tool.call(ASK)
  await world.clock.settle()

  expect({ result, received: world.received.at(-1) }).toMatchObject({ result: { result: 'committed', text: 'progress: 2/3' }, received: ASK })
})

test('an AskUserQuestion call before any dispatch of the session toasts nothing', async ($, on) => {
  const world = worldOf(on)
  await $.session.start(SESSION)
  await world.clock.settle()

  await $.tool.call(ASK)
  await world.clock.settle()

  expect(world.toasts).toEqual([])
})

const SILENT: readonly (readonly [event: string, act: ($: Engine, world: World) => Promise<unknown>])[] = [
  ['a newly done task', async ($, world) => {
    world.rows[PLAN_A] = [['T1', 'done', 'One'], ['T2', 'done', 'Two'], ['T3', 'todo', 'Three']]
    await $.tool.call(COMMIT)
  }],
  ['a new ruling', async ($, world) => {
    world.tail = ['ruling: T2: retry | why: flaky | cost if wrong: a rerun']
    await $.tool.call(COMMIT)
  }],
  ['the run ending', async ($, world) => {
    delete world.rows[PLAN_A]
    await $.tool.call(COMMIT)
  }],
  ['an AskUserQuestion call', ($) => $.tool.call(ASK)],
]

for (const [event, act] of SILENT) {
  test(`with build.monitor false ${event} raises no toast`, async ($, on) => {
    const world = worldOf(on, { monitor: false, runs: { [PLAN_A]: THREE } })
    await $.session.start(SESSION)
    await $.agent.spawn(spawnOf(PLAN_A, 'T2', 'viber:task-coder', 'opus', 'tu1'))
    await world.clock.settle()

    await act($, world)
    await world.clock.settle()

    expect(world.toasts).toEqual([])
  })
}
