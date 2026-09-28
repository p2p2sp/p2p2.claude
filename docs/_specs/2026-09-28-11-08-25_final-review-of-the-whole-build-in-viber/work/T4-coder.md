# T4 - notes

- `final-reviewer.md` finds each task's commit by matching the git subject convention
  `commit-task.sh` already uses (`<task id> - <title>`, or `<task id>(<n>) - <title>` for a
  post-review fix) - no new commit metadata was needed for slice discovery.
- The reviewer's slice-exclusion rule ("less every file a lower-numbered task outside `tasks`
  also changed") is stated as prose the agent follows at dispatch time, not as pseudocode: T5,
  which computes and passes the `tasks:` groups, is what actually enforces "every changed file
  reviewed exactly once" (S5); this task only had to make the agent itself honour the same rule
  over its own slice's files.
- Reused `key-cleanup` -> `agent-closeout` as the template for linking `key-final-review` to the
  new `agent-final-reviewer` line, and colored the agent `yellow` like the other review-role
  agents (`task-reviewer`, `planner-review`, `plain-plan-review`).
