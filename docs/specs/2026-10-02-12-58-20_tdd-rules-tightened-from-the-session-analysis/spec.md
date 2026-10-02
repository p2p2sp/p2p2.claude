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
