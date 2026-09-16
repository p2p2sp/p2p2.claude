Title: "Focused TDD commands in plan tasks"
Intent: docs/.workflows/2026-09-16-focused-tdd-commands-in-plan-tasks/intent.md


## Goal
Every `TDD: required` plan task carries a per-file focused test command, both task implementors run the TDD cycle through that command instead of the task's full `### Test Commands`, and a RED run's failure reason is checked from the `TAIL:` line without forking in the healthy case.

## Context
Today both implementors run a TDD cycle's VERIFY RED and VERIFY GREEN on the task's `### Test Commands`, which is the full suite, and RED goes out with `expect-exit: nonzero`. A full-suite run that exits non-zero for any reason - an unrelated failing test, a compile error - satisfies that expectation, so VERIFY RED proves nothing about the test just written, and every cycle pays for a full suite twice. The plan template has no place to record a narrower command, and the tdd skill is knowledge only: it names no runner and never sees the implementor's execution contract. This plan adds one new plan-task section, `### TDD Commands`, wires both implementors to it, and closes the RED reason hole using the `TAIL:` line that `run.sh` already prints and `references/review-contract.md` already sanctions as evidence on a no-fork path.

## Out of scope
- `superdev/references/adr-task.md` - that canned task is `TDD: none`.
- `superdev/agents/superbuild-task-reviewer.md` - it runs no gate commands.
- `superdev/skills/executor/scripts/run.sh` and the `superdev:executor` skill.
- An advisory rule that three test files in one task signal an oversized task.

## Acceptance criteria
1. Section in both templates - Both plan templates carry `### TDD Commands` immediately after `### Test Commands` and before `### Approach`, holding one `<test file path> - <command>` line per test file, annotated as present only on a `TDD: required` task.
2. Presence rule - The plan review rubric lists `### TDD Commands` among the plan's task sections, flags a `TDD: required` task without it and a `TDD: none` task carrying it, checks each line's path against that task's `### Files` and each command against the repo's real tooling, and both planners' self-review lines name the section.
3. Not a gate - `references/review-contract.md` lists `### TDD Commands` among the task sections it refers to and states in `## Gates` that it is never collected as a gate command.
4. Cycle runs focused - Both task implementors run every VERIFY RED and VERIFY GREEN through `<runner>` on the `### TDD Commands` line whose path matches the test file being written, RED with `expect-exit: nonzero` and GREEN with `expect-exit: 0`.
5. RED reason checked - Both task implementors dispatch `superdev:executor` after a RED run only when its `TAIL:` line does not show a test that ran and failed.
6. VERIFY GREEN matches - `skills/tdd/SKILL.md`'s `### VERIFY GREEN` describes the cycle-scoped green plus the full run promised at the end of the task, and still names no runner, no `run.sh` and no `expect-exit`.

