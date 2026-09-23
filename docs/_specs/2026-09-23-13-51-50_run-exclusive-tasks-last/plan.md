---
source: C:\Users\dario\.claude-dario\plans\quiet-foraging-perlis.md
---

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

## Tasks

<!-- TASK -->
### T1 - Refuse a dependency on an Exclusive task at plan validation
- TDD: required
- Covers: #2, #3, #4, #5
- Uses: C1
- Depends-on: none
- Files: viber/scripts/plan-index.sh, tests/viber/plan-index.test.ts, viber/references/plan-rules.md
- Delivers: `plan-index.sh` without `--split` rejects, with exit 4 and the C1 message per offending dependency, any task whose `Depends-on` names a task marked `Exclusive: true`; with `--split` the same plan validates and decomposes as before; the header comment lists the defect among the exit-4 cases together with its `--split` exemption and why (a landed plan is frozen and a resumed run must still validate); `plan-rules.md` carries the rule tagged `(script)`, with the clause that work another task needs never sits in an Exclusive task and is split out of it.
- Verification: `node --test tests/viber/plan-index.test.ts` -> every test passes, including the new cases for the rejected dependency, the `--split` exemption and an Exclusive task that itself depends on other tasks.
- DoD: a plan where T2 depends on an Exclusive T1 exits 4 on the validation call, stdout empty, stderr matching C1 with both ids; the same plan under `--split` exits 0 and writes `tasks/`, as its own test case; a plan whose Exclusive task depends on earlier tasks and has no dependents exits 0 under `--split`, as its own test case (the validation-call half is already the existing test at `tests/viber/plan-index.test.ts:291`); the header comment names the new exit-4 defect and its `--split` exemption; `plan-rules.md` has one new `(script)` line stating an Exclusive task is never named in another task's `Depends-on`; the whole `tests/viber/plan-index.test.ts` file passes
<!-- /TASK -->

<!-- TASK -->
### T2 - Hold an Exclusive task until nothing else is ready or in flight
- TDD: none
- Covers: #1, #5
- Uses: none
- Depends-on: T1
- Files: viber/skills/implementor/SKILL.md, viber/CLAUDE.md
- Delivers: the `excl` bullet in `## 4. Run the plan` of `implementor` states that such a task goes out only when no task without `excl` is ready to dispatch and nothing else is in flight, that several ready ones go out one after another, and that each still runs alone until committed; the section's opening sentence no longer claims `deps` is the only ordering, naming the `excl` hold beside it; the `viber/CLAUDE.md` `Exclusive:` bullet states that an Exclusive task is a leaf the validation call enforces (skipped under `--split`) and that `implementor` holds it until nothing else can run, the node staying within 12000 characters.
- Verification: `grep -nE "excl|Exclusive|no task may depend on it" viber/skills/implementor/SKILL.md viber/CLAUDE.md viber/scripts/plan-index.sh` plus `wc -m viber/CLAUDE.md` -> the implementor `excl` bullet names both conditions (no task without `excl` ready, nothing in flight), the node bullet names the leaf rule and its `--split` exemption, `plan-index.sh` shows the C1 message T1 added (the check the node describes), and the node count is at most 12000.
- DoD: the implementor `excl` bullet holds such a task back while any task without `excl` is ready or anything is in flight; the same bullet sends several ready Exclusive tasks one after another; the same bullet keeps "runs alone until committed"; the opening sentence of `## 4. Run the plan` names the `excl` hold beside `deps`; the node `Exclusive:` bullet names the leaf rule and the `--split` exemption; `wc -m viber/CLAUDE.md` reports at most 12000
<!-- /TASK -->

## Contracts

### C1 - Leaf-rule rejection message

File: viber/scripts/plan-index.sh

error: task <dependent-id>: Depends-on <exclusive-id>, an Exclusive task - it runs last, so no task may depend on it
