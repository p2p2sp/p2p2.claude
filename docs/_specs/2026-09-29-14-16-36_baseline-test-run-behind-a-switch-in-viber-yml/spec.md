To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Baseline test run behind a switch in `viber.yml`

## Goal

Let a build tell the test failures it found in the tree from the ones it caused. Behind a new `viber.yml` switch, `baseline-tests`, off by default, the build runs the test suite once before its first task, records what already fails, and from then on treats only new failures as its own work to repair.

## Problem

Today the final test run cannot tell a failure the build found from one it introduced. On a project whose suite is already red, the build spends its repair rounds on someone else's broken code, or stalls on three failed rounds and a question to the user. A task whose own verification runs a failing test the task never touched stalls the same way.

## Current behaviour

`implementor` dispatches `test-runner` only after the last task (step 5): a `VERDICT: FAIL` there goes to a repair coder, up to three rounds, then a question. `test-runner` takes a report path only and writes the report on `FAIL` only. `task-coder` and `task-reviewer` have no notion of a failure that predates the build. `config.sh` prints nine switches, `switch-text.sh` accepts those nine plus `branching.mode`.

### Must not change

- With `baseline-tests` false or absent from `viber.yml`, `implementor`, `test-runner`, `task-coder` and `task-reviewer` behave exactly as today.
- `config.sh` prints every existing key with the same value and in the same relative order.
- `bootstrap.sh`'s merge keeps every value a user already set.
- `test-runner` dispatched with a report path alone (the final run with the switch off, `intent`'s fast path) behaves as today.

## Behaviour

### S1 - A green baseline [NEW]

Given `baseline-tests: true` and a run with no task done
When the build starts
Then the suite runs once before the first task and is green, the baseline is recorded in the run, and the build goes on asking nothing

### S2 - A red baseline [NEW]

Given `baseline-tests: true`, a run with no task done and a suite with failing tests
When the baseline run finds failing tests
Then the build asks continue or abort, naming the baseline report; on continue the tasks run with the recorded failures known to every coder and reviewer

### S3 - The final run with a recorded baseline [CHANGED - was: every failure went to repair]

Given a recorded baseline listing failing tests
When the final test run finds failures
Then a failure matching a baseline entry by test name and file is pre-existing and not repaired; only new failures make the run fail; the final summary names in one line how many pre-existing failures still fail

### S4 - A baseline whose build fails [NEW]

Given `baseline-tests: true` and a project whose build already fails
When the baseline run finds the build broken
Then the question says the build failed and no test ran; on continue, a build failure in the final run is new work to repair

### S5 - A resumed run [NEW]

Given `baseline-tests: true` and a resumed run with a task already done
When the build resumes
Then no baseline run is made; a baseline recorded earlier in the run is used, and with none recorded the final summary says so in one line

### S6 - The switch is off [CHANGED - was: no switch existed]

Given `baseline-tests: false`, or no such key
When a plan is built
Then the build runs exactly as before this change

### S7 - A person looks the switch up [NEW]

Given a person reading `viber/README.md`, the help page or the flow diagrams
When they look for how a build handles a suite that is already red
Then they find the `baseline-tests` switch, off by default, and the baseline run before the first task

### Edge cases

- A run with no task done whose baseline is already recorded (an earlier session stopped before the first commit) -> the recorded baseline is used, the suite is not run again.
- The same test failing in the final run with a different message than in the baseline -> pre-existing.
- A test failing in the baseline that passes in the final run -> nothing reported for it.
- A project with no test suite at the baseline -> no question, and the final run treats every failure as new.
- A tool call refused during the baseline run -> retry, accept or abort; accept goes on with no baseline.
- A resumed run with no task done but a task interrupted half-finished in the tree -> no baseline run, since it would record the build's own unfinished work as pre-existing; the final summary says in one line that the run has no baseline.
- A resumed run whose baseline was never recorded -> no failure is pre-existing for any coder, reviewer or the final run.
- A task's own verification failing only on tests listed in the baseline -> the coder neither fixes them nor counts them against its task, and the reviewer raises no finding for them.

## Glossary

- baseline - the result of the one test run before the first task, recorded in the run as its list of failures.
- pre-existing failure - a failing test whose test name and file match a failure entry of the baseline, whatever its message.
- new failure - any other failure, and every build failure in the final run.

## Acceptance criteria

1. A new project gets the `baseline-tests` switch off, a project set up by an older version gains it off on the next `/viber:setup` with its own values kept, a config without the key resolves it off, and with the switch off no baseline text reaches `implementor`.
2. With the switch on, no task of the run done and no task left half-finished in the tree, `implementor` dispatches `test-runner` once in baseline mode before the first task dispatch.
3. A baseline already recorded in the run is used as it stands: `test-runner` in baseline mode returns the recorded verdict without running the suite.
4. A resumed run with a task done makes no baseline run; when the run has no recorded baseline, the final summary says so in one line.
5. A red baseline asks continue or abort, naming the baseline report, and the report records every failing test by test name and file.
6. A baseline whose build fails asks the same question, saying the build failed and no test ran; a build failure in the final run is always a new failure.
7. A failure counts as pre-existing when its test name and file match a baseline failure entry, whatever its message.
8. The final test run fails only on new failures, its report listing only those, and the final summary names in one line the number of pre-existing failures that still fail.
9. Every task coder and task reviewer dispatch carries the baseline path; the coder neither fixes a pre-existing failure nor counts it against its task, and the reviewer raises no finding for one.
10. A green baseline, or a project with no test suite, asks nothing; a tool call refused during the baseline run asks retry, accept or abort, and accept goes on with no baseline.
11. `viber/README.md` and `help.html` document the `baseline-tests` switch and count ten switches, `help.html`'s build walkthrough and `test-runner` line describe the baseline run, and both flow diagrams show it.

## Scope

### File map

- modify - viber/scripts/config.sh - resolves and prints the `baseline-tests` switch
- modify - viber/scripts/switch-text.sh - accepts `baseline-tests` as a key
- modify - viber/skills/setup/templates/viber.yml - carries `baseline-tests: false` under its own comment
- modify - tests/viber/config.test.ts - proves the switch's resolution and print order
- modify - tests/viber/switch-text.test.ts - proves the fragment selection for the key
- modify - tests/viber/bootstrap.test.ts - fixtures and merge messages that enumerate every template key
- modify - tests/portability.test.ts - the switch-value map the fragment-call sweep checks against
- modify - viber/agents/test-runner.md - the baseline mode and the comparison against a recorded baseline
- modify - viber/agents/task-coder.md - the `baseline` input line
- modify - viber/agents/task-reviewer.md - the `baseline` input line
- modify - viber/skills/implementor/SKILL.md - preloads the two baseline fragments at steps 4 and 5
- add - viber/skills/implementor/fragments/baseline-run.true.md - the baseline run and the `baseline` line on task dispatches
- add - viber/skills/implementor/fragments/baseline-close.true.md - the `baseline` line on the final run and its summary lines
- modify - viber/README.md - the switch row and the switch counts
- modify - viber/skills/setup/assets/help.html - the switch entry, the counts, the build walkthrough and the `test-runner` line
- modify - viber/skills/setup/assets/viber-flow-en.svg - the baseline run in the English flow diagram
- modify - viber/skills/setup/assets/viber-flow-pl.svg - the baseline run in the Polish flow diagram

### Out of scope

- The plan format and every parser (`plan-index.sh`, `plan-path.sh`, `commit-task.sh`, `archive-run.sh`).
- `intent`'s fast path and its `test-runner` dispatch.
- The repair coder's dispatch lines.
- The final review's fix coder and recheck (`final-review.true.md`): they get no baseline line.
- End-to-end tests.
- Every `CLAUDE.md` node, left to the build's memory close.
- Roadmap part 4: Full autonomy with a ruling register.

## Constraints

- Stack-agnostic: no line names an ecosystem, a test framework or a fixed file list.
- Switch doctrine: no skill body branches on the switch.
- Every script keeps working under Git Bash on Windows and under macOS.
