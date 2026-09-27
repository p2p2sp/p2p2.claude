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
