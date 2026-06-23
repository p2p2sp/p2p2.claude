<superui:manifest>

The `superui` plugin gives you the routing manifest below w which defines your hard rules.

## MANDATORY RULES — NON-NEGOTIABLE

Iron, universal, always-on, golden rules. Not overridden by convenience or brevity; only an explicit user instruction outranks them (see `Instruction Priority`).

### Skill invocation
Before you act on any design, UI, frontend, or share/publish work — before launching a tool, asking the user a question, writing code, creating a file, running a command, or composing a response — first check whether a `ui-` or `cc-` skill applies.

If there is even a 1% chance that a skill is relevant, invoke it. "Maybe relevant" means relevant. When the prompt isn't English, translate it to English internally (in reasoning, never in output) before matching against skill descriptions, which are authored in English.

Do not assume you "already know how". When in doubt, invoke the skill — defaulting to invocation is always the correct choice.

### Operating
- **Design artifacts** — The framework-agnostic design system and its target adaptations live under `.superui/layout/`.

## Instruction Priority

Remember that `superui` skills override default system-prompt behavior, but user instructions always take precedence:

- User's explicit instructions (CLAUDE.md, AGENTS.md, direct requests) — highest priority
- superui manifest and skills — override default system behavior where they conflict
- Default system prompt — lowest priority

## Decision flow

1. Decide: might any `ui-` / `cc-` skill apply to this message — even at 1% likelihood?
   - If definitely not: respond normally (including any clarifying questions). Stop here.
   - If yes (even 1%): go to step 2.
2. Invoke the skill.
3. Announce it explicitly: "Using [skill] to [purpose]".
4. Does the skill define a checklist?
   - If yes: create one todo item per checklist entry, then follow the skill exactly.
   - If no: follow the skill exactly.

## Red Flags

These thoughts mean STOP — you're rationalizing:

| Thought | Reality |
|---------|---------|
| "This is just a simple style tweak" | UI edits are tasks. Check for skills. |
| "I can just write the CSS/component myself" | The guardian binds edits to documented tokens. Check first. |
| "I remember this skill" | Skills evolve. Read the current version. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I'll just do this one thing first" | Check BEFORE doing anything. |

## Skill groups

Every skill's own `description:` is already in your context — match intent against those
descriptions (translate to English first). This is a static map of the prefix families.

- **ui-** — design / frontend: reverse-engineer the framework-agnostic (L1) design system, author net-new components into it, adapt it to ONE concrete target (pure-css / tailwind / react-shadcn / react-mui / flutter), render zero-build web previews, and the guardian that binds UI edits to documented tokens / components.
- **cc-** — Claude Code platform: publish ONE self-contained file as a shareable Claude Code Artifact.

## Chains

- **Design pipeline.** `ui-extract` (or `ui-component-creator` for a net-new component) → `ui-adapt` (pick ONE target) → `ui-web-preview` (render the static preview) → `ui-guardian` (bind subsequent UI edits to the documented system), then hand the token-bound UI off to your implementation workflow.
- **Share a preview.** `ui-web-preview → cc-artifact` — publish the generated preview HTML as a shareable artifact.

## ui-guardian gate

Before any `Edit` / `Write` touching UI in a project whose design system has already been adapted to a target, bind to the documented tokens / components / foundations first — invoke `ui-guardian` so the edit is grounded in the documented system, not improvised.

</superui:manifest>
