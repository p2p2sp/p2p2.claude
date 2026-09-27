To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Written-only end-to-end tasks and tighter plan dependency and coverage rules

## Goal

A build writes end-to-end tests without running them unless the user asked for them to be run, so no task holds the whole build waiting on a browser. Plans lose dependency edges that constrain nothing, so independent tasks run in parallel and no task is profiled above its weight. Every acceptance criterion a task claims is tied to a done clause that proves it.

## Acceptance criteria

1. A plan's end-to-end task only writes the tests - `TDD: none`, no `Exclusive`, a `Verification` that never executes them - and such a test is run only under an acceptance criterion stating the user asked in their own words for it to be run; `plan-rules.md`, `test-strategy.md`, the `intent` skill and `PRODUCT.md` state the same.
2. `plan-rules.md` puts a shape several tasks consume into a task of its own ahead of them whenever the task that would otherwise write it carries behaviour too.
3. The plain `plan-index.sh` call rejects a `Depends-on` entry already reached through another entry of the same line, the `--split` call exempts it, and `plan-rules.md` lists that rule tagged `(script)`.
4. `planner-review` checks every dependency edge in both directions and rates an edge whose dependent consumes nothing from its target as Blocking.
5. `plan-rules.md` requires every criterion a task's `Covers` names to be proven by a done clause (by the union of their clauses when several tasks cover it), treats a done clause proving nothing in `Covers` or `Delivers` as a finding, and requires the test proving each clause to run inside the task's `Verification`, a write-only end-to-end task excepted.

## Scope

### File map

- modify - viber/scripts/plan-index.sh - plan validation, including the new redundant-dependency check and its header entry
- modify - tests/viber/plan-index.test.ts - regression cases for the redundant-dependency check, plain and `--split`
- modify - viber/agents/planner-review.md - the plan gate's dependency check, both directions
- modify - viber/references/plan-rules.md - the End-to-end, Owned, Covered and Provable rules and the new Minimal rule
- modify - viber/references/test-strategy.md - the end-to-end rule, writing apart from running
- modify - viber/skills/intent/SKILL.md - the done-condition step records a request to run end-to-end tests apart from one to write them
- modify - viber/PRODUCT.md - the end-to-end product assumption

### Out of scope

- `/viber:e2e` and `e2e-writer`: the user invoking it is the explicit request to run.
- `plain-plan-review`.
- Shared wiring files (a registry, an export index, a route table) forcing chains through the Disjoint rule.
- Every other `plan-index.sh` graph rule.
- `task-coder`, `task-reviewer` and `implementor` bodies: they read `test-strategy.md` and the plan, which carry the change.
- `viber/CLAUDE.md` and its `CLAUDE.*.md` sections: the build's memory close updates them.
