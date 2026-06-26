---
name: commit
description: >-
  Commit context resolver — runs in the MAIN context so it can read this session's conversation. Use this skill whenever the user wants to commit changes, save work to git, create a commit, or "wrap up" edits — even if they don't say the exact word "commit". Three modes via argument. Triggers include "commit", "make a commit", "git commit", "commit all", "commit staged", "save my changes". Do NOT run `git add` / `git commit` directly via Bash — use this skill.
allowed-tools: Bash(git status:*), Bash(git rev-parse:*), Bash(sh:*), Skill
user-invocable: true
argument-hint: "[all|staged]"
effort: low
---

!`"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/route.sh" "$ARGUMENTS"`

- Never question or analyze user intent to commit `all` or `staged` files.
- If mode is `all` or `staged`, never propose or start a new branch.