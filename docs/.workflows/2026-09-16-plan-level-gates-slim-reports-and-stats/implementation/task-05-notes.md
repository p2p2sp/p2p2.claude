# Task 5 notes

## Runs
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-implementor.md -> FAIL=0 WARN=1

Approach step 5 covers only the TDD clause's RED/GREEN binding and its stop condition, but that
clause also carried the removed-section sentence; it was rewritten with step 3's gate wording (the
plan header's own gate block never enters a cycle and never runs here) rather than dropped, so the
"nothing outside Task Checks runs in this task" rule still holds inside the TDD path.

UNDERSPECIFIED: the `## Runs` fallback line - written for any pass in which nothing ran, not only for
a `### Task Checks` section reading `none - <reason>`, because the fix-mode no-match branch also runs
nothing and would otherwise leave the section empty.

Both step headings (`## 2. Build + Test`, `## 3. Run Build & Tests`) and the superbuild opening
`Order is fixed:` line are unchanged: `### Task Checks` carries compile and lint commands too, so the
wording stays true and `### Files` names those sections by it.

CARRY: superdev/skills/superbuild/SKILL.md - `### Loop` step 3 FAIL branch says "`plan` lets it
source the real Test Commands"; that section no longer exists and the label now sources
`### Task Checks`.
