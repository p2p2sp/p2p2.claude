# T4 coder notes

- Removed all `Exclusive: true` scoping from task-coder.md and task-reviewer.md's integration-test
  rules entirely (both had exactly one such mention) rather than adding a parallel unscoped rule
  beside it, per `.claude/rules/instruction-editing.md`'s "extend in place" convention.
- planner-review.md and planner/SKILL.md both used "with/has an integration task" wording that the
  task's own negated-grep bans; reworded both to "carries/carrying an integration test" - matches
  the C2 vocabulary (tests, not tasks) and clears the grep.
- No test files touched (TDD: none, doc/prompt-only task); nothing to defer.
