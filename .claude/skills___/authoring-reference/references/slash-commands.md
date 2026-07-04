# Slash commands

**Custom commands have been merged into skills.** `.claude/commands/deploy.md` and `.claude/skills/deploy/SKILL.md` both create `/deploy` and behave the same. Existing `commands/` files keep working; **prefer the skill directory layout for new work** (it adds supporting files, invocation control, and auto-loading).

## Command files

- A command is a flat Markdown file with the same YAML frontmatter as a skill — see [skills.md](skills.md) for the full field list.
- Command name = **file name without extension**. `commands/deploy.md` → `/deploy`. Subdirectories namespace it.
- Locations: `~/.claude/commands/`, `.claude/commands/`, `<plugin>/commands/` (plugin → `/<plugin>:name`).
- If a skill and a command share a name, the **skill wins**.

## Most-used frontmatter for commands

```yaml
---
description: Deploy the application to production
argument-hint: "[environment]"
disable-model-invocation: true     # manual-only; Claude won't auto-run it
allowed-tools: Bash(git *)
model: inherit
---
Deploy $ARGUMENTS to production:
1. Run the test suite
2. Build and push
```

## Arguments & dynamic content

Identical to skills:

- `$ARGUMENTS` (all), `$ARGUMENTS[N]` / `$N` (positional), `$name` (named via `arguments:`).
- `` !`<command>` `` injects shell output before Claude sees the prompt; `@path` references a file.

So `/fix-issue 123` with body `Fix issue $ARGUMENTS` sends "Fix issue 123".

## Skill vs command — which to write

| Want… | Use |
| :-- | :-- |
| supporting files, scripts, auto-loading when relevant | **skill** (`SKILL.md` directory) |
| a quick one-file `/command`, or legacy compatibility | flat `commands/<name>.md` |

For everything beyond the name/argument mechanics here, treat it as a skill and use [skills.md](skills.md).
