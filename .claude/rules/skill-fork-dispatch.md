---
paths:
  - "**/skills/**/*.*"
---

# Forked-skill dispatch

A `context: fork` skill can fan work out two ways — pick by what the worker is.

## Tool inheritance — the cascade (governs both mechanisms below)

A dispatched worker never gets its full declared toolset for free — the grant CASCADES from the caller. A tool is available to the worker only if it is present at EVERY level from the main session down to that worker.

- **Skill-tool fork** — effective tools = the caller's effective tools INTERSECTED with the fork's own `allowed-tools`. A tool the fork's `allowed-tools` declares but the caller lacks is silently stripped (no error until the fork tries to use it). Proven (historical): the `runner` agent was once `Read, Skill` and invoked `superbuild-runner` (`allowed-tools: Bash, …`), so the fork ran with `Read, Skill` only — `Bash` gone. That demonstration is now superseded — `runner` is `Read, Bash` and runs the recipe itself, no longer invoking the fork; after that change NO `superbuild-runner` caller exhibits a `Bash` strip, since both survivors (`coder`, `superbuild-reviewer`) deliberately carry `Bash` so the fork inherits it.
- **Agent-tool / workflow (`agentType`) subagent** — runs with its OWN declared `tools:`; it does NOT widen to the caller's set, and still cannot exceed what ancestors hold. To grant a subagent a tool, list it in that agent's own `tools:`.
- **Universal rule:** a tool a worker needs at runtime must be granted on the worker AND on every ancestor up to the main session. Missing at ANY level → stripped.
- **Scoped `Bash` intersects narrowly:** caller unscoped `Bash` ∩ child `Bash(sh:*)` = `Bash(sh:*)` (survives); caller with NO `Bash` ∩ child `Bash(…)` = nothing. An unscoped `Bash` on the parent covers any scoped child grant; no `Bash` on the parent strips every child's `Bash` — runtime calls AND load-time `!`-injection alike.
- **A thin delegating wrapper still needs the tool.** A wrapper that runs nothing itself but invokes a fork/subagent that runs `Bash` MUST carry `Bash` purely to pass it down — omitting the tool to enforce "don't run it yourself" also disarms the fork. Enforce that intent by INSTRUCTION in the body, never by tool omission.
- **Diagnosing:** a worker whose error names "available tools: … only", omitting a tool its own `allowed-tools`/`tools` declares, has hit a cascade strip — add the tool to the caller (and up the chain), not just the worker.
- Precedent: `coder` (agent, has `Bash`) → `superbuild-runner` fork runs its recipe fine. Anti-precedent (fixed): `superbuild-reviewer` (fork) had to carry `Bash` solely so the `superbuild-runner` fork it invokes inherits it. (`runner` formerly shared this shape but no longer — it runs the recipe with its own `Bash` and no longer invokes the fork.)

## Via the `Skill` tool → other fork-skills
- A `context: fork` skill MAY invoke other `context: fork` skills via the `Skill` tool; whitelist `Skill` in its `allowed-tools`.
- Independent fork-skills run concurrently — batch several `Skill` calls in one turn; chain only when a later step depends on an earlier verdict.
- Precedent: `superbuild-reviewer` calls `superbuild-reviewer-plan` / `superbuild-runner` via `Skill`.

## Via the `Agent` tool → subagents
- A `context: fork` skill MAY also dispatch subagents via the `Agent` tool; whitelist `Agent` in its `allowed-tools` (canonical token `Agent`, capital A — `Task` is a legacy alias).
- A fork can spawn any NON-fork subagent type (`general-purpose`, `Explore`, …) but CANNOT spawn another fork that way — that is the whole "a fork cannot spawn a fork" limit, and it applies to the `Agent`/`Task` tool, never to `Skill`.
- Nesting is depth-capped at 5 levels below the main conversation; a subagent at depth 5 cannot spawn further.
- Batch independent agents in one turn to run them concurrently.
- Precedent: `superplan-reviewer` dispatches one `general-purpose` agent per checklist group via the `Agent` tool.
