/*
 * register.tsx - the build monitor's engine layer. At session start it reads
 * `build.monitor` through config.sh and stays silent unless it is `true`.
 * Otherwise it tracks viber:task-coder and viber:task-reviewer spawns,
 * refreshes the active run through plan-path.sh and plan-index.sh (never
 * --split: the mod writes nothing) and pins the status line. It also registers
 * `/viber-build` (immediate), which opens the `viber-build` pane drawing the
 * task rows, decisions and rulings of the active run; the session's first
 * coder dispatch opens it by itself when the surface last reported a
 * fullscreen layout while drawing. Every hook passes
 * its event on unchanged and starts its refresh without waiting for it. The
 * logic it draws from is monitor.ts; the session state is state.d.ts.
 */

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderElement, RenderInput } from 'claude-code'

import { isSettled, panelRows, parseDispatch, parseIndex, parseRunList, pickRun, statusLine } from './monitor'
import type { Candidate, Dispatch, RunIndex } from './monitor'

const enabled = atom({ plugin: 'viber', key: 'enabled' } as const, false)
const index = atom({ plugin: 'viber', key: 'index' } as const, null)
const flights = atom({ plugin: 'viber', key: 'flights' } as const, [])
const attempts = atom({ plugin: 'viber', key: 'attempts' } as const, {})
const tiers = atom({ plugin: 'viber', key: 'tiers' } as const, {})
const lastDispatchPlan = atom({ plugin: 'viber', key: 'lastDispatchPlan' } as const, null)
const observed = atom({ plugin: 'viber', key: 'observed' } as const, false)
const autoOpened = atom({ plugin: 'viber', key: 'autoOpened' } as const, false)

const COMMAND = 'viber-build'
const PANE = 'viber-build'
const PANE_TITLE = 'viber build'

// added to every script run, so its `git status` never takes the index lock a
// task commit needs
const QUIET = { GIT_OPTIONAL_LOCKS: '0' }

/** Runs argv and hands back its stdout, or undefined when it exits non-zero or cannot start. */
async function run($: EngineInterface, argv: string[], cwd?: string): Promise<string | undefined> {
  try {
    const ran = await $.process.run(argv, cwd === undefined ? { env: QUIET } : { cwd, env: QUIET })
    return ran.exitCode === 0 ? ran.stdout : undefined
  } catch {
    return undefined
  }
}

/** The repository root, or undefined outside a repository. */
async function repoRoot($: EngineInterface): Promise<string | undefined> {
  const root = (await run($, ['git', 'rev-parse', '--show-toplevel']))?.trim()
  return root === undefined || root === '' ? undefined : root
}

/** One of viber's scripts, run from the repository root. */
function script($: EngineInterface, root: string, name: string, ...args: string[]): Promise<string | undefined> {
  return run($, ['bash', `${$.plugin.root.replace(/\\/g, '/')}/scripts/${name}.sh`, ...args], root)
}

/** build.monitor as config.sh resolves it: true only for an explicit `true`. */
async function readSwitch($: EngineInterface): Promise<boolean> {
  const root = await repoRoot($)
  if (root === undefined) return false
  return /^build\.monitor: true\s*$/m.test((await script($, root, 'config')) ?? '')
}

/** The later of the plan's and its status.md's change times (absent: 0). */
async function changedMs($: EngineInterface, root: string, plan: string): Promise<number> {
  const dir = plan.slice(0, plan.lastIndexOf('/'))
  const times = await Promise.all(
    [`${root}/${plan}`, `${root}/${dir}/status.md`].map((path) => $.fs.stat(path).then((stat) => stat.mtimeMs, () => 0)),
  )
  return Math.max(...times)
}

/** The active run's index as S2 picks it, or undefined for no view. */
async function activeIndex($: EngineInterface): Promise<RunIndex | undefined> {
  const root = await repoRoot($)
  if (root === undefined) return undefined
  const listed = await script($, root, 'plan-path')
  if (listed === undefined) return undefined
  const list = parseRunList(listed)
  const loaded = new Map<string, RunIndex | undefined>()
  const load = async (plan: string) => {
    if (!loaded.has(plan)) loaded.set(plan, parseIndex((await script($, root, 'plan-index', plan)) ?? ''))
    return loaded.get(plan)
  }
  const candidates: Candidate[] = []
  // every "open:" plan is unsettled by plan-path.sh's own count; the newest one is judged by its index
  for (const plan of new Set([...(list.newest === undefined ? [] : [list.newest]), ...list.open])) {
    const known = plan === list.newest ? await load(plan) : undefined
    const settled = plan === list.newest && (known === undefined || isSettled(known))
    candidates.push({ plan, settled, changedMs: settled ? 0 : await changedMs($, root, plan) })
  }
  const chosen = pickRun(candidates, (await read($, lastDispatchPlan)) ?? undefined)
  return chosen === undefined ? undefined : load(chosen)
}

// the latest refresh started; an older one finishing after it writes nothing
let generation = 0

/** Re-reads the active run and pins its status line; with no view the build is no longer observed. */
async function refresh($: EngineInterface): Promise<void> {
  const mine = ++generation
  const view = await activeIndex($)
  if (mine !== generation) return
  await update($, index, () => view ?? null)
  if (view === undefined) await update($, observed, () => false)
  await $.ui.status(statusLine(view, await read($, flights)))
}

