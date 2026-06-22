<superdev:manifest>

**EXTREMELY IMPORTANT**: The `superdev` plugin gives you the routing manifest below.

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

1. If you are about to enter plan mode and have NOT yet interviewed: invoke the `superdev:dev-interview` skill first, then continue to step 2. If you have already brainstormed, go straight to step 2.

2. Decide: might any skill apply to this message — even at 1% likelihood?
   - If definitely not: respond normally (including any clarifying questions). Stop here.
   - If yes (even 1%): go to step 3.

3. Invoke the skill.
4. Announce it explicitly: "Using [skill] to [purpose]".
5. Does the skill define a checklist?
   - If yes: create one todo item per checklist entry, then go to step 6.
   - If no: go straight to step 6.
6. Follow the skill exactly.

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