---
source: C:/Projects/p2p2.claude/docs/_specs/2026-09-30-16-43-20_final-test-run-limited-to-the-fast-suite-and-the-integration/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Final test run limited to the fast suite and the integration tests of the change

## Goal

A viber build ends on a test run that today executes every test layer but end-to-end, the whole integration layer included, and the optional baseline run does the same before the first task. This change narrows the final run to the unit and component layers plus the integration tests the build's own change reaches, lets the baseline run choose between that fast scope and the full one, and has every test a build writes or edits carry its layer's marker so a layer can be selected by the test tool's own filter. The whole integration layer and the end-to-end layer belong to the host's continuous integration pipeline.

## Problem

A build spends its longest wait on the final test run, and a baseline run doubles it: both start every real dependency the integration layer needs, although only the adapters the build touched can have changed behaviour. Nothing in the tests a build writes tells one layer from another, so neither viber nor the host's pipeline can run one layer alone. Whether the host has a pipeline at all is the developer's decision and not viber's concern.

## Current behaviour

`test-runner` (haiku) runs the project's build and then the full suite once, the integration layer included, the end-to-end layer excluded through the test tool's own filter. `implementor` dispatches it after the last task and after each repair round; `intent`'s fast path dispatches it after an approved change. `build.baseline-tests` is a `true`/`false` switch: `true` makes `implementor` run the same full suite once before the first task and compare the final run against it. `setup` checks that the host's `CLAUDE.md` names the build, whole-suite and single-test-file commands. `test-strategy.md` says nothing about marking a test's layer, and a plan designs test infrastructure only for a host with no harness for the component or integration layer.

### Must not change

- A coder and a reviewer still run only their task's own `Verification` and `recheck:` commands, never a wider suite.
- `test-runner`'s report file format, its verdict lines (`PASS`, `SKIP`, `FAIL`, `DENIED`, `BUILD: failed`, `KNOWN:`, `BASELINE: none`), its background run with the `exit=` log line and its "Stop what you started" section.
- Every other switch still resolves to `true`/`false`, and `config.sh` prints its lines in the same order.
- The end-to-end layer stays out of every `test-runner` run.

## Behaviour

### S1 - Final test run after a build [CHANGED - was: every layer but end-to-end]

After the last task, the build runs the host's fast command, then only the integration tests whose adapter the build changed, directly or through a file that adapter depends on, such as a migration or a schema.

Given a build whose tasks changed one data-access adapter and its migration
When the final test run starts
Then the unit and component tests run, followed by that adapter's integration tests alone

### S2 - Final test run of a change with no adapter [NEW]

Given a build that changed no adapter and nothing an adapter depends on
When the final test run starts
Then only the fast command runs and no integration test starts

### S3 - Host with no layer selection [NEW]

Given a host whose instructions name no fast command or no layer marker convention
When a final test run or a `fast` baseline run starts
Then every layer but end-to-end runs, as it does today

### S4 - Fast path test run [CHANGED - was: every layer but end-to-end]

Given a change built on `intent`'s fast path, left uncommitted, a new untracked migration among its files
When the test run starts
Then the change is the working tree's uncommitted and untracked paths, and the run is the fast command plus the integration tests they reach

### S5 - Baseline run by switch value [CHANGED - was: `true` ran every layer but end-to-end]

Given `build.baseline-tests: fast` (or `full`)
When a build starts with no task done
Then the recorded baseline covers the unit and component tests only (or every layer but end-to-end), and the final run compares against it as today; `off` runs no baseline

### S6 - Configuration from an older version [CHANGED - was: `true` or `false`]

Given a `.claude/viber.yml` at schema 1 carrying `baseline-tests: true` inside `build:`
When `/viber:setup` runs
Then the value becomes `full`, `schema:` becomes 2, and the report names the rewrite; `false` becomes `off`

### S7 - Setup on a host missing a declaration [CHANGED - was: three commands checked]

Given a host whose `CLAUDE.md` names the build, whole-suite, single-test-file and fast commands but not how a test is tagged with its layer
When `/viber:setup` runs
Then its report names the layer marker convention as missing and prints the prompt to paste

### S8 - A plan on a host with no layer marker convention [NEW]

Given a host that already has a test harness but declares no layer marker convention or no fast command
When a plan writes any test
Then one task designs the convention and the fast command from the test framework's own mechanism, and every task writing tests depends on it

### S9 - A test written or edited by a build [NEW]

