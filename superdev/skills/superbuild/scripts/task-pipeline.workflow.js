// superdev / superbuild — deterministic per-task pipeline (dynamic Workflow).
//
// Encodes the fixed control flow that the main Opus session used to interpret from
// references/retry-policy.md every turn (non-deterministic, token-heavy). This script
// IS the source of truth for that logic now; retry-policy.md documents the behaviour.
//
// Runs ONE already-decomposed task through coder → runner → task-reviewer → improver
// → commit (haiku commiter passthrough) with the existing retry / BLOCKED-unblock /
// infinite-loop-guard / report-forwarding rules. Invoked once per task by
// superbuild/SKILL.md via the Workflow tool.
//
// ── I/O contract ───────────────────────────────────────────────────────────
// args (Workflow({scriptPath, args})):
//   taskFile           : absolute path to .superdev/.workflows/<slug>/tasks/<N>.md         (required)
//   reportDir          : absolute path to .superdev/.workflows/<slug>/orchestration/task-<N> (required)
//   taskBaseSha        : the task-base git SHA the superbuild captured at attempt 1   (required)
//   recipePath         : absolute path to the slug-scoped .superdev/.workflows/<slug>/recipe.sh
//                        the superbuild-recipe generator authored at run start. Spliced into
//                        the coder prompt and the runner-wrapper prompt so each downstream
//                        fork sources its build/test/launch verbs from that one artifact.    (optional)
//   taskGateRunnable   : true iff the task's `## Task gate` is runnable (Build: green / Tests: <non-none>);
//                        false on a pure `Tests: none` task (runner pass skipped).      (default true)
//   rulesImprover      : false → skip the improver step; anything else → run it.        (default true standalone; superbuild forwards explicit)
//   retryMaxAttempts   : attempt-cap for this invocation (escalation passes a fresh cap).(default 3)
//   feedbackPath       : on an escalation re-invoke, the prior run's lastFailureReportPath —
//                        forwarded as the FIRST coder call's Feedback.                   (optional)
//   stub               : TEST SEAM ONLY. When present, every agent() call is replaced by a
//                        deterministic stub that pops a canned verdict from this object
//                        instead of spawning a real fork — this is how the mandatory
//                        stubbed-agent dry-run (plan §8) exercises each branch with no forks.
//                        Shape: { coder:[v,…], unblockCoder:[v,…], runner:[v,…],
//                                 taskReviewer:[v,…], improver:[v,…] } where each v is a
//                                 status string ("PASS"|"FAIL"|"BLOCKED"|…) or {status,summary}.
//                                 The `committer` role is special: its queue holds RAW committer
//                                 tag LINES (e.g. '<commit sha="abc1234" files="3">T1: …</commit>'),
//                                 not verdicts — parseCommitTag() turns each into a `commit` object.
//
// return { status: 'PASS'|'FAIL', attempts: <int>, lastFailureReportPath: <string>, outputTokens: <int|null>, commit?: {...} }
//   ('PASS' once the task cleared coder+runner+task-reviewer (+improver) AND the commit stage ran;
//    'FAIL' once the attempt cap is exhausted or a BLOCKED guard converts to FAIL — no commit on FAIL,
//    so `commit` is absent. `status:'PASS'` reflects the PIPELINE only; the commit verdict travels
//    SEPARATELY in `commit` (one of {kind:'sha',sha,files,subject} | {kind:'no-changes'} |
//    {kind:'error',reason} | {kind:'malformed',raw}) — a failed commit does NOT flip status to FAIL,
//    the dispatcher reads `commit.kind` and hard-stops on error/malformed. `outputTokens` is the output
//    tokens THIS workflow run consumed, measured as a `budget.spent()` delta (output-only; `null` when the
//    budget API is absent or in stub mode) — the dispatcher sums it across all per-task workflow runs for
//    the closing token report. In stub mode an extra
//    `trace` array records each agent call's role + forwarded paths for dry-run assertions.)
//
// Determinism: no Bash, no filesystem, no Date.now()/Math.random()/argless new Date().
// All file reads/writes happen INSIDE the agents; this script only coordinates them.

export const meta = {
  name: 'dev-task-pipeline',
  description:
    'Deterministic per-task pipeline: drives one decomposed task through coder → runner → task-reviewer → improver with the retry / BLOCKED-unblock / infinite-loop-guard logic.',
  whenToUse:
    'Invoked once per task by superdev:superbuild (its SKILL.md tells it to call Workflow). Requires args {taskFile, reportDir, taskBaseSha, recipePath?, taskGateRunnable?, rulesImprover?, retryMaxAttempts?, feedbackPath?}.',
  phases: [
    { title: 'Coder', detail: 'write production code for the task (Mode: normal / unblock)' },
    { title: 'Runner', detail: 'run the task gate (skipped on Tests: none)' },
    { title: 'Review', detail: 'single-task review gate + config-gated rules improver' },
    { title: 'Commit', detail: 'commit the passed task via the commiter passthrough (T<N>: <subject>)' },
  ],
}

