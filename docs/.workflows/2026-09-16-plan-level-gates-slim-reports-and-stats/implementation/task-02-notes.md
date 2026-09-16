# Task 2 - Give both planners judgment criteria for the gate, the task checks and the build strength

## Runs
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan -> FAIL=0 WARN=0

Approach step 3's `### Task Checks` criteria were stated in a new `**Task Checks**` block (placed after `**Remember**`, before `**TDD Discipline**`) in both SKILL.md rather than inside `**TDD Discipline**`, whose old in-memory paragraph shrank to the one sentence binding the TDD cycle to the `### Task Checks` line naming the test file - why: the criteria govern every task, `TDD: none` included, so they read wrong as a sub-rule of the TDD marker; the step fixed the wording, not the location.

Approach step 5's `Review:` rule sits at the end of `**Build strength**` in superplan - why: it is the third dispatch-strength marker and is judged against the same two value sets as `Model:` and `Effort:`.

Only the task's `#### Build` line ran; the second lint (`lint_skill.sh superdev/skills/simpleplan`) is a `#### Tests` gate line, which belongs to the build reviewers, not to the implementor - why: the implementor never runs the plan-level gate. simpleplan/SKILL.md was instead inspected against every lint FAIL branch (frontmatter untouched, body 135 lines, no em/en dash, no table, no emoji, no `(read|load|check|consult)…CLAUDE.md` line).

UNDERSPECIFIED: the `Effort: medium` band - the covered criterion names only the `sonnet`/`low`, `opus`/`high` and `xhigh` poles, so `medium` was kept as the band between them (a task following a pattern already in the repo while running a real test cycle of its own), carrying over the surviving half of the old rubric's `medium` clause rather than dropping the value from the rules.