Given a host declaring a layer marker convention
When a coder writes a new test or edits an existing one
Then that test carries its layer's marker, and the reviewer raises a missing one as Blocking

### Edge cases

- A build whose plan decomposition commit cannot be found -> the final test run runs every layer but end-to-end.
- `baseline-tests: TRUE` inside `build:` -> resolves to `full`.
- A legacy `baseline-tests: true` at column 0 -> resolves to `off` until `/viber:setup` moves it into `build:` as `full`, reporting both the move and the rewrite.
- `build.baseline-tests: fast` on a host with no fast command -> the baseline runs every layer but end-to-end.
- A value `fast`, `full` or `off` already in a schema 2 file -> `setup` leaves it byte-identical and reports nothing for it.

## Glossary

- Fast command - the host's own command running every test except those marked integration or end-to-end; it is not the whole-suite command.
- Layer marker convention - how the host's test framework tags a test with its layer (a marker, a trait, a tag, a build tag, a runner project or a file-name pattern), declared in the host's instructions; viber names no framework.
- The change - the paths a build or a fast-path change touched, from which the integration tests to run are selected.

## Acceptance criteria

1. The final test run of a build or of a fast-path change runs the build, then the host's fast command, then the integration tests covering the change - each integration test, found through the layer marker convention, whose adapter file or a file that adapter depends on (a migration, a schema, shared data access) is among the changed paths - and no integration test when none is; the end-to-end layer never runs.
2. A build's change is every path changed since its plan decomposition commit plus the uncommitted and untracked paths; a fast-path change is the uncommitted and untracked paths of the working tree.
3. With no fast command or no layer marker convention in the host's instructions, or a build whose decomposition commit cannot be found, the final test run runs every layer but end-to-end; a host with no test setup still gets no test run, as today.
4. `test-runner` runs on `model: sonnet` with `effort: low`, and its selection of the integration tests ends on the sentence "Think the problem through before you answer."
5. `config.sh` prints `build.baseline-tests: off`, `fast` or `full`: `full` or `true` in any letter case inside `build:` -> `full`, `fast` -> `fast`, anything else or no key -> `off`.
6. With `build.baseline-tests: fast` the baseline records the unit and component tests only, with `full` every layer but end-to-end, with `off` no baseline runs; the comparison against the baseline and its summary lines work as today under both values.
7. The `viber.yml` template ships `schema: 2` and `baseline-tests: off`; `bootstrap.sh` raises an older file to schema 2 and rewrites a grouped or moved `baseline-tests` value `true` to `full` and `false` to `off`, reporting each rewrite.
8. `test-strategy.md` carries a Blocking rule: every test written or edited carries its layer's marker in the host's declared convention, or in the one the plan's harness task designed.
9. `plan-rules.md` makes any plan writing tests on a host declaring no layer marker convention or no fast command design both, from the test framework's native mechanism, in its one harness task, created for this when the host already has a harness, which every task writing tests depends on.
10. `viber/README.md`, `help.html` in both languages, both flow diagrams and `PRODUCT.md` describe the final run as the fast command plus the change's integration tests and the three baseline values.
11. `setup` counts the fast command and the layer marker convention among the items `CLAUDE.md` must state, and its paste prompt asks for both.

## Scope

### File map

- modify - `viber/scripts/config.sh` - resolves `build.baseline-tests` to `off`, `fast` or `full`
- modify - `viber/scripts/switch-text.sh` - header contract naming the key's three values
- modify - `tests/viber/config.test.ts` - the key's resolution cases and the template default
- modify - `tests/viber/switch-text.test.ts` - fragment selection for the key's values
- modify - `viber/skills/setup/templates/viber.yml` - `schema: 2`, `baseline-tests: off`, its comment and the opening comment's switch wording
- modify - `viber/skills/setup/scripts/bootstrap.sh` - the value rewrite and its report line
- modify - `tests/viber/bootstrap.test.ts` - schema 2 key list, rewrite and untouched-value cases, the printed `config.sh` value
- modify - `viber/agents/test-runner.md` - model, effort, `suite:` and `run:` input lines, the run scope and the selection
- modify - `viber/skills/implementor/SKILL.md` - `run: <dir>` on every final test run dispatch
- delete - `viber/skills/implementor/fragments/baseline-run.true.md` - replaced by the per-value files
- delete - `viber/skills/implementor/fragments/baseline-close.true.md` - replaced by the per-value files
- add - `viber/skills/implementor/fragments/baseline-run.fast.md` - baseline dispatch with `suite: fast`
- add - `viber/skills/implementor/fragments/baseline-run.full.md` - baseline dispatch with `suite: full`
- add - `viber/skills/implementor/fragments/baseline-close.fast.md` - the baseline close lines
- add - `viber/skills/implementor/fragments/baseline-close.full.md` - the baseline close lines
- modify - `tests/portability.test.ts` - the key's valid fragment values and its self-check sample
- modify - `viber/references/test-strategy.md` - the layer marker rule
- modify - `viber/references/plan-rules.md` - the harness task designing a missing marker convention and fast command
- modify - `viber/PRODUCT.md` - the final run and layer marker assumptions
- modify - `viber/skills/setup/SKILL.md` - the fast command and the marker convention among the checked items
- modify - `viber/skills/setup/templates/claude-md-prompt.txt` - the fast command and marker convention asked for
- modify - `viber/README.md` - the switch row and the build close sentence
- modify - `viber/skills/setup/assets/help.html` - baseline and final run text, the schema tag, the switch entry, the `test-runner` entry and what `setup` checks, both languages
- modify - `viber/skills/setup/assets/viber-flow-en.svg`, `viber/skills/setup/assets/viber-flow-pl.svg` - the baseline and `test-runner` labels

