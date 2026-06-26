# Retry policy and BLOCKED branch

Behavioural reference for the retry / unblock mechanics of the per-task pipeline.

> **Executable source of truth:** this control flow is encoded as the deterministic dynamic-Workflow
> script `scripts/task-pipeline.workflow.js`, which the orchestrator invokes **once per task** via the
> `Workflow` tool. The script (not this prose, and no longer the main Opus session) is what actually
> runs the inner loop; this file documents the behaviour it implements so a reader can reason about a
> run without reading the JS. When the two disagree, the `.js` wins — update it first, then this file.
>
> The script's `agent()` boundary is a test seam: passing `args.stub` (canned per-role `{status}`
> verdicts) drives the same branches with no real forks, which is how the mandatory stubbed-agent
> dry-run validates each decision branch. The attempt cap is `args.retryMaxAttempts ?? 3`; a successful
> unblock pass restarts its pass without incrementing the attempt counter; a second BLOCKED in a row on
> the same pass converts to FAIL (the infinite-loop guard).

## Who owns what

- **The workflow** (`task-pipeline.workflow.js`) owns: the per-attempt loop, the coder / runner /
  task-reviewer / improver dispatch, both BLOCKED-unblock branches, the infinite-loop guard,
  feedback-/previous-coder-report forwarding, **and the final commit stage** (the haiku `commiter`
  passthrough that runs `commit-task.sh`, reached only on PASS). It returns
  `{status: 'PASS'|'FAIL', attempts, lastFailureReportPath, outputTokens, commit?}` — `commit` (the parsed
  commit verdict) present only on PASS; `outputTokens` is the output tokens this run consumed, measured as a
  `budget.spent()` delta (output-only, `null` when the budget API is unavailable; the dispatcher sums it
  across invocations for the closing token report).
- **The dispatcher** (`SKILL.md` per-task loop) owns: the widget flip, the `task-base.sha` capture, the
  single `Workflow` invocation, and — on PASS — the state writes (`status.yml` / one-time `base.sha`) driven
  by `wf_out.commit` / on FAIL — the escalation `AskUserQuestion`. It no longer runs the commit itself. It
  re-invokes the workflow with a fresh cap (`retry_escalation_attempts`) and
  `feedbackPath = lastFailureReportPath` if the user chooses Retry.

## Contents

