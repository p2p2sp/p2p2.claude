# Report harness permission refusals as their own verdict

Build: skill `implementor`

## Goal

When the harness refuses a tool call during a build (a deny rule, a user rejecting a prompt, command-line flags, managed settings), the three agents that run commands report it today as an ordinary failure. The orchestrator then retries one model tier up, or sends a coder to repair something that is not broken, and never offers the user the one move that helps: grant the permission and try again. This change makes a refusal a signal of its own, answered by a question to the user instead of an automatic loop.

## Acceptance criteria

1. `task-coder`, `task-reviewer` and `test-runner`, after the harness refuses one of their tool calls, return a refusal verdict whose reason names the refused tool and the exact refused call.
2. `task-coder` never works around a refusal by reaching the refused call's effect through another command or tool.
3. `task-reviewer` returning a refusal writes no findings report.
4. `implementor`, on a refusal from any of the three agents, asks the user once, naming the refused call; the first option re-dispatches the same agent on the same model and the same round, and the remaining options are that branch's own (task coder: skip or abort; reviewer: accept as unreviewed or abort; test run and the repair coder after it: accept or abort).
5. `viber/CLAUDE.md` describes the refusal verdict: who emits it, that it is never worked around, and how the orchestrator answers it.

## Scope

### File map

- modify - viber/agents/task-coder.md - the coder's refusal verdict and the rule against working around a refusal
- modify - viber/agents/task-reviewer.md - the reviewer's refusal verdict, with no findings report
- modify - viber/agents/test-runner.md - the test run's refusal verdict
- modify - viber/skills/implementor/SKILL.md - the orchestrator's answer to a refusal from each of the three agents
- modify - viber/CLAUDE.md - the cross-file invariant describing the refusal verdict

### Out of scope

- Reading `settings.json`, `settings.local.json` or managed settings from any skill or agent.
- Validating a plan's `Verification` commands against deny rules in `planner`, `planner-review` or `plan-index.sh`.
- `e2e-writer`, `closeup` and their existing blocked verdict.
- The existing one-tier-up retry on an ordinary coder failure, and every other existing failure path.