### Out of scope

- `viber/skills/intent/fragments/fast-path.true.md` keeps dispatching `test-runner` with the report path alone, which now means the uncommitted change.
- `task-coder`, `task-reviewer` and `final-reviewer` keep their text: coders and reviewers read the marker rule from `test-strategy.md`.
- The `e2e` skill and `e2e-writer`.
- Generating any continuous integration configuration for the host.
- Marking a host's existing tests other than those a task writes or edits: an integration test without a marker keeps running inside the host's fast command.
- A baseline taken with `fast` records no integration failure, so an integration test of a changed adapter that already failed before the build counts as a new failure in the final run.
- The existing tests under `tests/` of this repository, and this repository's own `.claude/viber.yml`, which `setup` migrates.
- Every `CLAUDE.md` node, `CLAUDE.<section>.md` file and `.claude/rules/` file: the build's close updates them.

## Constraints

- No viber file assumes a stack or names a test framework as a default: the fast command, the marker convention and how a layer is excluded come only from the host's instructions or its framework's native mechanism.
- Every script runs in Git Bash on Windows and on macOS bash 3.2: no heredoc, no apostrophe inside a single-quoted awk program, shell values reach awk through `ENVIRON`.
- `config.sh`, `switch-text.sh` and `bootstrap.sh` keep exiting 0 on every data condition.

## Tasks

<!-- TASK -->
### T1 - Resolve build.baseline-tests to off, fast or full
- TDD: required
- Covers: #5
- Uses: C2
- Depends-on: none
- Files: viber/scripts/config.sh, viber/scripts/switch-text.sh, tests/viber/config.test.ts, tests/viber/switch-text.test.ts, tests/viber/bootstrap.test.ts
- Delivers: `config.sh` resolving `build.baseline-tests` to one of three values at its current line position, legacy `true` and `false` mapped, `switch-text.sh`'s header naming those values for the key, and the one bootstrap case reading `config.sh` output expecting the new value.
- Verification: node --test --test-concurrency=12 --test-reporter=dot tests/viber/config.test.ts tests/viber/switch-text.test.ts tests/viber/bootstrap.test.ts -> every test passes
- DoD: `baseline-tests: fast` inside `build:` prints `build.baseline-tests: fast`; `full` or `true` in any letter case inside `build:` prints `build.baseline-tests: full`; `false`, a missing key, a column-0 key or any other value prints `build.baseline-tests: off`; the line still sits between `planning.fast-path` and `build.final-review`; `switch-text.sh` with the key resolved to `fast` prints the `<name>.fast.md` fragment and with it resolved to `off` prints nothing when no `.off.md` file exists; the bootstrap case asserting `config.sh` output expects `build.baseline-tests: off` where it expected `false`
<!-- /TASK -->

