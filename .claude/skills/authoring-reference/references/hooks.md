# Hooks

Hooks run a handler on a lifecycle event. Configured as JSON, never frontmatter-free YAML.

## Where they live

- `~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`, managed settings
- Plugin: `hooks/hooks.json` at the plugin root (auto-loaded — do **not** also add a `hooks` key in `plugin.json` unless adding extra files)
- Skill / subagent frontmatter (`hooks:` — scoped to that skill/agent's lifecycle)

## Structure

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/check.sh", "args": [] }
        ]
      }
    ]
  }
}
```

Event names are **case-sensitive** (`PostToolUse`, not `postToolUse`).

## Events (most-used first)

| Event | Fires | Can block? | Matches against |
| :-- | :-- | :-- | :-- |
| `PreToolUse` | before a tool call | yes | tool name |
| `PostToolUse` | after a tool call succeeds | yes | tool name |
| `PostToolUseFailure` | after a tool call fails | yes | tool name |
| `UserPromptSubmit` | prompt submitted, pre-processing | yes | — |
| `SessionStart` | session begins/resumes | no | `startup`/`resume`/`clear`/`compact` |
| `SessionEnd` | session terminates | no | end reason |
| `Stop` | Claude finishes responding | yes | — |
| `SubagentStart` / `SubagentStop` | subagent begins / finishes | start: no, stop: yes | agent type |
| `Notification` | a notification is sent | no | notification type |
| `PreCompact` / `PostCompact` | around compaction | Pre: yes | `manual`/`auto` |
| `PermissionRequest` | permission dialog shown | yes | tool name |
| `TaskCreated` / `TaskCompleted` | task create / complete | yes | — |
| `InstructionsLoaded` | CLAUDE.md / rules loaded | no | load reason |
| `FileChanged` | watched file changes | — | literal filenames |

Other events exist (`Setup`, `UserPromptExpansion`, `PermissionDenied`, `PostToolBatch`, `MessageDisplay`, `StopFailure`, `ConfigChange`, `CwdChanged`, `WorktreeCreate/Remove`, `Elicitation`/`ElicitationResult`, `TeammateIdle`) — consult the live docs when you need one of these.

## Matcher syntax

| Matcher | Meaning |
| :-- | :-- |
| `"*"`, `""`, omitted | match all |
| only letters/digits/`_`/`\|` | exact, or `\|`-separated exacts (`Edit\|Write`) |
| anything else | JavaScript regex (`^Notebook`, `mcp__memory__.*`) |

## Handler types

`type` is one of `command`, `http`, `mcp_tool`, `prompt`, `agent`.

```json
{ "type": "command", "command": "script.sh", "args": ["x"], "async": false, "shell": "bash", "timeout": 600, "if": "Bash(git *)" }
{ "type": "http", "url": "http://localhost:8080/hook", "headers": { "Authorization": "Bearer $TOK" }, "allowedEnvVars": ["TOK"] }
{ "type": "mcp_tool", "server": "my_server", "tool": "tool_name", "input": { "file": "${tool_input.file_path}" } }
{ "type": "prompt", "prompt": "Evaluate:\n$ARGUMENTS", "model": "fast-model" }
{ "type": "agent", "prompt": "Verify:\n$ARGUMENTS" }
```

- `command` with `args` → exec form (no shell); without `args` → shell form (quote `"${CLAUDE_PLUGIN_ROOT}"`).
- `if` filters by permission rule (tool events only): `"Bash(git *)"`, `"Edit(*.ts)"`.
- `timeout` default 600s (30 for `UserPromptSubmit`). `once: true` runs once per session (skills/agents only).

## Input (stdin / POST body)

Common: `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `permission_mode`. Tool events add `tool_name` + `tool_input`. `UserPromptSubmit` adds `prompt`. `SessionStart` adds `source`, `model`.

## Output — exit codes (command hooks)

| Exit | Meaning | Effect |
| :-- | :-- | :-- |
| `0` | success | proceeds; stdout JSON processed if valid |
| `2` | blocking error | blocks the action; stderr fed to Claude |
| other | non-blocking error | shown; execution continues |

Exit 2 on `PreToolUse` blocks the tool; on `UserPromptSubmit` blocks+erases the prompt; on `Stop`/`SubagentStop` prevents stopping; on `PreCompact` blocks compaction.

## Output — JSON (exit 0, stdout)

```json
{
  "continue": true,
  "stopReason": "msg when continue:false",
  "suppressOutput": false,
  "systemMessage": "shown to user",
  "decision": "block",
  "reason": "explanation",
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",        // allow|deny|ask|defer (PreToolUse)
    "permissionDecisionReason": "...",
    "additionalContext": "text for Claude (SessionStart/Stop/PostToolUse)",
    "updatedInput": {},                   // PreToolUse/PermissionRequest
    "updatedToolOutput": "..."            // PostToolUse
  }
}
```

- Top-level `decision: "block"` + `reason` is used by `UserPromptSubmit`, `PostToolUse`, `Stop`, etc.
- `PreToolUse` permission control goes through `hookSpecificOutput.permissionDecision`.
- `additionalContext` injects context (the common SessionStart pattern).

## Path placeholders (command/http hooks)

`${CLAUDE_PROJECT_DIR}` (project root), `${CLAUDE_PLUGIN_ROOT}` (plugin install dir), `${CLAUDE_PLUGIN_DATA}` (persistent plugin data). Prefer exec form (`args`) when using placeholders.

## Gotchas

- Make scripts executable (`chmod +x`) and add a shebang; on Windows use `shell: powershell`.
- Plugin hook commands must reference bundled scripts via `"${CLAUDE_PLUGIN_ROOT}"` (quoted in shell form).
