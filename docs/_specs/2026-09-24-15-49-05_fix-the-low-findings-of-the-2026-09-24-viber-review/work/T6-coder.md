# T6 - coder notes

- `has_tasks()` and `progress_of()`'s TASK-open counter now both anchor on C3
  (`^[[:space:]]*<!--...-->[[:space:]]*$`), so a prose mention of the marker never
  opens a draft into a run nor inflates the total.
- `progress_of()` now parses task ids out of each TASK block's `### <id> - <title>`
  line (same shape `plan-index.sh` uses) and only lets a `done:`/`skipped:` token
  settle a task when it names a known id AND has not already settled one - an
  unknown or repeated id is silently ignored, so the run stays open.
- Other files touching the same C3 marker (`plan-index.sh`, `commit-task.sh`,
  `archive-run.sh`) are out of this task's `Files:` and were left untouched even
  though they carry the same unanchored pattern - they belong to sibling tasks in
  this plan (visible as concurrent dirty files in the shared tree).
