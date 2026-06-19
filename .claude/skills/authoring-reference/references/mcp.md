# MCP servers (.mcp.json)

MCP servers expose external tools to Claude. Tools surface to the model as `mcp__<server>__<tool>` (this is also how hook matchers and permission rules reference them).

## Config files & scopes

| Scope | Stored in | Available |
| :-- | :-- | :-- |
| `local` (default) | project-local user config | you, this project |
| `project` | `.mcp.json` (committed) | everyone on the project (per-server approval on first run) |
| `user` | `~/.claude.json` | you, all projects |

Add via CLI (writes the right file): `claude mcp add --scope <scope> ...`. Manage with `claude mcp list|get|remove`, and `/mcp` in-session (status, OAuth).

## `.mcp.json` shape

```json
{
  "mcpServers": {
    "airtable": {
      "command": "npx",
      "args": ["-y", "airtable-mcp-server"],
      "env": { "AIRTABLE_API_KEY": "${AIRTABLE_API_KEY}" }
    },
    "notion": {
      "type": "http",
      "url": "https://mcp.notion.com/mcp",
      "headers": { "Authorization": "Bearer ${TOKEN}" }
    }
  }
}
```

## Transports

| Transport | Key fields | Notes |
| :-- | :-- | :-- |
| stdio (default) | `command`, `args`, `env`, `cwd` | local process; omit `type` or set `"stdio"` |
| http | `type: "http"`, `url`, `headers` | recommended remote; `"streamable-http"` is an accepted alias |
| sse | `type: "sse"`, `url`, `headers` | **deprecated** — prefer http |
| ws | `type: "ws"`, `url`, `headers` | persistent bidirectional; header auth only |

Per-server `timeout` (ms) overrides `MCP_TOOL_TIMEOUT`. The server name `workspace` is reserved.

## In subagent frontmatter

`mcpServers:` is a list of either configured-server names or inline definitions (same schema, keyed by name):

```yaml
mcpServers:
  - playwright:
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
  - github        # reference an already-configured server
```

Inline definitions connect when the subagent starts and disconnect when it finishes — a way to keep a server's tool descriptions out of the main conversation's context.

## In a plugin

Plugins ship `.mcp.json` at the plugin root (or inline `mcpServers` in `plugin.json`). Use `${CLAUDE_PLUGIN_ROOT}` for bundled binaries/config, `${CLAUDE_PLUGIN_DATA}` for persistent state, `${CLAUDE_PROJECT_DIR}` for the project root:

```json
{
  "mcpServers": {
    "database-tools": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
      "env": { "DB_URL": "${DB_URL}" }
    }
  }
}
```

Plugin MCP servers start when the plugin is enabled; run `/reload-plugins` after enabling/disabling mid-session. In a project- or user-scoped `.mcp.json`, give `${CLAUDE_PROJECT_DIR}` a default (`${CLAUDE_PROJECT_DIR:-.}`); plugin configs substitute it directly.
