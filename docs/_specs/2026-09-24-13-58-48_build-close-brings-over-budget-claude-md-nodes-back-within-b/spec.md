# Build close brings over-budget CLAUDE.md nodes back within budget

Build: skill `implementor`

## Goal

A host project's `CLAUDE.md` nodes grow without bound (one reached 98113 characters against a 12000 cap): plan tasks write into them with no budget, `memory-writer` may end over a cap, and its `OVER:` report triggers no repair. The build's close must verify every node left over budget against the code and bring it back within budget in the same run, and plans must stop routing memory writes through ordinary tasks.

## Acceptance criteria

1. When `memory-writer` returns one or more `OVER:` lines, `implementor` step 6 dispatches `viber:memory-auditor` once per such path as soon as `memory-writer` returned, without waiting for `rules-writer` or `qa-writer`, all in one message, each with `target`, `scope` and `out: .temp/viber/<run key>/`, no `model:`; an auditor returning no `AUDIT:` line leaves its node with `findings: none`.
2. After every auditor returned, `implementor` dispatches `viber:memory-node-writer` on each of those paths in waves by depth, the root's first, each with `mode: fix`, `findings:` its audit file, `planned: none`, `refs:`, no `model:`; when a later wave created or deleted a node and the root exists, one more `mode: fix`, `findings: none`, `planned: none` dispatch runs on the root.
3. The paths those writers return on `FILES:` are committed through the same `commit-task.sh --chore` call as the other memory and rule paths; their `AUDIT:`, `DROPPED:`, `DELETED:`, `LIFT:` and `CHAIN:` lines are repeated verbatim in the final summary; an `OVER:` line whose node a writer returned `UPDATED` or `NONE` on is no longer repeated, any other stays.
4. `memory-node-writer` accepts `planned: none`: a node carrying a list of nodes keeps the list it found, adds each node its own split created and drops each node that no longer exists.
5. The descriptions of `memory-auditor` and `memory-node-writer` end "Invoked only by the memory skill and the implementor skill, never directly."
6. `plan-rules.md` carries a `(review)` rule: with the `memory` switch on, no task lists a `CLAUDE.md` in `Files`, whatever the host's own instructions say; `planner` passes the resolved `memory:` value to `planner-review`, whose input names that line, so the reviewer can gate the rule.

## Scope

### File map

- modify - viber/agents/memory-node-writer.md - `planned: none` input and its budget meaning; description names the implementor as caller
- modify - viber/agents/memory-auditor.md - description names the implementor as caller
- modify - viber/skills/implementor/SKILL.md - step 6 audit and budget repair of `OVER:` nodes, their commit and summary lines
- modify - viber/references/plan-rules.md - the `(review)` rule keeping `CLAUDE.md` out of task `Files` under `memory: true`
- modify - viber/skills/planner/SKILL.md - step 3 passes the `memory:` line to the reviewer
- modify - viber/agents/planner-review.md - input names the `memory:` line

### Out of scope

- Every `CLAUDE.md`: under this repo's `memory: true` the build's close records the change in `viber/CLAUDE.md`.
- `viber/agents/memory-writer.md`: unchanged, it still ends over a cap and reports `OVER:`.
- The `memory` skill, its `disable-model-invocation`, and `memory-map.sh`.
- Any pending-facts file, any task added to a running build.
- Every script and every test under `tests/`.
