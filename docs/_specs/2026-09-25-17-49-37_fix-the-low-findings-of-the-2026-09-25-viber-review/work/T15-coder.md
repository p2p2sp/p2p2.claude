# T15 coder notes

- The fourth caller is planner's ADR-task step (`skills/planner/references/adr-tasks.md` step 3,
  `date +%Y%m%d%H%M%S`), not an agent: it runs after the step-2 prose accept/drop question, so its
  own `allowed-tools` pre-approval (turn-scoped) has already expired by the time it runs.
- triage's and prototype's `post-comment.sh` and intent's `create-issue.sh`/`post-comment.sh`
  calls are the same pattern: each follows a prose question that ends the turn.
- Added the sentence to the Install section (the README's only place discussing what `/viber:setup`
  writes into `.claude/settings.json` before the "Where it writes" section repeats the settings
  detail), matching the task's "install notes" wording.
