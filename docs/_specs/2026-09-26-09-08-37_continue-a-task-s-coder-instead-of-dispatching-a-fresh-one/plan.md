---
source: /Users/dario/Projects/p2p2.claude/docs/_specs/2026-09-26-09-08-37_continue-a-task-s-coder-instead-of-dispatching-a-fresh-one/plan.md
---

# Continue a task's coder instead of dispatching a fresh one

Build: skill `implementor`

## Goal

When the implementor sends a task's coder back to work on the same model, it continues the coder instance that already holds the task in its context through `SendMessage`, handing it only the new lines. A fresh dispatch stays the path whenever the model changes, the instance was already continued twice, or continuing is not possible. The aim is fewer tokens read against the Claude Code usage limits.

## Problem

Every re-run of a task's coder today is a fresh `viber:task-coder` dispatch: the new agent re-reads the task file, the references, the prior notes and the code the previous instance already had in its context. A round-1 review failure, a retry after a refused tool call, an owner decision and a retry held at the tier ceiling each pay that full cost again, although the previous instance only needs the findings or the reason. The cost lands on the 5-hour and weekly usage limits of whoever runs the build.

## Current behaviour

The implementor dispatches a coder once per task with its labelled lines. On a round-1 review `FAIL` it dispatches a new coder with the review path as `report:`; on `retry` after `DENIED` it dispatches a new coder on the same model with `reason:`; on `decide` it dispatches a new coder at the same tier with its `decision:` lines; on `retry` after a failure it dispatches a new coder one tier up, or on the same model when the tier is already at `tiers.max`. `SendMessage` is used today only for an agent that stopped with background work still running and for one that returned no `VERDICT:` line.

### Must not change

- The implementor's `SendMessage` on a "stopped with background work" notice and on a reply with no `VERDICT:` line.
- A coder's output lines (`VERDICT:`, `REASON:`, `DOD:`, `EXTRA:`, `DEFERRED:`, `FILES:`) and how the implementor acts on them.
- Reviewer, test-runner and repair-coder dispatches.

## Behaviour

### S1 - A round-1 review failure continues the coder [CHANGED - was: fresh coder dispatch with `report:`]

Given a task whose coder returned PASS and whose reviewer returned `FAIL` in round 1 of 2
When the implementor sends the coder back
Then it continues the coder instance that did the task through `SendMessage`, the message carrying only the `report:` line, and that instance fixes the findings on top of its own work and returns its output lines again

### S2 - Retry after a refused tool call continues the coder [CHANGED - was: fresh coder dispatch with `reason:`]

Given a coder that returned `VERDICT: DENIED` and a user who added the permission and chose retry
When the implementor retries
Then it continues that coder instance with only the `reason:` line

### S3 - An owner decision continues the coder [CHANGED - was: fresh coder dispatch at the same tier]

Given a stalled task on which the user answered with a decision
When the implementor sends the coder back after recording it
Then it continues the task's last coder instance with only the new `decision:` line, plus `report:` when the last failure was a review

### S4 - A retry held at the tier ceiling continues the coder [CHANGED - was: fresh coder dispatch on the same model]

Given a task whose coder tier already equals `tiers.max`
When a retry sends its coder back
Then it continues that instance, since the model does not change

### S5 - A tier raise starts a fresh coder

Given a retry that raises the task's tier
When the implementor sends the coder back
Then it dispatches a fresh coder on the new model with every labelled line, as today

### S6 - The third continuation starts a fresh coder [NEW]

Given a coder instance already continued twice
When the implementor would send it back a third time
Then it dispatches a fresh coder with every labelled line, and that fresh instance may itself be continued twice

### Edge cases

- The coder's agent id is no longer in the implementor's context (a build resumed in another session, a compaction, a task re-dispatched with `resume:` after `dirty:`) -> fresh dispatch with every labelled line.
- `SendMessage` to the coder returns an error -> fresh dispatch with every labelled line.
- Several tasks run at once -> each continuation goes to the instance of its own task, never another task's.
- A continued coder returns no `VERDICT:` line or stops with background work -> the existing `SendMessage` rules apply unchanged and do not count as a continuation.

## Glossary

