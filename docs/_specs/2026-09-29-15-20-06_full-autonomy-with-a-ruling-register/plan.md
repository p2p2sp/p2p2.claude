---
source: C:/Projects/p2p2.claude/docs/_specs/2026-09-29-15-20-06_full-autonomy-with-a-ruling-register/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Full autonomy with a ruling register

## Goal

Let a build run to its end without a person at the keyboard. The build settles stalled tasks, failing reviews, red test runs and refused commits itself, through a new arbiter agent choosing from a closed list of ways forward, and records every such ruling, with its reason and its cost if wrong, in a register that outlives the run.

## Problem

Today a build stops on a question whenever a task fails three times, a review fails three rounds, the final test run stays red, a commit is refused, the baseline is red or the final review's recheck fails. A build left running overnight stands still at the first of these until morning, and every task after it waits too. The only decision the build takes on its own today (`auto: <option>`) lands in `status.md`, which the archive drops.

## Current behaviour

`implementor` retries a coder's first failure one tier up, takes the first `DECIDE:` option not marked `owner:` on the second, recorded as the task's automatic decision, and asks retry / decide / skip / abort on the third. A failed review goes back to the coder at the same tier up to round 3, then asks retry / decide / accept / abort. A refused task commit asks retry / skip / abort, a refused commit outside a task asks retry / abort. The final test run repairs twice and asks retry / accept / abort on its third failed run, a red baseline asks continue / abort, a failed recheck of the final review asks retry / accept / an answer in the user's own words. The `orphan:` question offers the tasks that may take the paths, or leaving them out. `commit-task.sh` has no register and no form committing paths outside the plan; `plan-index.sh` prints `decision:` lines from `status.md`; `closeout` reads those lines to mark deviations.

### Must not change

- Every `VERDICT: DENIED` from any agent still asks the user, with the options it offers today.
- The open-run, missing-plan and `dirty:` questions, the owner-marked `DECIDE:` question and the exit-4 `--landed` question are asked as today.
- Every existing `commit-task.sh` form keeps its arguments, its stdout and its exit codes.
- A run that records no ruling has no `rulings.md`, and `plan-index.sh` prints exactly what it printed before.
- A coder's `WAIT:` hold costs its task nothing.

## Roadmap

Part 4 of 4 - Full autonomy with a ruling register

1. Edge cases in the plan (built)
2. Fast path: a small change with no plan document (built)
3. Baseline test run behind a switch in `viber.yml` (built)
4. Full autonomy with a ruling register (this plan)

## Behaviour

### S1 - A coder stalls on an open choice [CHANGED - was: the second failure took the first `DECIDE:` option, the third asked]

Given a task whose coder fails again, from its second attempt on, proposing at least one way forward not reserved for the owner
When the build handles that failure
Then the arbiter picks one of those ways, the build records it as a ruling and as the task's decision, and the coder runs again with it, asking nothing

### S2 - A task uses up its attempts [CHANGED - was: a question after 3 coder failures or 3 review rounds]

Given a task that has failed 5 attempts, coder failures, review failures and refused commits counted together
When the fifth attempt fails
Then the arbiter rules on the task and the build carries the ruling out and goes on with the other tasks, asking nothing: after a failed review the arbiter chooses between accepting the task unreviewed and skipping it with every task depending on it; after a coder failure or a refused commit its only option is skipping it with its dependents, since no finished work exists to accept

### S3 - The repository refuses a task's commit [CHANGED - was: retry / skip / abort]

Given a task whose commit the repository refuses, a hook or a lock for instance, and not because another commit already carried its work
When the build handles the refusal
Then it counts as one of that task's attempts, and the coder runs again one tier up with the refusal's error as its reason

### S4 - Changes outside the plan at the start [CHANGED - was: pick a task to take them, or leave them out]

Given changed files no open task claims when the build starts
When the build asks about them
Then the question has exactly two answers, skip or commit now; commit now lands those files in one commit of their own before the first task

