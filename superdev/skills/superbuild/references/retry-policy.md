# Retry policy and BLOCKED branch

Behavioural reference for the retry / unblock mechanics of the per-task pipeline.

> **Executable source of truth:** `scripts/task-pipeline.workflow.js`, invoked **once per task** by the
> superbuild via `Workflow`. The script (not this prose, not the main session) runs the inner loop; this
> file documents what it implements. When the two disagree, the `.js` wins — update it first, then this file.
>
> The `agent()` boundary is a test seam: `args.stub` (canned per-role `{status}` verdicts) drives the same
> branches with no real forks (the mandatory stubbed-agent dry-run). Attempt cap = `args.retryMaxAttempts ?? 3`;
> a successful unblock restarts its pass without incrementing `attempt`; a second BLOCKED in a row on the same
> pass converts to FAIL (the infinite-loop guard).

## Who owns what

- **The workflow** owns: the per-attempt loop, the coder / runner / task-reviewer / improver dispatch, both
  BLOCKED-unblock branches, the infinite-loop guard, feedback-/previous-coder-report forwarding, **and the
  final commit stage** (the haiku `commiter` passthrough running `commit-task.sh`, only on PASS). Returns
  `{status: 'PASS'|'FAIL', attempts, lastFailureReportPath, outputTokens, commit?}` — `commit` only on PASS;
  `outputTokens` = output tokens this run consumed (a `budget.spent()` delta; output-only, `null` when the
  budget API is unavailable; the dispatcher sums it across invocations for the closing report).
- **The dispatcher** (`SKILL.md` per-task loop) owns: the widget flip, the `task-base.sha` capture, the single
  `Workflow` call, and — on PASS — the state writes (`status.yml` / one-time `base.sha`) driven by
  `wf_out.commit` / on FAIL — the escalation `AskUserQuestion`. It does not run the commit. On Retry it
  re-invokes with a fresh cap (`retry_escalation_attempts`) and `feedbackPath = lastFailureReportPath`.

## Retry cap

- The `attempt` counter is **shared** across coder / runner / task-reviewer / unblock-coder failures within one task.
- Cap per invocation = `args.retryMaxAttempts ?? 3`: `retry_max_attempts` on the first invocation,
  `retry_escalation_attempts` on an escalation Retry. Total ceiling across both = `retry_max_attempts +
  retry_escalation_attempts` (default `6`), with the user gate in between.
- Only a **successful** unblock pass is free (does not increment `attempt`); a failed unblock counts like any FAIL.
- No separate budget for `BLOCKED` — the unblock branch shares the same cap.

## Infinite-loop guard

`lastBlocked.runner` / `lastBlocked.taskReviewer` track whether a pass already returned `BLOCKED` last iteration.

- Same pass returns `BLOCKED` twice in a row → the second is forcibly converted to `FAIL` (increments `attempt`).
- Catches "the unblock didn't actually unblock" without an unbounded loop.

## Previous-coder-report forwarding (task-reviewer pass)

The task-base diff scoping protocol can produce a `task-reviewer FAIL → coder PASS` handshake that looks like a no-op retry but is a contested-feedback exchange:

1. Task-reviewer attempt K returns `FAIL` citing lines the coder believes are pre-existing. Its report lives at `.../task-reviewer-K.md`.
2. Coder attempt K+1 (invoked with `Feedback: .../task-reviewer-K.md`, `Mode: normal`) confirms the flagged lines are NOT in `git diff <task_base_sha> -- <path>` and returns `PASS` with a `## Rationale` defending the no-op in `coder-(K+1).md`.
3. Task-reviewer attempt K+1 MUST receive that coder report so it can `Read` the `## Rationale` and confirm/refute with file:line evidence from `task_diff`.

The workflow sets `lastCoderReportPath = coderOut.reportPath` after every coder PASS that follows a prior FAIL (`lastFailureReportPath !== ''`), and forwards it to the next `taskReviewer()` call by appending one line after `Report path:`:

```
Previous coder report: <absolute path to coder-(K+1).md>
```

