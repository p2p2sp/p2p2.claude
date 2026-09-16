# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Focused TDD commands in plan tasks"
Intent: docs/.workflows/2026-09-16-focused-tdd-commands-in-plan-tasks/intent.md
Plan: C:\Users\dario\.claude-p2p2\plans\humble-whistling-russell.md

---
<!-- HEADER -->

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

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - Add the TDD Commands section to both plan templates
- Covers: `Section in both templates` (#1)
- TDD: none
- Model: sonnet
- Effort: medium

### Dependencies
- none

### Files
- modify - superdev/skills/superplan/templates/plan.md (### TDD Commands)
- modify - superdev/skills/simpleplan/templates/plan.md (### TDD Commands)

### Test Commands
#### Build
- none - markdown only, this repo has no build step

#### Tests
- `test "$(grep -c '^### TDD Commands$' superdev/skills/superplan/templates/plan.md)" -eq 1` - exits 0
- `test "$(grep -c '^### TDD Commands$' superdev/skills/simpleplan/templates/plan.md)" -eq 1` - exits 0
- `node --test "tests/**/*.test.ts"` - all green

### Approach
1. In `superdev/skills/superplan/templates/plan.md`, insert a new section between the `#### Tests` block and `### Approach`, separated by one blank line on each side, with exactly this body:
   ```markdown
   ### TDD Commands
   - <test file path> - <command that runs only that file>
   <one line per test file this task writes; present ONLY on a `TDD: required` task and omitted entirely on `TDD: none`; every path is one this task declares under `### Files`; the command is literal and runnable as written - no placeholder, no filter to be filled in later - and where the host's runner cannot scope to a single file it carries the narrowest scope that does exist>
   ```
2. Insert the identical section, byte for byte, at the same position in `superdev/skills/simpleplan/templates/plan.md`.
3. Leave every `<!-- TASK -->` / `<!-- /TASK -->` marker and every other section untouched, and add the section nowhere else.

### Failure modes
- none - template

### Contracts
- The `### TDD Commands` section shape: one `<test file path> - <command>` line per test file, each path declared under the same task's `### Files`, present only on a `TDD: required` task - consumed by `Teach the plan review rubric the TDD Commands section` (Task 2), `Keep TDD Commands out of the gate contract` (Task 3) and `Run the TDD cycle on the focused command` (Task 4).

### DoD
Both templates carry `### TDD Commands` between `### Test Commands` and `### Approach` with identical body text; both commands above exit 0; the test suite is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - Teach the plan review rubric the TDD Commands section
- Covers: `Presence rule` (#2)
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- `Add the TDD Commands section to both plan templates` (Task 1) - blocks: the rubric names a section that must already exist in the templates.

### Files
- modify - superdev/references/plan-review-checklist.md (stack-agnostic section list, B2, B6, Author self-check)
- modify - superdev/skills/superplan/SKILL.md (Self-Review)
- modify - superdev/skills/simpleplan/SKILL.md (Self-Review)

### Test Commands
#### Build
- none - markdown only, this repo has no build step

#### Tests
- `test "$(grep -c 'TDD Commands' superdev/references/plan-review-checklist.md)" -ge 4` - exits 0
- `test "$(grep -c 'TDD Commands' superdev/skills/superplan/SKILL.md)" -ge 1` - exits 0
- `test "$(grep -c 'TDD Commands' superdev/skills/simpleplan/SKILL.md)" -ge 1` - exits 0
- `node --test "tests/**/*.test.ts"` - all green

### Approach
1. In `superdev/references/plan-review-checklist.md`, add `` `### TDD Commands` `` to the stack-agnostic section enumeration that runs from `### Files` to `Covers:`.
2. Extend B6 (`Missing or invalid task marker`) with the presence rule tied to the `TDD:` marker: a `TDD: required` task carrying no `### TDD Commands` section, a `TDD: none` task carrying one, or a section line whose path is not declared under that task's `### Files`, is B6, settled by reading the task's marker line and its two sections.
3. Extend B2 (`Build/test command mismatch`) so a command in `### TDD Commands` is checked against the repo's real tooling on the same terms as one in `### Test Commands`.
4. Add one `## Author self-check` bullet mirroring step 2's rule.
5. In `superdev/skills/superplan/SKILL.md` and `superdev/skills/simpleplan/SKILL.md`, extend the Self-Review bullet that already names `### Test Commands` so it names `### TDD Commands` beside it.

### Failure modes
- none - rubric

### Contracts
- none

### DoD
The checklist enumerates the new section, B6 carries the presence rule, B2 covers the new commands, `## Author self-check` mirrors B6, and both planner Self-Review bullets name the section; every command above exits 0; the test suite is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - Keep TDD Commands out of the gate contract
- Covers: `Not a gate` (#3)
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- `Add the TDD Commands section to both plan templates` (Task 1) - blocks: the contract names a section that must already exist in the templates.

### Files
- modify - superdev/references/review-contract.md (stack-agnostic section list, ## Gates)

### Test Commands
#### Build
- none - markdown only, this repo has no build step

#### Tests
- `test "$(grep -c 'TDD Commands' superdev/references/review-contract.md)" -ge 2` - exits 0
- `node --test "tests/**/*.test.ts"` - all green

### Approach
1. Add `` `### TDD Commands` `` to the stack-agnostic section enumeration in the file's opening block, beside `### Test Commands`.
2. In `## Gates`, directly under the three-bullet list of gate commands and above the exact-string dedup rule, add one sentence: a task's `### TDD Commands` section is never a gate - it belongs to the TDD cycle of the implementor writing that task, no stage collects it, and a command appearing there and nowhere else runs at no stage of a review.

### Failure modes
- none - contract

### Contracts
- none

### DoD
`review-contract.md` enumerates the new section and its `## Gates` section states the exclusion; the command above exits 0; the test suite is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - Run the TDD cycle on the focused command
- Covers: `Cycle runs focused` (#4), `RED reason checked` (#5), `VERIFY GREEN matches` (#6)
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- `Add the TDD Commands section to both plan templates` (Task 1) - blocks: the implementors read a section that must already exist in the templates.

### Files
- modify - superdev/agents/superbuild-task-implementor.md (## Input task shape, TDD discipline bullet)
- modify - superdev/agents/simplebuild-task-implementor.md (## Input task shape, TDD discipline bullet)
- modify - superdev/skills/tdd/SKILL.md (### VERIFY GREEN)

### Test Commands
#### Build
- none - markdown only, this repo has no build step

#### Tests
- `test "$(grep -c 'TDD Commands' superdev/agents/superbuild-task-implementor.md)" -ge 2` - exits 0
- `test "$(grep -c 'TDD Commands' superdev/agents/simplebuild-task-implementor.md)" -ge 2` - exits 0
- `test "$(grep -c 'TAIL:' superdev/agents/superbuild-task-implementor.md)" -ge 1` - exits 0
- `test "$(grep -c 'TAIL:' superdev/agents/simplebuild-task-implementor.md)" -ge 1` - exits 0
- `! grep -qE 'run\.sh|expect-exit|executor' superdev/skills/tdd/SKILL.md` - exits 0
- `node --test "tests/**/*.test.ts"` - all green

### Approach
1. Rewrite the `TDD: required` bullet in both implementors so the command a VERIFY RED or VERIFY GREEN run carries is the `### TDD Commands` line whose path matches the test file the cycle is writing, taken verbatim; the transport, the heredoc and the `timeout:` rule stay exactly those of the gate step the bullet already points at; RED keeps `expect-exit: nonzero` and GREEN `expect-exit: 0`; and the task's `### Test Commands` stay out of the cycle entirely, run once at the end of the task by that same step.
2. Add the RED reason rule to the same bullet: on a RED whose block says `RESULT: SUCCESS`, read its `TAIL:` line and dispatch `superdev:executor` in analysis mode - `log:`, `exit:`, `duration:` plus the `expect:` sentence - only when that line does not show a test that ran and failed, which covers a compile or transform error, a "no tests found" line, an unrecognisable line and a block carrying no `TAIL:` at all; in doubt, dispatch.
3. Leave the `RESULT: DEVIATION` branch of that bullet as it stands - a RED that passes is a deviation and already forks - and leave both files' gate step untouched.
4. In both implementors, extend the `## Input` line enumerating a plan task's shape so it names `TDD Commands` beside `Test Commands`.
5. Rewrite `### VERIFY GREEN` in `superdev/skills/tdd/SKILL.md` so its heading and first bullet name the cycle's own test file as the green target and place the no-regression sweep at the end of the task; the pristine-output bullet and the rest of the section stay as they are, and no runner, command, `run.sh`, `executor` or `expect-exit` enters the file.

### Failure modes
- when the task is `TDD: required` and its `### TDD Commands` carries no line for the test file the cycle is writing -> response the implementor returns `VERDICT: FAIL` naming that file and changes nothing, log the returned `REASON:` line, test the two `grep -c 'TDD Commands'` commands above, one per implementor, which assert the section is named in both.

### Contracts
- `run.sh`'s `TAIL:` line - the log's last line carrying more than whitespace, omitted entirely when the log holds no such line - consumed here as the RED reason signal, its absence being one of the dispatch triggers.

### DoD
Both implementors take the cycle's command from `### TDD Commands`, carry the `TAIL:` rule and name the section in their input shape list; `tdd/SKILL.md`'s `### VERIFY GREEN` matches what the cycle runs and still names no execution mechanism; every command above exits 0; the test suite is green.

<!-- /TASK -->

---

<!-- repeat Task <N> per unit of work; leave intact all comment markers; keep tasks small, independently testable, and builder-executable unattended (no interactive human step) -->
