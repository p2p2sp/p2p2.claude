Title: "superbuild-task-reviewer as an agent dispatched at the task's build strength"
Intent: docs/.workflows/2026-09-10-task-reviewer-agent/intent.md


## Goal
`superbuild` reviews every task with an agent, `superdev:superbuild-task-reviewer`, dispatched through the `Agent` tool at the same `model:` / `effort:` the task's implementor received, both on the first review and on every re-review after a `FAIL`. The reviewer lives in `superdev/agents/`, has no `!` preloads, reads its labeled inputs itself, falls back to `opus` / `high` when the index column is `-`, and answers a missing required input with `VERDICT: FAIL` + `REASON: missing input <label>`, which `superbuild` escalates instead of re-dispatching the implementor.

## Context
Commit `01e8a14` moved the two task implementors from `Skill` forks to agents so `superbuild` / `simplebuild` can dispatch them per task at the plan's `Model:` / `Effort:` markers. The per-task reviewer stayed a `Skill` fork with a static `model: sonnet` / `effort: medium`, so a task implemented on `opus` / `xhigh` is gated by sonnet at medium. The `Skill` tool has no `model` / `effort` parameter, so the reviewer must take the same road as the implementors. The `decompose.sh` index already prints the `<model>` / `<effort>` columns; no script or test changes are needed. The repo has no build step and no lint; the deliverables are markdown + JSON, verified with `node` and `grep`.

## Out of scope
- `simplebuild-reviewer`, `superbuild-reviewer-spec`, `superbuild-reviewer-change` stay `Skill` forks with a static model.
- `superdev/scripts/decompose.sh` and every suite under `tests/superdev/`.
- The final-review fix dispatch of the implementor (no `model:` / `effort:` parameters) in `superbuild` Step 3.
- `superdev/hooks/content/manifest.md`.

## Acceptance criteria
1. `superdev/agents/superbuild-task-reviewer.md` exists with frontmatter `name: superbuild-task-reviewer`, a full-sentence `description:` ending with an "invoked only by the superbuild skill through the Agent tool" clause, `tools: Read, Write, Grep, Glob, Bash`, `model: opus`, `effort: high`, and no `context:`, `background:`, `allowed-tools:` or `user-invocable:` keys; `superdev/skills/superbuild-task-reviewer/` no longer exists.
2. The agent body contains no `` !` `` preload; it carries the implementors' `## Input` paragraph (labeled `label: value` lines, read each file-valued label, missing required label or unreadable file -> `VERDICT: FAIL` + `REASON: missing input <label>`, change nothing), lists `plan-header` (required), `task` (required), `notes` (optional, read as the implementor's deviation claims) and `report` (required, the path written on FAIL), instructs running `git status --short` with `Bash` to bound the review to the uncommitted work, and keeps the existing `## Scope`, `## Check`, `## Calibration` and `## Output format` content (`VERDICT: PASS` alone on PASS; `VERDICT: FAIL` + `REVIEW: <report path>` on FAIL, report written only then).
3. `superdev/.claude-plugin/plugin.json` parses as JSON, its `skills[]` has no `superbuild-task-reviewer` entry, and its `agents[]` lists `./agents/superbuild-task-reviewer.md` directly after `./agents/simplebuild-task-implementor.md`; no worker appears in both arrays.
4. In `superdev/skills/superbuild/SKILL.md` Step 2 item 3 dispatches the reviewer with `Agent`, `subagent_type: superdev:superbuild-task-reviewer`, `model:` / `effort:` equal to this task's step 2 values (parameter omitted when the column is `-`), and a labeled-line prompt (`plan-header`, `task`, `notes`, `report`); the re-review after a `FAIL` says it re-dispatches the reviewer the same way with the next `R`; the string "`superbuild-task-reviewer` (Skill)" no longer appears in the file.
5. `superdev/skills/superbuild/SKILL.md` Step 2 item 3 states that a reviewer `VERDICT: FAIL` carrying `REASON:` instead of `REVIEW:` escalates via `AskUserQuestion` (retry / abort) and never re-dispatches the implementor; the frontmatter `description:` names the reviewer agent dispatched at the task's Model and Effort.
6. `superdev/README.md` Super track table keys the row as `superdev:superbuild-task-reviewer` with an `Agent - ...` role naming the `Agent` tool dispatch at the task's `Model:` / `Effort:` and the `opus` / `high` frontmatter default; flow step 5 mentions the per-task reviewer agent running at the same strength as the implementor on the Super track.
7. Root `CLAUDE.md` directory map describes `superdev/agents/` as holding two task implementors, one task reviewer and four closeout writers; the Self-documentation invariant's `agents[]` enumeration names `superbuild-task-reviewer` as dispatched by `superbuild` at the task's `Model:` / `Effort:`; the superdev overview sentence about `decompose.sh` columns says the orchestrator dispatches both the implementor agent and (on the Super track) the task reviewer agent at those values.

