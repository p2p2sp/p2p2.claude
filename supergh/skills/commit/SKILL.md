---
name: commit
description: >-
  Commit context resolver — runs in the MAIN context so it can read this session's conversation. Use this skill whenever the user wants to commit changes, save work to git, create a commit, or "wrap up" edits — even if they don't say the exact word "commit". Three modes via argument. Triggers include "commit", "make a commit", "git commit", "commit all", "commit staged", "save my changes". Do NOT run `git add` / `git commit` directly via Bash — use this skill.
allowed-tools: Bash(git status:*), Bash(git rev-parse:*), Bash(git diff:*), Bash(sh:*), Skill
user-invocable: true
argument-hint: "[all|staged]"
model: sonnet
effort: low
---

## Step 1: No-op gate

!`sh -c '[ -z "$(git status --porcelain)" ] && echo "Nothing to commit. STOP." || echo "There are some changes. Go to next step."'`

## Step 2: Process

!`git rev-parse --verify --quiet HEAD 2>/dev/null || echo NONE`

HEAD frozen before any commit. The fork path (`all`/`staged`) verifies the commit landed against this value — do NOT re-read it.

!`"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/route.sh" "$ARGUMENTS"`

- NEVER explain, question, analyze or user intent to commit in mode `all` or `staged` files. If user want it then do it in silence.
- If mode is `all` or `staged`, never propose or start a new branch.