// ── arg normalization (input may arrive as a JSON string) ────────────────────
const input =
  typeof args === 'string'
    ? (() => {
        try {
          return JSON.parse(args)
        } catch {
          return {}
        }
      })()
    : args || {}

const taskFile = input.taskFile
const reportDir = input.reportDir
const taskBaseSha = input.taskBaseSha
if (!taskFile || !reportDir || !taskBaseSha) {
  throw new Error(
    'task-pipeline workflow requires args {taskFile, reportDir, taskBaseSha} (taskGateRunnable?, rulesImprover?, retryMaxAttempts?, feedbackPath?).',
  )
}
const taskGateRunnable = input.taskGateRunnable !== false // default true; only an explicit false skips the runner pass
const runImprover = input.rulesImprover !== false // honors the explicit boolean the superbuild forwards; standalone fallback (arg absent) = run
const cap = Math.max(1, input.retryMaxAttempts ?? 3) // missing key → 3; floor at 1 so an explicit 0 never no-op-FAILs
const feedbackPath = input.feedbackPath || '' // escalation seed for the first coder call
const recipePath = input.recipePath || '' // slug-scoped recipe.sh; threaded into the coder + runner prompts
const stub = input.stub || null

// ── output-token metering (budget.spent() delta) ─────────────────────────────
// `budget.spent()` (Workflow tool contract) returns output tokens spent this turn across the main loop
// AND all workflows — and `agent()` calls draw from that same pool. The superbuild awaits each per-task
// workflow serially, so the start→end delta within this run ≈ the output tokens this task's agents
// consumed. Guarded like `typeof phase` / `stub`: when `budget` is absent (or in stub mode) the delta is
// `null` (fail-open) and the dispatcher degrades the token report to "unavailable" — never throws.
const tokensBefore =
  typeof budget !== 'undefined' && budget && typeof budget.spent === 'function' ? budget.spent() : null
function tokensDelta() {
  if (tokensBefore == null) return null
  try {
    return Math.max(0, budget.spent() - tokensBefore)
  } catch {
    return null
  }
}

// ── the agent() port seam ────────────────────────────────────────────────────
// In production each role is a single fork — a per-task plugin agent (coder / runner /
// task-reviewer / improver, plus the commiter committer). In stub mode every role pops a
// canned verdict so the branch logic is exercisable with no real forks (the dry-run technique of plan §8).
const trace = []
const VERDICT = {
  type: 'object',
  additionalProperties: false,
  required: ['status'],
  properties: {
    status: { type: 'string' },
    reportPath: { type: 'string' },
    summary: { type: 'string' },
  },
}

function stubVerdict(role, reportPath) {
  const queue = (stub && stub[role]) || []
  const raw = queue.length ? queue.shift() : 'FAIL' // an empty queue is a test-fixture bug → FAIL, never spin
  const v = typeof raw === 'string' ? { status: raw } : { ...raw }
  return { status: v.status, reportPath: v.reportPath || reportPath, summary: v.summary || `stub:${role}` }
}

// Dispatch one role. `prompt` carries the dispatcher-dictated paths; `opts` selects the
// real agentType / model when not stubbing. Always returns {status, reportPath, summary}.
async function dispatch(role, prompt, opts, reportPath) {
  if (stub) {
    const v = stubVerdict(role, reportPath)
    trace.push({ role, reportPath, prompt, status: v.status })
    return v
  }
  const out = await agent(prompt, { ...opts, schema: VERDICT })
  return {
    status: (out && out.status) || 'FAIL',
    reportPath: (out && out.reportPath) || reportPath,
    summary: (out && out.summary) || '',
  }
}

// Parse the single tag line the committer relays from commit-task.sh (script header = the contract).
// Tolerates leading/trailing prose by searching the whole reply for the tag. Returns a `commit` object.
function parseCommitTag(line) {
  const raw = (line || '').trim()
  let m
  if ((m = raw.match(/<commit sha="([0-9a-f]{7,40})" files="(\d+)">(.*)<\/commit>/))) {
    return { kind: 'sha', sha: m[1], files: Number(m[2]), subject: m[3] }
  }
  if (/<commit status="no-changes"\/>/.test(raw)) {
    return { kind: 'no-changes' }
  }
  if ((m = raw.match(/<commit status="error">(.*)<\/commit>/))) {
    return { kind: 'error', reason: m[1] }
  }
  return { kind: 'malformed', raw }
}

