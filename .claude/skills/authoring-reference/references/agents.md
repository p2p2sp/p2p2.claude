# Subagents (agents/<name>.md)

A subagent is a Markdown file: YAML frontmatter + a body that becomes the subagent's **system prompt**. It runs in its own context window. Claude delegates to it based on the `description`.

## Locations & precedence

| Location | Scope | Priority |
| :-- | :-- | :-- |
| Managed settings | org-wide | 1 (highest) |
| `--agents` CLI flag (JSON) | session | 2 |
| `.claude/agents/` | project | 3 |
| `~/.claude/agents/` | personal | 4 |
| `<plugin>/agents/` | plugin | 5 |

Scanned recursively; identity comes only from the `name` field (keep names unique per scope). Plugin subfolders become part of the scoped id: `agents/review/security.md` in plugin `my-plugin` → `my-plugin:review:security`. Added on disk → restart the session to load (or use `/agents`, which is live).

## Frontmatter reference

Only `name` and `description` are required.

```yaml
---
name: code-reviewer            # lowercase + hyphens; unique; received by hooks as agent_type
description: When Claude should delegate here. Add "use proactively" to encourage delegation.
tools: Read, Grep, Glob, Bash  # allowlist; inherits ALL tools if omitted
disallowedTools: Write, Edit   # denylist; applied before `tools`
model: inherit                 # sonnet|opus|haiku|fable | full id (claude-opus-4-8) | inherit (default)
permissionMode: default        # default|acceptEdits|auto|dontAsk|bypassPermissions|plan
maxTurns: 20                   # max agentic turns
skills: [api-conventions]      # preload FULL skill content at startup (not just description)
mcpServers: [github]           # names of configured servers, or inline definitions (see mcp.md)
hooks: { PreToolUse: [...] }   # lifecycle hooks while this agent is active (see hooks.md)
memory: project                # user|project|local — persistent agent-memory dir
background: false              # true → always run as a background task
effort: medium                 # low|medium|high|xhigh|max
isolation: worktree            # run in a temp git worktree (only valid value: worktree)
color: blue                    # red|blue|green|yellow|purple|orange|pink|cyan
initialPrompt: ...             # auto-submitted first turn when run as main agent (--agent)
---

You are a senior code reviewer. When invoked, run git diff, focus on
modified files, and report issues by priority with concrete fixes.
```

## Field notes

- **Model resolution order**: `CLAUDE_CODE_SUBAGENT_MODEL` env → per-invocation `model` → frontmatter `model` → main conversation's model.
- **tools + disallowedTools**: if both set, `disallowedTools` applies first, then `tools` resolves against the remainder. To preload skills use `skills:`, not `Skill` in `tools`.
- **Unavailable to subagents even if listed**: `AskUserQuestion`, `EnterPlanMode`, `ScheduleWakeup`, `WaitForMcpServers` (and `ExitPlanMode` unless `permissionMode: plan`).
- **Parent mode wins**: if the parent is `bypassPermissions`/`acceptEdits`/`auto`, the child's `permissionMode` is overridden.
- **Body = system prompt** only (plus environment details) — not the full Claude Code system prompt. CLAUDE.md + git status load for custom agents (built-in Explore/Plan skip them).
- **Nested subagents** (2.1.172+): a subagent CAN spawn subagents. It has `Agent` when `tools` lists it, or when `tools` is omitted (inherits); to block, omit it from `tools` or set `disallowedTools: Agent`. In a subagent definition the `Agent(type)` allowlist form is ignored — the parenthesised list only applies to a main-thread `claude --agent`. Depth limit: 5 levels below the main conversation, fixed; at depth 5 no `Agent` tool. A `context: fork` skill is one such level and takes its tools from its `agent:` type (default `general-purpose` = has `Agent`; `Explore`/`Plan` = read-only, no `Agent`). Unrelated: a `/fork` (conversation fork) cannot spawn another `/fork`, but can spawn ordinary subagent types.

## Plugin agents — restrictions

Plugin-shipped agents support: `name`, `description`, `model`, `effort`, `maxTurns`, `tools`, `disallowedTools`, `skills`, `memory`, `background`, `isolation`. For security, **`hooks`, `mcpServers`, and `permissionMode` are ignored** in plugin agents — copy the file into `.claude/agents/` if you need them.

## `--agents` JSON form

Same fields, with `prompt` instead of the markdown body:

```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer. Use proactively after code changes.",
    "prompt": "You are a senior code reviewer...",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  }
}'
```

## Disable an agent

```json
{ "permissions": { "deny": ["Agent(Explore)", "Agent(my-custom-agent)"] } }
```