<!-- TASK -->
### T2 - Migrate baseline-tests to off, fast or full in setup
- TDD: required
- Covers: #7, #10
- Uses: C2, C3
- Depends-on: T1
- Files: viber/skills/setup/templates/viber.yml, viber/skills/setup/scripts/bootstrap.sh, tests/viber/bootstrap.test.ts, viber/README.md, viber/skills/setup/assets/help.html, viber/skills/setup/assets/viber-flow-en.svg, viber/skills/setup/assets/viber-flow-pl.svg
- Delivers: a template at schema 2 shipping `baseline-tests: off`, a `bootstrap.sh` that rewrites a legacy `true`/`false` value and reports it, and the switch described with its three values in the README, the help page and both flow diagrams.
- Verification: node --test --test-concurrency=12 --test-reporter=dot tests/viber/bootstrap.test.ts tests/viber/config.test.ts tests/viber/help.test.ts -> every test passes
- DoD: the template carries `schema: 2` and `baseline-tests: off` under a comment naming `off`, `fast` and `full`, its opening comment no longer says every switch takes only `true` or `false`, and `SCHEMA_KEYS` records its key list under `"2"`; a grouped `baseline-tests: true` becomes `full` and `false` becomes `off`, each reported on the C3 line, the file raised to `schema: 2`; a column-0 `baseline-tests: true` moves into `build:` as `full`, reported on the move line and on the C3 line; a file already at schema 2 whose value is `off`, `fast` or `full` is left byte-identical and unreported; the README switch row, the help page's `build.baseline-tests` entry and baseline paragraph in both languages and both diagrams' baseline label name the `fast` and `full` values; the help page's `schema` entry shows 2
<!-- /TASK -->

<!-- TASK -->
### T3 - Limit the final test run to the fast command and the change's integration tests
- TDD: none
- Covers: #1, #2, #3, #4, #10
- Uses: C1, C4
- Depends-on: T2
- Files: viber/agents/test-runner.md, viber/skills/implementor/SKILL.md, viber/README.md, viber/skills/setup/assets/help.html, viber/skills/setup/assets/viber-flow-en.svg, viber/skills/setup/assets/viber-flow-pl.svg
- Delivers: a `test-runner` on sonnet at low effort that takes the C1 lines and runs the fast command plus the integration tests covering the change, falling back to every layer but end-to-end, an `implementor` passing `run: <dir>` on every final test run dispatch, and the final run described that way in the README, the help page and both flow diagrams.
- Verification: grep -c "run: <dir>" viber/agents/test-runner.md viber/skills/implementor/SKILL.md -> a count of 1 or more for each file, then node --test --test-concurrency=12 --test-reporter=dot tests/viber/help.test.ts tests/portability.test.ts -> every test passes
- DoD: the `test-runner` frontmatter carries `model: sonnet` and `effort: low` in the field order `name, description, tools, model, effort, color`; with no `suite:` line it runs the fast command and then the integration tests it selects through the layer marker convention, that selection ending on "Think the problem through before you answer."; `run: <dir>` makes the change every path changed since the commit that first added `<dir>/plan.md` plus the uncommitted and untracked paths, and no `run:` line makes it the uncommitted and untracked paths; `suite: fast` runs the fast command alone and `suite: full` every layer but end-to-end; no fast command, no marker convention or a `run:` base it cannot find runs every layer but end-to-end; every `implementor` step 5 `test-runner` dispatch carries `run: <dir>`; the help page's final run paragraphs (after the last task and once the suite passes) and `test-runner` entry in both languages, the README's build close sentence and both diagrams' `test-runner` label describe the fast command plus the change's integration tests
<!-- /TASK -->

<!-- TASK -->
### T4 - Load the baseline fragments by switch value
- TDD: none
- Covers: #6
- Uses: C1, C2
- Depends-on: T3
- Files: viber/skills/implementor/fragments/baseline-run.true.md, viber/skills/implementor/fragments/baseline-close.true.md, viber/skills/implementor/fragments/baseline-run.fast.md, viber/skills/implementor/fragments/baseline-run.full.md, viber/skills/implementor/fragments/baseline-close.fast.md, viber/skills/implementor/fragments/baseline-close.full.md, tests/portability.test.ts
- Delivers: the baseline run and close fragments per value, `fast` and `full`, in place of the `true` ones, and the portability sweep accepting the key's three values.
- Verification: grep -c "suite: fast" viber/skills/implementor/fragments/baseline-run.fast.md viber/agents/test-runner.md -> a count of 1 or more for each file, then node --test --test-concurrency=12 --test-reporter=dot tests/portability.test.ts -> every test passes
- DoD: `baseline-run.true.md` and `baseline-close.true.md` are removed through `git rm`; `baseline-run.fast.md` dispatches the baseline `test-runner` with `suite: fast` and `baseline-run.full.md` with `suite: full`, each otherwise carrying the removed fragment's text; `baseline-close.fast.md` and `baseline-close.full.md` each carry the removed close fragment's text; the portability sweep lists `off`, `fast` and `full` as the values of `build.baseline-tests` and its baseline self-check sample uses a `.fast.md` fragment
<!-- /TASK -->

