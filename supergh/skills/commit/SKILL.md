---
name: commit
description: Always must use this skill when user want to commit or save changes. Do not commit by yourself. Do not analyze files and git status - agent in fork will do all of this.
model: haiku
context: fork
allowed-tools: Bash
---

## Conventional Commits rules
!`cat "${CLAUDE_PLUGIN_ROOT}/skills/commit/references/commit-conventions.md" 2>&1`

## Commit context (recent style + changes + diff)
!`"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit-context.sh" "$ARGUMENTS" 2>&1`

## Recognize what has changed and commit

Compose a "commit message" according to the Conventional Commits rules above, based on the diff above and matching the type/scope style of the recent commit subjects. Execute the commit, return one line with sha and composed commit message - wait for result.

Before SHA: !`git rev-parse HEAD 2>&1`

## Working mode
- `all` or empty args -> Run `"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit.sh" "<message>"`.
- `staged` -> Run `"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit.sh" "<message>" "staged"`.
- anything else is a PATH -> Run `"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit.sh" "<message>" "<path>"` to commit ONLY that path. Pass the path exactly as given — POSIX (`src/foo`), Windows (`C:/foo`, `C:\foo`) and MSYS (`/c/foo`) all work verbatim; do not rewrite separators.

## Self-Check

Run `"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit-selfcheck.sh" "<Before SHA>"` with the literal SHA from "Before SHA" above. It compares HEAD to that pre-commit SHA; its output (`VERIFIED` / `FAILED`) fills `<verification>`.

## Output format
Return only one line: `<sha> | <commit message> (<verification>)`

## Rules
- If there is nothing to commit just show `Nothing to commit` and stop.
- CRITICAL: Do not comment what you are doing - just output one line with sha and composed commit message.
- Do not push.
- Do not add "Co-Authored-By".
- Has something changed in the meantime? So what - MUST do what the user wants.