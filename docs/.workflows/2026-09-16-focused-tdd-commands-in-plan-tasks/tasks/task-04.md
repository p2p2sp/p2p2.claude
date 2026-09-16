
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


### Covered criteria
4. Cycle runs focused - Both task implementors run every VERIFY RED and VERIFY GREEN through `<runner>` on the `### TDD Commands` line whose path matches the test file being written, RED with `expect-exit: nonzero` and GREEN with `expect-exit: 0`.
5. RED reason checked - Both task implementors dispatch `superdev:executor` after a RED run only when its `TAIL:` line does not show a test that ran and failed.
6. VERIFY GREEN matches - `skills/tdd/SKILL.md`'s `### VERIFY GREEN` describes the cycle-scoped green plus the full run promised at the end of the task, and still names no runner, no `run.sh` and no `expect-exit`.
