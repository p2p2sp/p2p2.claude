# STATUS parsing and helpers

Detail reference for parsing sub-agent verdicts and the helpers used by the per-task pipeline. Used by the per-task pipeline and the final review.

> **Authoritative source for every contract below:** each skill's own `# Output format` section — the pipeline fork-skills `skills/{decomposer,coder,dev-agent-task-reviewer,improver,runner}/SKILL.md` and the committer skill's `# Output format` at `skills/committer/SKILL.md`. This file is a quick-reference cheatsheet for the dispatcher — when the two disagree, the skill file wins.

## Sub-agent STATUS (coder / improver / decomposer)

The first non-empty line MUST match exact regex:

```
^STATUS: (PASS|FAIL)$
```

Anything else is treated as `FAIL` with:

```
last_failure = "Malformed agent output — first line: <line>\n\n<full reply>"
```

## Sub-agent STATUS (dev-agent-task-reviewer)

The first non-empty line MUST match exact regex:

```
^STATUS: (PASS|FAIL|BLOCKED)$
```

The widened regex is necessary so that `STATUS: BLOCKED` is **not coerced to FAIL** before reaching the dev-agent-task-reviewer-pass BLOCKED branch. Anything else is `FAIL` with the same malformed-output handling.

## Sub-agent STATUS (runner — pipeline mode)

In **pipeline mode** (the dispatcher passes `Report path:`), the runner replies on stdout with exactly three lines (`STATUS:` / `Report:` / `Summary:`) and writes the full markdown to the dictated path itself. The first non-empty line MUST match exact regex:

```
^STATUS: (PASS|FAIL|BLOCKED|ERROR|TIMEOUT)$
```

The five-value enum mirrors the runner's `## Verdict` token 1:1 — `BLOCKED` / `ERROR` / `TIMEOUT` are **NOT coerced to FAIL** before reaching the runner-pass branches (BLOCKED routes through unblock-coder, ERROR / TIMEOUT fall through to the standard failure path). Anything else is `FAIL` with the same malformed-output handling.

`BLOCKED` still requires a `Scope hints:` block in the runner prompt — without it the runner cannot emit `BLOCKED` and the whole runner unblock path becomes unreachable.

> **`N/A` is full-scope only.** In `Scope: full` runs the runner may also return `N/A` (the host documents no build/test/lint suite). That token is consumed by `dev-agent-final-reviewer` (where `N/A` is non-blocking / PASS-eligible), **not** by the orchestrator's per-task pipeline — the per-task task-scope `STATUS:` regex above stays `(PASS|FAIL|BLOCKED|ERROR|TIMEOUT)` and never matches `N/A`.

**Legacy mode** (no `Report path:`, main session / ad-hoc callers) — the runner returns the full markdown on stdout instead; the verdict is read from the `## Verdict` heading by `runner_verdict(out)` rather than from a `STATUS:` first line. The dispatcher does NOT use legacy mode.

## `committer` skill output (commit step)

The committer skill (a `context: fork` skill) returns one tagged line as the fork's summary. The commit step passes it the **task file path** (`.temp/.workflows/<slug>/tasks/<N>.md`); the committer derives the subject itself — `N` from the filename and `<subject>` from the task file's `# ` H1 — and commits `T<N>: <subject>` verbatim (the dispatcher authors no subject — see the commit step in `skills/dev-orchestrator/SKILL.md`). The `subject` echoed in the success tag is that derived message. The dispatcher does NOT apply STATUS regex here; it parses one of these exact shapes via `parse_commit_tag(commit_out)`:

| Pattern | Returns | Handling |
|---|---|---|
| `<commit sha="(?P<sha>[0-9a-f]{7,40})" files="(?P<files>\d+)">(?P<subject>.*)</commit>` | `("sha", sha, files, subject)` | Continue pipeline; print `[<N>/<max>] commit: <sha>` |
| `<commit status="no-changes"/>` | `("no-changes",)` | Terminal OK for this task (coder produced no diff). Print `[<N>/<max>] commit: no-op (no-changes)` and continue |
| `<commit status="error">(?P<stderr>.*)</commit>` | `("error", stderr)` | Surface stderr and **stop the skill** — committer failure is not retried via coder |
| anything else | `("malformed", raw)` | Stop the skill and surface raw output for debugging |

Subject content rule: `</commit>` inside `subject` is escaped as `<\/commit>` by the committer; the dispatcher does NOT need to unescape unless surfacing the subject to the user.

> **A `sha` tag is NOT proof of a commit.** `parse_commit_tag` validates only the tag *shape* — a syntactically valid `("sha", …)` result does **not** mean a commit landed. The committer fork (Haiku) can hallucinate the tool result: narrate the `git commit`, fabricate a SHA, and leave the tree dirty with HEAD unmoved. So after a `("sha", …)` result the dispatcher MUST verify the move itself: `git rev-parse HEAD` advanced past the pre-commit HEAD **and** `git status --porcelain` is empty. On a phantom commit (HEAD unchanged and/or dirty) it re-invokes the committer (≤3, changes are still staged) then hard-stops. The sha surfaced to the user comes from `git rev-parse --short HEAD` after that check — never `commit_result[1]`. See the commit step in `skills/orchestrator/SKILL.md`.

