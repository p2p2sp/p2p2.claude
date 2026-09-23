<viber:manifest>

## Rules
- Do not write or edit code before the user approves a plan: write the plan, get approval, then implement. Skip the plan only when the user explicitly asks for a direct change.
- Never create a git branch unless the user explicitly asks, even on the default branch.
- Save temporary files (test scripts, test results, logs) under `.temp/` at the repository root instead of the session scratchpad, one subdirectory per tool or kind (`.temp/playwright-cli/`, `.temp/logs/`), so they stay inspectable in the project.
- Do not repeat back decisions the user has already made unless asked.
- Prefer questions in prose over `AskUserQuestion` tool.

## Output
- Do not end a response with a summary or recap of the work just done.

</viber:manifest>
