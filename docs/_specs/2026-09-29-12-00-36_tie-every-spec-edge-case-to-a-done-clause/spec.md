To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Tie every spec edge case to a done clause

## Goal

A `spec-full` specification lists edge cases under `### Edge cases`, yet no plan rule ties them to a task, so an edge case can pass through a build with nothing proving it. The plan reviewer should reject a plan that leaves a listed edge case without a done clause, while the section itself stays limited to behaviour the change introduces or changes.

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
