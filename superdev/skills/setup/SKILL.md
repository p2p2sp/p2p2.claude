---
name: setup
description: Setup superdev environment.
allowed-tools: Read, Glob, Grep, Bash, Edit, AskUserQuestion
user-invocable: true
disable-model-invocation: true
---

## Bootstrap

Run the bundled deterministic bootstrap (idempotent — never overwrites anything that exists). It
seeds `.superdev/`, `.temp/`, `.gitignore`, `.claude/settings.json`, `.superdev/config.yml`, and
`.claude/rules/_superdev.md` (a frozen pointer rule reminding the agent of the `<superdev:manifest>`
mandatory rules) from templates and prints one result line per item. Trust those lines — do not
re-verify.

```!
bash "${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh"
```

## Enable opt-in switches

The seeded `.superdev/config.yml` ships all switches **`false`** (disabled; fail-closed — a missing
key/file also means off). Branch on the printed `config.yml:` line — never `Write` the config inline;
the asset is the only source of its shape.

- **`already present`** — do NOT touch it (it is the user's choice record). Report its current
  switches (printed above); note they can change them by editing `.superdev/config.yml`, or deleting
  it and re-running `/setup`. Go to **Output**.
- **`seeded from template`** — the switches are `false`. Ask which to enable, then flip those on:
  1. Call `AskUserQuestion` **once** — a single `multiSelect` question, "Which pipeline areas to
     enable? (unchecked = stays disabled)". All options default **unchecked**:
     - `adr` — ADR capture (records the architectural *why* of structural decisions).
     - `rules_improver` — auto-promote per-task review learnings into `.claude/rules/`.
     - `docs` — as-built docs (after final review, reconcile `.superdev/docs/` to current functionality).
  2. For each **selected** area, `Edit` `.superdev/config.yml` to flip that key `false → true`
     (change only the boolean; leave the key + comment intact). Unselected areas stay `false`.

## Output

Emit exactly one message:

```
## superdev setup complete

<one line per bootstrap result — e.g. ".superdev created", ".temp already present", ".gitignore seeded from template", "settings.json already present", "_superdev.md created">
<config line — e.g. "config.yml seeded from template, then enabled: adr (rules_improver left off)" OR "config.yml already present (left untouched): <current values>">

### Recommended next steps
- Run `/superdev:memory-layers` — bootstrap the CLAUDE.md project-memory cascade (general → specific).
- Run `/superdev:memory-rules` — author the `.claude/rules/` conventions layer.
```

Report the actual results — never invent them. Do NOT invoke `memory-layers` / `memory-rules` (or any
skill) yourself; they are interactive and the user chooses when to run them.
