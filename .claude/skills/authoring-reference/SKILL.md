---
name: authoring-reference
description: Claude Code authoring reference — the exact YAML frontmatter / JSON schemas for defining a skill (SKILL.md), a subagent, a slash command, hooks, MCP servers, and plugins (plugin.json / marketplace.json). Must use this skill whenever creating, editing, or reviewing any of these artifacts, or when the exact field names, allowed values, hook event names, path conventions, or string substitutions are needed. Triggers include "create a skill", "write a SKILL.md", "define an agent", "agent frontmatter", "add a hook", "hooks.json", "plugin.json", "marketplace.json", ".mcp.json", "slash command". Do NOT write these schemas from memory — consult this skill first. Do NOT use for authoring METHOD/process (splitting content, trimming, description quality) — that is the skill-constructor's job; this skill is the field-level data reference. Trigger applies in any language and to descriptive phrasing too.
user-invocable: true
---

# Claude Code authoring reference

Field-level schemas for defining Claude Code extensions. Verified against `code.claude.com/docs` (2026-06). Load the matching reference file before writing the artifact.

For ARCHITECTURE decisions — fork vs file-handoff vs `!command`, sub-skills vs monolith, skill-vs-agent-vs-model — see the `skill-chaining` skill. This skill is field-level data only.

| Artifact | Define in | Reference |
| :-- | :-- | :-- |
| Skill | `<name>/SKILL.md` | [references/skills.md](references/skills.md) |
| Subagent | `agents/<name>.md` | [references/agents.md](references/agents.md) |
| Slash command | `commands/<name>.md` (= a skill) | [references/slash-commands.md](references/slash-commands.md) |
| Hooks | `settings.json` / `hooks/hooks.json` | [references/hooks.md](references/hooks.md) |
| MCP server | `.mcp.json` | [references/mcp.md](references/mcp.md) |
| Plugin + marketplace | `plugin.json` / `marketplace.json` | [references/plugins.md](references/plugins.md) |

## Where things live

```
~/.claude/skills/<name>/SKILL.md      personal skill        .claude/skills/<name>/SKILL.md      project skill
~/.claude/agents/<name>.md            personal subagent     .claude/agents/<name>.md            project subagent
~/.claude/commands/<name>.md          personal command      .claude/commands/<name>.md          project command
~/.claude/settings.json               personal settings     .claude/settings.json               project (shared)
                                                            .claude/settings.local.json        project (gitignored)
.mcp.json                             project MCP servers (shared)
<plugin>/skills/ agents/ commands/ hooks/hooks.json .mcp.json    plugin components (root, NOT in .claude-plugin/)
<plugin>/.claude-plugin/plugin.json   plugin manifest       <repo>/.claude-plugin/marketplace.json   marketplace catalog
```

Plugin components are invoked namespaced: `/<plugin>:<skill>`, `@agent-<plugin>:<agent>`. Precedence for same name: enterprise > personal > project; plugins are always namespaced so never collide.

## Frontmatter at a glance

- **Skill** — all fields optional; only `description` recommended. Common: `name`, `description`, `allowed-tools`, `disable-model-invocation`, `user-invocable`, `model`. Full set + substitutions in [skills.md](references/skills.md).
- **Subagent** — `name` + `description` required; body is the system prompt. Common: `tools`, `model` (`sonnet`/`opus`/`haiku`/`fable`/full-id/`inherit`, default `inherit`), `color`. Full set in [agents.md](references/agents.md).
- **Hooks** — JSON, not frontmatter. Event names are case-sensitive (`PreToolUse`, `PostToolUse`, …). Contract in [hooks.md](references/hooks.md).

## Top gotchas

- **Custom commands are now skills.** `.claude/commands/deploy.md` and `.claude/skills/deploy/SKILL.md` both make `/deploy`. Prefer the skill layout for new work.
- **Plugin components go at the plugin root**, never inside `.claude-plugin/` (which holds only `plugin.json`).
- **Do not put a `hooks` key in plugin `plugin.json`** when you ship `hooks/hooks.json` — it auto-loads; declaring it can conflict. (See [plugins.md](references/plugins.md) for the exact path-field merge rules.)
- **Plugin agents ignore `hooks`, `mcpServers`, `permissionMode`** (security). Copy the agent to `.claude/agents/` if you need them.
- **`name` does not set a skill's command name** (the directory name does), except for a plugin-root `SKILL.md`.
- Use `${CLAUDE_PLUGIN_ROOT}` for any path bundled in a plugin; absolute/`../` paths break after install (cache copy).
- **`!` context blocks + `$ARGUMENTS`:** never splice `$ARGUMENTS` into a quoted string — a literal `"`/`` ` ``/`(` in the args breaks the shell and the injection comes back empty; capture via a quoted here-doc and parse with bash builtins, not `awk` (broken in the `!` exec shell on Windows). **`$ARGUMENTS` substitutes in a `context: fork` skill too — including a fork invoked programmatically via the `Skill` tool — in both `!` blocks and prose.** See [skills.md](references/skills.md) → "Writing robust `!` blocks".
