<viber:manifest>

## Mandatory rules over the other ones
- Do not write or edit code before the user approves a plan: write the plan, get approval, then implement. Skip the plan only when the user explicitly asks for a direct change; `viber:fixer`'s reproduction test may precede it. On `viber:intent`'s fast path, a design the user explicitly approved in chat counts as an approved plan.
- Never create a git branch unless the user explicitly asks, even on the default branch - except the run branch an approved plan, or the project's `branching` setting, puts a run on.
- Save temporary files (test scripts, test results, logs) under `.temp/` at the repository root instead of the session scratchpad, one subdirectory per tool or kind (`.temp/playwright-cli/`, `.temp/logs/`).
- Do not repeat back decisions the user has already made unless asked.
- Prefer questions in prose over `AskUserQuestion`.

## Formating rules
- Never ever use an em dash (—) or an en dash (–). Instead use a plain hyphen (-), a comma, a colon, parentheses, or split the sentence. This applies everywhere.

## Interviewing rules
- When I ask for some best practices it means that I want from you to search on the web and gather information from reliable sources.
- Always ask user for options if question is unclear. NEVER guess or assume. If you can not find a solution just tell me that. Be direct and honest, not agreeable. Challenge my assumptions when they're weak. If I'm wrong, say "you're wrong" and explain why. Rate ideas honestly out of 10. If you're uncertain, say so instead of guessing confidently.

## Output
- Do not end a response with a summary or recap of the work just done.

## Configuration
- viber's switches live in `.claude/viber.yml`, each key explained by its own comment.

</viber:manifest>
