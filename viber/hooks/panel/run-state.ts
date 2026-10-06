export type PlanTask = { id: string; title: string }
export type Deferral = { id: string; path: string }
export type RunStatus = { done: string[]; skipped: string[]; deferred: Deferral[] }
export type RunCandidate = { key: string; plan: string; status: string | null }
export type ActiveRun = { key: string; tasks: PlanTask[]; status: RunStatus }
export type TaskState = 'done' | 'skipped' | 'running' | 'pending'
export type PanelRow = { id: string; title: string; state: TaskState; deferred: string[] }
export type Panel = { key: string; rows: PanelRow[]; done: number; total: number }

const DEFAULT_RUNS = '_specs'

function linesOf(text: string): string[] {
  return text.split('\n').map((line) => line.replace(/\r$/, ''))
}

// A key value as config.sh reads it: after the colon, cut at the first space or #.
function valueOf(line: string): string {
  return line.replace(/^[^:]*:\s*/, '').replace(/[\s#].*$/, '')
}

// The first `<key>:` line among the indented lines of the `<group>:` group, at any depth.
function groupValue(lines: string[], group: string, key: string): string {
  const opens = new RegExp('^' + group + '\\s*:')
  const keyed = new RegExp('^\\s+' + key + '\\s*:')
  let inGroup = false
  for (const line of lines) {
    if (/^[^\s#]/.test(line)) {
      inGroup = opens.test(line)
      continue
    }
    if (inGroup && keyed.test(line)) return valueOf(line)
  }
  return ''
}

export function runsDirectory(viberYml: string | null): string {
  if (viberYml === null) return DEFAULT_RUNS
  const value = groupValue(linesOf(viberYml), 'directories', 'runs')
  if (value === '' || value === '.' || value === '..' || !/^[A-Za-z0-9._-]+$/.test(value)) return DEFAULT_RUNS
  return value
}

export function isCleanupOn(viberYml: string | null): boolean {
  if (viberYml === null) return false
  let group = ''
  let inBuild = false
  let mapState = 0 // 0 no map seen, 1 inside the extensions map, 2 map closed
  let mapIndent = 0
  for (const line of linesOf(viberYml)) {
    const indent = line.length - line.replace(/^\s+/, '').length
    if (mapState === 1) {
      if (/^\s*(#|$)/.test(line) || indent > mapIndent) continue
      mapState = 2
    }
    if (/^[^\s#]/.test(line)) {
      inBuild = /^build\s*:/.test(line)
      group = /^[A-Za-z0-9_-]+\s*:/.test(line) ? line.replace(/\s*:.*$/, '') : ''
      continue
    }
    if (mapState === 0 && inBuild && /^\s+extensions\s*:/.test(line)) {
      mapIndent = indent
      mapState = 1
    }
    if (group === '' || !/^\s+[A-Za-z]/.test(line)) continue
    const child = line.replace(/^\s+/, '')
    if (!/^[A-Za-z0-9_-]+\s*:/.test(child)) continue
    if (group === 'build' && child.replace(/\s*:.*$/, '') === 'cleanup') {
      return valueOf(child).toLowerCase() === 'true'
    }
  }
  return false
}

export function planTasks(plan: string): PlanTask[] {
  const tasks: PlanTask[] = []
  let inTasks = false
  let inBlock = false
  let named = false
  for (const line of linesOf(plan)) {
    if (/^##\s*Tasks/.test(line)) {
      inTasks = true
      continue
    }
    if (/^##\s/.test(line)) {
      inTasks = false
      inBlock = false
      continue
    }
    if (!inTasks) continue
    if (/^\s*<!--\s*TASK\s*-->\s*$/.test(line)) {
      inBlock = true
      named = false
      continue
    }
    if (/^\s*<!--\s*\/TASK\s*-->\s*$/.test(line)) {
      inBlock = false
      continue
    }
    if (!inBlock || named || !/^###\s/.test(line)) continue
    const heading = line.replace(/^###\s+/, '').trim()
    const dash = heading.indexOf(' - ')
    if (dash < 0) continue
    named = true
    tasks.push({ id: heading.slice(0, dash).trim(), title: heading.slice(dash + 3).trim() })
  }
  return tasks
}

function entries(line: string): string[] {
  return line
    .replace(/^[A-Za-z]+:/, '')
    .split(/\s+/)
    .filter((entry) => entry !== '' && entry !== 'none')
}

export function runStatus(status: string | null): RunStatus {
  const result: RunStatus = { done: [], skipped: [], deferred: [] }
  if (status === null) return result
  for (const line of linesOf(status)) {
    if (line.startsWith('done:')) result.done.push(...entries(line))
    else if (line.startsWith('skipped:')) result.skipped.push(...entries(line))
    else if (line.startsWith('deferred:')) {
      for (const entry of entries(line)) {
        const colon = entry.indexOf(':')
        if (colon > 0) result.deferred.push({ id: entry.slice(0, colon), path: entry.slice(colon + 1) })
      }
    }
  }
  return result
}

export function activeRun(candidates: RunCandidate[], cleanup: boolean): ActiveRun | null {
  let newest: ActiveRun | null = null
  for (const candidate of candidates) {
    const tasks = planTasks(candidate.plan)
    if (tasks.length === 0) continue
    if (newest !== null && candidate.key <= newest.key) continue
    newest = { key: candidate.key, tasks, status: runStatus(candidate.status) }
  }
  if (newest === null) return null
  if (cleanup) return newest
  const settled = new Set([...newest.status.done, ...newest.status.skipped])
  return newest.tasks.every((task) => settled.has(task.id)) ? null : newest
}

export function panelOf(run: ActiveRun, running: string[]): Panel {
  const done = new Set(run.status.done)
  const skipped = new Set(run.status.skipped)
  const active = new Set(running)
  const rows = run.tasks.map((task): PanelRow => {
    const state: TaskState = done.has(task.id)
      ? 'done'
      : skipped.has(task.id)
        ? 'skipped'
        : active.has(task.id)
          ? 'running'
          : 'pending'
    const deferred = run.status.deferred.filter((entry) => entry.id === task.id).map((entry) => entry.path)
    return { id: task.id, title: task.title, state, deferred }
  })
  return { key: run.key, rows, done: rows.filter((row) => row.state === 'done').length, total: rows.length }
}
