---
source: C:/Projects/p2p2.claude/docs/_specs/2026-09-29-14-16-36_baseline-test-run-behind-a-switch-in-viber-yml/plan.md
---

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

## Roadmap

Part 3 of 4 - Baseline test run behind a switch in `viber.yml`

1. Edge cases in the plan (built)
2. Fast path: a small change with no plan document (built)
3. Baseline test run behind a switch in `viber.yml` (this plan)
4. Full autonomy with a ruling register
   - The build decides conflicts, ambiguities and stalled tasks itself instead of asking.
   - Every such decision is recorded as a ruling with its reason and its cost if wrong.
   - The final summary lists every ruling.
   - `VERDICT: DENIED` stays a stop.
   - It consumes part 3's list of pre-existing failures.

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

## Tasks

<!-- TASK -->
### T1 - Add the baseline-tests switch
- TDD: required
- Covers: #1, #11
- Uses: C1
- Depends-on: none
- Files: viber/scripts/config.sh, viber/scripts/switch-text.sh, viber/skills/setup/templates/viber.yml, tests/viber/config.test.ts, tests/viber/switch-text.test.ts, tests/viber/bootstrap.test.ts, tests/portability.test.ts, viber/README.md, viber/skills/setup/assets/help.html
- Delivers: the `baseline-tests` switch resolved by `config.sh`, accepted by `switch-text.sh`, seeded off by the template and merged into older configs, plus its README row, corrected switch counts and its `help.html` key entry in both languages.
- Verification: node --test tests/viber/config.test.ts tests/viber/switch-text.test.ts tests/viber/bootstrap.test.ts tests/viber/help.test.ts tests/portability.test.ts && grep -q '^| `baseline-tests` | \*\*off\*\* |' viber/README.md && grep -q 'seven of the ten' viber/README.md && grep -q 'Seven of the ten' viber/skills/setup/assets/help.html && grep -q 'Siedem z dziesięciu' viber/skills/setup/assets/help.html && grep -q '^baseline-tests: false$' viber/skills/setup/templates/viber.yml -> every test passes and every grep exits 0
- DoD: `config.sh` prints `baseline-tests: true` for a config holding `baseline-tests: true` in any letter case, and `baseline-tests: false` when the key is absent or holds any other value, proven in `tests/viber/config.test.ts`; the `baseline-tests` line prints directly after the `fast-path` line, proven in `tests/viber/config.test.ts`; `switch-text.sh baseline-tests <skill dir> baseline-run` prints `fragments/baseline-run.true.md` under `baseline-tests: true` and nothing under false, proven in `tests/viber/switch-text.test.ts`; the template carries `baseline-tests: false` and a config lacking it gains `baseline-tests: false` on merge with every other value kept, proven in `tests/viber/bootstrap.test.ts`; the portability sweep's switch-value map lists `baseline-tests` with `true` and `false`; `help.html` holds an entry `id="key-baseline-tests"` with an English and a Polish description, proven by `tests/viber/help.test.ts`; `help.html`'s switch-count paragraph names seven of ten switches on and `qa`, `issues` and `baseline-tests` off, in English and Polish; `viber/README.md`'s switch table has a `baseline-tests` row marked `**off**` like `qa` and `issues`, and its counts name ten switches
<!-- /TASK -->

<!-- TASK -->
### T2 - Record a baseline and compare the final run against it in test-runner
- TDD: none
- Covers: #3, #5, #6, #7, #8
- Uses: C2
- Depends-on: none
- Files: viber/agents/test-runner.md
- Delivers: `test-runner`'s baseline mode (record the run's failures in the baseline report on every verdict but `DENIED`, or return the verdict an existing baseline report records without running) and its comparison mode (failures matching the baseline by test name and file are pre-existing; only new ones fail the run and reach the report), both keyed on the dispatch lines of C2, with a dispatch carrying neither line unchanged.
- Verification: node --test tests/orphan-tags.test.ts && grep -n 'mode: baseline' viber/agents/test-runner.md && grep -n 'KNOWN:' viber/agents/test-runner.md && grep -n 'BASELINE: none' viber/agents/test-runner.md && grep -n 'BUILD: failed' viber/agents/test-runner.md && grep -n 'build-failed' viber/agents/test-runner.md -> the test passes and every grep prints a line
- DoD: `test-runner.md`'s input names the `mode: baseline` and `baseline: <path>` lines of C2 beside the report path, and a prompt with neither line runs exactly as today; in baseline mode with no file at the report path, the agent runs the suite once and writes the report in C2's format on `PASS`, `SKIP` and `FAIL` alike, one failure line per failing test with its test name and file; in baseline mode with a file already at the report path, the agent runs nothing and returns the verdict its `status:` line records, with `REPORT:` and `BUILD: failed` as C2 maps them; a baseline build failure returns `BUILD: failed` beside `VERDICT: FAIL` and `REPORT:`; in comparison mode a failing test whose test name and file both match a failure line of the baseline is pre-existing, whatever its message; in comparison mode only new failures are written to the report, only new failures return `VERDICT: FAIL`, and a run with pre-existing failures alone returns `VERDICT: PASS`; `KNOWN: <n>` follows the verdict whenever pre-existing failures still fail; a build failure in comparison mode is always a new failure, and a baseline recorded as `build-failed` or `skip` makes no failure pre-existing; in comparison mode with no file at the baseline path the agent runs as today and adds `BASELINE: none`
<!-- /TASK -->

