---
name: gh-commit
description: >-
  Commit context resolver — runs in the MAIN context so it can read this session's conversation. Use this skill whenever the user wants to commit changes, save work to git, create a commit, or "wrap up" edits — even if they don't say the exact word "commit". Three modes via argument: (no arg) gather the files changed in THIS session from conversation context and commit only those; `all` → stage every new/modified/deleted file (`git add -A`) and commit; `staged` → commit whatever is already staged. Triggers include "commit", "make a commit", "git commit", "commit all", "commit staged", "save my changes". Do NOT run `git add` / `git commit` directly via Bash — use this skill.
allowed-tools: Bash(git status:*), Bash(git rev-parse:*), Bash(sh:*), Skill
user-invocable: true
argument-hint: "[all|staged]"
effort: low
---

## Commit mode selection

The mode comes from the skill argument (`all` / `staged` / empty→`session`). The matching playbook is injected below for **your** argument — follow it exactly: it tells you how to resolve the file set and how to delegate to `superdev:gh-agent-committer`. Do not consider the other two modes.

--- playbook ---
!`"${CLAUDE_PLUGIN_ROOT}/skills/gh-commit/scripts/route.sh" "$ARGUMENTS"`
--- playbook ---

## Safety rules

- If you cannot determine a safe set of files to commit, prefer a **no-op** (report "nothing to commit") over guessing — an unwanted commit is far more costly to undo than a no-op is to re-run.
- The resolver is **read-only on git** — it inspects with `git status` / `git rev-parse` only. All staging, diff-reading, and committing happens in the committer fork.
- Never push, merge, rebase, amend, cherry-pick, or use `--force` / `--no-verify`; never instruct the committer to.
- Never edit source files, test files, or git config — this skill only inspects, routes, and passes a hint.
- One route, one delegation, one report. Never re-run "to confirm".
- Never question or analyze user intent to commit `all` or `staged` files.
- If mode is `all` or `staged`, never propose or start a new branch.
