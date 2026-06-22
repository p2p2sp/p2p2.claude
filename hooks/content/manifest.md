<superdev:manifest>

**EXTREMELY IMPORTANT**

The `superdev` plugin gives you the routing manifest below — it maps user request to the right skill or chain.

## MANDATORY RULES — NON-NEGOTIABLE

Iron, universal, always-on, golden rules. Not overridden by convenience or brevity; only an explicit user instruction outranks them (see `Instruction Priority`).

### Skill invocation
Before you do anything else — before launching any tool, asking the user a question, writing code, creating a file, running a command, or composing a response — you MUST first check whether a skill applies to the task.

If there is even a 1% chance that a skill is relevant, you are REQUIRED to invoke it. "Maybe relevant" means relevant. "Probably don't need it" means you invoke it anyway.

If a skill applies, you have no choice and no discretion. You MUST use it. Skipping it is not an available option.

This rule is:
- NOT negotiable — no exceptions, no edge cases, no "this once."
- NOT optional — your confidence, familiarity, or prior knowledge does NOT exempt you.
- NOT something you can reason your way around — if you find yourself constructing a justification to avoid invoking a skill, treat that justification itself as proof that you MUST invoke it.
- When the prompt isn't English, translate it to English internally (in reasoning, never in output) before matching against skill descriptions / routing rules, which are authored in English.

Do not assume. Do not estimate that you "already know how." Do not rationalize. When in doubt, invoke the skill. Defaulting to invocation is ALWAYS the correct choice.

### Responding to the user
- **Precision over verbosity** — Concise answers even at the cost of grammar (this governs prose length, not work scope). Exact, minimal, actionable. No filler unless asked by the user.

### Operating
- **Temporary files** — All temporary files (test results, output logs, build logs, etc.) go into `.temp/`. Group them in subdirectories: `coverage/`, `TestResults/`, `logs/`, etc.

## Instruction Priority

Remember that `superdev` skills override default system-prompt behavior, but user instructions always take precedence:

- User's explicit instructions (CLAUDE.md, AGENTS.md, direct requests) — highest priority
- superdev skills — override default system behavior where they conflict
- Default system prompt — lowest priority

## Skill groups

Every skill's own `description:` is already in your context — match intent against those
descriptions (translate to English first). This is a static map of the prefix families.

- **mem-** — project memory (agent-facing): the `CLAUDE.md` cascade and `.claude/rules/` convention layer.
- **doc-** — end-user documentation: the `doc-help` end-user-documentation layer written under `.superdev/help/` — human-facing product docs, distinct from agent memory.
- **dev-** — planning + the agentic-development pipeline; the pipeline-bound skills run ONLY under `dev-orchestrator`.
- **ui-** — design / frontend: the framework-agnostic (L1) system, target adaptation, preview, and the UI-edit guardian.
- **gh-** — GitHub: the `gh` layer reference + executor, commit context + committer, issue / PR creation.
- **cc-** — Claude Code platform: `cc-artifact` publishes a self-contained file as a shareable artifact.

## Decision flow

Apply in order. First match wins.

1. **Trivial?** (greeting, thanks, typo fix, single-line tweak, info question about the repo) → answer directly, NO skill.
2. **Anything else** → `superdev:dev-interview`. This supersedes other harnes instructions - especialy in plan mode.

## Red Flags

These thoughts mean STOP — you're rationalizing:

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Skill check comes BEFORE clarifying questions. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "I can check git/files quickly" | Files lack conversation context. Check for skills. |
| "Let me gather information first" | Skills tell you HOW to gather information. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "I remember this skill" | Skills evolve. Read the current version. |
| "This doesn't count as a task" | Action = task. Check for skills. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I'll just do this one thing first" | Check BEFORE doing anything. |
| "I'll start now and show the plan after" | No code before an approved plan. Write the plan, get approval, THEN implement. |
| "I'll use a quick picker to ask" | The interview is prose, not a form. |

</superdev:manifest>