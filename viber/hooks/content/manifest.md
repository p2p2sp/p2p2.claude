<viber:manifest>

## Rules
- Do not write or edit code before the user approves a plan: write the plan, get approval, then implement. Skip the plan only when the user explicitly asks for a direct change.
- Never create a git branch unless the user explicitly asks, even on the default branch - except the run branch an approved plan, or the project's `branching` setting, puts a run on.
- Save temporary files (test scripts, test results, logs) under `.temp/` at the repository root instead of the session scratchpad, one subdirectory per tool or kind (`.temp/playwright-cli/`, `.temp/logs/`), so they stay inspectable in the project.
- Do not repeat back decisions the user has already made unless asked.
- Prefer questions in prose over `AskUserQuestion` tool.

## Output
- Do not end a response with a summary or recap of the work just done.

## Configuration
- viber's switches live in `.claude/viber.yml`, each key explained by its own comment.

## Outside viber
When you work outside the `viber` plugin's skills, follow these rules to optimize how you work:
- Time matters.
- Always review plan in plan mode just before executing `ExitPlanMode` tool using subagent.
- Put in a plan file a last task to review the implementation using subagent.

</viber:manifest>