### S5 - A red baseline [CHANGED - was: continue / abort]

Given `baseline-tests: true` and a baseline run that fails
When the build handles it
Then the arbiter rules continue, the build records the ruling and goes on with the tasks, asking nothing

### S6 - The final test run stays red [CHANGED - was: two repairs, then a question]

Given a final test run failing on new failures
When five repair rounds have not made it pass
Then the sixth failed run gets the arbiter's accept ruling, the build records it and goes on to the close, the failing run named in the final summary

### S7 - The final review's recheck fails [CHANGED - was: retry / accept / an answer in the user's own words]

Given a final review whose one fix wave failed its recheck
When the build handles it
Then the arbiter rules accept, the build records the ruling and commits the fix; no second fix wave runs

### S8 - A commit outside a task is refused [CHANGED - was: retry / abort]

Given a refused commit of a post-test repair, the close's knowledge or QA files, the final review's fix or the files outside the plan
When the build handles it
Then it retries once, and a second refusal leaves the files uncommitted under an arbiter ruling, named in the final summary

### S9 - A person reads what the build decided [NEW]

Given a finished build that recorded rulings
When the person reads the final summary, the archive or the specification
Then the summary lists every ruling of the run with its reason and cost, `rulings.md` sits in the archive, and `spec.md` marks a deviation a ruling caused

### S10 - A person looks the behaviour up [CHANGED - was: the build asks on every stall]

Given a person reading `viber/README.md`, the help page or the flow diagrams
When they look for what happens when a task stalls
Then they find the autonomous build, its stops, the 5-attempt limit, the arbiter and `rulings.md`

### Edge cases

- The arbiter naming a way forward that is not on its list -> the first way on the list is taken, and the mismatch is named in the final summary.
- The arbiter's own tool call refused -> the user is asked retry / accept / abort, accept taking the first way on the list, recorded with the refused call as its reason.
- A coder proposing both ways reserved for the owner and ways that are not -> the arbiter chooses among the ways not reserved only.
- A coder failure from the second attempt on proposing no way forward -> the next attempt runs with no arbiter.
- An accepted task at the limit whose commit is then refused -> the arbiter rules again, its only option skipping the task with its dependents.
- The owner's own answer on a stalled task -> the task's attempt count starts over.
- A resumed session -> every task's attempt count starts over.
- A ruling holding a double quote, a dollar sign, a backtick or a backslash -> rewritten into words before it is recorded.
- A ruling left empty or spread over several lines -> refused, nothing recorded, and the refusal named in the final summary.
- The same ruling recorded twice -> one line in the register.
- A run that recorded no ruling -> no register, and no ruling in the index or the final summary.
- A register still uncommitted when the run is archived -> the archive commit carries it.
- Committing the files outside the plan with one of them under `.temp/` -> that file is refused with a warning, the others committed.

## Glossary

- ruling - a decision the build takes in the user's place: what was decided, why, and what it costs if wrong.
- register - the run's list of rulings, one line each, which a person finds beside the specification in the run and in its archive.
- arbiter - the agent that chooses a ruling from a closed list of options and states its reason and cost; it never invents an option.
- attempt - one try of a coder at a task, ended by the coder failing, the review failing or the commit being refused; a coder waiting on another task's file makes no attempt.
- limit - 5 attempts per task, the point at which the arbiter rules on the task instead of another attempt.
- stop - a situation that still asks the user: an agent's tool call refused, a coder offering only ways reserved for the owner, and the questions before the first task.

## Acceptance criteria

