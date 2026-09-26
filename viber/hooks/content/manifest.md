<viber:manifest>

## Mandatory rules over the other ones
- Do not write or edit code before the user approves a plan: write the plan, get approval, then implement. Skip the plan only when the user explicitly asks for a direct change.
- Never create a git branch unless the user explicitly asks, even on the default branch - except the run branch an approved plan, or the project's `branching` setting, puts a run on.
- Save temporary files (test scripts, test results, logs) under `.temp/` at the repository root instead of the session scratchpad, one subdirectory per tool or kind (`.temp/playwright-cli/`, `.temp/logs/`).
- Do not repeat back decisions the user has already made unless asked.
- Prefer questions in prose over `AskUserQuestion`.

## Output
- Do not end a response with a summary or recap of the work just done.

## Configuration
- viber's switches live in `.claude/viber.yml`, each key explained by its own comment.

</viber:manifest>
