# Task 3 - Cut the plan review checklist classes at judgment instead of commands

## Runs
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan-reviewer -> FAIL=0 WARN=1

Approach step 5's rename sweep turned `B13`'s single `### Test Commands` mention into two sections, `## Gate commands` and `### Task Checks` - why: the old per-task `### Test Commands` block split into a header gate and a per-task check list, so both are now places a test can be described, and naming only one of them would have narrowed B13.

`B6` closes with a pointer to B17 (`what a task runs as its own proof is B17, not this`) beyond the marker-only rewrite the step asked for - why: the clauses moved out of B6 need a visible destination, otherwise the two classes read as a gap rather than a cut.

Only the task's `#### Build` line ran; the `#### Tests` greps and the second lint (`lint_skill.sh superdev/skills/simpleplan-reviewer`) are gate lines belonging to the build reviewers, not to the implementor. `### Task Tests` reads `none - <reason>`, so the build alone proves this task. The five changed files were instead inspected directly: one `^- B17 - ` line, `B1-B17` twice in the checklist and once in each of the two reviewers, no `B1-B16` and no `Test Commands` / `Task Tests` string left in any of the five, no em/en dash.

The advisory `Model:` / `Effort:` / `Review:` too-low item stayed in the `## Advisory (NOTES)` opening paragraph where it already lived, and the new gate-with-nothing-to-run item became a third named bullet under it (`Three named items ride here too`) - why: the opening paragraph owns the marker-strength judgment, while the named bullets own the per-plan shapes.

UNDERSPECIFIED: what counts as "a plan that moves code with no command anywhere in `## Gate commands`" for the new advisory item - read as all three subsections carrying `none - <reason>`, since a single subsection holding a command already gives the build a gate, and a reasonless or repo-contradicted `none` is B17 rather than advisory.