1. Recording a ruling appends one line per ruling to the run's `rulings.md`, carrying what was decided, why and the cost if wrong, makes no commit, refuses an empty or multi-line field, keeps a repeated ruling once, and every commit form taking a plan carries the register once it holds a change; the archive keeps the register.
2. `plan-index.sh` prints one `ruling:` line per register entry in file order, and exactly its former output for a run with no register.
3. Committing files outside the plan commits only the named paths, in one commit of their own with a derived subject, refusing a `.temp/` path.
4. The arbiter, given a case, a closed option list and the reports, returns one option copied from that list plus a one-line reason and a one-line cost, and writes no file.
5. Within one session and since the owner's last answer on it, a task gets at most 5 attempts, coder failures, review failures and refused task commits counted together and a `WAIT:` hold not, each attempt after the first running one tier up, never past `tiers.max`.
6. From the second attempt on, a coder failure offering an option not marked `owner:` gets the arbiter's pick among those options, recorded as a ruling and as the task's decision, never a question.
7. A task failing its fifth attempt gets the arbiter's ruling, carried out without a question: its options are accept unreviewed or skip with its dependents after a review failure, and skip with its dependents only after a coder failure or a refused commit.
8. The build asks the user only on `VERDICT: DENIED`, on a coder whose every `DECIDE:` option is owner-marked, on the open-run, missing-plan, `dirty:` and `orphan:` questions and on the `--landed` exit; the `orphan:` question offers exactly skip and commit now.
9. A refused commit outside a task is retried once, then its paths stay uncommitted under an arbiter ruling and are named in the final summary.
10. A red baseline, a final test run still failing after five repair rounds and a failed recheck of the final review's single fix wave each end on an arbiter ruling (continue, accept, accept), never a question.
11. The final summary lists every ruling of the run, earlier sessions' included, each with its reason and cost, outside its 7-line cap.
12. `closeout` reads the register and marks in `spec.md` a deviation a ruling causes.
13. `viber/README.md` and `help.html` describe the autonomous build, its stops, the 5-attempt limit, the arbiter and `rulings.md`, `help.html` carries the arbiter's agent line, and both flow diagrams show a ruling where a question stood.

## Scope

### File map

- modify - viber/scripts/commit-task.sh - the `--rule` and `--outside` forms and carrying the register in every plan-taking commit
- modify - tests/viber/commit-task.test.ts - proves both forms and the register's staging
- modify - tests/viber/archive-run.test.ts - proves the archive keeps the register, committed or not
- modify - viber/scripts/plan-index.sh - the `ruling:` index lines
- modify - tests/viber/plan-index.test.ts - proves the `ruling:` lines and the unchanged output without a register
- add - viber/agents/arbiter.md - the arbiter agent
- modify - viber/.claude-plugin/plugin.json - lists the arbiter in `agents[]`
- modify - viber/skills/implementor/SKILL.md - attempts, the limit, rulings, the stops, the `orphan:` question, commits outside a task, the final test run and the summary
- modify - viber/skills/implementor/fragments/baseline-run.true.md - a red baseline ends on a ruling
- modify - viber/skills/implementor/fragments/final-review.true.md - a failed recheck ends on a ruling, one fix wave
- modify - viber/agents/closeout.md - reads the register for deviations
- modify - viber/README.md - the autonomous build and the `final-review` row
- modify - viber/skills/setup/assets/help.html - the arbiter's agent line, the build walkthrough, stalled tasks, the test run, the `implementor` card, the `final-review` entry, the write locations
- modify - viber/skills/setup/assets/viber-flow-en.svg - rulings in place of questions
- modify - viber/skills/setup/assets/viber-flow-pl.svg - the same in Polish

### Out of scope

- `intent`'s fast path and the `e2e` skill.
- The plan format and `plan-path.sh`, `archive-run.sh`, `run-branch.sh`.
- `task-coder`, `task-reviewer`, `test-runner` and `final-reviewer`: their inputs and outputs stay as they are.
- A `viber.yml` switch: autonomy is always on.
- Every `CLAUDE.md` node and section, left to the build's memory close.
- End-to-end tests.

## Constraints

- Stack-agnostic: no line names an ecosystem, a test framework or a fixed file list.
- Every script keeps working under Git Bash on Windows and under macOS.
- The arbiter runs only when a ruling is due; a build that stalls nowhere dispatches it never.
- No agent edits the register: a ruling reaches it only through the build's own recording step, so what a person reads there is exactly what the build decided.

