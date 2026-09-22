---
source: /Users/dario/.claude-dario/plans/synchronous-whistling-mochi.md
---

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

## Tasks

<!-- TASK -->
### T1 - Report a refused tool call as DENIED in the three command-running agents
- TDD: none
- Covers: #1, #2, #3
- Uses: C1
- Depends-on: none
- Files: viber/agents/task-coder.md, viber/agents/task-reviewer.md, viber/agents/test-runner.md
- Delivers: the three agents return the C1 verdict when the harness refuses one of their tool calls, `task-coder` stops instead of working around the refusal, and `task-reviewer` writes no report on it.
- Verification: `grep -c "VERDICT: DENIED" viber/agents/task-coder.md viber/agents/task-reviewer.md viber/agents/test-runner.md && bash supercc/skills/skill-designer/scripts/lint_skill.sh viber/agents/task-coder.md && bash supercc/skills/skill-designer/scripts/lint_skill.sh viber/agents/task-reviewer.md && bash supercc/skills/skill-designer/scripts/lint_skill.sh viber/agents/test-runner.md` -> every count is at least 1 and each lint run ends `FAIL=0`
- DoD: each of the three files states its output as C1 when the harness refuses one of its tool calls; `task-coder.md` forbids reaching a refused call's effect through any other command or tool and ends the task on C1 instead; `task-reviewer.md` writes no findings report on C1; in all three files a command that ran and exited non-zero stays on the existing `VERDICT: FAIL` path; each file grows by at most 4 lines; every edit follows the `supercc:skill-designer` authoring rules; no added line carries an em dash or an en dash
<!-- /TASK -->

<!-- TASK -->
### T2 - Answer a DENIED verdict with a same-tier retry question in implementor
- TDD: none
- Covers: #4, #5
- Uses: C1
- Depends-on: none
- Files: viber/skills/implementor/SKILL.md, viber/CLAUDE.md
- Delivers: `implementor` answers C1 from the coder, the reviewer and the test run with one user question whose first option retries the same agent on the same model and round, and `viber/CLAUDE.md` records the refusal verdict as a cross-file invariant.
- Verification: `grep -c "VERDICT: DENIED" viber/skills/implementor/SKILL.md viber/CLAUDE.md && bash supercc/skills/skill-designer/scripts/lint_skill.sh viber/skills/implementor/SKILL.md` -> both counts are at least 1 and the lint run ends `FAIL=0`
- DoD: a coder returning C1 gets one `AskUserQuestion` naming the task and the refused call with the options permission added and retry, skip, abort; that retry re-dispatches the coder on the same model with its own dispatch lines plus `reason:` carrying the returned `REASON`, and does not raise the tier; a reviewer returning C1 gets one `AskUserQuestion` naming the task and the refused call with the options permission added and retry, accept, abort; that retry re-dispatches the reviewer on the same model with the same `report:` round, and accept commits with `--unreviewed`; a test run returning C1 gets one `AskUserQuestion` naming the refused call with the options permission added and retry, accept, abort, and no repair coder is dispatched; that retry re-dispatches `test-runner` with the same report round; a repair coder dispatched after a failed test run returning C1 gets one `AskUserQuestion` naming the refused call with the options permission added and retry, accept, abort, and nothing is committed on that return; that retry re-dispatches the repair coder on `sonnet` with the same `spec:`, `report:`, `notes:` and `refs:` lines, and accept closes the build as the test-run accept does; every existing `VERDICT: FAIL` path in the skill reads as it does today; `viber/CLAUDE.md` carries one bullet under `## Contracts & invariants` naming the three emitters, the no-workaround rule and the same-tier retry question; every edit follows the `supercc:skill-designer` authoring rules; no added line carries an em dash or an en dash
<!-- /TASK -->

## Contracts

### C1 - Refusal verdict

File: none

```
VERDICT: DENIED
REASON: <refused tool name>: <the exact refused command, or the path for a file tool>
```

Line 1 and line 2 of the agent's output. Any further line the agent's output format already defines for its other verdicts may follow.
