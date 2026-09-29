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
