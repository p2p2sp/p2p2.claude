---
source: /Users/dario/Projects/p2p2.claude/docs/_specs/2026-09-26-01-16-40_align-planning-coding-and-review-instructions-and-add-an-own/plan.md
---

# Align planning, coding and review instructions and add an owner decision channel

Build: skill `implementor`

## Goal

Remove the contradictions between the planner rules, the plan reviewer, the task coder, the task reviewer and the test-driven development skill that caused needless review rounds in the phase 2 build, and give the owner a way to settle a stalled task that reaches both the coder and the reviewer, survives a resumed session and ends up in the archived specification.

## Problem

In the phase 2 build a task whose done clause disagreed with a contract block could not pass: the coder was told the clause wins, the reviewer was told the contract is never widened, so either choice was blocked. The owner's ruling could only land in the coder's notes, which the reviewer treats as a claim to disprove, so the loop ended only when the gate was waived. A consumer task was planned without depending on the task writing its contract and failed its verification three times. The coder was free to defer a proof or pick its own behaviours while the reviewer demanded a failing test per done clause, and the plan rules never required a done clause to be provable inside its own task. Every one of these costs a review round and ends in an unreviewed commit.

## Current behaviour

The coder resolves a clause-versus-contract disagreement in favour of the clause; the reviewer blocks the widened contract and any note describing the conflict. The plan script checks that every contract block is used and held, but not that a consumer depends on its writer. The plan rules flag a test-driven task only when its verification needs a database, never when a done clause does. The coder may defer a proof on any task, chooses its own behaviours, and counts clauses as met without a test mapping; the reviewer gates each clause by its failing test. The build orchestrator offers retry, skip, accept and abort on a stalled task and nothing that carries a ruling. The run state records done, skipped, unreviewed, deferred and closed entries only.

### Must not change

- A plan that landed before this change still validates and decomposes under `--split`.
- A run state file with no owner decision reads and prints exactly as before.
- Every existing form of `commit-task.sh` keeps its arguments, output lines and exit codes.
- The build orchestrator opens no file and writes no file.
- The first coder failure on a task is still retried without asking.

## Behaviour

### S1 - A contract conflict stops the coder [CHANGED - was: the clause won and the reviewer blocked the widened contract]

A coder meeting a done clause that its task's contract blocks contradict stops and reports which clause, instead of choosing a side.

Given a task whose done clause names a result its contract block does not allow
When the coder works on it
Then the coder returns a failure naming that clause, and no widened contract reaches review

### S2 - A consumer planned without its writer is refused [NEW]

The planner learns at validation time that a task uses a contract written by an earlier task it does not depend on.

Given a plan where a later task uses a contract block that an earlier task writes, with no dependency path between them
When the planner validates the plan
Then validation fails naming both tasks, while a landed plan resumed under the decomposition still passes

### S3 - A plan defect is caught at plan review [CHANGED - was: caught by the task reviewer after the build]

The plan reviewer rejects a test-driven task whose done clause can only be proven against a database or another external dependency, whose done clause disagrees with its contracts, or which reads a file, route or symbol another task creates without depending on that task.

Given a test-driven task whose done clause needs a database, contradicts a block it uses, or whose verification reads a file another task creates with no dependency on it
When the plan reviewer gates the plan
Then the plan fails review with that finding

### S4 - The coder proves every done clause [CHANGED - was: the coder picked its own behaviours and could defer any proof]

A coder on a test-driven task treats each numbered done clause as a behaviour with its own failing test, and reports a clause as met only with such a test.

Given a test-driven task with three done clauses
When the coder finishes
Then each clause has a test that fails without it, and deferring a proof to a later task is refused as unfinished work

### S5 - The owner settles a stalled task [NEW]

After a task fails twice, the owner types a ruling instead of choosing retry, skip, accept or abort; the build records it and hands it to the coder and reviewer of that task and of every task depending on it.

Given a task whose coder failed twice, or whose review failed twice
When the owner answers the question with a ruling
Then the ruling is recorded in the run state, the coder runs again with it, and the reviewer gates against it instead of against the conflicting task text

### S6 - A resumed build keeps the ruling [NEW]

Given a build stopped after an owner ruling
When a new session resumes it
Then the index shows the ruling and every later dispatch of that task and its dependents carries it

### S7 - The archive tells the ruling [NEW]

Given a finished build carrying an owner ruling that makes a sentence of the specification false
When the build closes
Then the archived specification marks that sentence as a deviation naming what the build does

