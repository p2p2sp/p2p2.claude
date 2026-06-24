// superdev / dev-orchestrator — deterministic per-task pipeline (dynamic Workflow).
//
// Encodes the fixed control flow that the main Opus session used to interpret from
// references/retry-policy.md every turn (non-deterministic, token-heavy). This script
// IS the source of truth for that logic now; retry-policy.md documents the behaviour.
//
// Runs ONE already-decomposed task through coder → runner → task-reviewer → improver
// with the existing retry / BLOCKED-unblock / infinite-loop-guard / report-forwarding
// rules. Invoked once per task by dev-orchestrator/SKILL.md via the Workflow tool.
//
// ── I/O contract ───────────────────────────────────────────────────────────
// args (Workflow({scriptPath, args})):
//   taskFile           : absolute path to .temp/.workflows/<slug>/tasks/<N>.md         (required)
//   reportDir          : absolute path to .temp/.workflows/<slug>/orchestration/task-<N> (required)
//   taskBaseSha        : the task-base git SHA the orchestrator captured at attempt 1   (required)
//   taskGateRunnable   : true iff the task's `## Task gate` is runnable (Build: green / Tests: <non-none>);
//                        false on a pure `Tests: none` task (runner pass skipped).      (default true)
//   rulesImprover      : false → skip the improver step; anything else → run it.        (default true)
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
//
// return { status: 'PASS'|'FAIL', attempts: <int>, lastFailureReportPath: <string> }
//   ('PASS' once the task cleared coder+runner+task-reviewer (+improver); 'FAIL' once the
//    attempt cap is exhausted or a BLOCKED guard converts to FAIL. In stub mode an extra
//    `trace` array records each agent call's role + forwarded paths for dry-run assertions.)
//
// Determinism: no Bash, no filesystem, no Date.now()/Math.random()/argless new Date().
// All file reads/writes happen INSIDE the agents; this script only coordinates them.

export const meta = {
  name: 'dev-task-pipeline',
  description:
    'Deterministic per-task pipeline: drives one decomposed task through coder → runner → task-reviewer → improver with the retry / BLOCKED-unblock / infinite-loop-guard logic.',
  whenToUse:
    'Invoked once per task by superdev:dev-orchestrator (its SKILL.md tells it to call Workflow). Requires args {taskFile, reportDir, taskBaseSha, taskGateRunnable?, rulesImprover?, retryMaxAttempts?, feedbackPath?}.',
  phases: [
    { title: 'Coder', detail: 'write production code for the task (Mode: normal / unblock)' },
    { title: 'Runner', detail: 'run the task gate (skipped on Tests: none)' },
    { title: 'Review', detail: 'single-task review gate + config-gated rules improver' },
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
const runImprover = input.rulesImprover !== false // default-enabled; only `=== false` skips the improver
const cap = input.retryMaxAttempts ?? 3 // missing key → 3
const feedbackPath = input.feedbackPath || '' // escalation seed for the first coder call
const stub = input.stub || null

// ── the agent() port seam ────────────────────────────────────────────────────
// In production each role is a single fork (the three converted plugin agents, plus a
// cheap haiku wrapper for the runner). In stub mode every role pops a canned verdict so
// the branch logic is exercisable with no real forks (the dry-run technique of plan §8).
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

// ── per-role prompt builders + dispatchers ───────────────────────────────────
const r = name => `${reportDir}/${name}` // report path under the per-task audit dir

function coder(attempt, mode, feedback) {
  const reportPath = mode === 'unblock' ? r(`unblock-coder-${attempt}.md`) : r(`coder-${attempt}.md`)
  const prompt =
    `Task file: ${taskFile}\n` +
    `Report path: ${reportPath}\n` +
    `Mode: ${mode}\n` +
    `Feedback: ${feedback || '—'}`
  // Same real agentType for both modes (the coder agent runs `Mode: unblock` itself); the stub
  // role differs (`unblockCoder`) so a dry-run can queue normal vs. unblock verdicts unambiguously.
  const stubRole = mode === 'unblock' ? 'unblockCoder' : 'coder'
  return dispatch(stubRole, prompt, { agentType: 'superdev:dev-coder', model: 'opus' }, reportPath)
}

// The runner pass is a cheap haiku wrapper agent that invokes Skill(superdev:dev-agent-runner)
// in pipeline mode, reads the runner's report, and returns the structured verdict. Encoding the
// command + scope-hint construction lives in that wrapper agent; this script only forwards paths.
function runner(attempt) {
  const reportPath = r(`runner-${attempt}.md`)
  const prompt =
    `Task file: ${taskFile}\n` +
    `Report path: ${reportPath}\n` +
    `Run the task gate via Skill(superdev:dev-agent-runner) in pipeline mode and return the structured verdict.`
  return dispatch('runner', prompt, { model: 'haiku' }, reportPath)
}

function taskReviewer(attempt, runnerReportLine, previousCoderReport) {
  const reportPath = r(`dev-task-reviewer-${attempt}.md`)
  let prompt =
    `Task file: ${taskFile}\n` +
    `Runner report: ${runnerReportLine}\n` +
    `Task base: ${taskBaseSha}\n` +
    `Report path: ${reportPath}`
  if (previousCoderReport) prompt += `\nPrevious coder report: ${previousCoderReport}`
  return dispatch('taskReviewer', prompt, { agentType: 'superdev:dev-task-reviewer', model: 'opus' }, reportPath)
}

function improver(attempt, reviewerReportPath) {
  const reportPath = r(`improver-${attempt}.md`)
  const prompt = `Task-reviewer report: ${reviewerReportPath}\n` + `Report path: ${reportPath}`
  return dispatch('improver', prompt, { agentType: 'superdev:dev-improver', model: 'sonnet' }, reportPath)
}

// ── main control flow ────────────────────────────────────────────────────────
let attempt = 0
let lastFailureReportPath = '' // most recent upstream report on disk → next coder Feedback
let lastCoderReportPath = '' // forwarded to the next task-reviewer as `Previous coder report:`
const lastBlocked = {} // {runner|taskReviewer -> 'BLOCKED'} infinite-loop guard

function fail() {
  return { status: 'FAIL', attempts: attempt, lastFailureReportPath, ...(stub ? { trace } : {}) }
}

if (typeof phase === 'function') phase('Coder')

while (attempt < cap) {
  attempt += 1
  if (typeof log === 'function') log(`Task pipeline: attempt ${attempt}/${cap}`)

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

  // task cleared coder + runner + task-reviewer (+ improver)
  return { status: 'PASS', attempts: attempt, lastFailureReportPath, ...(stub ? { trace } : {}) }
}

// cap exhausted with no PASS
return fail()
