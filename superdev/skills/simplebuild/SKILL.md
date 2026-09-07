---
name: simplebuild
description: Use ONLY when the approved plan's body contains instruction to use it.
model: sonnet
effort: low
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Skill, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList, TaskStop, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/read-config.sh:*)
user-invocable: false
---

# SimpleBuild

Drives an already-approved plan, task by task.

## Mandatory Rules
You are orchestrator only. Be concise, do not explain. No prose - just simple status lines.
Every `args` handoff to a fork (Skill) is a labeled block - one `label: <file path>` per line. Every value is a PATH; NEVER paste file content (content breaks the fork's shell preload). A bare path with no label is equally wrong.

## Config

Resolved opt-in switches (missing file/key = `false`; nothing below breaks on a missing config):

!`"${CLAUDE_PLUGIN_ROOT}/scripts/read-config.sh"`

These gate the Close-Out delegations (Step 4: `adr`, `rules`, `memory`, `changelog`) and the run cleanup (Step 5: `cleanup`). Run a delegation ONLY when its line above reads exactly `true`; anything else (`false`, absent, or an unresolved block) = skip.

## Step 1 - Decompose Plan

Resolve `<plan-file>` from the `Plan:` line of the approved plan already in context - never guessed. No `Plan:` line -> STOP on the same branch below. Then verify identity: `grep -m1 '^Title:' <plan-file>` must equal the approved plan's own `Title:` line. Missing file or a differing `Title:` -> STOP: report that the plan file at that path is absent or holds a different plan (a plan-slug collision may have overwritten it); do not decompose, do not fall back, do not rewrite the plan from context.

Then preflight git: run `git rev-parse --git-dir`. A non-zero exit means this is not a git repository - and the whole pipeline assumes one (`base.md`, the reviewer's `git diff <base>..HEAD`, a commit after every task). Ask via `AskUserQuestion` before decomposing:
- **Initialize git (recommended)** -> run `git init`, then `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "chore: initial commit"`, so the build gets a real base SHA and a per-task history.
- **Continue without git** -> proceed; `base:` stays `none`, no task gets committed, and Final Review runs unbounded over the whole tree.

Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/decompose.sh" <plan-file>` with the resolved plan path. It creates a working dir (returned as `workdir:`) containing:
- `status.md` - number of the last processed task (starts at `00`).
- `base.md` - the build's base SHA (HEAD before the decompose commit); preserved on resume.
- `plan-header.md` - plan header.
- `plan.md` - full copy of the approved plan.
- `tasks/task-NN.md` - one file per task, each carrying the verbatim acceptance criteria it covers.
- `implementation/` - implementor deviation notes (`task-NN-notes.md`, `fix-NN-notes.md`) and reviewer reports (`review-NN.md`); created empty here, filled in Steps 2-3.

It prints the task index (`workdir:` working-dir path, `status:` last processed task or `none`, `base:` the build's base SHA or `none`, `plan-header:` path, `plan:` full-plan copy path, `intent:` intent path (optional), then `<task-file>\t<title>` per line) - use it to drive the implementation loop.

Non-zero exit (e.g. a `Covers:` criterion absent from the plan's `## Acceptance criteria`) -> STOP and show the error.

## Step 2 - Run Implementation Loop

### Build task list

Use `TaskCreate` to create task list based on task index + task for Final Review + task for Close Out. When `status:` is `NN` (not `none`), mark tasks `01`..`NN` as already completed at creation.

### Loop

Starting point (from decompose `status:`):
- `none` -> start at the first task.
- `NN`   -> tasks `01`..`NN` are already done; start at the first task whose number is greater than `NN`.

For each remaining task file (in order):
  1. `TaskUpdate` -> start
  2. Invoke `simplebuild-implementor` (Skill) with a labeled-line `args` block - `plan-header: <path>`, `task: <task-file path>`, and `notes: <workdir>/implementation/task-NN-notes.md` on separate lines (paths from the decompose index).
     It returns `VERDICT: PASS`, or `VERDICT: FAIL` + a `REASON: <line>`.
       - `VERDICT: PASS`  -> continue to commit
       - `VERDICT: FAIL`  -> escalate via `AskUserQuestion` (retry / skip / abort); act on the answer (abort ends the loop)
  3. Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "<task title>" <task-file>` - commits the task and records its number in `status.md`.
  4. `TaskStop` -> completed

## Step 3 - Final Review

1. `TaskUpdate` -> start
2. Invoke `simplebuild-reviewer` (Skill) with a labeled-line `args` block - `plan-header: <path>`, `plan: <plan-copy path>`, `base: <base SHA from the decompose index>`, `notes: <workdir>/implementation/`, and `report: <workdir>/implementation/review-NN.md` on separate lines (NN = review round, starting `01`, +1 on each reviewer call). It returns `VERDICT: PASS`, or `VERDICT: FAIL` + `REVIEW: <path>`.
3. Fix loop (max 2 rounds):
    - `VERDICT: PASS`  -> Step 4
    - `VERDICT: FAIL`  -> invoke `simplebuild-implementor` (Skill) with `plan-header: <path>`, `plan: <plan-copy path>`, `task: <REVIEW path>`, and `notes: <workdir>/implementation/fix-NN-notes.md` on separate lines (`plan` lets it verify the fix with the plan's real Test Commands).
        - implementor `VERDICT: PASS`  -> `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "<fix title>"`, then re-run the reviewer with the next `report:` number.
        - implementor `VERDICT: FAIL`  -> escalate via `AskUserQuestion` (retry / accept / abort); act on the answer.
    - Still `VERDICT: FAIL` after 2 rounds -> escalate via `AskUserQuestion` (retry / accept / abort); act on the answer.
4. Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "chore(simplebuild): final review reports"` - saves the review reports (also on an accepted FAIL).
5. `TaskStop` -> completed

## Step 4 - Close Out

1. `TaskUpdate` -> start
2. Wave 1 - gated by Config; run only the enabled ones, in parallel (single message, await all).
    - `adr: true`    -> Invoke `superbuild-adr` (Skill) with a labeled-line `args` block - `plan: <plan-copy path>` and `adr: docs/adr` (the target DIRECTORY - it timestamps the filename itself) on separate lines. Its `ADR:` line carries the written path, or `none` when the plan holds no significant architectural decision and no file was written.
    - `memory: true` -> Invoke `superdev-memory-writer` (Skill) with a labeled-line `args` block - `capture: <plan-copy path>` and `notes: <workdir>/implementation/` on separate lines.
    - `rules: true`  -> Invoke `superdev-rules-writer` (Skill) with a labeled-line `args` block - `capture: <plan-copy path>` and `notes: <workdir>/implementation/` on separate lines.
3. Wave 2 - `changelog: true` -> after wave 1 completes, invoke `superdev-changelog-writer` (Skill) with a labeled-line `args` block - `capture: <plan-copy path>`, `workdir: <workdir>`, and `notes: <workdir>/implementation/` on separate lines, plus `intent: <intent path>` only when the decompose index printed an `intent:` line, and `adr: <path>` only when wave 1 returned `ADR: <path>` other than `none`.
   Nothing enabled in either wave -> skip to the commit.
4. Keep each delegation's `ADR:` / `NODE:` / `RULE:` / `CHANGELOG:` / `INDEX:` / `GAP:` lines verbatim for the Step 5 summary. Any delegation failing is non-fatal -> note it there too, do not block.
5. Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "chore(simplebuild): close out adr, memory, rules and changelog"` - commits whatever the delegations touched.
6. `TaskStop` -> completed

## Step 5 - Done

1. `cleanup: true` -> run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/cleanup-run.sh" <workdir> simplebuild` and keep its `CLEANUP:` line; the script verifies completion itself - never re-check, never retry.
2. Cleanup the task list and display short summary of work. Max ~3-5 sentences plus the relayed lines. Include:
    - Step 4's `ADR:` / `NODE:` / `RULE:` / `CHANGELOG:` / `INDEX:` lines verbatim (or the noted failure / disabled)
    - the `CLEANUP:` line verbatim (or "disabled" when `cleanup` is off)
    - every `GAP:` line verbatim, each followed by `-> run superdev-memory` (memory gaps) or `-> run superdev-rules` (rules gaps)
