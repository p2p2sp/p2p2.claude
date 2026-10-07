/*
 * register.tsx - viber's task panel and its report-name write. The panel shows
 * only the runs this session builds: a run becomes the session's when the session
 * dispatches one of its tasks or calls commit-task.sh or plan-index.sh --split on
 * its plan. It reads the active run (the newest of those run directories of
 * docs/<runs>/) from disk at session start, after Bash calls naming a run script,
 * after task dispatches and every 15 seconds, draws a button above the prompt only
 * while a run is active, and opens a pane listing the run's tasks; its tool.call
 * hooks pass their calls through unchanged. The Write hook answers one refusal only: the harness guard
 * rejecting a viber agent's Write of a .md file whose name starts with report,
 * summary, findings or analysis, for a path inside the project root; it writes
 * that file itself and returns the Write result. The logic it draws from is
 * panel/run-state.ts, panel/run-events.ts and write/report-name.ts.
 */

import type { EngineInterface, Register } from 'claude-code'

import { claimedRunKey, dispatchedTask, isRunScriptCall } from './panel/run-events'
import { activeRun, isCleanupOn, panelOf, runsDirectory } from './panel/run-state'
import type { ActiveRun, RunCandidate } from './panel/run-state'
import { isInsideRoot, isReportNameRefusal, isViberAgent } from './write/report-name'

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

let run: ActiveRun | null = null
let seq = 0
const running = new Set<string>()
const owned = new Set<string>()
let stopClock: (() => void) | undefined

/** The active run among this session's runs as the disk shows it now, or null for none. */
async function loadRun($: EngineInterface): Promise<ActiveRun | null> {
  if (owned.size === 0) return null
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
    if (!owned.has(entry.name)) continue
    const plan = await textOf($, `${runs}/${entry.name}/plan.md`)
    if (plan === null) continue
    candidates.push({ key: entry.name, plan, status: await textOf($, `${runs}/${entry.name}/status.md`) })
  }
  return activeRun(candidates, isCleanupOn(viberYml))
}

/** Reads the active run again and redraws; a read that a newer one overtook is dropped. */
async function refresh($: EngineInterface): Promise<void> {
  const mine = ++seq
  try {
    const loaded = await loadRun($)
    if (mine !== seq) return
    if (run !== null && loaded?.key !== run.key) running.clear()
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
    const task = dispatchedTask(e.subagent_type, e.prompt)
    if (task !== null) {
      running.add(task.id)
      if (owned.has(task.run)) {
        try {
          $.ui.invalidate('ui.render')
        } catch {
          // the next refresh redraws
        }
      } else {
        owned.add(task.run)
        void refresh($)
      }
    }
    const ran = await next(e)
    void refresh($)
    return ran
  }).catch((_$, e, next) => next(e))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    const key = claimedRunKey(e.command)
    if (key !== null) owned.add(key)
    if (isRunScriptCall(e.command)) void refresh($)
    return ran
  }).catch((_$, e, next) => next(e))

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)
    if (e.agentId === undefined || ran.isError !== true) return ran
    if (!isReportNameRefusal(e.file_path, typeof ran.text === 'string' ? ran.text : undefined)) return ran
    const agent = (await $.agent.list()).find((each) => each.id === e.agentId)
    if (!isViberAgent(agent?.type)) return ran
    if (!isInsideRoot(await $.session.root(), e.file_path)) return ran
    const originalFile = await textOf($, e.file_path)
    await $.fs.write(e.file_path, e.content)
    return {
      result: {
        type: originalFile === null ? 'create' : 'update',
        filePath: e.file_path,
        content: e.content,
        structuredPatch: [],
        originalFile,
      },
    }
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
          <Box key={row.id} flexDirection="row" justifyContent="space-between">
            <Box flexGrow={1} flexShrink={1}>
              <Text>{`${row.id} - ${row.title}`}</Text>
            </Box>
            <Box flexShrink={0} marginLeft={2}>
              <Text>{row.state}</Text>
            </Box>
          </Box>
        ))}
      </Box>
    )
  })
}
