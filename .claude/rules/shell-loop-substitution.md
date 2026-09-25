---
paths:
  - "superfix/skills/code-auditor/scripts/*.sh"
  - "supercc/skills/*/scripts/*.sh"
  - "superui/skills/pro-designer/scripts/*.sh"
  - "viber/scripts/*.sh"
  - "viber/hooks/scripts/*.sh"
  - "viber/skills/*/scripts/*.sh"
---

# Shell loop over command output

- Feed a `while read` loop through process substitution (`done < <(cmd)`), never a piped
  `cmd | while read` and never a heredoc. A pipe forks the loop body into a subshell, so any
  variable it sets is gone once the loop exits; a heredoc is forbidden outright (root
  `CLAUDE.md`). `viber/skills/memory/scripts/memory-map.sh:163` runs
  `done < <(git status --porcelain -z -uall 2>/dev/null || true)` so the counters
  (`nodes`, `removed`, `total`) it sets inside the loop still hold once it exits; the same shape
  covers `viber/scripts/commit-task.sh`, `viber/scripts/check-playwright.sh` and
  `viber/skills/commit/scripts/commit.sh`.
