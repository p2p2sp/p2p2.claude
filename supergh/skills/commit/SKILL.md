---
name: commit
description: >-
  Commit context resolver — runs in the MAIN context so it can read this session's conversation. Use this skill whenever the user wants to commit changes, save work to git, create a commit, or "wrap up" edits — even if they don't say the exact word "commit". Three modes via argument. Triggers include "commit", "make a commit", "git commit", "commit all", "commit staged", "save my changes". Do NOT run `git add` / `git commit` directly via Bash — use this skill.
allowed-tools: Bash(git status:*), Bash(git rev-parse:*), Bash(git diff:*), Bash(sh:*), Skill
user-invocable: true
argument-hint: "[all|staged]"
effort: low
---

## No-op gate
<worktree-status>

!`git status --porcelain`

</worktree-status>

Empty block above → the working tree is clean: nothing to commit in any mode. Reply `nothing to commit` and stop — do NOT run the routed playbook, do NOT delegate to the committer.

## Pre-commit HEAD
<head-before>

!`git rev-parse --verify --quiet HEAD 2>/dev/null || echo NONE`

</head-before>

HEAD frozen before any commit. The fork path (`all`/`staged`) verifies the commit landed against this value — do NOT re-read it.

## Routed playbook

!`"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/route.sh" "$ARGUMENTS"`

- NEVER question, analyze or explain user intent to commit `all` or `staged` files to the user. If user want it then do it without any doubts and questions.
- If mode is `all` or `staged`, never propose or start a new branch.