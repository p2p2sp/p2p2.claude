/*
 * register.tsx - viber's task panel. It reads the active run (the newest run
 * directory of docs/<runs>/) from disk at session start, after Bash calls
 * naming a run script, after task dispatches and every 15 seconds, draws a
 * button above the prompt only while a run is active, and opens a pane listing
 * the run's tasks. It writes no file and every tool.call hook passes its call
 * through unchanged. The logic it draws from is panel/run-state.ts and
 * panel/run-events.ts.
 */

import type { EngineInterface, Register } from 'claude-code'

import { dispatchedTaskId, isRunScriptCall } from './panel/run-events'
import { activeRun, isCleanupOn, panelOf, runsDirectory } from './panel/run-state'
import type { ActiveRun, RunCandidate } from './panel/run-state'

const PANE = 'viber-tasks'
const PANE_TITLE = 'viber tasks'
const NO_RUN = 'No active viber run.'
const REFRESH_MS = 15000

/** The text of a file, or null when it cannot be read. */
function textOf($: EngineInterface, path: string): Promise<string | null> {
  return Promise.resolve()
    .then(() => $.fs.read(path))
    .then(
      (text) => text,
      () => null,
    )
}

/** The active run as the disk shows it now, or null for none. */
async function loadRun($: EngineInterface): Promise<ActiveRun | null> {
  const viberYml = await textOf($, '.claude/viber.yml')
  const runs = `docs/${runsDirectory(viberYml)}`
  const entries = await Promise.resolve()
    .then(() => $.fs.list(runs))
    .then(
      (list) => list,
      () => [],
    )
  const candidates: RunCandidate[] = []
  for (const entry of entries) {
    const plan = await textOf($, `${runs}/${entry.name}/plan.md`)
    if (plan === null) continue
    candidates.push({ key: entry.name, plan, status: await textOf($, `${runs}/${entry.name}/status.md`) })
  }
  return activeRun(candidates, isCleanupOn(viberYml))
}

let run: ActiveRun | null = null
let seq = 0
const running = new Set<string>()
let stopClock: (() => void) | undefined

/** Reads the active run again and redraws; a read that a newer one overtook is dropped. */
async function refresh($: EngineInterface): Promise<void> {
  const mine = ++seq
  try {
    const loaded = await loadRun($)
    if (mine !== seq) return
    run = loaded
  } catch {
    return
  }
  try {
    $.ui.invalidate('ui.render')
  } catch {
    // a redraw that cannot be asked for leaves the last drawing standing
  }
}

export const register: Register = (on) => {
  on('session.start', ($, e, next) => {
    void refresh($)
    try {
      stopClock?.()
      stopClock = $.clock.every(REFRESH_MS, () => void refresh($))
    } catch {
      // without the clock the panel still refreshes on events
    }
    return next(e)
  })

  on('tool.call', { tool: 'Agent' }, async ($, e, next) => {
    const id = dispatchedTaskId(e.subagent_type, e.prompt)
    if (id !== null) {
      running.add(id)
      try {
        $.ui.invalidate('ui.render')
      } catch {
        // the next refresh redraws
      }
    }
    const ran = await next(e)
    void refresh($)
    return ran
  }).catch((_$, e, next) => next(e))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (isRunScriptCall(e.command)) void refresh($)
    return ran
  }).catch((_$, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    if (run === null) return next(e)
    const { Box, Button } = $.ui.resolve(e)
    const panel = panelOf(run, [...running])
    return (
      <Box>
        <Button
          key="viber-tasks"
          label={`viber tasks ${panel.done}/${panel.total}`}
          onPress={() => $.ui.open({ id: 'viber-tasks', title: 'viber tasks', focus: true, closeOnEscape: true })}
        />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    if (run === null) return <Text>{NO_RUN}</Text>
    const panel = panelOf(run, [...running])
    return (
      <Box flexDirection="column">
        <Text dimColor>
          {PANE_TITLE} {panel.done}/{panel.total}
        </Text>
        {panel.rows.map((row) => (
          <Box key={row.id} flexDirection="column">
            <Text>{`${row.id} - ${row.title}  ${row.state}`}</Text>
            {row.deferred.map((path) => (
              <Text dimColor>{`deferred: ${path}`}</Text>
            ))}
          </Box>
        ))}
      </Box>
    )
  })
}
