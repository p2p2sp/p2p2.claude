---
source: C:/Projects/p2p2.claude/docs/_specs/2026-09-29-12-00-36_tie-every-spec-edge-case-to-a-done-clause/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Tie every spec edge case to a done clause

## Goal

A `spec-full` specification lists edge cases under `### Edge cases`, yet no plan rule ties them to a task, so an edge case can pass through a build with nothing proving it. The plan reviewer should reject a plan that leaves a listed edge case without a done clause, while the section itself stays limited to behaviour the change introduces or changes.

## Roadmap

Part 1 of 4 - Edge cases in the plan

1. Edge cases in the plan (this plan)
2. Fast path: a small change with no plan document
   - A small, well-scoped change to existing code gets a short design shown in chat instead of a plan file.
   - The build starts only after the user's explicit "yes".
   - No plan file and no run directory.
3. Baseline test run behind a switch in `viber.yml`
   - The switch lives in `viber.yml`.
   - With it on, the test runner runs once before the first task dispatch.
   - A red baseline asks continue or abort and records the pre-existing failures.
   - The final test run treats only new failures as repair work.
4. Full autonomy with a ruling register
   - The build decides conflicts, ambiguities and stalled tasks itself instead of asking.
   - Every such decision is recorded as a ruling with its reason and its cost if wrong.
   - The final summary lists every ruling.
   - `VERDICT: DENIED` stays a stop.
   - It consumes part 3's list of pre-existing failures.

## Acceptance criteria

1. `viber/references/plan-rules.md` carries a `(review)` rule requiring every entry of `### Edge cases` to be tied to at least one task's done clause, a missing one being a plan reviewer finding.
2. The same rule states that `### Edge cases` holds only cases of behaviour the change introduces or changes, and that a case of untouched behaviour belongs under `### Must not change`.
3. Under the `Covered` rule, a done clause proving an edge case is not a finding.

## Scope

### File map

- modify - viber/references/plan-rules.md - the `Covered` rule of the Tasks section, extended in place to edge cases

Every planner and every plan reviewer reads `plan-rules.md`, so the addition costs the minimum extra tokens: a clause or two inside the existing sentence, never a new bullet.

### Out of scope

- The plan format and every parser (`plan-index.sh`, `plan-path.sh`, `commit-task.sh`, `archive-run.sh`, `run-branch.sh`).
- The `spec-lite` template.
- `task-coder`, `task-reviewer`, `final-reviewer` and `help.html`.
- Roadmap part 2: Fast path: a small change with no plan document.
- Roadmap part 3: Baseline test run behind a switch in `viber.yml`.
- Roadmap part 4: Full autonomy with a ruling register.

## Tasks

<!-- TASK -->
### T1 - Tie spec edge cases to done clauses in the Covered rule
- TDD: none
- Covers: #1, #2, #3
- Uses: none
- Depends-on: none
- Files: viber/references/plan-rules.md
- Delivers: the `Covered` rule of `plan-rules.md`, extended within its own bullet so every `### Edge cases` entry - limited to behaviour the change introduces or changes, untouched behaviour belonging under `### Must not change` - is tied to at least one task's done clause, and a done clause proving an edge case no longer counts as proving nothing
- Verification: `grep -c -E "^- Covered:.*### Edge cases.*### Must not change|^### (Edge cases|Must not change)$" viber/references/plan-rules.md viber/skills/planner/templates/spec-full.md` -> `plan-rules.md:1` and `spec-full.md:2`
- DoD: the `Covered` bullet requires every `### Edge cases` entry to be tied to at least one task's done clause and names a missing one a finding; the same bullet limits `### Edge cases` to behaviour the change introduces or changes and sends untouched behaviour to `### Must not change`; the bullet's closing finding counts a done clause proving an edge case as proving something; the change stays inside the existing `Covered` bullet, still tagged `(review)`, with no new bullet added to `plan-rules.md`; the `Covered` bullet grows by no more than two clauses
<!-- /TASK -->
