---
source: C:\Users\dario\.claude-p2p2\plans\lively-bouncing-seal.md
---

# Build close brings over-budget CLAUDE.md nodes back within budget

Build: skill `implementor`

## Goal

A host project's `CLAUDE.md` nodes grow without bound (one reached 98113 characters against a 12000 cap): plan tasks write into them with no budget, `memory-writer` may end over a cap, and its `OVER:` report triggers no repair. The build's close must verify every node left over budget against the code and bring it back within budget in the same run, and plans must stop routing memory writes through ordinary tasks.

## Acceptance criteria

1. When `memory-writer` returns one or more `OVER:` lines, `implementor` step 6 dispatches `viber:memory-auditor` once per such path as soon as `memory-writer` returned, without waiting for `rules-writer` or `qa-writer`, all in one message, each with `target`, `scope` and `out: .temp/viber/<run key>/`, no `model:`; an auditor returning no `AUDIT:` line leaves its node with `findings: none`.
2. After every auditor returned, `implementor` dispatches `viber:memory-node-writer` on each of those paths in waves by depth, the root's first, each with `mode: fix`, `findings:` its audit file, `planned: none`, `refs:`, no `model:`; when a later wave created or deleted a node and the root exists, one more `mode: fix`, `findings: none`, `planned: none` dispatch runs on the root.
3. The paths those writers return on `FILES:` are committed through the same `commit-task.sh --chore` call as the other memory and rule paths; their `AUDIT:`, `DROPPED:`, `DELETED:`, `LIFT:` and `CHAIN:` lines are repeated verbatim in the final summary; an `OVER:` line whose node a writer returned `UPDATED` or `NONE` on is no longer repeated, any other stays.
4. `memory-node-writer` accepts `planned: none`: a node carrying a list of nodes keeps the list it found, adds each node its own split created and drops each node that no longer exists.
5. The descriptions of `memory-auditor` and `memory-node-writer` end "Invoked only by the memory skill and the implementor skill, never directly."
6. `plan-rules.md` carries a `(review)` rule: with the `memory` switch on, no task lists a `CLAUDE.md` in `Files`, whatever the host's own instructions say; `planner` passes the resolved `memory:` value to `planner-review`, whose input names that line, so the reviewer can gate the rule.

## Scope

### File map

- modify - viber/agents/memory-node-writer.md - `planned: none` input and its budget meaning; description names the implementor as caller
- modify - viber/agents/memory-auditor.md - description names the implementor as caller
- modify - viber/skills/implementor/SKILL.md - step 6 audit and budget repair of `OVER:` nodes, their commit and summary lines
- modify - viber/references/plan-rules.md - the `(review)` rule keeping `CLAUDE.md` out of task `Files` under `memory: true`
- modify - viber/skills/planner/SKILL.md - step 3 passes the `memory:` line to the reviewer
- modify - viber/agents/planner-review.md - input names the `memory:` line

### Out of scope

- Every `CLAUDE.md`: under this repo's `memory: true` the build's close records the change in `viber/CLAUDE.md`.
- `viber/agents/memory-writer.md`: unchanged, it still ends over a cap and reports `OVER:`.
- The `memory` skill, its `disable-model-invocation`, and `memory-map.sh`.
- Any pending-facts file, any task added to a running build.
- Every script and every test under `tests/`.

## Tasks

<!-- TASK -->
### T1 - Let memory-node-writer run with no planned node set
- TDD: none
- Covers: #4, #5
- Uses: C1
- Depends-on: none
- Files: viber/agents/memory-node-writer.md
- Delivers: the agent's input accepts `planned: none`, meaning a node's list of nodes stays as found, gains the nodes its own split created and loses the nodes that no longer exist; the description names both callers.
- Verification: `grep -n "planned: .*none" viber/agents/memory-node-writer.md && grep -n "planned:" viber/skills/memory/SKILL.md` -> the agent's input line offering `none` beside the skill's existing `planned:` dispatch line
- DoD: the Input block shows `planned:` taking a comma-separated set or `none`; the Budget section states what a list of nodes becomes under `none`; the description ends "Invoked only by the memory skill and the implementor skill, never directly."; no em dash or en dash in the file
<!-- /TASK -->

