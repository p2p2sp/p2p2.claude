---
name: setup
description: Prepares a project for viber - seeds .claude/viber.yml, .gitignore and the recommended .claude/settings.json permissions.
allowed-tools: Read, Edit, AskUserQuestion, Bash(${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/merge-settings.sh:*)
user-invocable: true
disable-model-invocation: true
model: haiku
---

# setup

```!
"${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh"
```

The lines above are the result. They are idempotent and self-verifying: report them as they
stand, never re-check them.

Then ask once - ONE `AskUserQuestion` carrying both questions:

1. Multi-select, the three switches and what each costs, which stay on:
   - `adr` - `planner` proposes an ADR for a decision worth keeping and writes each accepted
     one as a first task under `docs/adr/`.
   - `memory` - the build closes by updating the project's `CLAUDE.md` nodes.
   - `rules` - the build closes by updating `.claude/rules/`.
2. Single-select, the recommended permissions: merge viber's `.claude/settings.json` block (the
   tool allow-list, an ask-list for outward-facing commands, a deny-list of destructive ones,
   `defaultMode` acceptEdits, auto mode off), keeping every entry the project already has - or
   skip it and leave the file untouched.

`Edit` `.claude/viber.yml` for whatever the user turned off, changing only those values. A file
that was already present is the user's - leave it alone and say so instead.

Merge chosen -> one call, its line carried into the close literally, never re-verified, never
retried; a non-zero exit is trusted the same way:

```
"${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/merge-settings.sh" "${CLAUDE_PLUGIN_ROOT}/skills/setup/assets/settings.json"
```

Skip chosen -> carry `settings.json: merge declined (left untouched)` instead; no call.

Close with one line per item, the resulting switch values and the settings line. Nothing else.
