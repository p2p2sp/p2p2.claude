---
name: superbuild
description: Build orchestrator for an approved SuperPlan. Use it ONLY when the approved plan's body says to build it with the superbuild skill - never for a plan that names simplebuild, never without an approved plan.
model: sonnet
effort: low
allowed-tools: Read, Bash, Grep, Glob, Skill, Agent, Task, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList, TaskStop, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/read-config.sh:*)
disallowed-tools: Edit, Write, NotebookEdit
user-invocable: false
---

# SuperBuild

Drives an already-approved plan, task by task.

## Harness pre-check

Every agent runs through the `Agent` tool. Its absence from your tool pool means the harness lost the tool, never that you may stand in for the worker: STOP at once, report exactly these four lines, and end the turn - do not decompose, do not commit, do not continue.

```
AGENT TOOL UNAVAILABLE - stopped at <step>.
Nothing was implemented, written or committed in its place.
State: <workdir> - last completed task `<title from the index>` (Task <NN from status.md>), or "not decomposed yet".
Fix: exit this session, restart with `claude --resume`, then ask to continue this build (this skill is `user-invocable: false` - there is no slash command).
```

Two interruption states, watched for at every step below:
- **interrupted by limit** - an `Agent` or `Skill` result reporting that the run ended early on an API error, a spend limit, a session limit or an HTTP 429. Today's harness phrasing is a `failed` task notification reading `Agent terminated early due to an API error: You've hit your ... limit`; treat that wording as one example and match on the meaning.
- **no report** - a reviewer returning without a `VERDICT:` line, or returning `VERDICT: FAIL` or `VERDICT: BLOCKED` with no report to act on: a `REVIEW:` line naming a file that does not exist, or no `REVIEW:` line at all (a `REASON: missing input <label>` line in its place); and an implementor returning `VERDICT: BLOCKED` whose `notes` file holds no `DECISION:` line, which is no stop to act on either. It outranks every `### Fix loop` branch and `### Implementor stop` alike - never dispatch an implementor at a report that was never written, and never re-dispatch one at a stop it never raised.

In both states your only action is `AskUserQuestion` (retry after the reset / abort). A retry re-dispatches the same call with the same arguments and the same report path. Neither state counts as a review round, as a fix round, or as an implementor `VERDICT: FAIL` - and in neither do you finish the worker's job from disk or review anything yourself.

## Mandatory rules