## Runner verdict

The five-value verdict enum is the same across both runner modes — only the surface differs:

- **Pipeline mode** (dispatcher path): the verdict is the token after `STATUS:` on the first stdout line (see the runner STATUS section above). The full `## Verdict` heading lives in the markdown file the runner writes to its `Report path:` — the dev-agent-task-reviewer / unblock-coder `Read` that file directly.
- **Legacy mode** (main session / ad-hoc callers): the verdict lives on stdout under the `## Verdict` heading, first list item, as one of `` `PASS` `` / `` `FAIL` `` / `` `ERROR` `` / `` `TIMEOUT` `` / `` `BLOCKED` ``.

Routing in either mode is identical:

- `` `PASS` `` — continues the pipeline
- `` `BLOCKED` `` — enters the runner unblock branch (see `retry-policy.md`)
- `` `FAIL` `` / `` `ERROR` `` / `` `TIMEOUT` `` — failure

`BLOCKED` requires a `Scope hints:` block in the runner prompt — without it the runner cannot emit `BLOCKED` and the whole runner unblock path becomes unreachable.

## Helpers referenced by the pseudocode

- `first_status_line(out)` — returns the first non-empty line of `out`. Used for every pipeline-bound skill's reply, including the runner in pipeline mode (the dispatcher then strips the `STATUS: ` prefix to get the verdict token, same pattern as the dev-agent-task-reviewer).
- `runner_verdict(out)` — **legacy helper, used only for runner replies emitted in legacy mode** (full markdown on stdout, no `Report path:` supplied). Parses the first item of `## Verdict` and returns one of `PASS` / `FAIL` / `ERROR` / `TIMEOUT` / `BLOCKED`. The orchestrator pseudocode no longer calls it — pipeline mode reads `STATUS:` from stdout via `first_status_line`. Retained for any ad-hoc caller that consumes a legacy runner reply.
- `parse_status_yml(path)` — return `None` when the file is missing or unreadable. Otherwise `Read` the file and match the first non-empty line against `^current_task:\s*(\d+)\s*$`. Return `int(match.group(1))` on success, `None` on any parse error.
- `parse_arg_task($ARGUMENTS)` — return integer `N` for the first match of `task=(\d+)` in the argument string, else `None`.
- `parse_commit_tag(out)` — applies the table above to the committer's output.
- `extract_task_gate(N)` — the lines under the task file's `## Task gate` heading (flat section, not nested).
- `extract_scope_paths(N)` — the glob/path bullets from the task file's `## Touches` heading (flat section).
- `extract_scope_test_names(N)` — identifier or intent-shorthand patterns derived from the task's `## Task gate` `Tests:` line. When the entry is a backticked intent shorthand (e.g. `` `unit: rejects status transition closed→open` ``) the patterns are the literal intent strings; the runner matches them as substrings against discovered test identifiers. Returns `[]` when `Task gate` is `Tests: none`.
- `extract_section(out, heading)` — returns the body lines under the first occurrence of `heading` (e.g. `## Rationale`), until the next `^## ` line or EOF. Returns `""` if the heading is absent. Retained for ad-hoc parsing of agent reports; the per-task pipeline itself no longer extracts `## Rationale` (the dev-agent-task-reviewer Reads the previous coder report directly — see `retry-policy.md` "Previous-coder-report forwarding").
- `build_test_command_or_build_command(gate, project_CLAUDE.md)` — constructs the runner command from the task's `## Task gate` line plus project conventions (test runner, build tool, etc.) sourced from the host project's `CLAUDE.md` and `.claude/rules/`.
- `safe_task_call(tool_fn, **kwargs)` — wraps a single `TaskCreate` / `TaskUpdate` invocation in a try-catch. On success, returns the tool's return value (e.g. the new task id). On any error, prints `TaskCreate/TaskUpdate failed: <error> — continuing` once and returns `None`. **All progress-widget calls go through this wrapper.** The progress tree is a UI overlay, never a source of truth — a UI failure must not halt the pipeline.

## Progress widget — TaskCreate / TaskUpdate constraints

The Claude Code task tools used by the progress-widget seed expose only:

- `TaskCreate(subject, description, activeForm?, metadata?)` — always returns a task in status `pending`. There is no `parent` field and no way to set initial status at creation. Hierarchy is therefore flat — the progress-widget seed emits one `Task <N>: …` widget per task in a flat list.
- `TaskUpdate(taskId, status?, subject?, description?, activeForm?, metadata?, …)` — the only legal `status` values are `pending`, `in_progress`, `completed`, `deleted`. **There is no `failed` status.**

Failure mapping: when a task is aborted (the per-task escalation → Abort), the committer returns `error` / `malformed`, or the user kills the run, the orchestrator **leaves the in-flight task widget at `in_progress`** rather than marking it `completed`. The visually-stuck widget mirrors the reality that the pipeline halted on that task. The accompanying `print` line (e.g. `[<N>/<max>] commit FAILED: …`) carries the diagnostic; the widget carries only the where-it-stopped marker.
