# Run Exclusive tasks last

Build: skill `implementor`

## Goal

An Exclusive task - in practice an integration task - must run at the end of a viber build, never in the middle of it. Today `implementor` orders tasks by `deps` alone, so an Exclusive task whose few dependencies are done goes out while independent unit tasks are still waiting, and because it runs alone it stops all parallel work mid-build. The change makes "integration last" hold at dispatch time and makes a plan that would break it fail validation.

## Acceptance criteria

1. `implementor` dispatches an Exclusive task only when no non-Exclusive task is ready to dispatch and nothing else is in flight; several Exclusive tasks ready together go out one after another.
2. The planner's validation call to `plan-index.sh` (without `--split`) rejects a plan in which any task depends on an Exclusive task, and its error names both the dependent task and the Exclusive one.
3. `plan-index.sh --split` does not apply that check, so the frozen plan of a run resumed after the plugin update still validates and decomposes.
4. `viber/references/plan-rules.md` carries a new `(script)` rule stating that an Exclusive task is a leaf of the dependency graph: no task depends on it.
5. The `plan-index.sh` header comment, the tests in `tests/viber/plan-index.test.ts` and the `viber/CLAUDE.md` node describe the new behaviour, the node staying within its 12000-character cap.

## Scope

### File map

- modify - viber/scripts/plan-index.sh - validation: the new leaf check on the planner's call only; header comment lists it among the exit-4 defects with its `--split` exemption
- modify - tests/viber/plan-index.test.ts - the regression cases for the leaf check and its `--split` exemption
- modify - viber/references/plan-rules.md - the `(script)` leaf rule under `## Tasks`
- modify - viber/skills/implementor/SKILL.md - the dispatch rule for an `excl` task in `## 4. Run the plan`
- modify - viber/CLAUDE.md - the `Exclusive:` invariant bullet, rewritten to name the leaf rule and the dispatch hold

### Out of scope

- `viber/references/test-strategy.md`: the line "Unit tests outnumber integration tests by a wide margin" stays without `(blocking)`.
- No new field in the plan format marking a task as integration; `Exclusive: true` remains the only marker.
- `superdev` and every other plugin.
- `viber/README.md` and the root `README.md`.