<!-- TASK -->
### T2 - Keep CLAUDE.md out of task files when memory is on
- TDD: none
- Covers: #6
- Uses: C2
- Depends-on: none
- Files: viber/references/plan-rules.md, viber/skills/planner/SKILL.md, viber/agents/planner-review.md
- Delivers: a `(review)` rule under `## Tasks` of `plan-rules.md` refusing a `CLAUDE.md` in any task's `Files` when the `memory` switch is on, with no exception for what the host's instructions ask, the close owning that layer; `planner` step 3 passing the resolved `memory:` line to `planner-review`; `planner-review`'s Input naming that line.
- Verification: `grep -n "CLAUDE.md" viber/references/plan-rules.md && grep -n "memory:" viber/skills/planner/SKILL.md viber/agents/planner-review.md` -> the rule line in `plan-rules.md` and the `memory:` line in both the dispatch and the reviewer's input
- DoD: the rule is tagged `(review)`, names the `memory` switch and admits no exception; `planner` step 3 dispatch carries `memory: <value>` from its config block; `planner-review` Input names `memory:` as a line it receives and reads a missing one as `false`; no em dash or en dash in the three files
<!-- /TASK -->

<!-- TASK -->
### T3 - Audit and shrink over-budget nodes in the build close
- TDD: none
- Covers: #1, #2, #3, #5
- Uses: C1, C3
- Depends-on: T1
- Files: viber/skills/implementor/SKILL.md, viber/agents/memory-auditor.md
- Delivers: `implementor` step 6 audits every `OVER:` path in parallel, then dispatches `memory-node-writer` on each in waves by depth plus a root reconcile when a later wave created or deleted a node, commits their paths with the other memory and rule paths, and carries their report lines to the final summary; `memory-auditor`'s description names both callers.
- Verification: `grep -n "memory-auditor\|memory-node-writer\|planned: none" viber/skills/implementor/SKILL.md && grep -n "^target:\|^scope:\|^out:" viber/agents/memory-auditor.md` -> the step 6 dispatch lines in the skill and the input lines they fill in the agent
- DoD: step 6 dispatches the auditors as soon as `memory-writer` returned, never waiting for the other writers of the step, and the `--chore` commit only after every writer, the last wave and any root reconcile returned; one `viber:memory-auditor` per `OVER:` path in one message with `target`, `scope` and `out: .temp/viber/<key>/`, no `model:`; an `AUDIT:` line is its return, never handled as a missing `VERDICT:`, and a missing `AUDIT:` line sends that node's writer `findings: none`; `viber:memory-node-writer` goes out per path in waves by depth, root first, with `mode: fix`, `findings:`, `planned: none`, `refs:`, no `model:`; a later wave returning a `FILES:` path other than its dispatched node, or a `DELETED:` line, triggers one root dispatch with `findings: none` when the root exists; its `FILES:` paths join the single `--chore` call; `AUDIT:`, `DROPPED:`, `DELETED:`, `LIFT:` and `CHAIN:` lines reach the final summary verbatim, an `OVER:` line stays only for a node whose writer returned neither `UPDATED` nor `NONE`; the `memory` task entry gets `TaskUpdate` -> completed only after that commit; `memory-auditor`'s description ends "Invoked only by the memory skill and the implementor skill, never directly." and its input lines stay as they are; no em dash or en dash in either file
<!-- /TASK -->

## Contracts

### C1 - memory-node-writer planned line

File: viber/agents/memory-node-writer.md

```
planned: <every node path of the planned set, comma-separated, root first> | none
```

`none`: a node carrying a list of nodes keeps the list it found, plus every node its own split created, minus every node no longer in the tree.

### C2 - planner-review memory line

File: viber/skills/planner/SKILL.md, viber/agents/planner-review.md

```
memory: true | false
```

One labelled line in the `planner-review` dispatch, the `memory:` value of the planner's resolved config block.

### C3 - memory-auditor dispatch and return

File: viber/agents/memory-auditor.md

```
target: <repo-relative path of one CLAUDE.md>
scope: <repo-relative directory the target describes>
out: .temp/viber/<id>/
```

`scope` for the root node is the repository root, as the `memory` skill already sends it. Return, exactly one line:

```
AUDIT: <target> stale <n> gone <n> unverifiable <n> miss <n> -> <path of the findings file>
```