<!-- TASK -->
### T3 - Keep pre-existing failures out of task coders' and reviewers' work
- TDD: none
- Covers: #7, #9
- Uses: C2, C3
- Depends-on: T2
- Files: viber/agents/task-coder.md, viber/agents/task-reviewer.md
- Delivers: the `baseline` input line in `task-coder` and `task-reviewer`: a failing test matching a baseline failure line by test name and file is pre-existing, never the coder's to fix or to count against its task, never the reviewer's finding.
- Verification: node --test tests/orphan-tags.test.ts && grep -n 'baseline: ' viber/agents/task-coder.md && grep -n 'baseline: ' viber/agents/task-reviewer.md && grep -n 'build-failed' viber/agents/test-runner.md -> the test passes and every grep prints a line
- DoD: `task-coder.md`'s Input section carries a bullet for the `baseline: <path>` line of C3; that bullet counts a failing test as pre-existing only when its test name and file match a failure line of that file, whatever its message; that bullet has the coder leave a pre-existing failure unfixed, not count it against its `DoD` or its verdict, and name it in its notes; `task-reviewer.md`'s Input section carries a bullet for the same line, raising no finding for a pre-existing failure; both bullets treat a missing file at that path as no pre-existing failure
<!-- /TASK -->

<!-- TASK -->
### T4 - Run the baseline and honour it in the build
- TDD: none
- Covers: #1, #2, #4, #5, #6, #8, #10, #11
- Uses: C1, C2, C3
- Depends-on: T1, T3
- Files: viber/skills/implementor/SKILL.md, viber/skills/implementor/fragments/baseline-run.true.md, viber/skills/implementor/fragments/baseline-close.true.md, viber/skills/setup/assets/help.html, viber/skills/setup/assets/viber-flow-en.svg, viber/skills/setup/assets/viber-flow-pl.svg
- Delivers: `implementor` preloading `baseline-run` at the top of step 4 and `baseline-close` in step 5 beside the test-runner dispatch; the first fragment holding the baseline run before the first task dispatch, its answers, and the `baseline:` line on every coder and reviewer dispatch; the second holding the `baseline:` line on every final test-runner dispatch and the summary lines for `KNOWN:` and `BASELINE: none`; `help.html`'s build walkthrough and `test-runner` agent line describing the baseline run, in English and Polish; the baseline run in both flow diagrams.
- Verification: node --test tests/viber/help.test.ts tests/orphan-tags.test.ts && test -f viber/skills/implementor/fragments/baseline-run.true.md && test -f viber/skills/implementor/fragments/baseline-close.true.md && grep -q 'baseline-tests' viber/skills/setup/assets/viber-flow-en.svg && grep -q 'baseline-tests' viber/skills/setup/assets/viber-flow-pl.svg && grep -q '^baseline-tests:' viber/skills/setup/templates/viber.yml && grep -q 'switch-text.sh" baseline-tests "${CLAUDE_SKILL_DIR}" baseline-run' viber/skills/implementor/SKILL.md && grep -q 'switch-text.sh" baseline-tests "${CLAUDE_SKILL_DIR}" baseline-close' viber/skills/implementor/SKILL.md && grep -q 'mode: baseline' viber/skills/implementor/fragments/baseline-run.true.md && grep -q 'mode: baseline' viber/agents/test-runner.md && grep -q 'BUILD: failed' viber/skills/implementor/fragments/baseline-run.true.md && grep -q 'BUILD: failed' viber/agents/test-runner.md && grep -q 'KNOWN:' viber/skills/implementor/fragments/baseline-close.true.md && grep -q 'KNOWN:' viber/agents/test-runner.md && grep -q 'BASELINE: none' viber/skills/implementor/fragments/baseline-close.true.md && grep -q 'BASELINE: none' viber/agents/test-runner.md && grep -q 'baseline: ' viber/skills/implementor/fragments/baseline-run.true.md && grep -q 'baseline: ' viber/skills/implementor/fragments/baseline-close.true.md && grep -q 'baseline: ' viber/agents/task-coder.md && grep -q 'href="#key-baseline-tests"' viber/skills/setup/assets/help.html -> every test passes, both files exist and every grep exits 0
- DoD: `implementor/SKILL.md` preloads `switch-text.sh baseline-tests "${CLAUDE_SKILL_DIR}" baseline-run` directly under `## 4. Run the plan`, before its first paragraph; `implementor/SKILL.md` preloads `switch-text.sh baseline-tests "${CLAUDE_SKILL_DIR}" baseline-close` in step 5 directly after the line dispatching `viber:test-runner`; the body's coder and reviewer dispatch wording admits a line a fragment of step 4 adds, and the body names no baseline beyond that and the two preloads; `baseline-run.true.md` dispatches `viber:test-runner` once with `<dir>/work/tests-baseline.md` and `mode: baseline`, with no `model`, only when no task on the index is `done` and the index carries no `dirty:` line, and dispatches no task before it returns; `baseline-run.true.md` goes on asking nothing on `PASS` or `SKIP`; `baseline-run.true.md` answers `FAIL` with an `AskUserQuestion` naming the report: continue or abort, abort being the `abort` answer; that question says the build failed and no test ran when `BUILD: failed` came back; `baseline-run.true.md` answers `DENIED` with retry / accept / abort, `accept` going on with no baseline; `baseline-run.true.md` adds `baseline: <dir>/work/tests-baseline.md` to every coder and reviewer dispatch of step 4, whether or not this session ran the baseline; `baseline-close.true.md` adds the same `baseline:` line to every test-runner dispatch of step 5; `baseline-close.true.md` carries `KNOWN: <n>` to the final summary as one line naming the count and the baseline report; `baseline-close.true.md` carries `BASELINE: none` to the final summary as one line saying the run has no recorded baseline; `help.html`'s build walkthrough names the baseline run before the first task and links `#key-baseline-tests`, in English and Polish; the `agent-test-runner` line names the baseline run, in English and Polish; `viber-flow-en.svg` shows a baseline run before the task loop, labelled with the `baseline-tests` switch, and its close test run treating only new failures as repair work; `viber-flow-pl.svg` shows the same in Polish, labelled with the `baseline-tests` switch
<!-- /TASK -->

