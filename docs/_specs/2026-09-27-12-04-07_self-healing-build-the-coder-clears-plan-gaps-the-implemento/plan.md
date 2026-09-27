---
source: /Users/dario/Projects/p2p2.claude/docs/_specs/2026-09-27-12-04-07_self-healing-build-the-coder-clears-plan-gaps-the-implemento/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Self-healing build: the coder clears plan gaps, the implementor decides before asking

## Goal

A viber build stops asking the owner about a stalled task until it has tried to heal itself: the planner maps more of what a claim of absence depends on, the coder may clear a file the map missed, and the implementor takes a recorded repair decision of its own before the third attempt. Every re-run starts a fresh agent instead of continuing the failed one.

## Problem

In run 3b-2 (T1) a file outside the task's `Files` held a chain that broke a done clause. The coder could not touch it, the implementor retried twice with nothing new to offer, and each `SendMessage` continuation of the failed coder changed nothing. The owner was asked late, with options that could not unblock the task, and the build stalled on a gap the planner should have mapped or the coder could have closed.

## Current behaviour

The planner reads the codebase for what the change forces, but not for the chain that would break a claim that something is absent (an import graph, a bundle's contents). The coder may leave its `Files` only in three narrow cases. The first coder failure is retried one tier up, the second asks the owner. Review and the closing test run ask the owner after the second failed round. A re-run on the same model continues the last coder instance through `SendMessage`, up to two continuations.

### Must not change

- A coder or reviewer `VERDICT: DENIED` still goes straight to the owner, with the answers it offers today.
- Tier profiling and clamping into `tiers.min`..`tiers.max` work as today.
- `task-reviewer` and `planner-review` gate and return exactly as today.
- The one-time `SendMessage` nudges, for background work left running and for a reply with no `VERDICT:` line, work as today.

## Behaviour

### S1 - The planner maps the chain behind a claim of absence [CHANGED - was: only what the change forces]

A criterion says a bundle never contains a library. The planner traces today's import chain that reaches it and puts every file of that chain into the file map, or words the criterion relative to what the change adds.

Given a criterion claiming a library is absent from a bundle that already reaches it through two service files
When the planner maps the files
Then both service files are in some task's `Files`, or the criterion no longer claims absolute absence

### S2 - The coder clears a file the map missed [CHANGED - was: only three narrow exceptions]

Given a task whose done clause is blocked by a file outside its map that no other task lists and no boundary protects
When the coder works the task
Then the task is committed with the smallest change to that file included, after a review of it

### S3 - The coder waits for a file another coder is changing [NEW]

Given a file outside the coder's map that another coder in flight is changing
When the coder needs to change it
Then the task pauses and starts again with a new coder once the tasks in flight have finished, and the owner sees no failed attempt for it

### S4 - The implementor takes a repair decision of its own [NEW]

Given a coder failing a task for the second time with decision options, the recommended one outside every protected area
When the implementor handles the failure
Then it records that option as an automatic decision, dispatches a fresh coder carrying it, and asks the owner only if that third attempt fails too

### S5 - Every option needs the owner [NEW]

Given a coder failure whose every decision option touches a protected area
When the implementor handles it
Then it asks the owner at once, the options quoted as ways to answer, whatever the attempt count

### S6 - Review and the closing test run get a third round [CHANGED - was: owner asked after round 2]

Given a task rejected by its reviewer twice, or a closing test run red twice
When the next failure is due
Then a fresh coder or repair coder fixes it twice, and the owner is asked only after the third failed round

### Edge cases

- A coder waits for a file while no other task is in flight -> counted as an ordinary failed attempt, since nobody will release the file; so is a second wait on the same file, left changed by a skipped or failed task.
- A second coder failure offering no options -> retried once more on a stronger model; the third failure asks the owner.
- The recommended option needs the owner but a later one does not -> the build takes the first option that does not.
- The owner's own ruling -> the attempt and round counts start over, as today; an automatic decision starts nothing over.
- A file the coder's own earlier attempt changed -> the next coder on that task keeps working on it rather than waiting for it.

## Glossary

- Protected area - a `Contracts` block, a file another task of the plan lists (except a `prior` task's), anything under `Out of scope` or `## Must not change`; only the owner rules there.
- Automatic decision - a repair decision the implementor records itself, in the owner's decision channel, marked as not the owner's.
- Fresh instance - a new coder that starts from the tree and the task file, never picking up an earlier coder's conversation.

## Acceptance criteria

1. The planner, in step 1, traces the chain that would break every claim of absence among the criteria (an import graph, a bundle's contents) and puts each link into the file map or out of the claim; the `Owned` rule of `plan-rules.md` gains one clause saying the same, with no new rule and no new `planner-review` check.
2. The coder changes a file outside `Files` that stands between its work and a `DoD` clause, when the change is the smallest one, follows the codebase's conventions and touches no protected area; it reports every such path on `EXTRA:`.
3. The coder touches a file outside its `Files` only while it carries no uncommitted change the coder did not make; otherwise it returns the wait line of C1, and the implementor dispatches a fresh instance once the tasks in flight have returned, not counting it as an attempt.
4. A coder failure it cannot clear on its own carries the decision options line of C2, the recommended one first, each option touching a protected area marked for the owner.
5. The first coder failure is retried one tier up; the second, when it offers an unmarked option, gets the implementor's automatic decision (C3) recorded in the owner's decision channel and a fresh instance; the third asks the owner; options all marked ask at once; automatic decisions reach the final summary and `closeout` marks the drift they cause.
6. Review and the closing test run allow three rounds: rounds 1 and 2 go back to a fresh coder or repair coder, round 3 asks the owner.
7. No coder re-run continues an earlier instance through `SendMessage`, and the continuation cap is gone; the nudges for background work and for a missing `VERDICT:` line stay.

## Scope

### File map

- modify - viber/skills/planner/SKILL.md - step 1 traces the chain behind every claim of absence
- modify - viber/references/plan-rules.md - the `Owned` rule's clause on claims of absence
- modify - viber/agents/task-coder.md - leaving `Files`, the `WAIT:` and `DECIDE:` output lines, no continuation
- modify - viber/skills/implementor/SKILL.md - fresh re-runs only, the `WAIT:` hold, the attempt ladder with automatic decisions, three rounds

### Out of scope

- `task-reviewer`'s role, checks and output.
- `planner-review`: no new check.
- The `e2e` skill and its writer.
- `VERDICT: DENIED` handling.
- Tier profiling and the tier ladder itself.
- `commit-task.sh`, `plan-index.sh` and `closeout`: `--decide` already stores any one-line text and `closeout` already marks drift from every `decision:` line.
- A new `Baseline` rule in `plan-rules.md`, and any wording that makes `Files` optional for the planner.

## Constraints

- Every edited file follows `supercc:skill-designer`: imperative, no history or rationale, an existing sentence extended where it already covers the rule.
- Instructions grow only as far as the change needs: every token is read at each dispatch.
- No script changes, so Windows (Git Bash) and macOS behaviour is untouched.
- `viber/CLAUDE.md` and its section `CLAUDE.owner-decisions.md` are left to the build's memory close (the `memory` switch is on), never to a task.

## Tasks

<!-- TASK -->
### T1 - Trace the chain behind every claim of absence when mapping files
- TDD: none
- Covers: #1
- Uses: none
- Depends-on: none
- Files: viber/skills/planner/SKILL.md, viber/references/plan-rules.md
- Delivers: step 1's bullet on what the change FORCES extended in place: for every criterion claiming something is absent (an import graph, a bundle's contents, a call never made), the planner traces the chain that would break it through today's tree and puts each link into the file map or out of the claim. The `Owned` rule of `plan-rules.md` extended in place with one clause stating the same for a claim of absence. No new bullet, no new rule, `planner-review.md` untouched.
- Verification: `grep -n "^- Read the codebase for what the change FORCES.*claim of absence" viber/skills/planner/SKILL.md && grep -n "^- Owned:.*claim of absence" viber/references/plan-rules.md && test "$(grep -c '^- ' viber/references/plan-rules.md)" = 36 && git diff --quiet -- viber/agents/planner-review.md` -> both greps print one line each, the bullet count of `plan-rules.md` is unchanged at 36 and `planner-review.md` has no diff
- DoD: the planner's step 1 `FORCES` bullet carries the chain tracing inside its existing sentence; the `Owned` rule carries the same requirement inside its existing text; `plan-rules.md` keeps its 36 bullets; `planner-review.md` is unchanged
<!-- /TASK -->

<!-- TASK -->
### T2 - Re-run a failed coder as a fresh instance only
- TDD: none
- Covers: #7
- Uses: none
- Depends-on: none
- Files: viber/skills/implementor/SKILL.md, viber/agents/task-coder.md
- Delivers: the implementor's paragraph continuing a coder instance through `SendMessage`, and its continuation cap, removed: every coder re-run (review failure, `retry`, `decide`) is a fresh dispatch carrying every labelled line plus its `reason:`, `report:` or `decision:` line. The two one-time nudges keep their `SendMessage` and drop their mention of the cap. The reviewer's `extra:` definition no longer mentions continuations. `task-coder.md` drops its continuation sentence.
- Verification: `! grep -n -i "continuation\|continues that instance" viber/skills/implementor/SKILL.md viber/agents/task-coder.md && test "$(grep -c "SendMessage" viber/skills/implementor/SKILL.md)" = 3 && test "$(wc -l < viber/skills/implementor/SKILL.md)" -lt 205` -> the first grep prints nothing and the command exits 0
- DoD: no coder re-run in the implementor continues an earlier instance; every re-run is a fresh dispatch with every labelled line; the background-work and missing-verdict nudges still `SendMessage` once; `task-coder.md` holds no continuation input; `implementor/SKILL.md` ends shorter than its current 205 lines
<!-- /TASK -->

<!-- TASK -->
### T3 - Let the coder clear a file the map missed, or wait for it
- TDD: none
- Covers: #2, #3
- Uses: C1
- Depends-on: T2
- Files: viber/agents/task-coder.md, viber/skills/implementor/SKILL.md
- Delivers: `task-coder.md`'s "Three exceptions" bullet replaced by one general rule: a file outside `Files` standing between the work and a `DoD` clause is the coder's to change, provided the change is the smallest one, follows the codebase's conventions and touches no protected area (a `Contracts` block, a file listed by another task file in the same `tasks` directory other than a `prior` task's, anything under `Out of scope` or `## Must not change`); every such path goes on `EXTRA:`. Before its first edit of such a file the coder checks it with `git status`; carrying changes not on its `resume:` line, it edits nothing more and returns `VERDICT: FAIL` with the C1 line; the Output section lists that line. Under Prove it green, the sentence dismissing a red traced to a file outside `Files`, `EXTRA:` and the `prior` files narrows to a red traced to a protected file or to one another coder is changing, and the "never touch another task's files" sentence agrees with the new rule. The implementor: every fresh coder re-run carries on `resume:` each `EXTRA:` path the task's earlier instances returned; a coder `FAIL` carrying `WAIT:` is held and dispatched fresh at the same tier once every task in flight at that return has returned, counting as no attempt and asking nothing, or treated as an ordinary failure when nothing else was in flight or the task already waited once on the same path.
- Verification: `grep -n "WAIT:" viber/agents/task-coder.md && grep -n "WAIT:" viber/skills/implementor/SKILL.md && ! grep -q "Three exceptions" viber/agents/task-coder.md && ! grep -q "the .prior. tasks' files is not yours to fix" viber/agents/task-coder.md && test "$(wc -l < viber/agents/task-coder.md)" -le 59` -> both greps print at least one line and the command exits 0
- DoD: the coder may change a file outside `Files` that blocks a `DoD` clause under the stated limits and reports it on `EXTRA:`; a red traced to an unmapped, unprotected file is the coder's to clear, while a red traced to a protected file or one another coder is changing is not; a file another task lists, other than a `prior` task's, stays untouched; a dirty file not on `resume:` ends the task with the C1 line; a fresh re-run's `resume:` carries the task's earlier `EXTRA:` paths; a `WAIT:` return is re-dispatched after the in-flight tasks return without counting an attempt; a `WAIT:` with nothing else in flight, or a second one on the same path for the same task, is an ordinary failure; `task-coder.md` ends at most 59 lines long
<!-- /TASK -->

<!-- TASK -->
### T4 - Take a repair decision before asking the owner about a failing coder
- TDD: none
- Covers: #4, #5
- Uses: C2, C3
- Depends-on: T3
- Files: viber/agents/task-coder.md, viber/skills/implementor/SKILL.md
- Delivers: `task-coder.md`: a `DoD` clause the coder cannot meet within its limits ends the task on `VERDICT: FAIL` with the clause number in `REASON` and the C2 line; the Output section lists that line. The implementor's step 4: the first coder failure is retried one tier up; the second, when its `DECIDE:` line holds an option without the owner marker, rewrites that first such option exactly as a `decide` answer is rewritten (one line, every double quote, dollar sign, backtick or backslash into words), records it through `commit-task.sh --decide` as the C3 text and dispatches a fresh coder at the same tier with its `decision:` lines; the second with no usable `DECIDE:` line is retried one tier up again; the third asks the owner (retry / decide / skip / abort); a `DECIDE:` line whose every option carries the owner marker asks at once, whatever the count, quoting the options as ways to answer through `decide`. An automatic decision restarts no counter; the owner's `decide` restarts the coder's attempt count. The final summary names every automatic decision. `task-coder.md`'s `decision:` input sentence covers a C3 ruling too: the build's own, binding exactly like the owner's.
- Verification: `grep -n "DECIDE:" viber/agents/task-coder.md && grep -n "DECIDE:" viber/skills/implementor/SKILL.md && grep -n "auto:" viber/skills/implementor/SKILL.md && grep -n "auto:" viber/agents/task-coder.md && test "$(wc -l < viber/agents/task-coder.md)" -le 61` -> every grep prints at least one line and the command exits 0
- DoD: the coder returns the C2 line on a clause it cannot meet, recommended option first, protected options marked; the second coder failure with an unmarked option records the C3 decision and re-dispatches fresh; the chosen option is rewritten like a `decide` answer before it reaches `--decide`; the second failure with no usable option is retried one tier up; the third coder failure asks the owner; an all-marked `DECIDE:` line asks at once; an automatic decision restarts no counter while the owner's `decide` restarts the attempt count; the final summary names every automatic decision; the coder's `decision:` input reads an `auto:` ruling as the build's own, binding like the owner's; `task-coder.md` ends at most 61 lines long
<!-- /TASK -->

<!-- TASK -->
### T5 - Give review and the closing test run three rounds
- TDD: none
- Covers: #6
- Uses: none
- Depends-on: T4
- Files: viber/skills/implementor/SKILL.md
- Delivers: review: a reviewer `FAIL` at round 1 or 2 of 3 goes back to a fresh coder with the report, round 3 asks the owner (retry / decide / accept / abort). Closing test run: a test-runner `FAIL` at round 1 or 2 of 3 goes to the repair coder, round 3 asks (retry / accept / abort). The `retry` answer's continued counter and the `decide` answer's restarted review count use rounds out of 3.
- Verification: `! grep -q "of 2" viber/skills/implementor/SKILL.md && test "$(grep -c "of 3" viber/skills/implementor/SKILL.md)" -ge 4` -> the command exits 0
- DoD: a second failed review round goes back to a fresh coder; the third failed review round asks the owner; a second red closing test run goes to the repair coder; the third red closing test run asks the owner; the `retry` and `decide` answers count rounds out of 3
<!-- /TASK -->

## Contracts

### C1 - Coder wait line

File: viber/agents/task-coder.md

On `VERDICT: FAIL` only, one line: `WAIT: <repo-relative path>, <repo-relative path>` - the files outside `Files` the coder needs that carry uncommitted changes it did not make.

### C2 - Coder decision options line

File: viber/agents/task-coder.md

On `VERDICT: FAIL` only, one line: `DECIDE: <option> | <option> [| <option>]` - each option one short clause that would unblock the task, the recommended one first; an option touching a protected area starts with `owner: `.

### C3 - Automatic decision text

File: viber/skills/implementor/SKILL.md

The `<text>` argument of `commit-task.sh --decide "<plan>" "<id>" "<text>"` for a decision the implementor takes itself: `auto: <the chosen option, owner marker absent, rewritten like a decide answer: one line, no double quote, dollar sign, backtick or backslash>`, stored in `status.md` as `decision: <id>: auto: <option>`.