### Edge cases

- A ruling on a task already committed or skipped -> refused, nothing recorded.
- A coder failing again after a ruling -> retried once without asking, then the owner is asked again.
- A ruling that is empty or spans several lines -> refused, nothing recorded.
- The same ruling recorded twice for one task -> kept once.
- A ruling holding a double quote, a dollar sign, a backtick or a backslash -> the orchestrator rewrites those characters into words before recording it.
- A ruling that changes nothing the specification states -> no deviation marker.
- A contract block declared in no file, or written by a later task -> the writer-dependency check raises nothing; the plan reviewer judges it.

## Glossary

- Owner decision - a ruling the person running the build types when a task stalled; it overrides the task text for that task and its dependents. It is not a plan change: the plan stays frozen.
- Done clause - one numbered condition of a task's definition of done, gated alone by the reviewer.
- Contract writer - the task holding a contract block's declaring file and naming the block; every other task naming it only consumes it.

## Acceptance criteria

1. A coder whose done clause disagrees with a contract block its task uses ends on failure naming the clause number, and no instruction tells it the clause wins.
2. The plan rules carry a review rule that a task's done clauses, deliverable and covered criteria agree with every contract block it uses.
3. Plan validation outside the decomposition rejects a task that uses a contract block written by a lower-numbered task not among its dependencies, naming both tasks; the decomposition of a landed plan still passes.
4. The plan rules require, on a test-driven task, every done clause provable by a unit test inside the task's own files with its test file listed, flag a done clause needing a database or another external dependency, and name the test files among what a task's file map holds.
5. The coder treats a test-driven task's numbered done clauses as its behaviours, counts a clause as met only with a test that fails without it, re-reads every test it wrote or changed against the blocking test rules before passing, and may add the test file its done clauses need when the file map lacks it, reporting it as extra.
6. The coder defers a proof to a later task only on a task that is not test-driven.
7. The plan rules and the plan reviewer check, per task, that every file, route or symbol its verification, deliverable or done clauses read and another task creates has that task among its dependencies, directly or through another.
8. The commit script records an owner decision for one task in the run state without committing, refusing an unknown task, a committed or skipped task and an empty or multi-line text.
9. After the second coder failure and after the second failed review round, the orchestrator offers an owner decision, records it through the commit script and dispatches the coder again.
10. The index prints every recorded owner decision, and the orchestrator passes each one to the coder and reviewer of its task and of every task depending on it, directly or through another; the coder and the reviewer let it override the task file.
11. The closing agent reads the recorded owner decisions and marks each one that makes a sentence of the specification false as a deviation.
12. A plan landed before this change and a run state with no owner decision validate, decompose and print as before.

## Scope

### File map

- modify - viber/scripts/plan-index.sh - writer-dependency validation; printing owner decisions from the run state
- modify - tests/viber/plan-index.test.ts - cases for both
- modify - viber/scripts/commit-task.sh - the owner decision recording form
- modify - tests/viber/commit-task.test.ts - cases for it
- modify - viber/references/plan-rules.md - the writer-dependency, agreement, provability, layering and ownership rules
- modify - viber/agents/planner-review.md - the per-task producer dependency check
- modify - viber/agents/task-coder.md - conflict stop, done clause proof, self-check, deferral limit, test file exception, owner decision input
- modify - viber/skills/tdd/SKILL.md - behaviours are the done clauses
- modify - viber/agents/task-reviewer.md - owner decision input overriding the task file
- modify - viber/skills/implementor/SKILL.md - the owner decision answer, recording and dispatch
- modify - viber/agents/closeout.md - owner decisions as a deviation source

### Out of scope

- Raising the plan reviewer's effort.
- Removing the deferral mechanism from the scripts.
- Parallel coders breaking each other's compilation in the shared tree.
- A grep, script or hook checking test style.
- Writing to task files or to the landed plan during a build.
- A done-clause-to-test map in the coder's notes.
- Naming individual tests in a task's verification.
- The project memory nodes (`CLAUDE.md`), which the build's close owns.

## Constraints

- A landed plan is frozen: every new validation is exempt under the decomposition, and a run state predating owner decisions must still parse.
- Every script change runs under Git Bash on Windows and under macOS bash 3.2.
- Every script change carries its regression tests under `tests/viber/`.
- Instruction files do not grow beyond the rule they change: each edit replaces or extends an existing sentence where one exists.
- The orchestrator still opens and writes no file; everything it records goes through a bundled script.

