# STATUS parsing and helpers

Detail reference for the **dispatcher-only** parsing helpers used by `SKILL.md`. The per-agent worker
`STATUS:` parsing and the scope/command construction now live inside `scripts/task-pipeline.workflow.js`
(and its runner wrapper agent), not the dispatcher — they are intentionally absent here.

> **Authoritative source for every contract below:** the deterministic committer script's header
> contract at `skills/dev-orchestrator/scripts/commit-task.sh`, the workflow's header contract at
> `skills/dev-orchestrator/scripts/task-pipeline.workflow.js`, and each worker agent's own `# Output
> format` (`agents/dev-coder.md`, `agents/dev-task-reviewer.md`, `agents/dev-improver.md`) /
> `skills/dev-agent-{decomposer,runner}/SKILL.md`. This file is a quick-reference cheatsheet for the
> dispatcher — when the two disagree, the source file wins.

## What the dispatcher still parses

The dispatcher (`SKILL.md`) reads only three things from sub-processes:

1. The **decomposer / adr-recorder / final-reviewer** replies — via `first_status_line` (`STATUS: …` first line).
2. The **workflow's structured return** `{status: 'PASS'|'FAIL', attempts, lastFailureReportPath, outputTokens, commit?}` — read directly off the `Workflow` result, no regex. The `commit` field (present only on PASS) is the **per-task** commit verdict, already parsed inside the workflow (table below); the dispatcher reads `commit.kind` and never parses the per-task tag line itself. `outputTokens` (a `budget.spent()` delta — output-only, `null` when unavailable) is summed across invocations for the closing token report.
3. The **ADR committer's tag** (`commit-adr.sh`, still run inline by the dispatcher) — via `parse_commit_tag` (table below). This is the one commit tag the dispatcher still parses directly.

Everything else (the coder / runner / task-reviewer / improver per-agent verdicts, the runner's five-value enum, the task-gate command construction, the scope-hint extraction, **and the per-task committer's tag line**) is internal to the workflow.

## Sub-process STATUS (decomposer / adr-recorder / final-reviewer)

The first non-empty line of these dispatcher-direct `Skill` replies MUST match:

```
^STATUS: (PASS|FAIL|ADR|NO-ADR|BLOCKED)$
```

(`ADR` / `NO-ADR` only from `dev-agent-adr-recorder`; `PASS` / `FAIL` from decomposer and final-reviewer.) Anything else is treated as `FAIL`/malformed with the same malformed-output handling the caller documents. `first_status_line(out)` returns the first non-empty line; the caller strips the `STATUS: ` prefix to get the token.

## Commit tag vocabulary (two parsers, one shape)

Both committer scripts — `scripts/commit-task.sh` (per-task) and `scripts/commit-adr.sh` (ADR) — emit the **same** one-line `<commit …>` tag vocabulary. It has two parsers depending on the path:

- **Per-task commit** runs as the workflow's final stage: the haiku `dev-commiter` passthrough agent runs `commit-task.sh` against the **task file** (`.temp/.workflows/<slug>/tasks/<N>.md`) and relays its single stdout line **verbatim**. The script derives the message itself — `N` from the filename, `<subject>` from the task file's `# ` H1 — and commits `T<N>: <subject>` (nobody authors a subject). The workflow's own `parseCommitTag(line)` turns the relayed line into the `commit` object it returns as `wf_out.commit`; the dispatcher reads `commit.kind` and never touches the per-task tag line.
- **ADR commit** is still run inline by the dispatcher (`commit-adr.sh`), and the dispatcher parses its tag with `parse_commit_tag` into the **tuple** form `("sha", sha, files, subject) | ("no-changes",) | ("error", reason) | ("malformed", raw)`.

| Tag line the script emits | workflow `parseCommitTag` → `commit` (per-task) | dispatcher `parse_commit_tag` → tuple (ADR) | Handling |
|---|---|---|---|
| `<commit sha="[0-9a-f]{7,40}" files="\d+">T<N>: <subject></commit>` | `{kind:"sha", sha, files, subject}` | `("sha", sha, files, subject)` | Print `[<N>/<max>] commit: <sha>` / `ADR: recorded (<sha>)`; continue |
| `<commit status="no-changes"/>` | `{kind:"no-changes"}` | `("no-changes",)` | Terminal OK (no diff). Print the no-op line and continue |
| `<commit status="error"><reason></commit>` | `{kind:"error", reason}` | `("error", reason)` | Surface `reason` and **stop the skill** — a commit failure is not retried |
| anything else | `{kind:"malformed", raw}` | `("malformed", raw)` | Stop the skill and surface `raw` for debugging |

