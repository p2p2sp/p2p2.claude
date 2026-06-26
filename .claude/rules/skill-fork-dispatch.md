---
paths:
  - "**/skills/**"
---

# Forked-skill dispatch

- A `context: fork` skill MAY invoke other `context: fork` skills via the `Skill` tool; whitelist `Skill` in its `allowed-tools` for this to work.
- Independent fork-skills can run concurrently — batch several `Skill` calls in one turn instead of chaining them; chain only when a later step depends on an earlier verdict.
- The "a fork cannot spawn further forks" limit applies only to the `Agent`/`Task` tool (nested subagents), never to the `Skill` tool.
- Precedent: `dev-agent-final-reviewer` calls `dev-agent-plan-auditor` / `dev-agent-runner` / `dev-agent-smoke` via `Skill`; `dev-superplan-reviewer` dispatches its lens reviewers concurrently via `Skill`.