// how often an observed build is re-read between its own events
const PERIOD_MS = 30_000
let ticker: { cancel: () => void } | undefined

/** One clock tick: refreshes while the build is observed, else stops the clock. */
async function tick($: EngineInterface): Promise<void> {
  if (await read($, observed)) return refresh($)
  ticker?.cancel()
  ticker = undefined
}

/** Starts the clock, once. */
function watch($: EngineInterface): void {
  ticker ??= $.clock.every(PERIOD_MS, () => background(tick($)))
}

/** Records a coder or reviewer dispatch, opens the panel on the session's first coder dispatch where it docks as a sidebar, then refreshes. */
async function dispatched($: EngineInterface, agentId: string, dispatch: Dispatch, isFullscreen: boolean): Promise<void> {
  if (!(await read($, enabled))) return
  await update($, flights, (list) => [...list, { agentId, dispatch }])
  if (dispatch.role === 'coder') {
    if (!(await read($, autoOpened))) {
      await update($, autoOpened, () => true)
      if (isFullscreen) await $.ui.open({ id: PANE, title: PANE_TITLE }).catch(() => undefined)
    }
    const key = `${dispatch.plan}#${dispatch.taskId}`
    await update($, attempts, (counts) => ({ ...counts, [key]: (counts[key] ?? 0) + 1 }))
    const tier = dispatch.tier
    if (tier !== undefined) await update($, tiers, (known) => ({ ...known, [key]: tier }))
  }
  await update($, lastDispatchPlan, () => dispatch.plan)
  await update($, observed, () => true)
  watch($)
  await refresh($)
}

/** Drops the flight of a subagent whose run ended, then refreshes; any other run is not ours. */
async function finished($: EngineInterface, agentId: string): Promise<void> {
  if (!(await read($, enabled))) return
  if (!(await read($, flights)).some((flight) => flight.agentId === agentId)) return
  await update($, flights, (list) => list.filter((flight) => flight.agentId !== agentId))
  await refresh($)
}

/** A task commit (or any other commit-task.sh run) landed: refreshes. */
async function committed($: EngineInterface): Promise<void> {
  if (await read($, enabled)) await refresh($)
}

/** Resolves the switch; on, registers /viber-build, picks the clock back up for an observed build (a reload drops it) and refreshes. */
async function opened($: EngineInterface): Promise<void> {
  const isOn = await readSwitch($)
  await update($, enabled, () => isOn)
  if (!isOn) return
  await $.command.register({ name: COMMAND, description: 'Show the viber build panel', immediate: true })
  if (await read($, observed)) watch($)
  background(refresh($))
}

/** The build panel's body: every task row, then the run's decisions and rulings. */
async function panel($: EngineInterface, e: RenderInput): Promise<RenderElement> {
  const { Box, Text } = $.ui.resolve(e)
  const view = await read($, index)
  if (view === null) return <Text dimColor>No build run to show.</Text>
  const rows = panelRows(view, await read($, flights), await read($, attempts), await read($, tiers))
  return (
    <Box flexDirection="column">
      <Text bold>{`${view.title} ${view.done}/${view.total}`}</Text>
      {rows.map((row) => (
        <Box flexDirection="column">
          <Text>{`${row.id} | ${row.state} | ${row.tier ?? '-'} | attempts ${row.attempts} | ${row.title}`}</Text>
          {row.deferred.length > 0 && <Text dimColor>{`deferred: ${row.deferred.join(', ')}`}</Text>}
        </Box>
      ))}
      <Text bold>Decisions</Text>
      {view.decisions.length === 0 && <Text dimColor>none</Text>}
      {view.decisions.map((text) => <Text>{text}</Text>)}
      <Text bold>Rulings</Text>
      {view.rulings.length === 0 && <Text dimColor>none</Text>}
      {view.rulings.map((text) => <Text>{text}</Text>)}
    </Box>
  )
}

/** Lets work run on past the hook that started it, its failure swallowed: the monitor never fails a hook. */
function background(work: Promise<unknown>): void {
  work.catch(() => undefined)
}

export const register: Register = (on) => {
  // the layout the surface last reported while drawing; undefined until it does
  let isFullscreen: boolean | undefined

  on('ui.render', async ($, e, next) => {
    isFullscreen = e.viewport?.isFullscreen
    return next(e)
  })

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    // awaited, so the switch stands before the first dispatch; the refresh it starts is not
    await opened($).catch(() => undefined)
    return started
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    const dispatch = parseDispatch(e.subagentType, e.prompt, e.model)
    if (dispatch !== undefined && started.agentId !== undefined) background(dispatched($, started.agentId, dispatch, isFullscreen === true))
    return started
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (/commit-task\.sh/.test(e.command)) background(committed($))
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    const ended = await next(e)
    if (e.agentId !== undefined) background(finished($, e.agentId))
    return ended
  })

  on('command.run', { command: COMMAND }, async ($) => {
    await $.ui.open({ id: PANE, title: PANE_TITLE })
    background(refresh($))
    return { text: 'viber build panel opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, ($, e) => panel($, e))
}
