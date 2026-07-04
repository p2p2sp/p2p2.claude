# Plugins & marketplaces

A plugin is a self-contained directory bundling skills, agents, hooks, MCP/LSP servers, and more. A marketplace is a catalog that lists plugins.

## Directory layout

Only `plugin.json` lives in `.claude-plugin/`; **every component directory sits at the plugin root**.

```
my-plugin/
├── .claude-plugin/plugin.json   manifest (optional)
├── skills/<name>/SKILL.md       skills
├── commands/<name>.md           skills as flat files
├── agents/<name>.md             subagents
├── hooks/hooks.json             hook config
├── .mcp.json                    MCP servers
├── .lsp.json                    LSP servers
├── output-styles/  themes/  monitors/  bin/  scripts/
└── settings.json                plugin default settings (only `agent`, `subagentStatusLine`)
```

A plugin's `CLAUDE.md` is **not** loaded as context — ship instructions as a skill instead.

## plugin.json schema

Manifest is optional; if present, only `name` is required. Components in default locations auto-load.

```json
{
  "name": "plugin-name",
  "displayName": "Plugin Name",
  "version": "1.2.0",
  "description": "Brief description",
  "author": { "name": "...", "email": "...", "url": "..." },
  "homepage": "...", "repository": "...", "license": "MIT",
  "keywords": ["..."],
  "defaultEnabled": true,
  "skills": "./custom/skills/",
  "commands": ["./custom/commands/special.md"],
  "agents": ["./custom/agents/reviewer.md"],
  "hooks": "./config/hooks.json",
  "mcpServers": "./mcp-config.json",
  "lspServers": "./.lsp.json",
  "outputStyles": "./styles/",
  "experimental": { "themes": "./themes/", "monitors": "./monitors.json" },
  "userConfig": { "api_token": { "type": "string", "title": "Token", "description": "...", "sensitive": true } },
  "dependencies": [{ "name": "secrets-vault", "version": "~2.1.0" }]
}
```

- **`version`**: set it → users only update when you bump it. **Omit it** → the git commit SHA is used, so every commit ships as latest. `plugin.json` wins over the marketplace entry. (This repo sets `version` and keeps it in sync with git tags via CI — see `.github/scripts/release.sh`.)
- Unrecognized top-level fields are ignored (warnings under `--strict`); wrong-typed fields fail. Validate: `claude plugin validate ./my-plugin [--strict]`.

### Component path-field merge rules

- **Adds to default**: `skills` (the default `skills/` is always scanned too).
- **Replaces default**: `commands`, `agents`, `outputStyles`, `experimental.themes`, `experimental.monitors`. List the default explicitly to keep it: `"commands": ["./commands/", "./extras/"]`.
- **Own merge rules**: `hooks`, `mcpServers`, `lspServers`.
- All paths are relative and start with `./`. Don't traverse outside the plugin root (`../` breaks after the cache copy).

### Path variables

`${CLAUDE_PLUGIN_ROOT}` (install dir; changes on update), `${CLAUDE_PLUGIN_DATA}` (persistent across updates → `~/.claude/plugins/data/<id>/`), `${CLAUDE_PROJECT_DIR}` (project root). Substituted in skill/agent content, hook/monitor commands, and MCP/LSP configs; exported as env vars to subprocesses.

## marketplace.json schema

Lives at `<repo>/.claude-plugin/marketplace.json`. Required: `name`, `owner`, `plugins`.

```json
{
  "name": "company-tools",
  "owner": { "name": "DevTools Team", "email": "devtools@example.com" },
  "metadata": { "pluginRoot": "./plugins" },
  "plugins": [
    {
      "name": "code-formatter",
      "source": "./plugins/formatter",
      "description": "Automatic code formatting",
      "version": "2.1.0"
    },
    {
      "name": "deployment-tools",
      "source": { "source": "github", "repo": "company/deploy-plugin" }
    }
  ]
}
```

- `owner.name` required, `owner.email` optional. Optional top-level: `$schema`, `description`, `version`, `metadata.pluginRoot`, `allowCrossMarketplaceDependenciesOn`.
- Each plugin entry: `name` + `source` required; may also carry any `plugin.json` field plus `category`, `tags`, `strict`, `defaultEnabled`.
- Marketplace `name` must be unique per user (re-adding the same name replaces it); some names are reserved for Anthropic.

### Plugin `source` forms

| Source | Form |
| :-- | :-- |
| relative path | `"./plugins/x"` (must start with `./`; resolved from marketplace root, not `.claude-plugin/`) |
| `github` | `{ "source": "github", "repo": "owner/repo", "ref": "v2.0.0", "sha": "<40-char>" }` |
| `url` (git) | `{ "source": "url", "url": "https://...git", "ref": "...", "sha": "..." }` |
| `git-subdir` | `{ "source": "git-subdir", "url": "...", "path": "tools/plugin", "ref": "...", "sha": "..." }` |
| `npm` | `{ "source": "npm", "package": "...", "version": "...", "registry": "..." }` |

`ref` = branch/tag, `sha` = exact commit (wins over `ref`). Relative paths only resolve when the marketplace is added via git.

## Skills-directory plugins

Any folder under a skills directory with a `.claude-plugin/plugin.json` loads as `<name>@skills-dir` (no marketplace, no install) — scaffold with `claude plugin init <name>`. A plugin with just a root `SKILL.md`, no `skills/`, and no `skills` manifest key loads as a single-skill plugin.

## Common load failures

| Symptom | Cause / fix |
| :-- | :-- |
| components missing | they're inside `.claude-plugin/` — move to plugin root |
| plugin not loading | invalid `plugin.json` — `claude plugin validate` |
| hooks not firing | script not executable (`chmod +x`) or wrong event-name casing |
| path errors | absolute / `../` paths — use relative `./` and `${CLAUDE_PLUGIN_ROOT}` |