// ── per-role prompt builders + dispatchers ───────────────────────────────────
const r = name => `${reportDir}/${name}` // report path under the per-task audit dir

function coder(attempt, mode, feedback) {
  const reportPath = mode === 'unblock' ? r(`unblock-coder-${attempt}.md`) : r(`coder-${attempt}.md`)
  const prompt =
    `Task file: ${taskFile}\n` +
    `Report path: ${reportPath}\n` +
    `Mode: ${mode}\n` +
    `Recipe: ${recipePath || '—'}\n` +
    `Feedback: ${feedback || '—'}`
  // Same real agentType for both modes (the coder agent runs `Mode: unblock` itself); the stub
  // role differs (`unblockCoder`) so a dry-run can queue normal vs. unblock verdicts unambiguously.
  const stubRole = mode === 'unblock' ? 'unblockCoder' : 'coder'
  return dispatch(stubRole, prompt, { agentType: 'superdev:coder', model: 'opus' }, reportPath)
}

// The runner pass is the cheap haiku `superdev:runner` plugin agent: it invokes
// Skill(superdev:superbuild-runner) in pipeline mode, reads the runner's report, and returns the
// structured verdict. Encoding the test-filter + scope-hint construction lives in that agent's body
// (agents/runner.md); this script only forwards paths.
function runner(attempt) {
  const reportPath = r(`runner-${attempt}.md`)
  const prompt =
    `Task file: ${taskFile}\n` +
    `Report path: ${reportPath}\n` +
    `Recipe: ${recipePath || '—'}\n` +
    `Run the task gate via Skill(superdev:superbuild-runner) in pipeline mode and return the structured verdict.`
  return dispatch('runner', prompt, { agentType: 'superdev:runner', model: 'haiku' }, reportPath)
}

function taskReviewer(attempt, runnerReportLine, previousCoderReport) {
  const reportPath = r(`task-reviewer-${attempt}.md`)
  let prompt =
    `Task file: ${taskFile}\n` +
    `Runner report: ${runnerReportLine}\n` +
    `Task base: ${taskBaseSha}\n` +
    `Report path: ${reportPath}`
  if (previousCoderReport) prompt += `\nPrevious coder report: ${previousCoderReport}`
  return dispatch('taskReviewer', prompt, { agentType: 'superdev:task-reviewer', model: 'opus' }, reportPath)
}

function improver(attempt, reviewerReportPath) {
  const reportPath = r(`improver-${attempt}.md`)
  const prompt = `Task-reviewer report: ${reviewerReportPath}\n` + `Report path: ${reportPath}`
  return dispatch('improver', prompt, { agentType: 'superdev:improver', model: 'sonnet' }, reportPath)
}

// The commit stage is a haiku passthrough agent (superdev:commiter) that runs the bundled
// commit-task.sh against the task file and relays its single tag line verbatim; this script parses
// that line deterministically. It BYPASSES dispatch()/VERDICT — the committer returns a raw tag line
// (not a {status} verdict), so it calls agent() WITHOUT a schema (raw string return) and we parse it.
// The committer agent sources the script path itself via ${CLAUDE_PLUGIN_ROOT} (like coder reads
// ${CLAUDE_PLUGIN_ROOT}/shared/coder-modes/…), so the workflow forwards only the task file path.
async function committer() {
  if (stub) {
    const queue = (stub && stub.committer) || []
    const line = queue.length ? queue.shift() : '' // empty queue → empty line → malformed (test-fixture bug)
    trace.push({ role: 'committer', line })
    return parseCommitTag(line)
  }
  const prompt =
    `Task file: ${taskFile}\n` +
    `Run the bundled commit-task.sh against this task file and return its single stdout line verbatim.`
  const line = await agent(prompt, { agentType: 'superdev:commiter', model: 'haiku' })
  return parseCommitTag(line)
}

// ── main control flow ────────────────────────────────────────────────────────
let attempt = 0
let lastFailureReportPath = '' // most recent upstream report on disk → next coder Feedback
let lastCoderReportPath = '' // forwarded to the next task-reviewer as `Previous coder report:`
const lastBlocked = {} // {runner|taskReviewer -> 'BLOCKED'} per-attempt unblock guard (reset each outer iteration)

function fail() {
  return { status: 'FAIL', attempts: attempt, lastFailureReportPath, outputTokens: tokensDelta(), ...(stub ? { trace } : {}) }
}

if (typeof phase === 'function') phase('Coder')

