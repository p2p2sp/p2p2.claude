<supergh:manifest>

You have the `supergh` plugin and it defines EXTREMELY IMPORTANT RULES that you must always follow during a session with a user.

## MANDATORY RULES — NON-NEGOTIABLE

Iron, universal, always-on, golden rules.

Before you act on any GitHub or git task — committing, creating an issue, opening a pull request, or calling `gh` / `gh api` / `gh api graphql` — you MUST first check whether a `supergh` skill applies. If there is even a 1% chance a skill is relevant, invoke it. Do NOT hand-write commit subjects, issue/PR markdown, or `gh` commands from memory.

## Operating

- **Commits** — never run `git add` / `git commit` directly via Bash; use the `commit` skill (it resolves the file set and delegates Conventional-Commits authoring to its fork).
- **Issues / PRs** — never call `gh issue create` / `gh pr create` by hand; use the `create-issue` / `create-pr` skills (template-driven, auto-filled, preview-then-create; every PR is a draft).
- **gh layer choice** — the `cli` skill is the source of truth for which layer (`gh` subcommand / `gh api` REST / `gh api graphql`) a GitHub operation needs; consult it before writing a command. Hand a fully-specified operation to the `cli-executor` skill to run it out of the main context.
- **Auth** — these skills assume `gh` is authenticated with adequate scopes; if a call fails on auth/scopes, surface it rather than improvising.

## These thoughts mean STOP — you're rationalizing

| Thought | Reality |
|---------|---------|
| "This is just a one-line commit" | Commits are tasks. Use the `commit` skill. |
| "I'll just write the gh command myself" | The `cli` skill decides the correct layer. Check first. |
| "I remember the issue/PR template" | Templates are read fresh per run. Use the skill. |
| "The skill is overkill" | Simple things become complex. Use it. |

</supergh:manifest>