## Tasks

<!-- TASK -->
### T1 - Record rulings in the run's register
- TDD: required
- Covers: #1
- Uses: C1
- Depends-on: none
- Files: viber/scripts/commit-task.sh, tests/viber/commit-task.test.ts, tests/viber/archive-run.test.ts
- Delivers: the `--rule` form of `commit-task.sh` writing the run's `rulings.md`, every commit form that takes a plan staging that file when it holds a change, and tests proving both plus the archive keeping the file
- Verification: node --test tests/viber/commit-task.test.ts tests/viber/archive-run.test.ts -> every test passes, the new `--rule` cases included
- DoD: `--rule` with a task id or a fixed subject appends exactly one C1 entry to `rulings.md` beside the plan, creating the file with its heading, and prints `ruled: <subject>` and `progress: unchanged` without committing; an empty or multi-line field, or a subject that is neither a task id of the plan nor a fixed subject, exits non-zero and leaves the register untouched; recording the same entry twice leaves one line; a task commit made after a `--rule` call carries `rulings.md` in that commit; a `--review` commit and a `--chore` commit made after a `--rule` call each carry `rulings.md`; `archive-run.sh` on a run holding `rulings.md`, committed or still uncommitted, leaves it in the archive commit
<!-- /TASK -->

<!-- TASK -->
### T2 - Commit changes made outside the plan
- TDD: required
- Covers: #3
- Uses: C1, C3
- Depends-on: T1
- Files: viber/scripts/commit-task.sh, tests/viber/commit-task.test.ts
- Delivers: the `--outside` form of `commit-task.sh`, committing only the named paths in one commit of their own under a derived subject, carrying the run's register like every other form taking a plan
- Verification: node --test --test-name-pattern "outside" tests/viber/commit-task.test.ts -> every matched test passes
- DoD: `--outside` commits exactly the named paths under the C3 subject and footer and prints the C3 stdout; a path staged beside the call stays staged and out of the commit; a `.temp/` path is refused with a warning while the other paths are committed; named paths producing no change exit 4 with nothing committed; an `--outside` call made after a `--rule` call carries `rulings.md` in its commit
<!-- /TASK -->

<!-- TASK -->
### T3 - Print the run's rulings on the index
- TDD: required
- Covers: #2
- Uses: C1, C2
- Depends-on: T2
- Files: viber/scripts/plan-index.sh, tests/viber/plan-index.test.ts
- Delivers: one `ruling:` index line per entry of the run's `rulings.md`, in file order
- Verification: node --test tests/viber/plan-index.test.ts -> every test passes, the new `ruling:` cases included
- DoD: a run whose `rulings.md` holds two entries prints two C2 lines in file order after the `decision:` lines; a run with no `rulings.md` prints byte for byte what it printed before; `rulings.md` never appears on an `orphan:` or `dirty:` line
<!-- /TASK -->

<!-- TASK -->
### T4 - Add the arbiter agent
- TDD: none
- Covers: #4, #13
- Uses: C4
- Depends-on: none
- Files: viber/agents/arbiter.md, viber/.claude-plugin/plugin.json, viber/skills/setup/assets/help.html
- Delivers: the read-only arbiter agent answering C4, listed in the plugin's `agents[]`, with its own agent line in the help page in both languages
- Verification: node --test tests/viber/help.test.ts && grep -n "RULING:" viber/agents/arbiter.md && grep -n "arbiter.md" viber/.claude-plugin/plugin.json && grep -n 'id="agent-arbiter"' viber/skills/setup/assets/help.html -> the tests pass and each grep prints a line
- DoD: `arbiter.md` takes exactly the C4 input lines, its `case:` line written exactly as C4 writes it, and returns exactly the C4 output lines, its `RULING:` always one option copied from `options:`; its `tools:` holds Read, Grep and Glob only and its opening paragraph names the same tools; its frontmatter sets `model: opus`, `effort: medium` and `color: yellow`; it returns `VERDICT: DENIED` with `REASON: <tool>: <call>` on a refused call; `plugin.json` lists it in `agents[]`; `help.html` carries an `agent-arbiter` line in English and Polish and `help.test.ts` passes
<!-- /TASK -->

