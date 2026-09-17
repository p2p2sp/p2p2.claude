---
name: setup
description: Setup superdev environment.
allowed-tools: Read, Glob, Grep, Bash, Edit, AskUserQuestion, Bash(${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/merge-settings.sh:*)
user-invocable: true
disable-model-invocation: true
effort: medium
---

## Bootstrap

Run the bundled deterministic bootstrap (idempotent - never overwrites anything that exists). It
seeds `.temp/`, `.gitignore`, and `.claude/superdev.yml` from
templates, ensures `.gitattributes` carries the `docs/.workflows/**` linguist-generated rule
(append-if-absent, so GitHub collapses the tracked run records in review), reports whether
`playwright-cli` and `@playwright/test` are present in the host project (setup installs neither),
and prints one result line per item. Trust those lines - do not re-verify.

```!
"${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh"
```

## Permissions

One `AskUserQuestion`: "Merge superdev's recommended permissions into .claude/settings.json? It
adds the tool allow-list with Bash, a deny-list of destructive commands and defaultMode
acceptEdits, keeping every entry you already have." - **Merge (Recommended)** (deterministic
merge, your own entries and other keys stay untouched; needs node on PATH, otherwise the block is
printed for manual merge) / **Skip** (leave .claude/settings.json untouched).

**Merge (Recommended)** -> one call, its line carried into `## Output` literally, never
re-verified, never retried - a non-zero exit is trusted the same way, fail-soft like bootstrap:

```
"${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/merge-settings.sh" "${CLAUDE_PLUGIN_ROOT}/skills/setup/assets/settings.json"
```

**Skip** -> carry `settings.json: merge declined (left untouched)` into `## Output`; no call.

## Output

Emit exactly one message:

```
## superdev setup complete

<one line per bootstrap result - e.g. ".temp already present", ".gitignore seeded from template", ".gitattributes created with linguist-generated rule">
<config line - e.g. "superdev.yml seeded from template, then enabled: adr (rules, memory left off)" OR "superdev.yml already present (left untouched): <current values>">
<playwright-cli line - e.g. "playwright-cli: found 1.42.0" OR "playwright-cli: not found">
<@playwright/test line - e.g. "@playwright/test: found" OR "@playwright/test: not found">
<settings line - the merge script's own line, or "settings.json: merge declined (left untouched)">
```

Report the actual results - never invent them.
