---
name: commit
description: Use whenever the user wants to commit, save, or record changes to git - including "commit", "commit changes", "commit all", "commit these files". This is the ONLY path to a commit: never run git add/commit yourself, never branch, never inspect git status/diff first - a forked agent stages, writes the Conventional Commits message, commits and verifies. Arguments, all optional - no arguments commits every change (modified, new and deleted files); one or more space-separated paths (files or directories) commit only those. Append any issue reference the user mentioned (`#123` or a GitHub issue link) - it becomes the commit's `Refs:` footer. Arguments never carry an apostrophe (').
model: haiku
effort: medium
context: fork
background: false
allowed-tools: Bash, Bash(${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit-context.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit-selfcheck.sh:*)
---

## Commit the selected changes

Compose a commit message per the Conventional Commits rules below from the commit context below, matching the type/scope style of the recent commit subjects, then commit it (Working mode) and verify it (Self-Check).

- In modes `all` and `paths` always run `commit.sh` exactly once with the resolved selector, whatever the context shows: a reply with no tool call commits nothing. Never decide on your own that there is nothing to commit, never re-inspect the tree, never question the selection.
- Run only `commit.sh` and `commit-selfcheck.sh`: no `git`, no push, and no second `commit.sh` with a different or empty selector (that widens the commit to everything staged).
- Never add a `Co-Authored-By` line.

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
- `paths` -> Run `"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit.sh" "<message>" "<paths>"` with `<paths>` copied verbatim from the Selector line, separators included, to commit ONLY those paths.
- `missing` -> run nothing.

## Self-Check
After a commit, run `"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit-selfcheck.sh" "<Before SHA>"` with the literal SHA from "Before SHA" above; its output (`VERIFIED` / `FAILED`) fills `<verification>`.

## Output
Return exactly one line and no other text:
- committed: `<sha> | <commit message> (<verification>)`
- `commit.sh` printed `Nothing to commit.`: `Nothing to commit`
- `commit.sh` exited non-zero: its error output
- mode `missing`: the line the Selector gives