- Continuation - sending new lines to a coder instance that already finished a run on this task, through `SendMessage`, so it keeps its context. Not a fresh dispatch, and not the existing nudges for a missing verdict or leftover background work.
- Coder instance - one agent started by one fresh `viber:task-coder` dispatch, identified by its agent id; it carries its own count of continuations.

## Acceptance criteria

1. The implementor continues a task's last coder instance through `SendMessage` whenever that coder goes back to work on the model the instance ran on: a round-1 review `FAIL`, `retry` after `DENIED`, `decide`, and `retry` at `tiers.max`; the message carries only the lines new to that instance.
2. A coder instance is continued at most twice; a third re-run is a fresh dispatch with every labelled line, and each fresh dispatch starts a new instance with its own count; `retry` after `DENIED` counts as a continuation.
3. A re-run that changes the model is always a fresh dispatch.
4. With no agent id for the task's coder in the implementor's context, or a `SendMessage` error, the implementor falls back to a fresh dispatch with every labelled line.
5. `task-coder.md` states that a continuation message carries only new lines, every earlier input still stands, and the coder continues the work already in the tree and returns its output lines again.

## Scope

### File map

- modify - viber/skills/implementor/SKILL.md - the continuation rule for a coder re-run, its limit and its fallback
- modify - viber/agents/task-coder.md - how a coder reads a continuation message

### Out of scope

- `task-reviewer`, `planner-review`, `plan-gate.sh`, `test-runner`, the repair coder.
- Continuing a coder on a different model.
- Any measurement or instrumentation of tokens or rounds; the owner tests it by hand after release.
- `viber/CLAUDE.md` and other memory nodes: the build's close owns them.

## Constraints

- Tokens are a design constraint: add as few instruction lines as the behaviour needs, extending existing sentences where the rule is a variant of one (`.claude/rules/instruction-editing.md`).
- `SendMessage` is already in the implementor's `allowed-tools` and in `viber/skills/setup/templates/settings.json`; no permission change.
- Whether an agent id survives `/resume` or a compaction, and the subagent cache lifetime, are unknown; the fallback keeps the build working either way.

## Tasks

<!-- TASK -->
### T1 - Continue a task's coder on a same-model re-run
- TDD: none
- Covers: #1, #2, #3, #4, #5
- Uses: C1
- Depends-on: none
- Files: viber/skills/implementor/SKILL.md, viber/agents/task-coder.md
- Delivers: an orchestrator that sends a task's coder back on the same model by continuing its last instance with only the new lines, at most twice per instance, and otherwise dispatches a fresh coder as today; a coder that reads a continuation message as new lines on top of its unchanged earlier input and work
- Verification: grep -n -i "continuation" viber/skills/implementor/SKILL.md && grep -n -i "continuation" viber/agents/task-coder.md && grep -n "\"SendMessage\"" viber/skills/setup/templates/settings.json -> exit 0: each of the two edited files prints at least one line holding "continuation" (both print none before this task), and the settings template prints the `SendMessage` allow the continuation relies on
- DoD: implementor SKILL.md continues the task's last coder instance through SendMessage on a round-1 review FAIL, retry after DENIED, decide and retry at tiers.max, the message carrying only the lines new to that instance; implementor SKILL.md caps each coder instance at two continuations, counting retry after DENIED, and makes the third re-run a fresh dispatch that starts a new instance with its own count; implementor SKILL.md makes every re-run that changes the model a fresh dispatch; implementor SKILL.md falls back to a fresh dispatch with every labelled line when no agent id for the task's coder is in its context or SendMessage returns an error; implementor SKILL.md keeps the existing background-work and no-verdict SendMessage rules unchanged and does not count them as continuations; task-coder.md states that a continuation message carries only new lines, every earlier input still stands, the work already in the tree is continued, and the output lines are returned again
<!-- /TASK -->

## Contracts

### C1 - Coder continuation message

File: viber/skills/implementor/SKILL.md

A `SendMessage` to the task's last coder instance whose body is only the labelled lines new to that instance, each in the dispatch form:

```
report: <dir>/work/review-<id>-<round>.md
reason: <the returned REASON, or the short DOD: line when no REASON: came>
decision: <task-id>: <text>
```

Each line appears only when the re-run adds it: `report:` after a review failure, `reason:` on a retry after the coder's own failure or `DENIED`, `decision:` for a decision recorded after the instance's last run.
