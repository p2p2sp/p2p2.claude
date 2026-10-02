---
source: C:/Projects/p2p2.claude/docs/_specs/2026-10-02-12-58-20_tdd-rules-tightened-from-the-session-analysis/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# TDD rules tightened from the session analysis

## Goal

An analysis of 577 `TDD: required` tasks across recent sessions found three gaps: 17% of cycles took a compile, import or missing-symbol failure as RED and 27 tests passed on their first run with no sharpening; user interface tasks on hosts with no component test layer got `TDD: required` and ended in tests matching the source text with regular expressions; defects escaped in consumers of a contract another task widened (a new error code shown as a raw key). The rules that drive the TDD cycle, the planning of tasks and the writing of tests change so these three gaps close.

## Acceptance criteria

1. The `tdd` skill counts a run as RED only when the test fails on an assertion about the missing behaviour, in its verify-red step and in its path for existing work alike; a compile, import or missing-symbol failure has the coder write a signature-only skeleton with no logic and run the test again until it fails on an assertion.
2. The `tdd` skill's iron law states that a test never watched failing on an assertion backs no `DoD` clause, and a test passing on its first run is sharpened and taken through red again.
3. The `tdd` card of the help page, in both languages, describes the test as one that first fails on an assertion.
4. The `TDD` rule of `plan-rules.md` marks `TDD: none` a task whose behaviour only a component test could observe on a host with no component layer, its `Verification` a grep on both sides, and has the pure decision logic of such a task extracted into a function proven in a `TDD: required` task.
5. `test-strategy.md` carries a rule tagged `(blocking)`: a test never reads the source of the code under test as text to assert its shape; the one exception is a file the host declares as its product (a document, a configuration, a prompt).
6. `plan-rules.md` carries a new rule tagged `(review)`, with its own leading name: a change that widens the set of values of a contract (an error code, a state, a variant) needs, for each consumer of that contract, a task whose done clause covers the consumer's handling of the new value and is proven by a test.

## Scope

### File map

- modify - viber/skills/tdd/SKILL.md - the Red-Green-Refactor cycle a `task-coder` follows on `TDD: required`
- modify - viber/skills/setup/assets/help.html - the user-facing help page, its `tdd` card
- modify - viber/references/plan-rules.md - the planning rules, its `TDD` rule and a new `Widened` rule
- modify - viber/references/test-strategy.md - the rules every unit and component test is written to

### Out of scope

- The default `TDD: required` for logic carrying a decision stays as it is.
- `task-coder` and `task-reviewer` keep their output lines and checks: no new return line and no RED check by the reviewer.
- No new integration test requirement beyond the `Layered` and `Shared harness` rules.
- No component test layer is added to any host.
- `viber/PRODUCT.md`, `viber/agents/task-coder.md` and `viber/agents/task-reviewer.md` keep their text: the coder reads the skill and `test-strategy.md`, the reviewer raises every `(blocking)` rule of `test-strategy.md`, and the planner and `planner-review` read `plan-rules.md` whole.

## Tasks

<!-- TASK -->
### T1 - Count only an assertion failure as red in the tdd cycle
- TDD: none
- Covers: #1, #2, #3
- Uses: none
- Depends-on: none
- Files: viber/skills/tdd/SKILL.md, viber/skills/setup/assets/help.html
- Delivers: a `tdd` skill whose red step, and its path for existing work, accept only a failing assertion, turn a compile, import or missing-symbol failure into a signature-only skeleton and a rerun, and whose iron law refuses a test never seen failing on an assertion; the help page's `tdd` card saying the same in English and Polish.
- Verification: grep -c "fails on an assertion" viber/skills/tdd/SKILL.md viber/skills/setup/assets/help.html -> a count of 1 or more for each file, then node --test --test-concurrency=12 --test-reporter=dot "tests/viber/*.test.ts" tests/orphan-tags.test.ts tests/portability.test.ts -> every test passes
- DoD: the `### Verify red - watch it fail` section states that a run counts as red only when the test fails on an assertion about the missing behaviour; the same section has a compile, import or missing-symbol failure answered by a signature-only skeleton with no logic and a rerun until the test fails on an assertion; the `## Iron law` paragraph on `resume`, `reason` or `report` input has the temporarily reverted behaviour make its test fail on an assertion; the `## Iron law` section states that a test never watched failing on an assertion backs no `DoD` clause and that a test passing on its first run is sharpened and taken through red again; the English span of the help page's `skill-tdd` card says the test first fails on an assertion and its Polish span says the same in Polish
<!-- /TASK -->

<!-- TASK -->
### T2 - Mark component-only behaviour on a host without that layer as TDD none
- TDD: none
- Covers: #4
- Uses: none
- Depends-on: none
- Files: viber/references/plan-rules.md
- Delivers: the `TDD` rule of `plan-rules.md`, extended in its own sentence, giving `TDD: none` to a task whose behaviour only a component test could observe on a host with no component layer, verified by a grep on both sides, with its pure decision logic extracted into a function a `TDD: required` task proves.
- Verification: grep -c "only a component test could observe" viber/references/plan-rules.md -> 1, then node --test --test-concurrency=12 --test-reporter=dot tests/orphan-tags.test.ts tests/portability.test.ts -> every test passes
- DoD: the `TDD` bullet lists, among its `TDD: none` cases, a task whose behaviour only a component test could observe on a host with no component layer, in the sense the `Shared harness` rule gives that phrase; the same case names its `Verification` as a grep on both sides, the source declaring the identifier and the place consuming it; the same case has any decision logic inside such a task extracted into a pure function proven in a `TDD: required` task; the `TDD` rule stays one bullet tagged `(review)`
<!-- /TASK -->

<!-- TASK -->
### T3 - Forbid tests that read the code under test as text
- TDD: none
- Covers: #5
- Uses: none
- Depends-on: none
- Files: viber/references/test-strategy.md
- Delivers: one new `(blocking)` rule in `test-strategy.md` forbidding a test that reads the source of the code under test as text to assert its shape, a file the host declares as its product being the one exception.
- Verification: grep -c "source of the code under test as text" viber/references/test-strategy.md -> 1, then node --test --test-concurrency=12 --test-reporter=dot tests/orphan-tags.test.ts tests/portability.test.ts -> every test passes
- DoD: `test-strategy.md` carries one bullet tagged `(blocking)` stating that a test never reads the source of the code under test as text to assert its shape; the same bullet names as its one exception a file the host declares as its product (a document, a configuration, a prompt)
<!-- /TASK -->

<!-- TASK -->
### T4 - Require tested handling in every consumer of a widened contract
- TDD: none
- Covers: #6
- Uses: none
- Depends-on: T2
- Files: viber/references/plan-rules.md
- Delivers: a new `Widened` rule in the `## Tasks` section of `plan-rules.md`, tagged `(review)`, requiring a change that widens the set of values of a contract to give each consumer of that contract a task whose done clause covers the consumer's handling of the new value, proven by a test.
- Verification: grep -c "^- Widened: " viber/references/plan-rules.md -> 1, then node --test --test-concurrency=12 --test-reporter=dot tests/orphan-tags.test.ts tests/portability.test.ts -> every test passes
- DoD: `plan-rules.md` carries one bullet opening with `Widened:` and tagged `(review)`; that bullet states that a change which widens the set of values of a contract (an error code, a state, a variant) needs, for each consumer of that contract, a task whose done clause covers the consumer's handling of the new value; the same bullet has that done clause proven by a test; the `Reach` bullet keeps its text
<!-- /TASK -->
