---
name: setup
description: Setup superdev environment.
allowed-tools: Read, Glob, Grep, Bash, Edit, AskUserQuestion
user-invocable: true
disable-model-invocation: true
effort: medium
---

## Bootstrap

Run the bundled deterministic bootstrap (idempotent - never overwrites anything that exists). It
seeds `.temp/`, `.gitignore`, `.claude/settings.json`, and `.claude/superdev.yml` from
templates, ensures `.gitattributes` carries the `docs/.workflows/**` linguist-generated rule
(append-if-absent, so GitHub collapses the tracked run records in review), and prints one result line
per item. Trust those lines - do not re-verify.

```!
bash "${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh"
```

## Enable opt-in switches

The seeded `.claude/superdev.yml` ships all switches **`false`** (disabled; fail-closed - a missing
key/file also means off). Branch on the printed `superdev.yml:` line - never `Write` the config
inline; the asset is the only source of its shape.

- **`already present`** - do NOT touch it (it is the user's choice record). Report its current
  switches (printed above); note they can change them by editing `.claude/superdev.yml`, or deleting
  it and re-running `/setup`. Go to **Output**.
- **`seeded from template`** - the switches are `false`. Ask which to enable, then flip those on:
  1. Call `AskUserQuestion` **once** - a single `multiSelect` question, "Which areas to enable?
     (unchecked = stays disabled)". All options default **unchecked**:
     - `adr` - ADR capture (`docs/adr/`).
     - `rules` - Rules system (`.claude/rules/`).
     - `memory` - Memory system (CLAUDE.md cascade).
     - `docs` - Product docs system (`docs/product/`).
  2. For each **selected** area, `Edit` `.claude/superdev.yml` to flip that key `false → true`
     (change only the boolean; leave the key + comment intact). Unselected areas stay `false`.

## Output

Emit exactly one message:

```
## superdev setup complete

<one line per bootstrap result - e.g. ".temp already present", ".gitignore seeded from template", "settings.json already present", ".gitattributes created with linguist-generated rule">
<config line - e.g. "superdev.yml seeded from template, then enabled: adr (rules, memory left off)" OR "superdev.yml already present (left untouched): <current values>">
```

Report the actual results - never invent them.
