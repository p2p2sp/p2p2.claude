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

Commit changes to GitHub.

## Step 1: No-op gate

<modified-files>

!`git status --porcelain`

</modified-files>

If `modified-files` is empty then show verbatim `Nothing to commit.` and JUST STOP.

## Step 2: Process

!`git rev-parse --verify --quiet HEAD 2>/dev/null || echo NONE`

HEAD frozen before any commit. The fork path (`all`/`staged`) verifies the commit landed against this value — do NOT re-read it.

!`"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/route.sh" "$ARGUMENTS"`