<!-- TASK -->
### T5 - Require a layer marker on every test a build writes or edits
- TDD: none
- Covers: #8, #9, #10
- Uses: C4
- Depends-on: T3
- Files: viber/references/test-strategy.md, viber/references/plan-rules.md, viber/PRODUCT.md
- Delivers: a Blocking layer marker rule in the test strategy, the planning rule that has a plan design a missing marker convention and fast command, and the product assumptions stating the final run's scope and the marker.
- Verification: grep -c "layer marker convention" viber/references/test-strategy.md viber/references/plan-rules.md viber/PRODUCT.md viber/agents/test-runner.md -> a count of 1 or more for each file
- DoD: `test-strategy.md` carries one rule tagged `(blocking)` stating that every test written or edited carries its layer's marker in the host's declared layer marker convention, or in the one the plan's harness task designed; `plan-rules.md`'s `Shared harness` rule, extended in its own sentence, has any plan writing tests on a host declaring no layer marker convention or no fast command design both from the test framework's native mechanism in its one harness task, created for this when the host already has a harness, every task writing tests depending on it; `PRODUCT.md`'s full suite assumption states that the final test run runs the fast command plus the integration tests of the change, the whole integration layer and the end-to-end layer belonging to continuous integration, and a new assumption states that every test a build writes or edits carries its layer's marker in the host's layer marker convention
<!-- /TASK -->

<!-- TASK -->
### T6 - Ask the host for its fast command and layer marker convention
- TDD: none
- Covers: #10, #11
- Uses: C4
- Depends-on: T4
- Files: viber/skills/setup/SKILL.md, viber/skills/setup/templates/claude-md-prompt.txt, viber/skills/setup/assets/help.html
- Delivers: a `setup` check counting the fast command and the layer marker convention among the items `CLAUDE.md` must state, a paste prompt asking for both, and the help page describing that check.
- Verification: grep -c "layer marker convention" viber/skills/setup/SKILL.md viber/skills/setup/templates/claude-md-prompt.txt viber/agents/test-runner.md -> a count of 1 or more for each file, then node --test --test-concurrency=12 --test-reporter=dot tests/viber/help.test.ts tests/portability.test.ts -> every test passes
- DoD: `setup` counts five items - the build, the whole test suite, a single test file and the fast command, each only by its literal command, and the layer marker convention, counted when the file states how a test is tagged with its layer; the line for all five named no longer advises adding a command that leaves the end-to-end tests out; the paste prompt asks for the fast command, running every test but the integration and end-to-end ones, and for the layer marker convention, in place of its end-to-end item; the help page's list of what to state in `CLAUDE.md` with its sentence on what `setup` checks, and the `setup` card, in both languages, name the fast command and the layer marker convention and drop the end-to-end item
<!-- /TASK -->

## Contracts

### C1 - test-runner input lines

File: viber/agents/test-runner.md

```
<report path>          line 1, always
mode: baseline         optional, as today
baseline: <path>       optional, as today
suite: fast | full     optional - fast: the fast command alone; full: every layer but end-to-end
run: <dir>             optional, only without suite: - the change is every path changed since
                       the commit that first added <dir>/plan.md, plus the uncommitted and
                       untracked paths
no suite: line         the fast command, then the integration tests covering the change
no run: line           the change is the uncommitted and untracked paths of the working tree
```

### C2 - build.baseline-tests value

File: viber/scripts/config.sh

```
printed line:  build.baseline-tests: off | fast | full
file value inside build: (any letter case)
  full, true   -> full
  fast         -> fast
  anything else, false, no key, a column-0 key -> off
fragment files per value: <name>.fast.md, <name>.full.md (no .off.md)
```

### C3 - bootstrap value rewrite report line

File: viber/skills/setup/scripts/bootstrap.sh

```
viber.yml: build.baseline-tests <old value> -> <new value> (the switch takes off, fast or full)
```

### C4 - Host test layer declarations

File: none

```
fast command              the host's command running every test but those marked
                          integration or end-to-end, named in the host's instructions
layer marker convention   how the host's test framework tags a test with its layer
                          (unit | component | integration | e2e), named in the host's
                          instructions; a marker, trait, tag, build tag, runner project
                          or file-name pattern
```