## Contracts

### C1 - The baseline-tests switch

File: viber/scripts/config.sh, viber/scripts/switch-text.sh, viber/skills/setup/templates/viber.yml

```
viber.yml key : baseline-tests: true | false   (top-level, column 0; the template seeds false)
config.sh     : baseline-tests: <true|false>   (printed directly after `fast-path:`; absent -> false)
switch-text.sh: key `baseline-tests`, values true | false
implementor   : "${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" baseline-tests "${CLAUDE_SKILL_DIR}" baseline-run     (step 4)
                "${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" baseline-tests "${CLAUDE_SKILL_DIR}" baseline-close   (step 5)
fragments     : viber/skills/implementor/fragments/baseline-run.true.md, baseline-close.true.md   (no .false.md)
help anchor   : id="key-baseline-tests"
agents        : never read viber.yml; they act on the dispatch lines of C2 and C3
```

### C2 - test-runner's baseline dispatch, returns and report

File: viber/agents/test-runner.md

```
dispatch, baseline mode   : <dir>/work/tests-baseline.md
                            mode: baseline
dispatch, comparison mode : <dir>/work/tests-<round>.md
                            baseline: <dir>/work/tests-baseline.md
dispatch, plain           : <report path>                       (unchanged)

returns, baseline mode    : VERDICT: PASS
                          | VERDICT: SKIP
                          | VERDICT: FAIL + REPORT: <path> [+ BUILD: failed]
                          | VERDICT: DENIED + REASON: <tool>: <call>
returns, comparison mode  : VERDICT: PASS [+ KNOWN: <n>] [+ BASELINE: none]
                          | VERDICT: SKIP [+ BASELINE: none]
                          | VERDICT: FAIL + REPORT: <path> [+ KNOWN: <n>] [+ BASELINE: none]
                          | VERDICT: DENIED + REASON: <tool>: <call>

baseline report (tests-baseline.md):
  status: pass | skip | fail | build-failed
  <test name> | <file> | <assertion or error>     one line per failing test, under `fail` only
  <build command> | <first error line>           one line, under `build-failed` only

recorded status -> returned verdict:
  pass -> PASS ; skip -> SKIP ; fail -> FAIL + REPORT ; build-failed -> FAIL + REPORT + BUILD: failed
```

### C3 - The baseline line on task dispatches

File: viber/agents/task-coder.md, viber/agents/task-reviewer.md

```
baseline: <dir>/work/tests-baseline.md     one line beside the task's other dispatch lines
pre-existing : a failing test whose <test name> and <file> match a failure line of C2's baseline report
missing file : no failure is pre-existing
```
