The task file's `### Test Commands` carried the `#### Tests` block only;
CARRY: superdev/agents/superbuild-task-reviewer.md - lint_skill.sh reports one pre-existing WARN (frontmatter `description:` has 8 words); it is the deliberate routing-guard wording and outside this task's `## Input` / `## Check` scope, so it was left in place.

C1 (fix round 1) - `.claude/settings.json` carries a `modelOverrides` block (opus to claude-opus-4-8) added outside this task's `### Files`; the user accepted keeping it and including it in Task 6's commit (see `implementation/decisions.md`, C1), so it is declared here instead of reverted - undeclared, commit-task.sh would refuse the commit outright.
touched: .claude/settings.json
Correction to the first line of this file: the plan's Task 6 does carry a `#### Build` block; the working-tree copy of `tasks/task-06.md` has it deleted, so that line described the edited task file, not the plan or the file at HEAD. The build command was run either way, so the recorded gate result stands.
CARRY: docs/.workflows/2026-09-16-implementor-runs-task-tests-directly/tasks/task-06.md - the working tree deletes the `#### Build` block from this file and from `tasks/task-07.md`, which plan.md still carries for both tasks; the files sit under the run directory, outside this task's `### Files`, so the drift was left in place for the final review.
C1: fixed - no test: the finding is a bookkeeping gap in this run's notes file (a working-tree path left undeclared), and no repository test can assert the content of a run's notes file.