## Tasks

<!-- TASK -->
### T1 - Reject a contract consumer that does not depend on its writer
- TDD: required
- Covers: #3, #12
- Uses: none
- Depends-on: none
- Files: viber/scripts/plan-index.sh, tests/viber/plan-index.test.ts, viber/references/plan-rules.md
- Delivers: plan validation outside the decomposition that fails when a task names a contract block in its Uses while a lower-numbered task holding that block's File path and naming it in its own Uses is not among its dependencies, direct or transitive; the matching rule in the plan rules, tagged as script-enforced
- Verification: node --test tests/viber/plan-index.test.ts -> every test passes
- DoD: plan-index.sh without --split exits 4 and names the consumer and the writer when the consumer lacks a dependency path to a lower-numbered writer; the same plan under --split exits 0 and decomposes; a consumer reaching the writer through another task validates; a block on File: none, or whose only writer is higher-numbered than the consumer, raises nothing from this rule; plan-index.sh's header lists the new exit 4 cause and its --split exemption; plan-rules.md carries the rule tagged (script); every existing plan-index test passes, a fixture changed only by adding the missing dependency
<!-- /TASK -->

<!-- TASK -->
### T2 - Hold plans to provable and contract-consistent done clauses
- TDD: none
- Covers: #2, #4, #7
- Uses: none
- Depends-on: T1
- Files: viber/references/plan-rules.md, viber/agents/planner-review.md
- Delivers: plan rules that require a task's done clauses, deliverable and covered criteria to agree with the contract blocks it uses, require every done clause of a test-driven task to be provable by a unit test inside its own files with the test file listed, extend the layering rule from verification to done clauses, name test files in the ownership rule and extend the ordering rule to every file, route and symbol a task reads; a plan reviewer step that walks each task through that ordering rule explicitly instead of leaving it among the rules gated in bulk
- Verification: grep -n "variant names, error codes" viber/references/plan-rules.md && grep -n "route or symbol" viber/references/plan-rules.md viber/agents/planner-review.md && grep -n "unit test inside" viber/references/plan-rules.md -> each grep prints a line, the second one line in each of the two files
- DoD: plan-rules.md carries a Consistent rule tagged (review) covering done clauses, Delivers and Covers against the blocks named in Uses - variant names, error codes, sets of states; the Layered rule names a done clause needing a database, queue, broker or network as a finding alongside Verification; the Provable rule requires on TDD: required every done clause provable by a unit test inside the task Files, that test file among them; the Owned rule names the test files proving the done clauses; the Ordered rule states that every file, route or symbol a task Verification, Delivers or done clause reads that another task creates or changes needs that task among its Depends-on, directly or through another; planner-review.md Check carries one Fed in order bullet that walks each task through the Ordered rule, naming each file, route or symbol it reads and its producing task, without restating the rule; neither file grows by more than the sentences these clauses name
<!-- /TASK -->

<!-- TASK -->
### T3 - Record an owner decision in the run state
- TDD: required
- Covers: #8, #10, #12
- Uses: C1, C2
- Depends-on: T1
- Files: viber/scripts/commit-task.sh, tests/viber/commit-task.test.ts, viber/scripts/plan-index.sh, tests/viber/plan-index.test.ts
- Delivers: the commit script form that records one owner decision for one task in status.md without committing, and the index lines that print every recorded decision
- Verification: node --test tests/viber/commit-task.test.ts tests/viber/plan-index.test.ts -> every test passes
- DoD: --decide appends one decision line to status.md, prints its two output lines and creates no commit; that line rides in the next task commit; an unknown task id exits 3, a task on the done or the skipped list exits 2, an empty or multi-line text exits 2, and each refusal leaves status.md byte-for-byte unchanged; the same task id and text recorded twice leaves one line; a text holding a colon is stored and printed intact; a status.md with no decision line validates and prints exactly as before; plan-index.sh prints every decision line in status.md order between the closed line and the tasks line; both scripts' headers document the form and the line; a failed task commit rolls status.md back with its decision lines intact
<!-- /TASK -->