Subject content rule: `</commit>` inside `subject` is escaped as `<\/commit>` by the script; neither parser needs to unescape unless surfacing the subject to the user.

> **The script self-verifies before emitting a `sha`, so the verdict is trusted directly.** `parseCommitTag` validates only the tag *shape*, but the shape is enough: `commit-task.sh` is deterministic and emits a `sha` tag **only** after itself confirming, with git, that HEAD advanced past the pre-commit HEAD **and** `git status --porcelain` is empty — a non-zero `git commit`, an unmoved HEAD, or a still-dirty tree all yield an `error` tag, never a fabricated `sha` (see the script's "Verify-before-claim" header contract). The `dev-commiter` agent only RELAYS that line (its prompt forbids inventing a tag), so even though a Haiku fork now wraps the script, the verify-before-claim guarantee still lives in the script. The dispatcher therefore does **not** re-run `git rev-parse HEAD` to re-check the move, does **not** wrap it in a phantom-commit retry loop, and takes the surfaced sha straight from `wf_out.commit.sha`. On an `error` / `malformed` `commit.kind` it hard-stops.

## Helpers referenced by the pseudocode

- `first_status_line(out)` — returns the first non-empty line of `out`. Used for the dispatcher-direct `Skill` replies (decomposer / adr-recorder / final-reviewer); the dispatcher then strips the `STATUS: ` prefix to get the token.
- `parse_status_yml(path)` — return `None` when the file is missing or unreadable. Otherwise `Read` the file and match the first non-empty line against `^current_task:\s*(\d+)\s*$`. Return `int(match.group(1))` on success, `None` on any parse error.
- `parse_arg_task($ARGUMENTS)` — return integer `N` for the first match of `task=(\d+)` in the argument string, else `None`.
- `parse_int_config(key, default=3)` — read an **integer** config value from the preloaded `.superdev/config.yml`. Match the first line `^<key>:\s*(\d+)\s*$`; return `int(group(1))` on success, else `default` (missing key, missing/unreadable file, or non-integer value all fail-open to `default`). Used for `retry_max_attempts` and `retry_escalation_attempts` (both default `3`).
- `parse_commit_tag(out)` — applies the commit tag table above, returning the tuple form. Used by the dispatcher **only** for the ADR commit (`commit-adr.sh`); the per-task commit tag is parsed inside the workflow by `parseCommitTag`, never here.
- `extract_task_gate(N)` — the lines under the task file's `## Task gate` heading (flat section). The dispatcher uses this **only** to compute the boolean `taskGateRunnable` flag it forwards to the workflow (`true` iff the gate has a `- Tests:` line with a non-`none` value or a `- Build: green` line). The workflow's runner wrapper agent does the actual command construction.
- `safe_task_call(tool_fn, **kwargs)` — wraps a single `TaskCreate` / `TaskUpdate` invocation in a try-catch. On success, returns the tool's return value (e.g. the new task id). On any error, prints `TaskCreate/TaskUpdate failed: <error> — continuing` once and returns `None`. **All progress-widget calls go through this wrapper.** The progress widget is a UI overlay, never a source of truth — a UI failure must not halt the pipeline.

## Progress widget — TaskCreate / TaskUpdate constraints

The Claude Code task tools used by the progress-widget seed expose only:

- `TaskCreate(subject, description, activeForm?, metadata?)` — always returns a task in status `pending`. There is no `parent` field and no way to set initial status at creation. Hierarchy is therefore flat — the progress-widget seed emits one `Task <N>: …` widget per task in a flat list.
- `TaskUpdate(taskId, status?, subject?, description?, activeForm?, metadata?, …)` — the only legal `status` values are `pending`, `in_progress`, `completed`, `deleted`. **There is no `failed` status.**

Failure mapping: when a task is aborted (the per-task escalation → Abort), `wf_out.commit.kind` is `error` / `malformed`, or the user kills the run, the orchestrator **leaves the in-flight task widget at `in_progress`** rather than marking it `completed`. The visually-stuck widget mirrors the reality that the pipeline halted on that task. The accompanying `print` line (e.g. `[<N>/<max>] commit FAILED: …`) carries the diagnostic; the widget carries only the where-it-stopped marker.
