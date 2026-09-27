---
source: /Users/dario/Projects/p2p2.claude/docs/_specs/2026-09-27-09-56-21_written-only-end-to-end-tasks-and-tighter-plan-dependency-an/plan.md
---

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

## Tasks

<!-- TASK -->
### T1 - Reject a redundant direct dependency in plan-index.sh
- TDD: required
- Covers: #3
- Uses: C1
- Depends-on: none
- Files: viber/scripts/plan-index.sh, tests/viber/plan-index.test.ts
- Delivers: the plain validation call fails with exit 4 and one C1 line for every `Depends-on` entry already reachable, directly or transitively, through another entry of the same task's line; the `--split` call skips the check, as it skips the other rules a frozen plan may predate; the header's exit-4 list names the new case among those exempted under `--split`.
- Verification: `node --test tests/viber/plan-index.test.ts` -> every test passes, the new cases among them
- DoD: a plan where T3 depends on T1 and T2 while T2 depends on T1 exits 4 with the C1 line naming T3, T1 and T2; a plan where T4 depends on T1 and T3 while T3 reaches T1 only through T2 exits 4 with the C1 line naming T4, T1 and T3; the first plan exits 0 under `--split`; a plan where T3 depends on T1 and T2 with no path between T1 and T2 exits 0
<!-- /TASK -->

<!-- TASK -->
### T2 - Make planner-review check every dependency edge both ways
- TDD: none
- Covers: #4
- Uses: none
- Depends-on: none
- Files: viber/agents/planner-review.md
- Delivers: the `Fed in order` check is replaced by one check covering both directions: every file, route or symbol a task reads has its producing task reachable through `Depends-on`, and every `Depends-on` edge names what the dependent consumes from its target - a file, route or symbol it reads, or a file both list; an edge consuming nothing is Blocking because it serialises tasks that could run in parallel. The check does not restate the Ordered rule's wording.
- Verification: `grep -n "consumes nothing" viber/agents/planner-review.md && ! grep -q "^- Fed in order:" viber/agents/planner-review.md` -> the grep prints one line and the command exits 0
- DoD: one check replaces `Fed in order` rather than sitting beside it; the missing-dependency direction keeps its direct or transitive reach; an edge whose dependent consumes nothing from its target is named Blocking; the agent file grows by at most two lines
<!-- /TASK -->

<!-- TASK -->
### T3 - Plan end-to-end tests as written, never run
- TDD: none
- Covers: #1
- Uses: none
- Depends-on: none
- Files: viber/references/plan-rules.md, viber/references/test-strategy.md, viber/skills/intent/SKILL.md, viber/PRODUCT.md
- Delivers: the End-to-end rule of `plan-rules.md` rewritten in place: an end-to-end test appears only under an acceptance criterion stating the user asked for one in their own words, and its task by default only writes it - `TDD: none`, no `Exclusive`, depending only on the tasks whose routes, selectors or endpoints it reads, its `Verification` never executing it but running the test tool's own listing or type-check step plus a grep of one route or selector on both sides, the test and the source declaring it; its done clauses are proven by that listing step and grep, never by running it; only a criterion stating the user asked in their own words for it to be run makes it an integration task. The TDD rule's list of `TDD: none` cases gains the write-only end-to-end task. `test-strategy.md`'s end-to-end rule separates the two: written only by a task whose criterion states the user asked for one, run only by a task whose criterion states the user asked for it to be run, still `(blocking)`. `intent`'s done-condition step carries a request to run the tests into the summary apart from a request to write them, and never proposes running them. `PRODUCT.md`'s end-to-end assumption states the written-only default. No file names a stack-specific tool.
- Verification: `grep -q "asked for it to be run" viber/references/plan-rules.md && grep -q "asked for it to be run" viber/references/test-strategy.md && grep -q "asked for it to be run" viber/skills/intent/SKILL.md && grep -q "asked for it to be run" viber/PRODUCT.md && ! grep -q "then as an integration task" viber/references/plan-rules.md` -> exit 0
- DoD: `plan-rules.md`'s End-to-end rule makes the default task write-only, `TDD: none`, not `Exclusive`, with a `Verification` that never executes the test; the same rule makes the task an integration task only under a criterion stating the user asked for it to be run; the TDD rule lists the write-only end-to-end task among its `TDD: none` cases; `test-strategy.md` separates writing from running and keeps the rule `(blocking)`; `intent` records a request to run apart from a request to write and never proposes running; `PRODUCT.md` states the written-only default; none of the four files names a stack-specific tool
<!-- /TASK -->

<!-- TASK -->
### T4 - Isolate a shared contract shape and forbid redundant dependencies in plan-rules
- TDD: none
- Covers: #2, #3
- Uses: C1
- Depends-on: T1, T3
- Files: viber/references/plan-rules.md
- Delivers: the Owned rule's sentence on who writes a shape two tasks need extended in place: a shape several tasks consume lands in a task of its own ahead of them when the task that would otherwise write it carries behaviour too, so its consumers wait for the shape, never for the behaviour. A new `Minimal` bullet beside `Depends`, tagged `(script)`: no `Depends-on` entry names a task already reached through another entry of the same line.
- Verification: `grep -n "^- Minimal:.*(script)$" viber/references/plan-rules.md && grep -n "is already reached through" viber/scripts/plan-index.sh && grep -n "never for the behaviour" viber/references/plan-rules.md` -> each prints one line
- DoD: the Owned rule carries the shape-first placement inside its existing sentence, with no new bullet for it; a `Minimal` bullet tagged `(script)` sits right after `Depends` and matches what C1 rejects; no rule other than Owned is reworded
<!-- /TASK -->

<!-- TASK -->
### T5 - Tie every covered criterion to a done clause in plan-rules
- TDD: none
- Covers: #5
- Uses: none
- Depends-on: T4
- Files: viber/references/plan-rules.md
- Delivers: the Covered rule extended in place: every criterion a task's `Covers` names is proven by one of its done clauses, a criterion several tasks cover by the union of their done clauses, and a done clause proving nothing in `Covers` or `Delivers` is a finding. The Provable rule extended in place: the test proving each done clause runs inside the task's `Verification` command, a write-only end-to-end task excepted, whose clauses the End-to-end rule proves without running the test.
- Verification: `grep -n "^- Covered:.*union of their done clauses" viber/references/plan-rules.md && grep -n "^- Provable:.*inside the task's .Verification. command" viber/references/plan-rules.md && grep -c "^- \(Covered\|Provable\):" viber/references/plan-rules.md` -> the first two greps print one line each and the count prints 2
- DoD: the Covered rule ties each covered criterion to a done clause, several covering tasks by the union of their clauses; the Covered rule makes a done clause proving nothing in `Covers` or `Delivers` a finding; the Provable rule requires each clause's test to run inside `Verification`; the Provable rule excepts the write-only end-to-end task and agrees with the End-to-end rule; both extensions sit inside the existing sentences, with no new bullet
<!-- /TASK -->

## Contracts

### C1 - Redundant dependency error

File: viber/scripts/plan-index.sh

One stderr line per redundant entry, exit 4, nothing on stdout:

`task <id>: Depends-on <dep> is already reached through <via> - drop it`