<!-- TASK -->
### T4 - Align the coder with the reviewer on done clause proof
- TDD: none
- Covers: #1, #5, #6
- Uses: none
- Depends-on: none
- Files: viber/agents/task-coder.md, viber/skills/tdd/SKILL.md
- Delivers: a coder that stops on a clause-versus-contract disagreement, proves each done clause of a test-driven task with its own failing test, self-checks its tests before passing, defers a proof only on a task that is not test-driven and may add the test file its done clauses need; a test-driven development cycle whose behaviours are the task's done clauses
- Verification: ! grep -n "the clause and the criterion win" viber/agents/task-coder.md && grep -n "disagree.*VERDICT: FAIL" viber/agents/task-coder.md && grep -n "DEFERRED.*TDD: none" viber/agents/task-coder.md && grep -n "DoD. clause" viber/skills/tdd/SKILL.md -> the first finds nothing, each of the other three prints a line
- DoD: task-coder.md ends the task on VERDICT: FAIL with the clause number in REASON where a DoD clause or a Covers criterion disagrees with a block the task uses; task-coder.md counts a clause as met on its DOD line, on TDD: required, only with a test that fails without it; task-coder.md has the coder re-read every test it wrote or changed against each (blocking) rule of test-strategy.md before returning PASS; task-coder.md allows a DEFERRED line only on a TDD: none task; task-coder.md lets the coder add the test file its done clauses need when Files lacks it, reported on EXTRA; tdd SKILL.md workflow step 1 names a plan task numbered DoD clauses as the behaviours, one failing test each; neither file grows by more than the sentences these clauses name
<!-- /TASK -->

<!-- TASK -->
### T5 - Carry an owner decision through the build
- TDD: none
- Covers: #9, #10, #11
- Uses: C1, C2, C3
- Depends-on: T3, T4
- Files: viber/skills/implementor/SKILL.md, viber/agents/task-coder.md, viber/agents/task-reviewer.md, viber/agents/closeout.md
- Delivers: an orchestrator that offers the owner decision on the two stalled-task questions, records it through the commit script, re-dispatches the coder and passes every recorded decision to the task and its dependents; a coder and a reviewer that take a decision line over the task file; a closing agent that reads recorded decisions as a deviation source
- Verification: grep -n "decision:" viber/skills/implementor/SKILL.md viber/agents/task-coder.md viber/agents/task-reviewer.md viber/agents/closeout.md viber/scripts/plan-index.sh && grep -n "commit-task.sh\" --decide" viber/skills/implementor/SKILL.md && grep -n "\-\-decide" viber/scripts/commit-task.sh -> every one of the five files prints a decision line, and the implementor call and the script form both print
- DoD: implementor SKILL.md defines the decide answer as the user free-text answer and offers it on the question after the second coder failure and after review round 2 of 2; on decide the implementor runs commit-task.sh --decide as one literal line, then dispatches the task coder again at the same tier carrying the new decision line, and report: when the last failure was a review; after a decision both the coder failure count and the review round counter start over, so the next coder failure is retried once without asking and the next review is round 1 of 2; the implementor rewrites a double quote, dollar sign, backtick or backslash in the text into words before recording it; the implementor adds one decision line per index decision line plus one per --decide this build recorded to every coder and reviewer dispatch of that task and of every task depending on it, directly or through another; task-coder.md reads a decision line as the owner ruling that wins over the task file; task-reviewer.md reads a decision line as winning over the task file and never raises a note restating it as a finding; closeout.md reads the decision lines of status.md and records each one that makes a sentence of spec.md false as a D marker
<!-- /TASK -->

## Contracts

### C1 - Owner decision recording form

File: viber/scripts/commit-task.sh

```
commit-task.sh --decide <plan-file> <task-id> <text>

status.md, one line per decision, appended, no commit (rides in the next one):
  decision: <task-id>: <text>

stdout:  decided: <task-id>
         progress: unchanged
exit 2:  bad arguments, missing plan, empty or multi-line <text>, <task-id> on the done or skipped list
exit 3:  no task with that id in the plan
```

### C2 - Owner decision lines of the index

File: viber/scripts/plan-index.sh

```
decision: <task-id>: <text>
```

One line per `decision:` line of status.md, in file order, printed after `closed:` and before `tasks:`; no line when status.md has none.

### C3 - Owner decision in the build

File: viber/skills/implementor/SKILL.md, viber/agents/task-coder.md, viber/agents/task-reviewer.md

```
answer:         decide - the user free-text answer to a stalled-task question
dispatch line:  decision: <task-id>: <text>    (coder and reviewer, one per decision)
text:           one line, no double quote, dollar sign, backtick or backslash
precedence:     a decision line wins over the task file where they disagree
```
