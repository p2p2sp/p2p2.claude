---
name: simplebuild
description: Use ONLY when the approved plan's body contains instruction to use it.
model: sonnet
effort: low
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Skill, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList, TaskStop
user-invocable: false
---

# SimpleBuild

Drives an already-approved plan, task by task.

## Mandatory Rules
You are orchestrator only. Be concise, do not explain. No prose - just simple status lines.
Every `args` handoff to a fork (Skill) is a labeled block — one `label: <file path>` per line. Every value is a PATH; NEVER paste file content (content breaks the fork's shell preload). A bare path with no label is equally wrong.

## Config

Resolved opt-in switches (missing file/key = `false`; nothing below breaks on a missing config):

!`bash "${CLAUDE_SKILL_DIR}/../../scripts/read-config.sh"`

These gate the Close-Out delegations (Step 4). Run a delegation ONLY when its line above reads exactly `true`; anything else (`false`, absent, or an unresolved block) = skip. `adr` is not used here.

## Step 1 - Decompose Plan

Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/decompose.sh" <plan-file>` with the approved plan's path. It creates a working dir (returned as `workdir:`) containing:
- `status.md` — number of the last processed task (starts at `00`).
- `base.md` — the build's base SHA (HEAD before the decompose commit); preserved on resume.
- `plan-header.md` — plan header.
- `plan.md` — full copy of the approved plan.
- `tasks/task-NN.md` — one file per task, each carrying the verbatim acceptance criteria it covers.
- `implementation/` — implementor deviation notes (`task-NN-notes.md`, `fix-NN-notes.md`) and reviewer reports (`review-NN.md`); created empty here, filled in Steps 2-3.

It prints the task index (`workdir:` working-dir path, `status:` last processed task or `none`, `base:` the build's base SHA or `none`, `plan-header:` path, `plan:` full-plan copy path, then `<task-file>\t<title>` per line) — use it to drive the implementation loop.

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
  2. Invoke `simplebuild-implementor` (Skill) with a labeled-line `args` block — `plan-header: <path>`, `task: <task-file path>`, and `notes: <workdir>/implementation/task-NN-notes.md` on separate lines (paths from the decompose index).
     It returns `VERDICT: PASS`, or `VERDICT: FAIL` + a `REASON: <line>`.
       - `VERDICT: PASS`  -> continue to commit
       - `VERDICT: FAIL`  -> escalate via `AskUserQuestion` (retry / skip / abort); act on the answer (abort ends the loop)
  3. Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "<task title>" <task-file>` — commits the task and records its number in `status.md`.
  4. `TaskStop` -> completed

## Step 3 - Final Review

1. `TaskUpdate` -> start
2. Invoke `simplebuild-reviewer` (Skill) with a labeled-line `args` block — `plan-header: <path>`, `plan: <plan-copy path>`, `base: <base SHA from the decompose index>`, `notes: <workdir>/implementation/`, and `report: <workdir>/implementation/review-NN.md` on separate lines (NN = review round, starting `01`, +1 on each reviewer call). It returns `VERDICT: PASS`, or `VERDICT: FAIL` + `REVIEW: <path>`.
3. Fix loop (max 2 rounds):
    - `VERDICT: PASS`  -> Step 4
    - `VERDICT: FAIL`  -> invoke `simplebuild-implementor` (Skill) with `plan-header: <path>`, `plan: <plan-copy path>`, `task: <REVIEW path>`, and `notes: <workdir>/implementation/fix-NN-notes.md` on separate lines (`plan` lets it verify the fix with the plan's real Test Commands).
        - implementor `VERDICT: PASS`  -> `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "<fix title>"`, then re-run the reviewer with the next `report:` number.
        - implementor `VERDICT: FAIL`  -> escalate via `AskUserQuestion` (retry / accept / abort); act on the answer.
    - Still `VERDICT: FAIL` after 2 rounds -> escalate via `AskUserQuestion` (retry / accept / abort); act on the answer.
4. Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "chore(simplebuild): final review reports"` — saves the review reports (also on an accepted FAIL).
5. `TaskStop` -> completed

## Step 4 - Close Out

1. `TaskUpdate` -> start
2. Gated by Config; run only the enabled delegations, in parallel (single message, await all). If none enabled, skip to 5.
    - `memory: true` -> Invoke `superdev-memory-writer` (Skill) with a labeled-line `args` block — `capture: <plan-copy path>` and `notes: <workdir>/implementation/` on separate lines.
    - `rules: true`  -> Invoke `superdev-rules-writer` (Skill) with a labeled-line `args` block — `capture: <plan-copy path>` and `notes: <workdir>/implementation/` on separate lines.
3. Keep each writer's `NODE:` / `RULE:` / `GAP:` lines verbatim for the Step 5 summary. Either delegation failing is non-fatal -> note it there too, do not block.
4. Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "chore(simplebuild): close out memory and rules"` — commits whatever the writers touched.
5. `TaskStop` -> completed

## Step 5 - Done

Cleanup the task list and display short summary of work. Max ~3-5 sentences plus the relayed lines. Include:
- Step 4's `NODE:` / `RULE:` lines verbatim (or the noted failure / disabled)
- every `GAP:` line verbatim, each followed by `-> run superdev-memory` (memory gaps) or `-> run superdev-rules` (rules gaps)
