---
source: C:/Projects/p2p2.claude/docs/_specs/2026-09-25-17-00-15_fix-the-medium-findings-of-the-viber-review/plan.md
---

# Fix the medium findings of the viber review

Build: skill `implementor`

## Goal

The viber review (`.temp/viber-review/report.md`) found nine medium defects: a fail-open hole in the plan gate, silent loss of contract text on landing, an orchestrator profiling tasks on fields it cannot see, a triage that ignores `issues: false`, broken run branch names, an e2e skill that cannot stop a writer's leftover processes, a setup that leaves no settings file without node, and two documentation claims that contradict the skills. On top of that, the `intent` interview invents questions when the conversation and the code already answer everything. Each defect is fixed on its own, and every script fix is proven by a test. Skill and agent text follows the repo's skill-designer doctrine and grows no more than the fix needs.

## Acceptance criteria

1. With a `planner-review` dispatch that carries a tool-use id and has not returned yet, a later `VERDICT: PASS` belonging to another tool call or agent does not let `ExitPlanMode` through; a dispatch without an id still pairs with the first verdict after it.
2. An HTML comment inside a fenced code block of a plan survives `plan-path.sh --land` and the `spec.md` cut of `plan-index.sh --split`, together with every other line of that block; comments outside fences are still stripped.
3. The `plan-index.sh` index tells the orchestrator, per task, which contract blocks it writes that another task consumes and what its `Verification` command is, and `implementor` decides a task's tier and review from those, never from fields it cannot see.
4. Under `issues: false`, `triage` never fetches or publishes an issue and never names a next step in the `#<N>` form; under `issues: true` its behaviour is unchanged.
5. A `branching.name` pattern whose placeholder expands to nothing never yields a branch name starting or ending with `/`, and a pattern that expands to nothing at all makes the landing refuse the run branch, the way it refuses any other invalid branch name, with a reason naming the empty name.
6. The `e2e` skill answers a writer's "stopped with background work" notice and a reply with no `VERDICT:` line the same way `implementor` does.
7. `merge-settings.sh` with no `node` on PATH and no target file creates the target from the template.
8. `viber/README.md` says viber suggests the interview first, not that it starts it.
9. `usage.html` no longer says the intent and fixer step writes nothing, in either language.
10. When the conversation and the code already answer everything the `intent` summary needs, the interview asks no question and goes straight to the confirmation summary.

## Scope

### File map

- modify - viber/hooks/scripts/plan-gate.sh - dispatch-to-verdict pairing by tool-use id
- modify - tests/viber/plan-gate.test.ts - the foreign PASS while the own review is in flight
- modify - viber/scripts/plan-path.sh - guidance-comment strip on landing, fence aware
- modify - tests/viber/plan-path.test.ts - fence cases of the strip; branch name cases
- modify - viber/scripts/plan-index.sh - `spec.md` comment strip, fence aware; the index's new column and lines
- modify - tests/viber/plan-index.test.ts - fence case of the `spec.md` cut; the new index shape
- modify - viber/skills/implementor/SKILL.md - profiling read from the index's new fields
- modify - viber/skills/triage/SKILL.md - `config.sh` preload and the `issues: false` branch
- modify - viber/scripts/run-branch.sh - branch name expansion and the empty-name refusal
- modify - viber/skills/e2e/SKILL.md - `SendMessage` and the two notice answers
- modify - viber/skills/setup/scripts/merge-settings.sh - missing target created before the node check
- modify - tests/viber/merge-settings.test.ts - no node, no target
- modify - viber/README.md - `issues` row names triage; interview is suggested, not forced
- modify - viber/skills/setup/assets/usage.html - `issues` entry names triage; intent and fixer step wording
- modify - viber/skills/intent/SKILL.md - no-question path straight to the summary

### Out of scope

