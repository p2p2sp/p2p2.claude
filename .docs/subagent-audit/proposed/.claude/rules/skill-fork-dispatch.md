---
paths:
  - "**/skills/**/*.*"
  - "**/agents/*.md"
---

# Worker dispatch — one level deep

Delegation in the harness is FLAT. The main session (or a main-context skill running in it)
dispatches workers — fork skills via the `Skill` tool, plugin agents via the Task tool or a
`Workflow` `agentType` stage. A dispatched worker (fork skill or agent) runs ONE level deep
and CANNOT spawn further workers: no `Skill`-fork, no `Agent`/`Task`, no `Workflow` from
inside a fork or subagent. Design every pipeline so the dispatcher fans out and each worker
returns a verdict/report — never so a worker delegates onward.

- Do NOT grant `Skill`, `Agent`/`Task`, or `Workflow` in a worker's `tools:` /
  `allowed-tools:` — the grant implies a nested dispatch that cannot happen, and it misleads
  the next editor into designing around it.
- A step a worker "needs" from another worker must be either **lifted to the dispatcher**
  (run it as a sibling stage and pass the report path between stages) or **folded into the
  worker itself** (inline the discipline — the shape the `runner` agent flattening already
  proved: it runs its recipe verbs directly instead of nesting the `superbuild-runner` fork).
- Batch independent workers in one dispatcher turn to run them concurrently.

## Tool inheritance — the cascade (still true, one level down)

A worker never gets its declared toolset for free — the grant cascades from the caller. A
tool is available to the worker only if it is present at the caller AND on the worker.

- **Skill-tool fork** — effective tools = the caller's effective tools INTERSECTED with the
  fork's own `allowed-tools`. A tool the fork declares but the caller lacks is silently
  stripped (no error until the fork tries to use it).
- **Agent (Task / workflow `agentType`) worker** — runs with its OWN declared `tools:`; it
  does NOT widen to the caller's set.
- **Scoped `Bash` intersects narrowly:** caller unscoped `Bash` ∩ child `Bash(sh:*)` =
  `Bash(sh:*)` (survives); caller with NO `Bash` ∩ child `Bash(…)` = nothing — runtime calls
  AND load-time `!`-injection alike.
- **Diagnosing:** a worker whose error names "available tools: … only", omitting a tool its
  own manifest declares, has hit a cascade strip — add the tool to the caller, not just the
  worker.