Omitted when `lastCoderReportPath === ''`. Forwarding is unconditional on `lastFailureReportPath !== ''` — no heuristic detection; forwarding a normal-rationale PASS is still safe (the task-reviewer may confirm the edits address the feedback). `lastCoderReportPath` resets to `''` on any coder FAIL and is `''` on attempt 1. Receiver-side parsing: the `task-reviewer` agent's Task-mode input contract.

## BLOCKED branch (runner pass)

- `runner` returns `BLOCKED` → every failure is out-of-scope.
- Guard: `lastBlocked.runner === 'BLOCKED'` already (twice in a row) → force FAIL (outer loop increments `attempt`).
- Else set `lastBlocked.runner = 'BLOCKED'` and run a `Mode: unblock` coder pass with `Feedback = runner's report path`.
- Unblock FAIL → record as last failure and FAIL the attempt.
- Unblock PASS → **free pass**: restart the runner pass without incrementing `attempt`.

The runner writes its full markdown report to its `Report path:` itself (pipeline mode), so the path is real on disk when forwarded as `Feedback:` to the unblock coder.

## BLOCKED branch (task-reviewer pass)

Symmetric to the runner pass — uses `lastBlocked.taskReviewer`, runs `Mode: unblock` with `Feedback = the task-reviewer's BLOCKED report path` + a fresh `Report path: .../unblock-coder-<attempt>.md`. On successful unblock, restarts the task-reviewer pass (re-review the same task) without incrementing `attempt`.

## Two-tier live signal

Per-task progress runs on two independent tiers plus the widget — all mandatory, never collapsed (see `SKILL.md` `# Anti-patterns`):

- **Tier 1 — the workflow's `phase` / `log` channel.** From inside the `Workflow`: `phase('Coder'/'Runner'/'Review')` and per-attempt `log("Task pipeline: attempt K/cap")`. The old per-agent `[<N>/<max>] <agent>: <VERDICT>` granularity lives here.
- **Tier 2 — the dispatcher's coarse `print` line.** `[<N>/<max>] task-pipeline: <PASS|FAIL> (attempts <K>/<cap>)`, plus the `commit` line.
- **The progress widget** — a third, parallel visual channel.

## Progress widget (TaskCreate / TaskUpdate)

A flat list (one `Task <N>: <verb-phrase>` per task), seeded by the progress-widget seed in `SKILL.md`.

- **Task entry:** `safe_task_call(TaskUpdate, taskId=task_widgets[N], status="in_progress")`.
- **Successful commit** (`wf_out.commit.kind == "sha"`): flip to `completed`, `description="Committed <sha>."`.
- **No-op commit** (`"no-changes"`): flip to `completed`, `description="No-op (no-changes)."`.
- **Commit `error`/`malformed`, or Abort:** **no status change** (no `failed` status) — stays at `in_progress`; the stuck row signals "halted here", the `print` line carries the diagnostic.
- **Never prune:** seeded once, never deleted / re-seeded mid-run. Ignore any "task list is stale" system reminder while the superbuild runs — deleting `completed` rows blanks the widget permanently and they do not return. (Distinct from the transient blanking *during* a sub-agent dispatch — expected platform behavior, not a reason to re-seed.)

UI overlay, not state of truth. Every call goes through `safe_task_call` (`status-parsing.md`); a UI error prints one warning and the pipeline continues.

## Escalation

Dispatcher-side (the workflow never prompts). After a `FAIL` return (cap exhausted, or a BLOCKED guard converted to FAIL):

```
answer = AskUserQuestion(
    question=f"Task {N} failed after {wf_out.attempts} attempts. Latest failure: {wf_out.lastFailureReportPath}. Choose:",
    options=[f"Retry {retry_escalation_attempts} more times", "Abort"]
)
if answer starts with "Retry":
    cap = retry_escalation_attempts
    feedback_path = wf_out.lastFailureReportPath   # seeds the re-invocation's first coder pass
    re-invoke the workflow (task_base_sha NOT recomputed — the baseline is stable)
else:
    report f"Aborted at Task {N} after {wf_out.attempts} attempts." and stop the skill
```

No "skip task" option — intentionally absent. If a task truly cannot be implemented, the user re-plans rather than skipping.