while (attempt < cap) {
  attempt += 1
  if (typeof log === 'function') log(`Task pipeline: attempt ${attempt}/${cap}`)
  // Reset the unblock guard per attempt — the "BLOCKED twice in a row" rule is per-pass, not global.
  // A fresh coder pass may have changed the code, so each attempt earns its own unblock chance.
  delete lastBlocked.runner
  delete lastBlocked.taskReviewer

  // ── coder (Mode: normal) ──────────────────────────────────────────────────
  // The first attempt seeds Feedback from feedbackPath (escalation re-invoke) when present;
  // every later attempt forwards the most recent failure's report path.
  const feedback = attempt === 1 && feedbackPath ? feedbackPath : lastFailureReportPath
  const coderOut = await coder(attempt, 'normal', feedback)
  if (coderOut.status !== 'PASS') {
    lastFailureReportPath = coderOut.reportPath // the FAIL evidence is this attempt's own coder report
    lastCoderReportPath = '' // a coder FAIL invalidates any prior rationale
    if (attempt >= cap) return fail()
    continue
  }
  // PASS after a prior FAIL → forward this coder report to the next task-reviewer.
  lastCoderReportPath = lastFailureReportPath !== '' ? coderOut.reportPath : ''

  // ── runner pass (skipped on pure `Tests: none`) ───────────────────────────
  // Inner loop so a successful unblock can restart the runner WITHOUT incrementing `attempt`.
  let runnerReportLine = 'none'
  let runnerOk = true
  if (taskGateRunnable) {
    if (typeof phase === 'function') phase('Runner')
    let runnerDone = false
    while (!runnerDone) {
      const runnerOut = await runner(attempt)
      if (runnerOut.status === 'BLOCKED') {
        if (lastBlocked.runner === 'BLOCKED') {
          // guard: BLOCKED twice in a row → forcibly FAIL (increments attempt via the outer loop)
          lastFailureReportPath = runnerOut.reportPath
          runnerOk = false
          break
        }
        lastBlocked.runner = 'BLOCKED'
        const unblockOut = await coder(attempt, 'unblock', runnerOut.reportPath)
        if (unblockOut.status !== 'PASS') {
          lastFailureReportPath = unblockOut.reportPath
          runnerOk = false
          break
        }
        // successful unblock — free pass; restart the runner pass without incrementing `attempt`
        continue
      }
      if (runnerOut.status !== 'PASS') {
        lastFailureReportPath = runnerOut.reportPath
        runnerOk = false
        break
      }
      lastBlocked.runner = 'PASS'
      runnerReportLine = runnerOut.reportPath
      runnerDone = true
    }
    if (!runnerOk) {
      if (attempt >= cap) return fail()
      continue
    }
  }

  // ── task-reviewer ─────────────────────────────────────────────────────────
  // Same unblock/guard shape as the runner pass (different guard key + restart target).
  if (typeof phase === 'function') phase('Review')
  let reviewOk = true
  let reviewerReportPath = ''
  let reviewDone = false
  while (!reviewDone) {
    const reviewOut = await taskReviewer(attempt, runnerReportLine, lastCoderReportPath || undefined)
    if (reviewOut.status === 'BLOCKED') {
      if (lastBlocked.taskReviewer === 'BLOCKED') {
        lastFailureReportPath = reviewOut.reportPath
        reviewOk = false
        break
      }
      lastBlocked.taskReviewer = 'BLOCKED'
      const unblockOut = await coder(attempt, 'unblock', reviewOut.reportPath)
      if (unblockOut.status !== 'PASS') {
        lastFailureReportPath = unblockOut.reportPath
        reviewOk = false
        break
      }
      continue // successful unblock — restart the review pass without incrementing `attempt`
    }
    if (reviewOut.status !== 'PASS') {
      lastFailureReportPath = reviewOut.reportPath
      reviewOk = false
      break
    }
    lastBlocked.taskReviewer = 'PASS'
    reviewerReportPath = reviewOut.reportPath
    reviewDone = true
  }
  if (!reviewOk) {
    if (attempt >= cap) return fail()
    continue
  }

  // ── improver (config-gated; never blocks the pipeline) ────────────────────
  if (runImprover) {
    await improver(attempt, reviewerReportPath)
  }

  // ── commit (haiku commiter passthrough → commit-task.sh) ──────────────
  // Reached ONLY on a passing task; the commit verdict travels separately in `commit` and does NOT
  // affect `status` — the dispatcher reads `commit.kind` to drive state/widgets and to hard-stop on error.
  if (typeof phase === 'function') phase('Commit')
  const commit = await committer()

  // task cleared coder + runner + task-reviewer (+ improver) and the commit stage ran
  return { status: 'PASS', attempts: attempt, lastFailureReportPath, outputTokens: tokensDelta(), commit, ...(stub ? { trace } : {}) }
}

// cap exhausted with no PASS
return fail()
