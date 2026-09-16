# Task 6 notes

## Runs
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-reviewer.md -> FAIL=0 WARN=1

Approach step 3 asks only for the `## Runs` shape on the `notes` label; that bullet also gained the
clause that the reviewer writes to the same path, because `## Output format` now hands it a write and
the label read "never read as input" nowhere else.

Both `### Failure modes` entries live inside the notes-only bullet of `## Output format` rather than
in a branch of their own: each is one sentence of the same path, and a separate section would restate
it.

The lint's one WARN (description 8 words) stands: the description is the routing guard every
dispatched superdev agent carries, and the task's `### Files` scopes the edit to the frontmatter
strength, `## Input`, `## Check` and `## Output format`.