<!-- TASK -->
### T5 - Run the task loop without asking
- TDD: none
- Covers: #5, #6, #7, #8, #11
- Uses: C1, C2, C4
- Depends-on: T3, T4
- Files: viber/skills/implementor/SKILL.md
- Delivers: `implementor`'s task loop counting attempts up to the limit and turning every task stall that is not a stop into an arbiter ruling recorded through `--rule`, and the rulings listed in the final summary
- Verification: grep -n -e "--rule" viber/skills/implementor/SKILL.md && grep -n -e "--rule" viber/scripts/commit-task.sh && grep -n "viber:arbiter" viber/skills/implementor/SKILL.md && grep -n "case: decide | cap" viber/agents/arbiter.md && node --test tests/portability.test.ts -> every grep prints a line and the test passes
- DoD: an attempt is one coder dispatch, a `WAIT:` hold excepted, and each attempt after the first runs one tier up clamped into `tiers.max`, its review tier rising with it and raised to `sonnet` from `haiku`; a task gets at most 5 attempts, a coder failure, a review failure and a task commit exiting other than 4 each ending one; a task commit refused with an exit other than 4 sends the coder again carrying the error as `reason:`; from the second attempt on, a coder failure whose `DECIDE:` line holds unmarked options dispatches the arbiter with case `decide`, the task file, the coder's notes and only those options, records the ruling through `--rule` and the chosen option through `--decide "auto: <option>"`, then runs the next attempt; a coder failure with no `DECIDE:` line runs the next attempt with no arbiter; a failed fifth attempt dispatches the arbiter with case `cap`, which takes precedence over case `decide` at the limit, carrying the task file, the coder's notes and the last review report as `report:` lines and options `accept | skip` after a review failure, `skip` only otherwise, `accept` committing with `--unreviewed` and `skip` skipping the task and its dependents; an `accept` at the limit whose commit is refused dispatches the arbiter again with `skip` only; the owner's `decide` answer restarts the task's attempt count; a resumed session starts every task's attempt count over; every ruling field is rewritten of double quotes, dollar signs, backticks and backslashes before `--rule`; a `--rule` call exiting non-zero is named in the final summary and triggers no further ruling or retry; a `RULING:` naming no listed option takes the first one and names the mismatch in the final summary; an arbiter `VERDICT: DENIED` asks retry / accept / abort, `accept` taking the first option, recorded with the refused call as its reason and `not assessed - the arbiter was refused` as its cost; every arbiter dispatch carries no `model`; within steps 3 and 4 `AskUserQuestion` appears only for `VERDICT: DENIED`, the owner-marked `DECIDE:` question and the exit-4 `--landed` question; the final summary lists, outside its 7 lines, every index `ruling:` line and every ruling this session recorded, each with its reason and cost
<!-- /TASK -->

<!-- TASK -->
### T6 - Settle changes and commits outside the plan without asking
- TDD: none
- Covers: #8, #9
- Uses: C1, C3, C4
- Depends-on: T5
- Files: viber/skills/implementor/SKILL.md
- Delivers: the two-answer `orphan:` question committing through `--outside`, and one automatic retry of a refused commit outside a task followed by an arbiter ruling
- Verification: grep -n -e "--outside" viber/skills/implementor/SKILL.md && grep -n -e "--outside" viber/scripts/commit-task.sh && grep -n "leave uncommitted" viber/skills/implementor/SKILL.md && node --test tests/portability.test.ts -> every grep prints a line and the test passes
- DoD: the `orphan:` question offers exactly skip and commit now, skip naming the paths in the final summary and commit now calling `--outside` once before the first task dispatch; no task takes `orphan:` paths any more, so no coder `resume:`, reviewer `extra:` or commit `--with` carries them; every refused `commit-task.sh` commit other than a task's own commit - the fix-number repair form, `--repair`, `--chore`, `--qa`, `--review` and `--outside` - is retried once without asking, and a second refusal dispatches the arbiter with case `commit`, option `leave uncommitted` and the error as `reason:`, records the ruling through `--rule`, leaves the paths uncommitted and names them in the final summary; a `--skip` or `--decide` call exiting non-zero after a ruling is named in the final summary, asking nothing; the open-run, missing-plan and `dirty:` questions stay as they are
<!-- /TASK -->

