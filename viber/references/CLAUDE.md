# viber references - rule files read whole at runtime

Each file is read in full by every consumer on every dispatch, and each consumer names it by file
name (`<refs>/<file>.md` or `${CLAUDE_PLUGIN_ROOT}/references/<file>.md`): a rename or a move
touches every reader below.

## Readers not named elsewhere

- `plan-rules.md`: `planner` (direct path, draft rounds included) and `planner-review`.
- `integration-tests.md`: `planner` and `planner-review` when the plan carries an integration
  test; `task-coder` and `task-reviewer` on a task writing or running one or building the shared
  harness.
- `node-doctrine.md`: `memory-writer` and `memory-node-writer`.

## Tags are an interface

- `(blocking)` (`test-strategy.md`, `integration-tests.md`): binding for `fixer` and `task-coder`,
  a Blocking finding for `task-reviewer` and `planner-review`. An untagged rule never blocks.
- `plan-rules.md`: `(script)` is enforced by `plan-index.sh`, `(review)` gated by `planner-review`,
  which reports each breach under the rule's leading name. That name is a finding label and is
  cited elsewhere (`End-to-end` by `planner`, `Minimal`, `Consumed after`, `Memory-owned` by the
  viber sections): renaming one updates every citation. One name on two bullets (`Exclusive`,
  `Reproduced`, `Block body`) is one rule split into its `(script)` and `(review)` halves.

## Duplicated on purpose - change together

- The test layers (unit, component with in-memory fakes never an in-memory database, integration
  against a disposable real dependency, e2e): `plan-rules.md`'s `Layers`, `Layered` and
  `Shared harness` rules, `test-strategy.md`'s unit and component bullets,
  `integration-tests.md`'s opening bullet, `task-reviewer`'s `Tested` line and `task-coder`'s
  seam sentence.
