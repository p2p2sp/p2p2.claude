# STATUS parsing and helpers

Detail reference for the **dispatcher-only** parsing helpers used by `SKILL.md`. The per-agent worker
`STATUS:` parsing and the scope/command construction live inside `scripts/task-pipeline.workflow.js` (and its
runner wrapper agent), not the dispatcher — intentionally absent here.

> **Authoritative source for every contract below:** the committer script headers
> (`scripts/commit-task.sh`), the workflow header (`scripts/task-pipeline.workflow.js`), and each worker
> agent's own `# Output format` (`agents/coder.md`, `agents/task-reviewer.md`, `agents/improver.md`) /
> `skills/superbuild-decomposer/SKILL.md` / `skills/superbuild-runner/SKILL.md`. This file is a cheatsheet — when the two disagree, the
> source file wins.

## What the dispatcher still parses

Three things only:

1. The **decomposer / adr-recorder / final-reviewer** replies — via `first_status_line` (`STATUS: …` first line).
2. The **workflow's structured return** `{status, attempts, lastFailureReportPath, outputTokens, commit?}` — read directly off the `Workflow` result, no regex. `commit` (only on PASS) is the per-task commit verdict, already parsed inside the workflow (table below); the dispatcher reads `commit.kind` and never parses the per-task tag line. `outputTokens` (output-only `budget.spent()` delta, `null` when unavailable) is summed across invocations for the closing report.
3. The **ADR committer's tag** (`commit-adr.sh`, still run inline by the dispatcher) — via `parse_commit_tag`. The one commit tag the dispatcher still parses directly.

Everything else (the coder / runner / task-reviewer / improver per-agent verdicts, the runner's five-value enum, the task-gate command construction, the scope-hint extraction, and the per-task committer's tag line) is internal to the workflow.

## Sub-process STATUS (decomposer / adr-recorder / final-reviewer)

First non-empty line of these dispatcher-direct `Skill` replies MUST match:

```
^STATUS: (PASS|FAIL|ADR|NO-ADR|BLOCKED)$
```

(`ADR`/`NO-ADR` only from `superbuild-adr`; `PASS`/`FAIL` from decomposer and final-reviewer.) Anything else = `FAIL`/malformed. `first_status_line(out)` returns the first non-empty line; the caller strips `STATUS: `.

## Commit tag vocabulary (two parsers, one shape)

Both committer scripts — `scripts/commit-task.sh` (per-task) and `scripts/commit-adr.sh` (ADR) — emit the **same** one-line `<commit …>` tag vocabulary, with two parsers:

- **Per-task commit** (workflow's final stage): the haiku `commiter` agent runs `commit-task.sh` against the **task file** and relays its single line verbatim. The script derives the message itself — `N` from the filename, `<subject>` from the `# ` H1 — and commits `T<N>: <subject>`. The workflow's `parseCommitTag(line)` turns the line into the `commit` object returned as `wf_out.commit`; the dispatcher reads `commit.kind`.
- **ADR commit** (inline, dispatcher): `commit-adr.sh`, parsed with `parse_commit_tag` into the **tuple** form `("sha", sha, files, subject) | ("no-changes",) | ("error", reason) | ("malformed", raw)`.

| Tag line the script emits | workflow `parseCommitTag` → `commit` (per-task) | dispatcher `parse_commit_tag` → tuple (ADR) | Handling |
|---|---|---|---|
| `<commit sha="[0-9a-f]{7,40}" files="\d+">T<N>: <subject></commit>` | `{kind:"sha", sha, files, subject}` | `("sha", sha, files, subject)` | Print `[<N>/<max>] commit: <sha>` / `ADR: recorded (<sha>)`; continue |
| `<commit status="no-changes"/>` | `{kind:"no-changes"}` | `("no-changes",)` | Terminal OK (no diff). Print the no-op line and continue |
| `<commit status="error"><reason></commit>` | `{kind:"error", reason}` | `("error", reason)` | Surface `reason` and **stop the skill** — not retried |
| anything else | `{kind:"malformed", raw}` | `("malformed", raw)` | Stop the skill and surface `raw` |

Subject content rule: `</commit>` inside `subject` is escaped `<\/commit>` by the script; neither parser unescapes unless surfacing to the user.

The script self-verifies before emitting a `sha` (HEAD advanced past pre-commit HEAD AND `git status --porcelain` empty — else an `error` tag, never a fabricated `sha`; see the script's "Verify-before-claim" header). `parseCommitTag` validates only tag *shape*, but the shape suffices: the dispatcher does **not** re-run `git rev-parse HEAD`, does **not** wrap it in a phantom-commit retry loop, and takes the sha straight from `wf_out.commit.sha`. On `error`/`malformed` it hard-stops.

## Helpers referenced by the pseudocode

- `first_status_line(out)` — first non-empty line. Used for the dispatcher-direct `Skill` replies; the caller strips `STATUS: `.
- `parse_status_yml(path)` — `None` when missing/unreadable. Else match the first non-empty line against `^current_task:\s*(\d+)\s*$`; return `int(group(1))` on success, `None` on any parse error.
- `parse_arg_task($ARGUMENTS)` — integer `N` for the first match of `task=(\d+)`, else `None`.
- `parse_int_config(key, default=3)` — read an integer from the preloaded `.superdev/config.yml`: match `^<key>:\s*(\d+)\s*$`, return `int(group(1))` else `default` (missing key/file or non-integer all fail-open). Used for `retry_max_attempts` and `retry_escalation_attempts` (both default `3`).
- `parse_commit_tag(out)` — applies the table above, returning the tuple form. Used by the dispatcher **only** for the ADR commit; the per-task tag is parsed inside the workflow.
- `extract_task_gate(N)` — the lines under the task file's `## Task gate` heading. Used **only** to compute the boolean `taskGateRunnable` (`true` iff the gate has a `- Tests:` line with a non-`none` value or a `- Build: green` line). The workflow's runner wrapper does the actual command construction.
- `safe_task_call(tool_fn, **kwargs)` — wraps one `TaskCreate`/`TaskUpdate` in try-catch. On success returns the tool's return value (e.g. the new task id). On error, prints `TaskCreate/TaskUpdate failed: <error> — continuing` once and returns `None`. **All progress-widget calls go through this** — a UI failure must not halt the pipeline.

## Progress widget — TaskCreate / TaskUpdate constraints

- `TaskCreate(subject, description, activeForm?, metadata?)` — always returns status `pending`. No `parent` field, no way to set initial status. Hierarchy is flat — one `Task <N>: …` widget per task.
- `TaskUpdate(taskId, status?, subject?, description?, activeForm?, metadata?, …)` — legal `status` values are `pending`, `in_progress`, `completed`, `deleted`. **No `failed` status.**

Failure mapping: on Abort, `wf_out.commit.kind` ∈ {`error`, `malformed`}, or a killed run, the superbuild **leaves the in-flight widget at `in_progress`** rather than `completed`. The stuck widget mirrors the halted pipeline; the `print` line carries the diagnostic.
