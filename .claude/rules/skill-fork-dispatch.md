---
paths:
  - "**/skills/**"
---

# Forked-skill dispatch

A `context: fork` skill can fan work out two ways — pick by what the worker is.

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
