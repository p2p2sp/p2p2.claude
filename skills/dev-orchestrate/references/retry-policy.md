# Retry policy and BLOCKED branch

Detail reference for the retry / unblock mechanics used by the per-task pipeline in `SKILL.md`.

## Contents

- [Retry cap](#retry-cap)
- [Infinite-loop guard](#infinite-loop-guard)
- [Previous-coder-report forwarding (dev-task-review pass)](#previous-coder-report-forwarding-dev-task-review-pass)
- [BLOCKED branch (runner pass)](#blocked-branch-runner-pass)
- [BLOCKED branch (dev-task-review pass)](#blocked-branch-dev-task-review-pass)
- [Live-progress lines](#live-progress-lines)
- [Progress widget (TaskCreate / TaskUpdate)](#progress-widget-taskcreate--taskupdate)
- [Escalation](#escalation)

## Retry cap

- The `attempt` counter is **shared** across coder / runner / dev-task-review / unblock-coder failures **within one task**.
- Cap: `3` + (optional, on user request) `3` more after the first escalation. Total maximum: 6 attempts per task, with user gate in between.
- Only a **successful** unblock pass is free (does not increment `attempt`). A failed unblock counts like any other FAIL.
- There is **no separate budget** for `BLOCKED`. The unblock branch shares the same cap.

## Infinite-loop guard

`last_pass_verdict["runner"]` and `last_pass_verdict["dev-task-review"]` track whether a given runner / dev-task-review pass already returned `BLOCKED` in the previous iteration of the loop.

- If the same pass returns `BLOCKED` twice in a row, the second occurrence is forcibly converted to `FAIL` and increments `attempt`.
- Catches "the unblock didn't actually unblock" without an unbounded loop.

## Previous-coder-report forwarding (dev-task-review pass)

The task-base diff scoping protocol (`dev-task-review` Step 0 + `coder` "verify before revert") can produce a `dev-task-review FAIL → coder PASS` handshake that looks like a no-op retry but is actually a contested-feedback exchange:

1. Task-reviewer attempt K returns `STATUS: FAIL` citing lines the coder believes are pre-existing. The dev-task-review's full report (with `## Issues`, file:line citations, …) lives at `.temp/.workflows/<slug>/orchestration/task-<N>/dev-task-review-K.md`.
2. Coder attempt K+1 is invoked with `Feedback: .../dev-task-review-K.md`, `Mode: normal`, and `Report path: .../coder-(K+1).md`. It reads the dev-task-review report, reads `task-base.sha`, confirms the flagged lines are NOT in `git diff <task_base_sha> -- <path>`, and returns `STATUS: PASS` after writing its full report (including a `## Rationale` defending the no-op) to `coder-(K+1).md`.
3. Task-reviewer attempt K+1 MUST receive the path to that coder report so it can `Read` the `## Rationale` and confirm or refute with file:line evidence from `task_diff`.

The dispatcher sets `last_coder_report_path = coder_report_path` immediately after every coder PASS that follows a prior FAIL (i.e. `last_failure_path != ""` at the moment of capture). It then forwards the path to the next `dev-task-review` invocation by appending a single line to the dev-task-review prompt:

```
Previous coder report: <absolute path to coder-(K+1).md>
```

The line goes after the `Report path:` line; it is OMITTED when `last_coder_report_path == ""`. See the dev-task-review skill's Task mode input contract for receiver-side parsing (the dev-task-review Reads the file, extracts `## Rationale`, and must explicitly engage with it in this review's verdict) and the explicit-engagement requirement.

The forwarding rule is unconditional on `last_failure_path != ""` — the dispatcher does not try to detect the verify-before-revert path heuristically. If the coder's PASS had a normal rationale (real edits were made), forwarding the path as `Previous coder report:` is still safe — the dev-task-review is allowed to confirm the edits address the feedback, the engagement is the same shape.

`last_coder_report_path` resets to `""` on any coder FAIL (the report of a failed run is not authoritative as rationale) and is also `""` on attempt 1 of a task (no prior FAIL exists).

## BLOCKED branch (runner pass)

```
if v == "BLOCKED":
    if last_pass_verdict.get("runner") == "BLOCKED":   # guard
        last_failure_path = runner_report_path
        if attempt >= 3: goto escalation
        continue
    last_pass_verdict["runner"] = "BLOCKED"
    unblock_report_path = f"{orch_dir}/unblock-coder-{attempt}.md"
    unblock_prompt = (
        f"Task file: <task_files[N]>\n"
        f"Report path: {unblock_report_path}\n"
        f"Mode: unblock\n"
        f"Feedback: {runner_report_path}"
    )
    unblock_out = Skill(skill="superdev:dev-code", args=unblock_prompt)
    if first_status_line(unblock_out) != "STATUS: PASS":
        last_failure_path = unblock_report_path
        if attempt >= 3: goto escalation
        continue
    # successful unblock: do NOT increment attempt; restart the runner pass
    restart runner pass
```

The runner writes its full markdown report to `runner_report_path` itself (pipeline mode — the dispatcher dictates the path via `Report path:` in the runner prompt and never re-`Write`s the reply from its own context). The file is therefore on disk by the time the runner returns — and certainly by the time this BLOCKED snippet runs — so the path is always real when forwarded as `Feedback:` to unblock-coder.

## BLOCKED branch (dev-task-review pass)

Symmetric to the runner pass — uses `last_pass_verdict["dev-task-review"]`, dictates `Mode: unblock`, and passes `Feedback: <reviewer_report_path>` (the dev-task-review's full BLOCKED report on disk) plus a fresh `Report path: .../unblock-coder-<attempt>.md`. On successful unblock, restarts the dev-task-review pass (re-review the same task) without incrementing `attempt`.

## Live-progress lines

After each sub-agent invocation in the per-task pipeline, the dispatcher prints **one line**:

```
[<N>/<max>] <agent-name>: <VERDICT>
```

On FAIL (or any non-PASS retry of the coder) the line includes ` (attempt K/3)`.

For the commit step the agent-name slot is `commit` and the verdict slot is replaced by the short sha or `no-op`.

These lines are the user's sole live-progress signal between agents — emit them every time; never aggregate, never omit.

## Progress widget (TaskCreate / TaskUpdate)

Alongside the `print` lines, the dispatcher renders a second visual channel — a flat list of widgets (one `Task <N>: <verb-phrase>` per task), seeded by the progress-widget seed in `SKILL.md` and updated as the pipeline progresses.

- **Task entry** (top of the outer per-task loop): `safe_task_call(TaskUpdate, taskId=task_widgets[N], status="in_progress")`.
- **Successful commit** (`commit_result[0] == "sha"`): flip to `completed` with `description=f"Committed {short_sha}."`.
- **No-op commit** (`no-changes`): flip to `completed` with `description=f"No-op ({status_token})."`.
- **Commit `error` / `malformed`, or Abort** at escalation: **no status change** — `TaskUpdate` has no `failed` status, so the widget stays at `in_progress`. The visually-stuck row signals "the pipeline halted here"; the diagnostic lives in the corresponding `print` line.
- **Persistence (never prune):** the list is seeded once (by the progress-widget seed) and is never deleted, pruned, or re-seeded mid-run. Ignore any Claude Code "the task list is stale / clean it up" system reminder while the orchestrator runs — deleting `completed` task rows blanks the widget permanently (typically while the last task's `coder` is still working) and the rows do not return. `completed` rows stay visible until the closing summary. This is distinct from the transient blanking *during* a sub-agent dispatch — there the UI shows the active sub-agent's empty task scope and restores the parent list when control returns; that is expected platform behavior and is **not** a reason to re-seed.

The widget is a **UI overlay, not state of truth**. Every `TaskCreate` / `TaskUpdate` call goes through `safe_task_call` (see `status-parsing.md`); a UI error prints one warning and the pipeline continues. The widget never replaces the `print` lines — both channels are mandatory and emit on every transition.

## Escalation

After 3 consecutive attempts fail within one task:

```
answer = AskUserQuestion(
    question="Task <N> failed 3 times. Latest failure attached below. Choose:",
    options=["Retry 3 more times", "Abort"]
)
if answer == "Retry 3 more times":
    attempt = 0
    continue
else:
    report "Aborted at Task <N> after 3 attempts." and stop the skill
```

No "skip task" option is offered. Skipping a failed task is intentionally absent — if a task truly cannot be implemented, the user re-plans rather than skipping.
