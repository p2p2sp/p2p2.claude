---
name: commit
description: Use whenever the user wants to commit, save, or record changes to git - including "commit", "commit changes", "commit all". This is the ONLY path to a commit: never run git add/commit yourself, never branch, never inspect git status/diff first - a forked agent stages, writes the Conventional Commits message, commits and verifies. Pass as arguments the selector the user gave plus any issue reference they mentioned (`#123` or a GitHub issue link) - it becomes the commit's `Refs:` footer.
model: haiku
context: fork
background: false
allowed-tools: Bash
---

## Recognize what has changed and commit

Compose a "commit message" according to the Conventional Commits rules below, based on the diff above and matching the type/scope style of the recent commit subjects. Execute the commit, return one line with sha and composed commit message - wait for result.

Before SHA: !`git rev-parse --verify -q HEAD 2>/dev/null || echo "(none)"`

## Conventional Commits rules
!`cat "${CLAUDE_PLUGIN_ROOT}/skills/commit/references/commit-conventions.md" 2>&1`

## Commit context (recent style + changes + diff)
```!
ARG=$(cat <<'__COMMIT_ARGS__'
$ARGUMENTS
__COMMIT_ARGS__
)
"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit-context.sh" "$ARG" 2>&1
```

## Working mode
- `all` or empty args -> Run `"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit.sh" "<message>"`.
- `staged` -> Run `"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit.sh" "<message>" "staged"`.
- an existing PATH -> Run `"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/commit.sh" "<message>" "<path>"` to commit ONLY that path. Pass the path exactly as given - POSIX (`src/foo`), Windows (`C:/foo`, `C:\foo`) and MSYS (`/c/foo`) all work verbatim; do not rewrite separators.
- an issue reference anywhere in the args - bare `#42` or a GitHub issue link - is stripped before selector resolution (so `src/foo #42` is still mode `path`) and surfaces as the "Issue footer (explicit…)" block in the context - copy that `Refs:` line into the message verbatim.
- anything else (a value that is not an existing path) falls back to `all` - commit.sh runs with no 2nd arg and commits every change. The Selector line in the context above states which mode was resolved.

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