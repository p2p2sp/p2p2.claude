---
paths:
  - "superdev/skills/dev-agent-task-reviewer/**"
---
# Git Review Conventions

- New untracked files do not appear in `git diff <base>` or `git diff --name-only <base>`; when a task adds only new files (docs-only, seed files), use `git status --short` + direct `Read` to confirm deliverables — never rely on the diff being non-empty.
