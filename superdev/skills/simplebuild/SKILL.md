---
name: simplebuild
description: Build orchestrator for an approved SimplePlan (a plan without a Spec line). Decomposes the plan into per-task files, dispatches the simplebuild-task-implementor agent per task at the Model and Effort the plan assigned to that task, commits every task, then runs one final review of the whole change and the config-gated close-out writers. Use it ONLY when the approved plan's body says to build it with the simplebuild skill - never for a plan that names superbuild, never without an approved plan.
model: sonnet
effort: low
allowed-tools: Read, Bash, Grep, Glob, Skill, Agent, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList, TaskStop, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/read-config.sh:*)
disallowed-tools: Edit, Write, NotebookEdit
user-invocable: false
---

# SimpleBuild

Drives an already-approved plan, task by task.

## Mandatory Rules
You are orchestrator only. Be concise, do not explain. No prose - just simple status lines.
Every handoff - the `args` of a fork (Skill) or the `prompt` of an agent (Agent) - is a labeled block - one `label: <file path>` per line. Every value is a PATH; NEVER paste file content (content breaks the fork's shell preload). A bare path with no label is equally wrong.
Never `cd`, and never pass a relative path on: join the decompose index's `root:` value with each relative path that index printed, so every fork, agent and script receives an absolute path and the build behaves identically whatever directory the session was started in. `<workdir>` below is therefore that joined, absolute run directory - for agents, for forks and for scripts alike, `checkpoint-update.sh` and `record-decision.sh` included (`commit-task.sh` normalises either form against the repository root), as is every file path under it. One single exception: `cleanup-run.sh` gets the index's `workdir:` value verbatim, repository-relative and never joined - its safety gate rejects every path outside `docs/.workflows/`, an absolute one included, and silently skips it as not a run dir.
You write no file. Notes, reports, `status.md`, `debt.md`, `decisions.md` and `checkpoint.md` are written by agents, forks and the bundled scripts - never by you, at any step.
Every agent runs through the `Agent` tool - you never do a worker's job yourself: no implementing, no editing project files, no writing what an agent owes. Its absence from your tool pool means the harness lost the tool, never that you may stand in for the worker: STOP at once, report exactly these four lines, and end the turn - do not decompose, do not commit, do not continue.

```
AGENT TOOL UNAVAILABLE - stopped at <step>.
Nothing was implemented, written or committed in its place.
State: <workdir> - last completed task <NN from status.md>, or "not decomposed yet".
Fix: exit this session, restart with `claude --resume`, then ask to continue this build (this skill is `user-invocable: false` - there is no slash command).
```

Two interruption states, watched for at every step below:
- **interrupted by limit** - an `Agent` or `Skill` result reporting that the run ended early on an API error, a spend limit, a session limit or an HTTP 429. Today's harness phrasing is a `failed` task notification reading `Agent terminated early due to an API error: You've hit your ... limit`; treat that wording as one example and match on the meaning.
- **no report** - a reviewer returning without a `VERDICT:` line, or returning `VERDICT: FAIL` or `VERDICT: BLOCKED` with no report to act on: a `REVIEW:` line naming a file that does not exist, or no `REVIEW:` line at all (a `REASON: missing input <label>` line in its place). It outranks every `### Fix loop` branch - never dispatch an implementor at a report that was never written.

In both states your only action is `AskUserQuestion` (retry after the reset / abort). A retry re-dispatches the same call with the same arguments and the same report path. Neither state counts as a review round, as a fix round, or as an implementor `VERDICT: FAIL` - and in neither do you finish the worker's job from disk or review anything yourself.

## Config

Resolved opt-in switches (missing file/key = `false`; nothing below breaks on a missing config):

!`"${CLAUDE_PLUGIN_ROOT}/scripts/read-config.sh"`

These gate the Close-Out delegations (Step 4: `adr`, `rules`, `memory`, `changelog`) and the run cleanup (Step 5: `cleanup`). Run a delegation ONLY when its line above reads exactly `true`; anything else (`false`, absent, or an unresolved block) = skip.

## Step 1 - Decompose Plan

Preflight the tool pool: the `Agent` tool must be present - absent -> STOP and report per `## Mandatory Rules`, with `State: not decomposed yet`. Do not resolve the plan, do not preflight git, do not run `decompose.sh`.

Resolve `<plan-file>` from the `Plan:` line of the approved plan already in context - never guessed. No `Plan:` line -> STOP on the same branch below. Then verify identity: `grep -m1 '^Title:' <plan-file>` must equal the approved plan's own `Title:` line. Missing file or a differing `Title:` -> STOP: report that the plan file at that path is absent or holds a different plan (a plan-slug collision may have overwritten it); do not decompose, do not fall back, do not rewrite the plan from context.

Then preflight git: run `git rev-parse --git-dir`. A non-zero exit means this is not a git repository - and the whole pipeline assumes one (`base.md`, the reviewer's `git diff <since>..HEAD`, a commit after every task). Ask via `AskUserQuestion` before decomposing:
- **Initialize git (recommended)** -> run `git init`, then `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "chore: initial commit" --path .` - the whole fresh tree, declared explicitly - so the build gets a real base SHA and a per-task history.
- **Continue without git** -> proceed; `base:` stays `none`, no task gets committed, no checkpoint ever runs, and Final Review goes out with `since: none`, unbounded over the whole tree.

Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/decompose.sh" <plan-file>` with the resolved plan path. It creates a working dir (returned as `workdir:`) containing:
- `status.md` - number of the last processed task (starts at `00`).
- `base.md` - the build's base SHA (HEAD before the decompose commit); preserved on resume.
- `checkpoint.md` - the last closed review round (`since:` / `prior:` lines), written by `checkpoint-update.sh`; absent until the first round closes, preserved on resume.
- `plan-header.md` - plan header.
- `plan.md` - full copy of the approved plan.
- `tasks/task-NN.md` - one file per task, each carrying the verbatim acceptance criteria it covers.
- `implementation/` - implementor deviation notes (`task-NN-notes.md`, `fix-NN-notes.md`), the review reports (`checkpoint-KK.md`, `review-01.md`), `debt.md` and `decisions.md`; created empty here, filled in Steps 2-3.

It prints the task index (`workdir:` working-dir path, `root:` the absolute repository root every relative path of this index is relative to, `status:` last processed task or `none`, `base:` the build's base SHA or `none`, `plan-header:` path, `plan:` full-plan copy path, `intent:` intent path (optional), then `<task-file>\t<title>\t<model>\t<effort>` per line - `<model>` / `<effort>` verbatim from the task's `Model:` / `Effort:` markers, `-` when absent) - use it to drive the implementation loop, joining the paths you hand on with `root:` as `## Mandatory Rules` directs.

Non-zero exit (e.g. a `Covers:` criterion absent from the plan's `## Acceptance criteria`) -> STOP and show the error.

Run `printf '%s\n' "${CLAUDE_PLUGIN_ROOT}/references"` once and keep its output as `<refs>` - the absolute references dir carried by every agent dispatch below.

Track four values for the rest of the build:
- `total` - the number of task lines in the index.
- `head` - the SHA of the last commit this build made; starts as `base:`, and every `commit: <sha>` line a commit prints replaces it.
- `since` - the SHA the next review round diffs from; starts as `base:`, and moves to `head` whenever a review round closes.
- `prior` - the report of the last closed review round; none at the start.

On a resume (`status:` is `NN`): read `head` from one `git rev-parse HEAD`, and `since` / `prior` from the `since:` / `prior:` lines of `<workdir>/checkpoint.md` when that file exists - otherwise `since` is `base:` and there is no `prior`, so no task committed after the last closed round is skipped by the next one.

Every report and notes ordinal below (`KK`, the fix `NN`, each re-review `R`) is likewise read off disk, never from memory: one `Glob` over `<workdir>/implementation/` at the start of the build and again on every resume, and each next ordinal is one past the highest already there for its own name shape - `checkpoint-KK.md`, `fix-NN-notes.md`, `<report basename>-reR.md`. So a resumed build never overwrites a closed round's report and never hands the implementor a `fix-NN-notes.md` an earlier round already filled (the implementor appends to an existing notes file, and `commit-task.sh --notes` would then declare that stale round's `touched:` paths too).

## Step 2 - Run Implementation Loop

### Build task list

Use `TaskCreate` to create task list based on task index + task for Final Review + task for Close Out. When `status:` is `NN` (not `none`), mark tasks `01`..`NN` as already completed at creation.

### Loop

Starting point (from decompose `status:`):
- `none` -> start at the first task.
- `NN`   -> tasks `01`..`NN` are already done; start at the first task whose number is greater than `NN`.

For each remaining task file (in order):
  1. `TaskUpdate` -> start
  2. Dispatch the implementor: `Agent` with `subagent_type: superdev:simplebuild-task-implementor`, `model:` = this task's `<model>` column and `effort:` = its `<effort>` column (omit a parameter whose column is `-`), and a labeled-line prompt - `plan-header: <path>`, `task: <task-file path>`, `refs: <refs>`, and `notes: <workdir>/implementation/task-NN-notes.md` on separate lines (paths from the decompose index). Await it.
     It returns `VERDICT: PASS`, or `VERDICT: FAIL` + a `REASON: <line>`.
       - `VERDICT: PASS`  -> continue to commit
       - `VERDICT: FAIL`  -> escalate via `AskUserQuestion` (retry / skip / abort); act on the answer (abort ends the loop)
  3. Commit the task: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "<task title>" <task-file> --notes <workdir>/implementation/task-NN-notes.md` - it records the task number in `status.md` and stages only the declared set (the task's `### Files`, the notes' `touched:` lines, the run dir).
       - `commit: <sha>` -> `head` := that SHA.
       - exit 2 with `undeclared: <path>` lines -> `AskUserQuestion` quoting those paths: **remove or stash them** (the user clears them, then re-run the same command), **include named ones** (re-run it with one `--path <path>` per path the user named), or **abort**. Never stage anything yourself.
       - `Nothing to commit.` or `Not a git repository - skipping commit.` -> `head` is unchanged.
  4. `TaskStop` -> completed
  5. This task's number `N` is a multiple of 5, `N` is smaller than `total`, and `head` moved in step 3 -> run the checkpoint review below before starting the next task.

### Checkpoint

Invoke `simplebuild-reviewer` (Skill) with a labeled-line `args` block - `stage: checkpoint`, `since: <since>`, `prior: <prior>` (omit the line when there is none), `decisions: <workdir>/implementation/decisions.md` (only when that file exists), `plan-header: <path>`, `plan: <plan-copy path>`, `notes: <workdir>/implementation/`, and `report: <workdir>/implementation/checkpoint-KK.md` (KK = this checkpoint's ordinal, `01`, `02`, ...) on separate lines. Then run `### Fix loop` on what it returns.

### Fix loop

Shared by the checkpoint above (`stage: checkpoint`) and by each round of Step 3 (`stage: final`). `<report>` is the report of the review that just returned; the budget per review is one fix dispatch and one re-review, after which the user decides.

- `VERDICT: PASS` -> close the round: `since` := `head`, `prior` := `<report>`, then run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/checkpoint-update.sh" <workdir> <since> <prior>` so a resume finds both. Continue.
- `VERDICT: BLOCKED` + `REVIEW: <report>` -> no implementor runs. One `AskUserQuestion` per bullet under the report's `### Needs decision`: **accept as changed** / **fix it** / **abort**. Per accepted bullet run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/record-decision.sh" <workdir> "<ID>" "<criterion or task>" "<what the user accepted>"`, then re-run the same reviewer call with the same `report:` and `decisions: <workdir>/implementation/decisions.md` added - that re-run is not a round. **fix it** on any bullet -> take the FAIL branch instead.
- `VERDICT: FAIL` + `REVIEW: <report>`:
    1. Dispatch `simplebuild-task-implementor` (`Agent`, no `model:` / `effort:` parameters) with `refs: <refs>`, `plan-header: <path>`, `plan: <plan-copy path>`, `task: <report>`, and `notes: <workdir>/implementation/fix-NN-notes.md` on separate lines (NN = the fix ordinal across the whole build, `01` upward). Await it.
       - `VERDICT: FAIL` + `REASON:` -> escalate via `AskUserQuestion` (retry / accept / abort); act on the answer.
    2. `VERDICT: PASS` -> keep the current `head` as `fix_since`, then commit the fix: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "<fix title>" --notes <workdir>/implementation/fix-NN-notes.md` (exit 2 handled exactly as in the loop above), and `head` := the SHA of its `commit:` line.
    3. Re-review: the same reviewer with the same labels, except `stage: re-review`, `since: <fix_since>`, `prior: <report>`, and `report: <report basename>-reR.md` (R = this report's re-review ordinal, `1` first).
       - `PASS` -> close the round: `since` := `head`, `prior` := the re-review report, run `checkpoint-update.sh` as above. Continue.
       - `FAIL` or `BLOCKED` -> `AskUserQuestion` listing the still-open finding IDs: **another round** (repeat from 1 with the next fix `NN` and the next re-review `R`, then ask this same question again - after every further round, every time), **accept with open findings** (record each still-open Critical and Important the same way the BLOCKED branch does - one `record-decision.sh` run per ID, so every later round reads it as plan text instead of re-opening what the user closed - then close the round: `since` := `head`, `prior` := the last report, run `checkpoint-update.sh`, continue), or **abort**.

## Step 3 - Final Review

1. `TaskUpdate` -> start
2. Invoke `simplebuild-reviewer` (Skill) with a labeled-line `args` block - `stage: final`, `since: <since>`, `prior: <prior>` (omit the line when there is none), `decisions: <workdir>/implementation/decisions.md` (only when that file exists), `plan-header: <path>`, `plan: <plan-copy path>`, `notes: <workdir>/implementation/`, and `report: <workdir>/implementation/review-01.md` on separate lines.
3. `VERDICT: BLOCKED` -> the BLOCKED branch of `### Fix loop` first; its re-run is the same `stage: final` call with `decisions:` set, and the verdict is read again afterwards.
4. `VERDICT: PASS` -> step 6.
5. `VERDICT: FAIL` -> the FAIL branch of `### Fix loop`: one implementor dispatch with `task: <report>`, one fix commit, then one `stage: re-review` round. Its `PASS` -> step 6; otherwise `AskUserQuestion` (another round / accept with open findings / abort), and each further round the user orders increments the fix `NN` and the re-review `R` and ends with that same question again.
6. Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "chore(simplebuild): final review reports" --path <workdir>` - saves the review reports (also on an accepted FAIL); its exit 2 is handled as in Step 2.
7. `TaskStop` -> completed

## Step 4 - Close Out

1. `TaskUpdate` -> start
2. Wave 1 - gated by Config; dispatch only the enabled ones with the `Agent` tool - all of them as multiple tool uses in ONE single message so they run concurrently - and await all before moving on.
    - `adr: true`    -> `Agent` with `subagent_type: superdev:adr-writer` and a labeled-line prompt - `plan: <plan-copy path>` and `adr: <root>/docs/adr` (the target DIRECTORY, joined with the index's `root:` like every other path, so the ADR lands at the repository root whatever directory this session started in - it timestamps the filename itself) on separate lines. Its `ADR:` line carries the written path, or `none` when the plan holds no significant architectural decision and no file was written.
    - `memory: true` -> `Agent` with `subagent_type: superdev:memory-writer` and a labeled-line prompt - `capture: <plan-copy path>`, `notes: <workdir>/implementation/`, and `refs: <refs>` on separate lines.
    - `rules: true`  -> `Agent` with `subagent_type: superdev:rules-writer` and a labeled-line prompt - `capture: <plan-copy path>`, `notes: <workdir>/implementation/`, and `refs: <refs>` on separate lines.
3. Wave 2 - `changelog: true` -> after wave 1 completes, `Agent` with `subagent_type: superdev:changelog-writer` and a labeled-line prompt - `capture: <plan-copy path>`, `workdir: <workdir>`, `notes: <workdir>/implementation/`, and `refs: <refs>` on separate lines, plus `intent: <intent path>` only when the decompose index printed an `intent:` line, and `adr: <path>` only when wave 1 returned `ADR: <path>` other than `none`.
   Nothing enabled in either wave -> skip to the commit.
4. Keep each delegation's `ADR:` / `NODE:` / `RULE:` / `CHANGELOG:` / `INDEX:` / `GAP:` lines verbatim for the Step 5 summary. Any delegation failing is non-fatal -> note it there too, do not block.
5. Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "chore(simplebuild): close out adr, memory, rules and changelog" --path <workdir>` with one further `--path <path>` per path the writers relayed on their `ADR:` / `NODE:` / `RULE:` / `CHANGELOG:` / `INDEX:` lines (a line reading `none` declares nothing) - that is the whole declared set of this commit; its exit 2 is handled as in Step 2.
6. `TaskStop` -> completed

## Step 5 - Done

1. `cleanup: true` -> run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/cleanup-run.sh" <workdir> simplebuild` - here alone `<workdir>` is the index's `workdir:` value verbatim, never joined with `root:`, per `## Mandatory Rules` - and keep its `CLEANUP:` line; the script verifies completion itself - never re-check, never retry.
2. Cleanup the task list and display short summary of work. Max ~3-5 sentences plus the relayed lines. Include:
    - Step 4's `ADR:` / `NODE:` / `RULE:` / `CHANGELOG:` / `INDEX:` lines verbatim (or the noted failure / disabled)
    - the `CLEANUP:` line verbatim (or "disabled" when `cleanup` is off)
    - every `GAP:` line verbatim, each followed by `-> run superdev-memory`
