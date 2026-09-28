---
name: commit
description: Use whenever the user wants to commit, save, or record changes to git - including "commit", "commit changes", "commit all", "commit these files". This is the ONLY path to a commit: never run git add/commit yourself, never branch, never inspect git status/diff first - a forked agent stages, writes the Conventional Commits message, commits and verifies. Arguments, all optional - no arguments commits every change (modified, new and deleted files); one or more space-separated paths (files or directories) commit only those. Append any issue reference the user mentioned (`#123` or a GitHub issue link) - it becomes the commit's `Refs:` footer. Arguments never carry an apostrophe (').
model: haiku
context: fork
background: false
allowed-tools: Bash, Bash(${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit-context.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit-selfcheck.sh:*)
---

## Recognize what has changed and commit

Your run ends only after you have run `commit.sh` (Working mode) and `commit-selfcheck.sh` (Self-Check): a reply with no tool call commits nothing. Compose a "commit message" according to the Conventional Commits rules below, based on the commit context below and matching the type/scope style of the recent commit subjects.

Before SHA: !`git rev-parse --verify -q HEAD 2>/dev/null || echo "(none)"`

## Conventional Commits rules
!`cat "${CLAUDE_PLUGIN_ROOT}/skills/commit/references/commit-conventions.md" 2>&1`

## Commit context (recent style + changes + diff)
```!
"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit-context.sh" '$ARGUMENTS'
```

## Working mode
Act on the mode the `## Selector:` line above resolved, never on the raw arguments:
- `all` -> Run `"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit.sh" "<message>"`.
- `paths` -> Run `"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit.sh" "<message>" "<paths>"` with `<paths>` copied from the Selector line, to commit ONLY those paths. Do not rewrite separators - POSIX (`src/foo`), Windows (`C:/foo`, `C:\foo`) and MSYS (`/c/foo`) all work verbatim.
- `missing` -> do not run `commit.sh`; return the line the Selector gives.

## Self-Check

Run `"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit-selfcheck.sh" "<Before SHA>"` with the literal SHA from "Before SHA" above. It compares HEAD to that pre-commit SHA; its output (`VERIFIED` / `FAILED`) fills `<verification>`.

## Output format
Return only one line: `<sha> | <commit message> (<verification>)`

## Rules
- Never decide on your own that there is nothing to commit, whatever the context above shows: in modes `all` and `paths` always run `commit.sh`. Only its own `Nothing to commit.` line means that - then show `Nothing to commit` and stop.
- CRITICAL: Do not comment what you are doing - just output one line with sha and composed commit message.
- If `commit.sh` exits non-zero, return its error output as the one line and stop. Never re-run it with a different or empty selector (that widens the commit to everything staged) and never run `git` yourself.
- Do not push.
- Do not add "Co-Authored-By".
- The tree may have changed since the snapshot above: still run `commit.sh` once with the resolved selector, never re-inspecting the tree or questioning the selection.