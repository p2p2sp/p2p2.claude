---
name: setup
description: Setup superdev environment.
allowed-tools: Read, Glob, Grep, Bash, Edit, AskUserQuestion
user-invocable: true
disable-model-invocation: true
---

## Setup

The block below runs at skill load (working dir = the project root) and is idempotent — re-running `/setup` never overwrites anything that already exists.

It:
- creates `.superdev/` and `.temp/` when they are missing,
- seeds `.gitignore` from the bundled template when the project has none,
- seeds `.claude/settings.json` from the bundled template when the project has none,
- seeds `.superdev/config.yml` from the bundled template (both switches default `true`) when the project has none, and reports whether it was freshly seeded or already present (with its current switches).

The bootstrap logic lives in a bundled deterministic script (one command, so Claude Code's Bash permission checker approves it as a unit instead of demanding approval for each sub-operation):

```!
bash "${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh"
```

## Configure the opt-in switches

The bootstrap block already seeded `.superdev/config.yml` from the bundled asset (both switches `true`) when it was missing, and never touched an existing one. Read the `config.yml:` line it printed and branch on it — **do not** `Write` a config template inline; the asset is the only source of the file's shape.

**If the line reports `already present`** — do **NOT** touch the file; it is the user's choice record. Report its current switch values (printed above) and note that they can change them by editing `.superdev/config.yml` by hand (or deleting it and re-running `/setup`). Skip straight to **Output**.

**If the line reports `seeded from template`** — the file now holds both switches `true`. Ask the user which to keep on, then flip the rest off:

1. Call `AskUserQuestion` **once** with a single `multiSelect` question. The user **checks the areas to KEEP ENABLED**; anything left unchecked gets flipped to `false`. Both areas default to checked — recommend keeping them on unless the project clearly does not need it (e.g. leave `adr` off for a constantly refactored repo, `rules_improver` off when you don't want per-task review learnings promoted into `.claude/rules/`).
   - **"Which pipeline areas to keep enabled? (unchecked = disabled)"** — switches the orchestrator honors:
     - `adr` — ADR capture (records the architectural *why* of structural decisions).
     - `rules_improver` — auto-promote per-task review learnings into `.claude/rules/`.
2. For each area the user did **not** select, `Edit` `.superdev/config.yml` to flip that switch's value from `true` to `false` (leave the comment and key intact — change only the boolean). Selected areas stay `true` and need no edit.

   - `adr` unselected → change the `adr:` line's value to `false`.
   - `rules_improver` unselected → change the `rules_improver:` line's value to `false`.

## Output

Emit exactly one message to the user in this shape:

```
## superdev setup complete

<one line per setup-block result — e.g. ".superdev/ created", ".temp/ already present", ".gitignore seeded from template", "settings.json already present">
<config line — e.g. "config.yml seeded from template, then set: adr=on, rules_improver=off" OR "config.yml already present (left untouched): <current values>">

### Recommended next steps
- Run `/superdev:mem-layers` — bootstrap the CLAUDE.md project-memory cascade (general → specific).
- Run `/superdev:mem-rules` — author the `.claude/rules/` conventions layer.
```

Rules:
- Report the actual results from the block above — do not invent or assume them. The config line reflects the seeded-then-edited values (or the untouched current switches).
- **Never overwrite an existing `.superdev/config.yml`** — it records the user's choices. The bootstrap block already guarantees this; only `Edit` the freshly seeded file to flip unselected switches.
- Do NOT invoke `mem-layers` / `mem-rules` (or any other skill) yourself — they are interactive and the user
  decides when to run them. Your job is to bootstrap the environment + recommend, not to chain.