- Every low finding (L1 to L19) and the informational note of the report.
- The dev-time rules under `.claude/rules/` the report lists as outside the plugin.
- Every `CLAUDE.md` node, `viber/CLAUDE.md` included: the `memory` switch is on, so the build's close records the new index shape, the e2e half of "Stop what you started" and the triage switch handling.
- How `planner` phrases its branch question when the `--branch` report's `new:` name is empty: only the landing refuses an empty name.
- Any other parser of the plan format (`commit-task.sh`, `archive-run.sh`, `run-branch.sh`'s `plan_type()`) and task markers inside fenced blocks.

## Tasks

<!-- TASK -->
### T1 - Bind the plan gate verdict to its own dispatch id
- TDD: required
- Covers: #1
- Uses: none
- Depends-on: none
- Files: viber/hooks/scripts/plan-gate.sh, tests/viber/plan-gate.test.ts
- Delivers: a gate that, for a review dispatch carrying a tool-use id, counts only a verdict line carrying that same id, so a foreign `VERDICT: PASS` arriving while the own review is still running leaves `ExitPlanMode` denied with the "let the review finish" reason; a dispatch without an id keeps the first-verdict-after-it pairing; the header comment states the new pairing rule; a test for "own review in flight, foreign PASS" beside the existing id-binding cases.
- Verification: node --test tests/viber/plan-gate.test.ts -> every test passes, 0 failed
- DoD: a transcript with an id-bearing dispatch followed only by another id's `VERDICT: PASS` is denied; the existing id-binding, background-launch and no-id cases still pass; the header comment names no weak fallback for an id-bearing dispatch
<!-- /TASK -->

<!-- TASK -->
### T2 - Keep comments inside fenced blocks when stripping plan guidance
- TDD: required
- Covers: #2
- Uses: none
- Depends-on: none
- Files: viber/scripts/plan-path.sh, viber/scripts/plan-index.sh, tests/viber/plan-path.test.ts, tests/viber/plan-index.test.ts
- Delivers: a landing strip in `plan-path.sh` and a `spec.md` cut in `plan-index.sh --split` that treat everything between a fence opened by three backticks or three tildes and its closing fence of the same character as content, copied through untouched, blank lines included, while comments outside any fence are stripped as before; both header comments state the fence exception; one test per script with a fenced `<!-- slot -->` line, plus a case where an unclosed comment outside a fence still goes whole.
- Verification: node --test tests/viber/plan-path.test.ts tests/viber/plan-index.test.ts -> every test passes, 0 failed
- DoD: a landed plan keeps a `<!-- slot -->` line inside a `## Contracts` fenced block; `spec.md` keeps a comment line inside a fenced block above `## Tasks`; a guidance comment outside any fence is still removed by both
<!-- /TASK -->

<!-- TASK -->
### T3 - Profile tasks from fields the index actually prints
- TDD: required
- Covers: #3
- Uses: C1
- Depends-on: T2
- Files: viber/scripts/plan-index.sh, tests/viber/plan-index.test.ts, viber/skills/implementor/SKILL.md
- Delivers: an index carrying the `feeds` column and one `verify:` line per task exactly as C1 shapes them, its header comment showing that shape; an `implementor` whose step 2 description of the index names the new fields and whose step 3 takes the load-bearing tier from a non-empty `feeds` column (or many files, or several dependents) and the review waiver only from a `verify:` line that runs the project's build or tests; the exact-stdout index tests updated to the new shape and one test proving `feeds` names a block written by one task and consumed by another.
- Verification: node --test tests/viber/plan-index.test.ts -> every test passes, 0 failed; grep -n "feeds" viber/skills/implementor/SKILL.md viber/scripts/plan-index.sh -> both files match
- DoD: the index header row reads as C1; a task holding a contract's `File:` path that another task names in `Uses:` shows that contract id in `feeds`; every task gets exactly one `verify:` line; `implementor/SKILL.md` step 3 decides tier and review only from index fields
<!-- /TASK -->

<!-- TASK -->
### T4 - Make triage honour the issues switch
- TDD: none
- Covers: #4
- Uses: none
- Depends-on: none
- Files: viber/skills/triage/SKILL.md, viber/README.md, viber/skills/setup/assets/usage.html
- Delivers: a `triage` skill that preloads `config.sh` through one literal `!` line with its matching `allowed-tools` pattern and, under `issues: false`, treats an issue-shaped argument as input it cannot use: one line saying issue handling is off and asking for the pasted issue text, then stop; pasted text is assessed as before and the next step is always named in the one-line-summary form; the `issues` row of the README and the `issues` entry of `usage.html` (both languages) name `triage` among the skills the switch governs.
- Verification: grep -n "scripts/config.sh" viber/skills/triage/SKILL.md viber/skills/fixer/SKILL.md -> both files carry the preload line and the allowed-tools pattern; grep -n "issues: false" viber/skills/triage/SKILL.md -> triage names the switch value; grep -n "plain-plan-review issues" viber/scripts/config.sh -> config.sh declares the key
- DoD: the preload line and its `allowed-tools` pattern are present in `triage/SKILL.md`; the skill states the `issues: false` behaviour for an issue-shaped argument; the README `issues` row names `triage`; the `usage.html` `issues` entry names `triage` in English and Polish
<!-- /TASK -->

<!-- TASK -->
### T5 - Drop dangling slashes from the run branch name
- TDD: required
- Covers: #5
- Uses: none
- Depends-on: T2
- Files: viber/scripts/run-branch.sh, tests/viber/plan-path.test.ts
- Delivers: a branch name expansion that drops a leading or trailing `/` left by an empty placeholder and trims the `-`, `_`, `.` runs left next to it again, so the comment's promise holds; a landing that stops with exit 6 and a reason naming the empty name when the pattern expands to nothing; parameterised `plan-path.test.ts` cases with a custom `branching.name` (`'{issue}/{slug}'` and `'{slug}/{issue}'` without an issue, `'{issue}'` alone) covering both the landing and the `--branch` report's `new:` line.
- Verification: node --test tests/viber/plan-path.test.ts -> every test passes, 0 failed
- DoD: `'{issue}/{slug}'` without an issue yields `add-login` on landing and on the report's `new:` line; `'{slug}/{issue}'` without an issue yields `add-login`; `'{issue}'` without an issue makes the landing exit 6 with HEAD unchanged and a reason on stderr
<!-- /TASK -->

<!-- TASK -->
### T6 - Give e2e its half of stopping the writer's processes
- TDD: none
- Covers: #6
- Uses: none
- Depends-on: none
- Files: viber/skills/e2e/SKILL.md
- Delivers: an `e2e` skill whose `allowed-tools` carries `SendMessage` and whose body answers a writer's "stopped with background work of its own still running" notice and a reply with no `VERDICT:` line with the same two rules `implementor` carries, adapted to the scenario loop (the second failure reads as a `FAIL` of that scenario).
- Verification: grep -n "SendMessage\|stopped with background work" viber/skills/e2e/SKILL.md viber/skills/implementor/SKILL.md -> both files carry both; grep -n "Stop what you started" viber/agents/e2e-writer.md -> the writer's section exists
- DoD: `SendMessage` is in the e2e `allowed-tools`; the body answers the background-work notice once and then acts on the verdict; the body answers a reply with no `VERDICT:` line once and then treats it as a `FAIL` of that scenario
<!-- /TASK -->

<!-- TASK -->
### T7 - Create the missing settings file without node
- TDD: required
- Covers: #7
- Uses: none
- Depends-on: none
- Files: viber/skills/setup/scripts/merge-settings.sh, tests/viber/merge-settings.test.ts
- Delivers: a `merge-settings.sh` that creates a missing target from the template before it checks for `node`, so only a real merge needs node; the header's node-skip description matching that; a test running with no node on PATH and no target.
- Verification: node --test tests/viber/merge-settings.test.ts -> every test passes, 0 failed
- DoD: with no node and no target the script prints `settings.json: created from template`, exits 0 and the target equals the template byte for byte; with no node and an existing target the node-skip case is unchanged
<!-- /TASK -->

<!-- TASK -->
### T8 - Say in the README that viber suggests the interview
- TDD: none
- Covers: #8
- Uses: none
- Depends-on: T4
- Files: viber/README.md
- Delivers: the README's "typical run" paragraph stating that a plan asked for without an interview behind it gets the interview suggested first, and that the user decides; the bug path through `/viber:fixer` stated the same way.
- Verification: grep -n "suggest" viber/README.md viber/skills/planner/SKILL.md -> the README paragraph and the planner's "suggest the `viber:intent` interview" line both match; grep -c "interview starts" viber/README.md -> 0
- DoD: the README no longer says the interview starts on its own; the README says viber suggests the interview and the user decides
<!-- /TASK -->

<!-- TASK -->
### T9 - Correct what usage.html says the first step writes
- TDD: none
- Covers: #9
- Uses: none
- Depends-on: T4
- Files: viber/skills/setup/assets/usage.html
- Delivers: the flow step "Understand" and the `/viber:intent` entry of "The ways in" saying, in English and Polish, that the step writes no production code, that fixer adds only its failing reproduction test ("test reprodukcyjny" in Polish), and, for intent, that it can save its summary as an issue when `issues` is on.
- Verification: grep -c "Writes nothing\|Niczego nie zapisuje" viber/skills/setup/assets/usage.html -> 0; grep -n "reproduction test" viber/skills/fixer/SKILL.md viber/skills/setup/assets/usage.html -> both files match; grep -n "test reprodukcyjny" viber/skills/setup/assets/usage.html -> the Polish flow step matches; grep -n "issues" viber/skills/setup/assets/usage.html viber/scripts/config.sh -> the intent entry names the switch in both languages, config.sh declares it
- DoD: neither English nor Polish text claims the step writes nothing; the flow step names fixer's failing test in both languages; the intent entry names the optional issue in both languages
<!-- /TASK -->

<!-- TASK -->
### T10 - Let the interview skip straight to the summary when nothing is open
- TDD: none
- Covers: #10
- Uses: none
- Depends-on: none
- Files: viber/skills/intent/SKILL.md
- Delivers: an `intent` skill that, when the conversation and the code already settle everything its `## Done` section requires, asks no question and opens with the settled line followed directly by the confirmation summary; the rule sits in `## Before the first question` and names `## Done` as where it goes; the "too simple to need a design" line no longer reads as a demand to ask questions.
- Verification: grep -n -A12 "^## Before the first question" viber/skills/intent/SKILL.md -> the section carries a line naming `## Done` as the next step when nothing is open; grep -n "^## Done" viber/skills/intent/SKILL.md -> the target section exists
- DoD: the skill states the no-question path to the summary; the path still ends on the same confirmation and hand-off as an interview with questions; the anti-pattern line and the new rule do not contradict each other
<!-- /TASK -->

## Contracts

### C1 - Task index shape

File: viber/scripts/plan-index.sh

```
tasks: id | state | tdd | excl | deps | feeds | files | title
T1 | todo | required | - | - | C1 | src/login.ts | Add the login handler
T2 | todo | required | - | T1 | - | src/reject.ts | Reject a bad password
verify: T1 | node --test tests/login.test.ts
verify: T2 | grep -n "reject" src/reject.ts
```

- `feeds`: comma-separated ids of the contract blocks whose `File:` path is in this task's `Files` and which at least one other task names in `Uses`; `-` when none. A block on `File: none` feeds nothing.
- `verify:` lines: one per task, in task order, right after the task rows and before any `dirty:` line; the value is the task's `Verification` text up to its first ` -> `, trimmed, the whole value when it has none. The command is the last field, so a `|` inside it is part of the command.
