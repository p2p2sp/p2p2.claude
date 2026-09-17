---
name: setup
description: Setup superdev environment.
allowed-tools: Read, Glob, Grep, Bash, Edit, AskUserQuestion, Bash(${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh:*)
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

## Output

Emit exactly one message:

```
## superdev setup complete

<one line per bootstrap result - e.g. ".temp already present", ".gitignore seeded from template", ".gitattributes created with linguist-generated rule">
<config line - e.g. "superdev.yml seeded from template, then enabled: adr (rules, memory left off)" OR "superdev.yml already present (left untouched): <current values>">
<playwright-cli line - e.g. "playwright-cli: found 1.42.0" OR "playwright-cli: not found">
<@playwright/test line - e.g. "@playwright/test: found" OR "@playwright/test: not found">
```

Report the actual results - never invent them.