- Orchestrator only: never do a worker's job yourself - no implementing, no editing project files, no writing what an agent owes. Be concise, no prose - just simple status lines.
- You write no file, by any means, a shell redirect included. Notes, reports, `status.md`, `decisions.md` and `checkpoint.md` come from the agents, the forks and the bundled scripts, at every step.
- Every handoff - a fork's `args` (Skill) or an agent's `prompt` (Agent) - is a labeled block, one `label: <file path>` per line. Every value is a PATH; never paste file content (it breaks the fork's shell preload), and a bare path with no label is equally wrong.
- Never `cd`, and never pass on a relative path: join the decompose index's `root:` value with every relative path that index printed, so every fork, agent and script receives an absolute path and the build behaves identically whatever directory the session started in. `<workdir>` below is therefore that joined absolute run directory, as is every path under it - for agents, forks and scripts alike, `checkpoint-update.sh` and `record-decision.sh` included (`commit-task.sh` normalises either form against the repository root). One single exception: `cleanup-run.sh` in Step 5.
- Name every task, criterion and finding you put in front of the user - a status line, an `AskUserQuestion` label or its text, an escalation, a `record-decision.sh` subject - in the reference form `` `<title>` (<pointer>) `` that `${CLAUDE_PLUGIN_ROOT}/references/review-contract.md` (`## Naming`) owns, never a bare number or ID: the task title from the decompose index's `<title>` column, the criterion short name from the plan header, the finding title from its report bullet. A report bullet carrying no title - written by a reviewer from before that contract - is named by its "what is wrong" clause plus the ID instead.
- Every `model:` / `effort:` parameter you pass to any dispatch is decided by `${CLAUDE_PLUGIN_ROOT}/references/review-contract.md` (`## Dispatch strength`) - it owns the two strength scales, which column or task set each dispatch reads, and the fact that passing no parameter is not a level but a handover to the dispatched worker's own frontmatter. Never invent a strength, never carry one over from a previous dispatch.

## Config

Resolved opt-in switches, gating the Step 4 close-out delegations (`rules`, `memory`, `changelog`, `qa`, `e2e-ui`, `e2e-api`), the Step 5 run cleanup (`cleanup`) and every stats call of this build (`stats`) - the `adr` line is printed too but gates nothing here, it gates the `intent` skill:

!`"${CLAUDE_PLUGIN_ROOT}/scripts/read-config.sh"`

Run a gated step ONLY when its line above reads exactly `true`; anything else - `false`, absent, an unresolved block, a missing config file - means skip, and nothing below breaks on it.

### Stats

`stats` not reading exactly `true` -> make no `stats-record.sh` and no `stats-report.sh` call at all, anywhere in this build, and log nothing. Otherwise record one event per item below, in one Bash call each, right after the thing it measures:

`bash "${CLAUDE_PLUGIN_ROOT}/scripts/stats-record.sh" <workdir> <kind> <label> <model> <effort> <tokens> <tool_uses> <duration_ms> <verdict> <note>` - positional, trailing arguments droppable, `-` for a gap in the middle, every argument double-quoted so a label or a note bearing spaces stays one field.

- Copy every value from the harness notification of the dispatch that just returned, or from the call you just made. Compute nothing, estimate nothing, sum nothing, and pass `-` in every position the notification left unreported.
- `start` right after `decompose.sh` - `resume` instead when its `status:` line was `NN` - label the workdir basename, every other field `-`.
- Every awaited `Agent` completion: kind `implementor`, `task-reviewer`, `fix-implementor` or `writer`; label the task file basename (`fix-NN` for a fix dispatch, the `subagent_type` for a close-out writer); the `model:` / `effort:` you dispatched at; the notification's `subagent_tokens`, `tool_uses` and `duration_ms`; the `VERDICT:` it returned.
- Every `Skill` fork return: kind `fork`, label the fork name plus its report basename, verdict its `VERDICT:` line, `-` in all five usage fields - a fork result carries no usage data.
- Every `commit-task.sh` run: kind `commit`, label the commit title, verdict the SHA of its `commit:` line, `nothing` when it had nothing to commit, `undeclared` on its exit 2.
- Every escalation: kind `escalation`, label what was escalated in the `` `<title>` (<pointer>) `` form, note the interruption and the user's answer. That same note field carries a `VERDICT: FAIL` with its `REASON:`, a `BLOCKED`, a re-dispatch, an undeclared working-tree change, an agent that returned no report, and a session or spend limit. An implementor `VERDICT: BLOCKED` is an escalation too: one event per `DECISION:` line you put to the user, labeled `` `<title>` (Task NN) `` or `` `<fix title>` (fix NN) `` as `### Implementor stop` names that dispatch, its note that line's `<what>` and the user's answer; a stop carrying no `DECISION:` line is one event noting `BLOCKED without DECISION line`, and a `record-decision.sh` exiting non-zero one further event noting that failure and the answer to it.
- A stats call exiting non-zero is noted for the Step 5 summary and the build carries on - never retried, never escalated, never a reason to stop or to ask the user.

## Step 1 - Decompose Plan

Preflight the tool pool: the `Agent` tool must be present - absent -> STOP and report per `## Harness pre-check`, with `State: not decomposed yet`. Do not resolve the plan, do not preflight git, do not run `decompose.sh`.

Resolve `<plan-file>` from the `Plan:` line of the approved plan already in context - never from its `Spec:` line, never guessed. Then verify identity: `grep -m1 '^Title:' <plan-file>` must equal the approved plan's own `Title:` line. No `Plan:` line, a missing file, or a differing `Title:` -> STOP: report that the plan is unresolvable or that the file at that path holds a different plan (a plan-slug collision may have overwritten it); do not decompose, do not fall back, do not rewrite the plan from context.

Then preflight git: run `git rev-parse --git-dir`. A non-zero exit means this is not a git repository - and the whole pipeline assumes one (`base.md`, the reviewer's `git diff <since>..HEAD`, a commit after every task). Ask via `AskUserQuestion` before decomposing:
- **Initialize git (recommended)** -> run `git init`, then `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "chore: initial commit" --path .` - the whole fresh tree, declared explicitly - so the build gets a real base SHA and a per-task history.
- **Continue without git** -> proceed; `base:` stays `none`, no task gets committed, no checkpoint ever runs, and Final Review goes out with `since: none`, unbounded over the whole tree.

Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/decompose.sh" <plan-file> superbuild` with the resolved plan path. It creates the run's working dir and prints the task index:
- `workdir:` the run dir, `root:` the absolute repository root every relative path of this index is relative to, `status:` last processed task or `none`, `base:` the build's base SHA or `none`, `plan-header:` path, `plan:` full-plan copy path, `spec:` spec path, `intent:` intent path (optional).
- then one `<task-file>\t<title>\t<model>\t<effort>\t<review>` line per task - `<model>` / `<effort>` / `<review>` verbatim from that task's `Model:` / `Effort:` / `Review:` markers, `-` when absent. `<model>` / `<effort>` are the implementor's strength, `<review>` that task's reviewer's: its first token the model, its second the effort.

Drive the whole build off that index, joining every path you hand on with `root:` as `## Mandatory rules` directs. No `spec:` line -> STOP: this plan belongs to `simplebuild`, not here. Non-zero exit (e.g. a `Covers:` criterion absent from the spec) -> STOP and show the error.

Two things under `<workdir>` you address yourself: `checkpoint.md` (the last closed review round's `since:` / `prior:` lines, written by `checkpoint-update.sh`, absent until the first round closes) and `implementation/` (implementor deviation notes `task-NN-notes.md` / `fix-NN-notes.md`, the review reports, plus `decisions.md`). Everything else reaches you as a path on the index.

Run `printf '%s\n' "${CLAUDE_PLUGIN_ROOT}/references"` once and keep its output as `<refs>` - the absolute references dir carried by every agent dispatch below.

Track four values for the rest of the build:
- `total` - the number of task lines in the index.
- `head` - the SHA of the last commit this build made; starts as `base:`, and every `commit: <sha>` line a commit prints replaces it.
- `since` - the SHA the next review round diffs from; starts as `base:`, and moves to `head` whenever a review round closes.
- `prior` - the report of the last closed review round; none at the start.

On a resume (`status:` is `NN`): read `head` from one `git rev-parse HEAD`, and `since` / `prior` from the `since:` / `prior:` lines of `<workdir>/checkpoint.md` when that file exists - otherwise `since` is `base:` and there is no `prior`, so no task committed after the last closed round is skipped by the next one.

Read every report and notes ordinal below (`KK`, the fix `NN`, each re-review `R`, each task's review `R`) off disk, never from memory: one `Glob` over `<workdir>/implementation/` at the start of the build and again on every resume, each next ordinal one past the highest already there for its own name shape - `checkpoint-KK.md`, `fix-NN-notes.md`, `<report basename>-reR.md`, `task-NN-review-R.md`. So a resumed build never overwrites a closed round's report and never hands the implementor a `fix-NN-notes.md` an earlier round already filled (the implementor appends to an existing notes file, and `commit-task.sh --notes` would then declare that stale round's `touched:` paths too).

## Step 2 - Run Implementation Loop

### Build task list

`TaskCreate` from the task index + one task for Final Review + one for Close Out. `status:` is `NN` (not `none`) -> mark tasks `01`..`NN` completed at creation and start the loop at the first task numbered above `NN`; `status: none` -> start at the first task.

### Loop

For each remaining task file (in order):
  1. `TaskUpdate` -> start
  2. Dispatch the implementor: `Agent` with `subagent_type: superdev:superbuild-task-implementor`, `model:` = this task's `<model>` column and `effort:` = its `<effort>` column (omit a parameter whose column is `-`), and a labeled-line prompt - `plan-header: <path>`, `task: <task-file path>`, `refs: <refs>`, `decisions: <workdir>/implementation/decisions.md` (only when that file exists), and `notes: <workdir>/implementation/task-NN-notes.md` on separate lines (paths from the decompose index). Await it.
       - `VERDICT: PASS` -> continue to review
       - `VERDICT: FAIL` + `REASON: <line>` -> escalate via `AskUserQuestion` naming the task `` `<title>` (Task NN) `` (retry / skip / abort); act on the answer (abort ends the loop)
       - `VERDICT: BLOCKED` + `REASON: <line>` -> run `### Implementor stop` with `<subject>` = `` `<title>` (Task NN) `` and `<notes>` = this dispatch's `notes:` path; its re-dispatch is this same step 2 call and its verdict is read here again
  3. Dispatch the reviewer: `Agent` with `subagent_type: superdev:superbuild-task-reviewer`, `model:` and `effort:` split out of this task's `<review>` column - its first token the model, its second the effort, and neither parameter at all when that column is `-` - and a labeled-line prompt - `plan-header: <path>`, `task: <task-file path>`, `notes: <workdir>/implementation/task-NN-notes.md`, `decisions: <workdir>/implementation/decisions.md` (only when that file exists - it is how the reviewer tells a `DECISION:` line the user already answered from one still open, the notes file keeping both), and `report: <workdir>/implementation/task-NN-review-R.md` on separate lines (R = review round for this task, starting `1`, +1 on each reviewer dispatch). Await it.
       - `VERDICT: PASS` -> continue to commit
       - `VERDICT: FAIL` + `REVIEW: <path>` -> dispatch `superbuild-task-implementor` again (`Agent`; a fix after a task review runs at that task's own `<model>` / `<effort>` columns, exactly as step 2 dispatched, and at neither parameter when a column is `-`) with `plan-header: <path>`, `plan: <plan-copy path>`, `refs: <refs>`, `task: <REVIEW path>`, `decisions: <workdir>/implementation/decisions.md` (only when that file exists), and `notes: <workdir>/implementation/task-NN-notes.md` on separate lines (`plan` lets it source the real `### Task Checks` lines). That fix returning `VERDICT: BLOCKED` + `REASON: <line>` -> run `### Implementor stop` with `<subject>` = `` `<title>` (Task NN) `` (this fix carries no fix ordinal of its own - it is the same task, writing that same notes file) and `<notes>` = that same `task-NN-notes.md`, and read the re-dispatched fix's verdict here in its place. Then dispatch the reviewer again the same way with the next `R`. Max 3 review rounds per task - a FAIL still standing after the third -> escalate via `AskUserQuestion` naming the task `` `<title>` (Task NN) `` (retry / accept / abort); act on the answer.
       - `VERDICT: FAIL` + `REASON: <line>` (no `REVIEW:` line) -> a missing reviewer input is an orchestration fault, not the implementor's: escalate via `AskUserQuestion` naming the task `` `<title>` (Task NN) `` (retry / abort) and never re-dispatch the implementor for it; `retry` re-dispatches the reviewer the same way with the same `R` (no report was written) and does not count as a review round.
  4. Commit the task: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "<task title>" <task-file> --notes <workdir>/implementation/task-NN-notes.md` - it records the task number in `status.md` and stages only the declared set (the task's `### Files`, the notes' `touched:` lines, the run dir).
       - `commit: <sha>` -> `head` := that SHA.
       - exit 2 with `undeclared: <path>` lines -> `AskUserQuestion` quoting those paths: **remove or stash them** (the user clears them, then re-run the same command), **include named ones** (re-run it with one `--path <path>` per path the user named), or **abort**. Never stage anything yourself.
       - `Nothing to commit.` or `Not a git repository - skipping commit.` -> `head` is unchanged.
  5. `TaskStop` -> completed
  6. This task's number `N` is a multiple of 5, `N` is smaller than `total`, and `head` moved in step 4 -> run `### Checkpoint` before starting the next task.

### Implementor stop

An implementor returning `VERDICT: BLOCKED` + `REASON: <line>` - from the loop above, from the fix after a task review, or from a `### Fix loop` dispatch - is a matter only the user can close, per `${CLAUDE_PLUGIN_ROOT}/references/review-contract.md` (`## Implementor stop`), which owns this protocol. `<subject>` is the dispatch it came back from, in the reference form of `## Mandatory rules`; `<notes>` is that dispatch's own `notes:` path. Nothing was committed, and the working tree stays exactly as the implementor left it - revert nothing, stage nothing, and never settle the matter yourself.

1. Read `<notes>` and take every `DECISION: <what> - <why> - <options>` line off it, skipping each one `<workdir>/implementation/decisions.md` already answers - a notes file appended to across re-dispatches keeps the earlier stop's lines, and those are closed. Not one `DECISION:` line there -> this is the **no report** state of `## Harness pre-check`, not a stop: take that rule (retry / abort) and re-dispatch nothing on it.
2. One `AskUserQuestion` per remaining line, in the order `<notes>` carries them, naming `<subject>` and carrying that line's `<what>`, its `<why>` and its `<options>`: **answer** (the user's own wording, taken verbatim) or **abort**. Abort ends the loop exactly as every other abort of this build does - the working tree is left as it stands and the task or fix stays unclosed.
3. Per answer run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/record-decision.sh" <workdir> "<ID>" "<subject>" "<the user's answer>"`, where `<ID>` is that line's `D<n>` per the review contract (`## Finding IDs`): the stop's first line takes the number after the highest `D<n>` already in `<workdir>/implementation/decisions.md`, `D1` when there is no such file or no such line in it, and the stop's further lines continue from there in the order `<notes>` carries them. A non-zero exit -> `AskUserQuestion` (retry the script / abort), and no re-dispatch until it succeeds.
4. Re-dispatch the dispatch that stopped - the same `subagent_type`, the same `model:` / `effort:`, the same labels - plus `decisions: <workdir>/implementation/decisions.md`. The re-dispatch is neither a review round nor a fix round: it consumes no round budget, moves no ordinal (the same `notes:` file, the same fix `NN`, the same reviewer `R`), and its verdict is read wherever the stopped dispatch's verdict is read. A second `VERDICT: BLOCKED` off it is a new matter and runs this whole subsection again.

### Checkpoint

Invoke `superbuild-reviewer-change` (Skill) with a labeled-line `args` block - `stage: checkpoint`, `since: <since>`, `prior: <prior>` (omit the line when there is none), `decisions: <workdir>/implementation/decisions.md` (only when that file exists), `plan: <plan-copy path>`, `spec: <spec path>`, `notes: <workdir>/implementation/`, and `report: <workdir>/implementation/checkpoint-KK.md` (KK = this checkpoint's ordinal, `01`, `02`, ...) on separate lines. Then run `### Fix loop` on what it returns.

### Fix loop

Shared by the checkpoint above (`stage: checkpoint`) and by each round of Step 3 (`stage: final`). `<report>` is the report of the review that just returned; the budget per review is one fix dispatch and one re-review, after which the user decides.

- `VERDICT: PASS` -> close the round: `since` := `head`, `prior` := `<report>`, then run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/checkpoint-update.sh" <workdir> <since> <prior>` so a resume finds both. Continue.
- `VERDICT: BLOCKED` + `REVIEW: <report>` -> no implementor runs. One `AskUserQuestion` per bullet under the report's `### Needs decision`, naming that bullet's finding `` `<title>` (<ID>) ``: **accept as changed** / **fix it** / **abort**. Per accepted bullet run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/record-decision.sh" <workdir> "<ID>" "<criterion or task>" "<what the user accepted>"` - its `<criterion or task>` argument in the reference form too, `` `<title>` (criterion N) `` or `` `<title>` (Task N) ``, read off the same bullet - then re-run the same reviewer call with the same `report:` and `decisions: <workdir>/implementation/decisions.md` added - that re-run is not a round. **fix it** on any bullet -> take the FAIL branch instead.
- `VERDICT: FAIL` + `REVIEW: <report>`:
    1. Dispatch `superbuild-task-implementor` (`Agent`) at the highest `<model>` and the highest `<effort>` among the tasks whose `### Files` names a file some finding in `<report>` points at - the two picked independently, `opus` over `sonnet` and `xhigh` over `high` over `medium` over `low`: read the findings' `file:line` paths off `<report>`, then those tasks' `### Files` off the task files the index lists. No task matches -> pass neither parameter. Labels: `refs: <refs>`, `plan-header: <path>`, `plan: <plan-copy path>`, `spec: <spec path>`, `task: <report>`, `decisions: <workdir>/implementation/decisions.md` (only when that file exists), and `notes: <workdir>/implementation/fix-NN-notes.md` on separate lines (NN = the fix ordinal across the whole build, `01` upward). Await it.
       - `VERDICT: FAIL` + `REASON:` -> escalate via `AskUserQuestion` (retry / accept / abort); act on the answer.
       - `VERDICT: BLOCKED` + `REASON: <line>` -> run `### Implementor stop` with `<subject>` = `` `<fix title>` (fix NN) `` and `<notes>` = this dispatch's `fix-NN-notes.md`; its re-dispatch keeps this same fix `NN`, its verdict is read here again, and the round's one-fix budget is untouched by it.
    2. `VERDICT: PASS` -> keep the current `head` as `fix_since`, then commit the fix: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "<fix title>" --notes <workdir>/implementation/fix-NN-notes.md` (exit 2 handled exactly as in the loop above), and `head` := the SHA of its `commit:` line.
    3. Re-review: the same reviewer with the same labels, except `stage: re-review`, `since: <fix_since>`, `prior: <report>`, and `report: <report basename>-reR.md` (R = this report's re-review ordinal, `1` first).
       - `PASS` -> close the round: `since` := `head`, `prior` := the re-review report, run `checkpoint-update.sh` as above. Continue.
       - `FAIL` or `BLOCKED` -> `AskUserQuestion` listing each still-open finding as `` `<title>` (<ID>) ``: **another round** (repeat from 1 with the next fix `NN` and the next re-review `R`, then ask this same question again - after every further round, every time), **accept with open findings** (record each still-open Critical and Important the same way the BLOCKED branch does - one `record-decision.sh` run per ID, so every later round reads it as plan text instead of re-opening what the user closed - then close the round: `since` := `head`, `prior` := the last report, run `checkpoint-update.sh`, continue), or **abort**.

## Step 3 - Final Review

1. `TaskUpdate` -> start
2. Invoke both reviewers before any fix dispatch - the spec dimension first, then the code dimension:
    - `superbuild-reviewer-spec` (Skill) with `stage: final`, `since: <since>`, `decisions: <workdir>/implementation/decisions.md` (only when that file exists), `plan: <plan-copy path>`, `spec: <spec path>`, `notes: <workdir>/implementation/`, and `report: <workdir>/implementation/review-01-spec.md` on separate lines; no `prior:` line - this dimension has no earlier report.
    - `superbuild-reviewer-change` (Skill) with `stage: final`, `since: <since>`, `prior: <prior>` (omit the line when there is none), the same `decisions:`, `plan:`, `spec:` and `notes:` lines, and `report: <workdir>/implementation/review-01-code.md`.
3. Run `### Fix loop` on the two verdicts, with three adjustments for the two dimensions:
    - a BLOCKED report takes the BLOCKED branch for that report first; its re-run is that reviewer's same `stage: final` call with `decisions:` set, and both verdicts are read again afterwards.
    - one single implementor dispatch carries every failed report: `task: <code report>` plus `more: <spec report>` when both failed, `task: <spec report>` alone when only the spec failed.
    - after its one fix commit, every reviewer that raised a Critical or an Important runs its own re-review - `stage: re-review`, `since: <fix_since>`, `prior: <its own report>`, `report: <its own report basename>-reR.md`.
   Continue once the round closes - both dimensions `PASS`, or the user accepting open findings.
4. Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "chore(superbuild): final review reports" --path <workdir>` - saves the review reports (also on an accepted FAIL); its exit 2 is handled as in Step 2.
5. `TaskStop` -> completed

## Step 4 - Close Out

1. `TaskUpdate` -> start
2. Wave 1 - gated by Config; dispatch only the enabled ones with the `Agent` tool - all of them as multiple tool uses in ONE single message so they run concurrently - and await all before moving on.
    - `memory: true` -> `subagent_type: superdev:memory-writer`, labeled-line prompt: `capture: <plan-copy path>`, `notes: <workdir>/implementation/`, `refs: <refs>`, `spec: <spec path>`.
    - `rules: true`  -> `subagent_type: superdev:rules-writer`, labeled-line prompt: `capture: <plan-copy path>`, `notes: <workdir>/implementation/`, `refs: <refs>`.
    - any of `qa`, `e2e-ui`, `e2e-api` reading `true` -> `subagent_type: superdev:qa-writer`, labeled-line prompt: `capture: <plan-copy path>`, `workdir: <workdir>`, `notes: <workdir>/implementation/`, `reports: <workdir>/implementation/`, `refs: <refs>`, `qa: <value>`, `e2e-ui: <value>`, `e2e-api: <value>` copied verbatim from the Config block, `spec: <spec path>`, plus `intent: <intent path>` only when the decompose index printed an `intent:` line.
3. Wave 2 - `changelog: true` -> after wave 1 completes, first collect the ADRs this build wrote: the index's `base:` is a SHA -> run `git diff --name-only --diff-filter=A <base>..HEAD -- <root>/docs/adr/` with the Bash tool - the pathspec joined with the index's `root:` because you never `cd` and the session may have started in a subdirectory, and `--diff-filter=A` so an older ADR this build only marked superseded stays off the list. Each path it prints is repository-root-relative like every other path of the index, so join it with `root:` and carry it as one `adr: <root>/<printed path>` line, in the printed order; nothing printed -> no `adr:` line. The index's `base:` is `none` -> run no `git diff` and pass no `adr:` line. The command exits non-zero -> pass no `adr:` line and note the failure in the Step 5 summary.
   Then dispatch `subagent_type: superdev:changelog-writer`, labeled-line prompt: `capture: <plan-copy path>`, `workdir: <workdir>`, `notes: <workdir>/implementation/`, `refs: <refs>`, `spec: <spec path>`, plus `intent: <intent path>` only when the decompose index printed an `intent:` line, and the `adr:` lines collected above (repeatable, one per ADR).
   Nothing enabled in either wave -> skip to the commit.
4. Keep each delegation's `NODE:` / `RULE:` / `CHANGELOG:` / `INDEX:` / `GAP:` / `QA:` / `E2E:` / `QA-INDEX:` lines verbatim for the Step 5 summary. Any delegation failing is non-fatal -> note it there too, do not block.
5. Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "chore(superbuild): close out memory, rules, changelog and qa" --path <workdir>` with one further `--path <path>` per path the writers relayed on their `NODE:` / `RULE:` / `CHANGELOG:` / `INDEX:` / `QA:` / `E2E:` / `QA-INDEX:` lines (a line reading `none` or `skipped - <reason>` declares nothing) - that is the whole declared set of this commit; its exit 2 is handled as in Step 2.
6. `TaskStop` -> completed

## Step 5 - Done

1. `stats: true` -> run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/stats-report.sh" <workdir>` - before the cleanup below, which takes the run dir the report reads. Keep its `stats:` line for the summary; a non-zero exit is noted there instead.
2. `cleanup: true` -> run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/cleanup-run.sh" <workdir> superbuild` - here alone `<workdir>` is the index's `workdir:` value verbatim, repository-relative and never joined with `root:`, because the script's safety gate rejects every path outside `docs/.workflows/`, an absolute one included, and silently skips it as not a run dir. Keep its `CLEANUP:` line; the script verifies completion itself - never re-check, never retry.
3. Cleanup the task list and display short summary of work. Max ~3-5 sentences plus the relayed lines. Include:
    - Step 4's `NODE:` / `RULE:` / `CHANGELOG:` / `INDEX:` lines verbatim (or the noted failure / disabled), plus the noted `git diff` failure when Step 4 hit one
    - the `QA:` / `E2E:` / `QA-INDEX:` lines verbatim, a `skipped - <reason>` line included, or "disabled" when `qa`, `e2e-ui` and `e2e-api` are all off
    - the `stats:` line verbatim (or "disabled" when `stats` is off), plus every stats call noted as failing
    - the `CLEANUP:` line verbatim (or "disabled" when `cleanup` is off)
    - every `GAP:` line verbatim, each followed by `-> run superdev-memory`
