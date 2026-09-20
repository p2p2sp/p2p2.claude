---
name: setup
description: Prepares a project for viber - seeds .claude/viber.yml and .gitignore.
allowed-tools: Read, Edit, AskUserQuestion, Bash(${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh:*)
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

Then show the three switches and what each costs, and ask once - one `AskUserQuestion`, multi-select -
which stay on:

- `adr` - `idea` proposes an ADR for a decision worth keeping, `planner` writes each accepted one
  as a first task under `docs/adr/`.
- `memory` - the build closes by updating the project's `CLAUDE.md` nodes.
- `rules` - the build closes by updating `.claude/rules/`.

`Edit` `.claude/viber.yml` for whatever the user turned off, changing only those values. A file
that was already present is the user's - leave it alone and say so instead.

Close with one line per item and the resulting switch values. Nothing else.