<!-- TASK -->
### T7 - Rule on the close instead of asking
- TDD: none
- Covers: #10
- Uses: C1, C4
- Depends-on: T6
- Files: viber/skills/implementor/SKILL.md, viber/skills/implementor/fragments/baseline-run.true.md, viber/skills/implementor/fragments/final-review.true.md
- Delivers: a red baseline, a final test run still failing after five repair rounds and a failed recheck of the final review each ending on an arbiter ruling recorded through `--rule`, the final review keeping one fix wave
- Verification: grep -n "case: baseline" viber/skills/implementor/fragments/baseline-run.true.md && grep -n "case: tests" viber/skills/implementor/SKILL.md && grep -n "case: final-review" viber/skills/implementor/fragments/final-review.true.md && grep -n "case: decide | cap | baseline | tests | final-review | commit" viber/agents/arbiter.md && node --test tests/portability.test.ts -> every grep prints a line and the test passes
- DoD: a baseline `VERDICT: FAIL` dispatches the arbiter with case `baseline`, option `continue` and the baseline report, records the ruling and goes on with the tasks; a baseline `VERDICT: DENIED` still asks retry / accept / abort; test runs 1 to 5 failing each go to a repair round, and a sixth failing run dispatches the arbiter with case `tests`, option `accept` and that run's report, records the ruling and goes on to the close, the failing run named in the final summary; a recheck `VERDICT: FAIL` dispatches the arbiter with case `final-review`, option `accept` and the recheck report, carrying no `model` although the fragment's other dispatches do, records the ruling and commits the fix through `--review`, with no second fix round and no `decision: final-review:` line; every `VERDICT: DENIED` of the test runner, the repair coder, the final reviewers and the fix coder still asks as today
<!-- /TASK -->

<!-- TASK -->
### T8 - Mark deviations caused by rulings
- TDD: none
- Covers: #12
- Uses: C1
- Depends-on: T2
- Files: viber/agents/closeout.md
- Delivers: `closeout` reading every entry of the run's `rulings.md` beside the `decision:` lines and marking in `spec.md` a deviation a ruling causes
- Verification: grep -n "rulings.md" viber/agents/closeout.md && grep -n "rulings.md" viber/scripts/commit-task.sh -> both greps print a line
- DoD: `closeout` reads `<dir>/rulings.md` after the `decision:` lines of `status.md` when the file exists; it marks a deviation where a ruling makes a sentence of `spec.md` false, exactly as for any other deviation source; a run with no register reads nothing more than today
<!-- /TASK -->

<!-- TASK -->
### T9 - Document the autonomous build
- TDD: none
- Covers: #13
- Uses: C1, C4
- Depends-on: T7
- Files: viber/README.md, viber/skills/setup/assets/help.html
- Delivers: the README and the help page describing the autonomous build, its stops, the 5-attempt limit, the arbiter's rulings and `rulings.md`, in both of the help page's languages
- Verification: node --test tests/viber/help.test.ts && grep -n "rulings.md" viber/README.md && grep -n "rulings.md" viber/skills/setup/assets/help.html && grep -n "rulings.md" viber/scripts/commit-task.sh -> the test passes and every grep prints a line
- DoD: the README's build description names the stops, the 5-attempt limit and `rulings.md`, and its `final-review` row no longer says a failed recheck asks; `help.html`'s build walkthrough, its `guide-resume` details (the unclaimed-files question and the stalled-task line), its `hw-close` passage, its `ts-task-fails` and `ts-tests` entries, its baseline passage, its `skill-implementor` card and its `key-final-review` entry describe rulings in place of questions in English and Polish; `help.html` names `rulings.md` among the run's files and in the archive; `help.test.ts` passes
<!-- /TASK -->