- [Retry cap](#retry-cap)
- [Infinite-loop guard](#infinite-loop-guard)
- [Previous-coder-report forwarding (task-reviewer pass)](#previous-coder-report-forwarding-task-reviewer-pass)
- [BLOCKED branch (runner pass)](#blocked-branch-runner-pass)
- [BLOCKED branch (task-reviewer pass)](#blocked-branch-task-reviewer-pass)
- [Two-tier live signal](#two-tier-live-signal)
- [Progress widget (TaskCreate / TaskUpdate)](#progress-widget-taskcreate--taskupdate)
- [Escalation](#escalation)

## Retry cap

- The `attempt` counter is **shared** across coder / runner / task-reviewer / unblock-coder failures **within one task**, inside the workflow.
- Cap per workflow invocation: `args.retryMaxAttempts ?? 3`. The dispatcher passes `retry_max_attempts` (fail-open `3`) on the first invocation; on an escalation Retry it passes `retry_escalation_attempts` (fail-open `3`). Total ceiling across the two invocations is therefore `retry_max_attempts + retry_escalation_attempts` (default `3 + 3 = 6`), with the user gate in between.
- Only a **successful** unblock pass is free (does not increment `attempt`). A failed unblock counts like any other FAIL.
- There is **no separate budget** for `BLOCKED`. The unblock branch shares the same cap.

## Infinite-loop guard

The workflow's `lastBlocked.runner` / `lastBlocked.taskReviewer` flags track whether a given runner / task-reviewer pass already returned `BLOCKED` on the previous iteration of the loop.

- If the same pass returns `BLOCKED` twice in a row, the second occurrence is forcibly converted to `FAIL` and increments `attempt`.
- Catches "the unblock didn't actually unblock" without an unbounded loop.

## Previous-coder-report forwarding (task-reviewer pass)

The task-base diff scoping protocol (the `task-reviewer` agent's Step 0 + the `coder` agent's "verify before revert") can produce a `task-reviewer FAIL → coder PASS` handshake that looks like a no-op retry but is actually a contested-feedback exchange:

1. Task-reviewer attempt K returns `FAIL` citing lines the coder believes are pre-existing. Its full report (with `## Issues`, file:line citations, …) lives at `.../orchestration/task-<N>/task-reviewer-K.md`.
2. Coder attempt K+1 is invoked with `Feedback: .../task-reviewer-K.md`, `Mode: normal`, and `Report path: .../coder-(K+1).md`. It reads the task-reviewer report, reads `task-base.sha`, confirms the flagged lines are NOT in `git diff <task_base_sha> -- <path>`, and returns `PASS` after writing its full report (including a `## Rationale` defending the no-op) to `coder-(K+1).md`.
3. Task-reviewer attempt K+1 MUST receive the path to that coder report so it can `Read` the `## Rationale` and confirm or refute with file:line evidence from `task_diff`.

The workflow sets `lastCoderReportPath = coderOut.reportPath` immediately after every coder PASS that follows a prior FAIL (`lastFailureReportPath !== ''` at the moment of capture). It then forwards the path to the next `taskReviewer()` call by appending a single line to the task-reviewer prompt:

```
Previous coder report: <absolute path to coder-(K+1).md>
```

The line goes after the `Report path:` line; it is OMITTED when `lastCoderReportPath === ''`. See the `task-reviewer` agent's Task-mode input contract for receiver-side parsing (it Reads the file, extracts `## Rationale`, and must explicitly engage with it in this review's verdict).

The forwarding rule is unconditional on `lastFailureReportPath !== ''` — the workflow does not try to detect the verify-before-revert path heuristically. If the coder's PASS had a normal rationale (real edits were made), forwarding the path as `Previous coder report:` is still safe — the task-reviewer is allowed to confirm the edits address the feedback.

`lastCoderReportPath` resets to `''` on any coder FAIL (a failed run's report is not authoritative as rationale) and is `''` on attempt 1 of a task (no prior FAIL exists).

## BLOCKED branch (runner pass)

This is what the workflow does (it is no longer dispatcher pseudocode):

- `runner` returns `BLOCKED` → every failure is out-of-scope.
- Guard: if `lastBlocked.runner === 'BLOCKED'` already (BLOCKED twice in a row), force FAIL (the outer loop increments `attempt`).
- Otherwise set `lastBlocked.runner = 'BLOCKED'` and run a `Mode: unblock` coder pass with `Feedback = runner's report path`.
- Unblock FAIL → record it as the last failure and FAIL the attempt.
- Unblock PASS → **free pass**: restart the runner pass without incrementing `attempt`.

The runner writes its full markdown report to its `Report path:` itself (pipeline mode — the workflow dictates the path and never re-`Write`s the reply). The file is on disk by the time the BLOCKED branch runs, so the path is always real when forwarded as `Feedback:` to the unblock coder.

## BLOCKED branch (task-reviewer pass)

Symmetric to the runner pass — uses `lastBlocked.taskReviewer`, runs `Mode: unblock`, passes `Feedback = the task-reviewer's BLOCKED report path` plus a fresh `Report path: .../unblock-coder-<attempt>.md`. On successful unblock, restarts the task-reviewer pass (re-review the same task) without incrementing `attempt`.

## Two-tier live signal

Per-task progress runs on two independent tiers plus the widget:

- **Tier 1 — the workflow's `phase` / `log` channel.** From inside the `Workflow` invocation the script emits the fine-grained signal: `phase('Coder')` / `phase('Runner')` / `phase('Review')` and per-attempt `log("Task pipeline: attempt K/cap")` lines. This is where the old per-agent `[<N>/<max>] <agent>: <VERDICT>` granularity now lives.
- **Tier 2 — the dispatcher's coarse `print` line.** After the workflow returns, the dispatcher prints one line per task: `[<N>/<max>] task-pipeline: <PASS|FAIL> (attempts <K>/<cap>)`, plus the `commit` line (`[<N>/<max>] commit: <sha|no-op>`).
- **The progress widget** (next section) is a third, parallel visual channel.

All three are mandatory and independent — never collapse one into another (see `SKILL.md` `# Anti-patterns`, the two-tier-signal entry).

## Progress widget (TaskCreate / TaskUpdate)

A flat list of widgets (one `Task <N>: <verb-phrase>` per task), seeded by the progress-widget seed in `SKILL.md` and updated as the pipeline progresses.

- **Task entry** (top of the outer per-task loop): `safe_task_call(TaskUpdate, taskId=task_widgets[N], status="in_progress")`.
- **Successful commit** (`wf_out.commit.kind == "sha"`): flip to `completed` with `description=f"Committed {short_sha}."`.
- **No-op commit** (`wf_out.commit.kind == "no-changes"`): flip to `completed` with `description="No-op (no-changes)."`.
- **Commit `error` / `malformed` (`wf_out.commit.kind`), or Abort** at escalation: **no status change** — `TaskUpdate` has no `failed` status, so the widget stays at `in_progress`. The visually-stuck row signals "the pipeline halted here"; the diagnostic lives in the corresponding `print` line.
- **Persistence (never prune):** the list is seeded once (by the progress-widget seed) and is never deleted, pruned, or re-seeded mid-run. Ignore any Claude Code "the task list is stale / clean it up" system reminder while the orchestrator runs — deleting `completed` task rows blanks the widget permanently (typically while the last task's workflow is still running) and the rows do not return. `completed` rows stay visible until the closing summary. This is distinct from the transient blanking *during* a workflow / sub-agent dispatch — there the UI shows the active sub-agent's empty task scope and restores the parent list when control returns; that is expected platform behavior and is **not** a reason to re-seed.

The widget is a **UI overlay, not state of truth**. Every `TaskCreate` / `TaskUpdate` call goes through `safe_task_call` (see `status-parsing.md`); a UI error prints one warning and the pipeline continues.

## Escalation

The escalation is **dispatcher-side** (the workflow itself never prompts). After a workflow invocation returns `FAIL` (its cap exhausted, or a BLOCKED guard converted to FAIL):

```
answer = AskUserQuestion(
    question=f"Task {N} failed after {wf_out.attempts} attempts. Latest failure: {wf_out.lastFailureReportPath}. Choose:",
    options=[f"Retry {retry_escalation_attempts} more times", "Abort"]
)
if answer starts with "Retry":
    cap = retry_escalation_attempts
    feedback_path = wf_out.lastFailureReportPath   # seeds the re-invocation's first coder pass
    re-invoke the workflow (task_base_sha is NOT recomputed — the baseline is stable)
else:
    report f"Aborted at Task {N} after {wf_out.attempts} attempts." and stop the skill
```

No "skip task" option is offered. Skipping a failed task is intentionally absent — if a task truly cannot be implemented, the user re-plans rather than skipping.