<!-- TASK -->
### T10 - Show rulings in both flow diagrams
- TDD: none
- Covers: #13
- Uses: C4
- Depends-on: T4
- Files: viber/skills/setup/assets/viber-flow-en.svg, viber/skills/setup/assets/viber-flow-pl.svg
- Delivers: both flow diagrams showing the arbiter's ruling where the coder, reviewer, baseline, final review and test-runner notes today say the build asks
- Verification: grep -n "arbiter" viber/skills/setup/assets/viber-flow-en.svg && grep -n "arbiter" viber/skills/setup/assets/viber-flow-pl.svg && grep -n "arbiter" viber/.claude-plugin/plugin.json -> every grep prints a line
- DoD: the English diagram's task-coder, task-reviewer, baseline, final-reviewer and final test-runner notes describe the attempt limit and the arbiter's ruling instead of a question; the Polish diagram says the same in Polish at the same places; both name `rulings.md`; both files stay well-formed SVG with no text overflowing its box
<!-- /TASK -->

## Contracts

### C1 - The ruling register and its `--rule` form

File: viber/scripts/commit-task.sh

```
commit-task.sh --rule <plan-file> <subject> <ruling> <why> <cost>

<subject>  a task id of the plan | baseline | tests | final-review | commit
<ruling>, <why>, <cost>  each one non-empty line

writes <run-dir>/rulings.md, created as:
# Rulings
<blank line>
then one appended line per call:
- <subject>: <ruling> | why: <why> | cost if wrong: <cost>

stdout: ruled: <subject>
        progress: unchanged
no commit; an identical line already present is not appended again
exit 2: missing argument, plan not found, empty or multi-line field, unknown fixed subject
exit 3: a subject shaped like a task id that the plan does not hold

every form taking a plan also stages <run-dir>/rulings.md when it exists and differs from HEAD
```

### C2 - The `ruling:` index line

File: viber/scripts/plan-index.sh

```
ruling: <subject>: <ruling> | why: <why> | cost if wrong: <cost>
```

One line per `- ` entry of `<run-dir>/rulings.md`, the leading `- ` dropped, in file order, printed after the `decision:` lines; none when the file is absent.

### C3 - The `--outside` form

File: viber/scripts/commit-task.sh

```
commit-task.sh --outside <plan-file> <file> [<file>...]

subject: chore(viber): commit changes made outside the plan
footer:  Refs: <plan-file> outside the plan   (plus Refs: #<N> for a plan tied to an issue)
stdout:  committed: <sha>
         subject: <line>
exit 2: missing argument or plan not found
exit 4: the named files produced no change
exit 5: staging or committing failed
```

### C4 - The arbiter's dispatch and return

File: viber/agents/arbiter.md

```
input lines:
case: decide | cap | baseline | tests | final-review | commit
options: <option> [| <option>...]      the closed list; the first is the fallback
task: <run-dir>/tasks/<id>.md          cases decide and cap only
report: <path>                         one line per report or notes file the case hands over
reason: <text>                         the failure's REASON or the refused call's error, when one came

options per case:
decide        the coder's DECIDE: options not starting with "owner: "
cap           accept | skip   after a review failure; skip   otherwise
baseline      continue
tests         accept
final-review  accept
commit        leave uncommitted

output lines:
VERDICT: RULED | DENIED
RULING: <one option copied verbatim from options:>
WHY: <one line>
COST: <one line: what breaks or has to be redone if the ruling is wrong>
REASON: <tool>: <call>                 on DENIED only
```
