---
source: /Users/dario/.claude-p2p2/plans/tingly-discovering-gizmo.md
---

# Give viber memory its own per-node writer, dispatched in top-down waves

Build: skill `implementor`

## Goal

`/viber:memory` must be able to rebuild, extend and repair a host project's `CLAUDE.md` cascade without leaving it over budget and without undoing a reset. The user-run path gets a writer built for authoring one node at a time, fed a truthful map, while the build close keeps the writer it already has.

## Problem

A reset on a real project (19 nodes) failed and cost 25m55s of one agent's context. After the reset, the skill handed one `memory-writer` the map it preloaded BEFORE the reset, so the writer saw 19 nodes that should exist and restored them from git instead of authoring them. It created none of the 3 candidate nodes whose discovery audits returned 7, 10 and 11 facts, split nothing, and left 12 nodes over the node budget and 7 over the chain budget as "pre-reset debt". The writer's contract is written for folding a build's delta (keep the node's existing voice, fix what the build made false, write over budget and report it), so authoring a cascade from zero and paying off an over-budget node are outside what it was told to do. Even a fresh map would not help today: the map script deletes a node without staging the deletion and lists nodes from the git index, so a deleted node still shows up as a node of 0 characters and as uncommitted work.

## Current behaviour

- The map treats every tracked `CLAUDE.md` as a node, present in the working tree or not.
- `/viber:memory` audits every approved target with `memory-auditor` (verify for a node, discovery for a candidate), then dispatches ONE `memory-writer` with the preloaded map and the audit notes. After a reset it continues with that same preloaded map.
- `memory-writer` serves both the build close and the user run, and may end a node over budget and report it.

### Must not change

- The build close: `implementor` dispatches `viber:memory-writer` after a build and handles what it returns exactly as today.
- The map's output line formats, the map mode always exiting 0, and the reset's all-or-nothing refusal with its exit codes, including the refusal of a node whose deletion is already uncommitted.
- `/viber:memory` opens and writes no file itself, and stages or commits nothing.
- The `rules` skill, `rules-writer` and `rules-auditor`.

## Behaviour

### S1 - A reset rebuilds the cascade from the code [CHANGED - was: one writer restored the deleted nodes from git using the pre-reset map]

Given a project with tracked nodes and no uncommitted node
When the user runs `/viber:memory reset` and approves the deletion and the targets
Then the skill maps the layer again, and every emptied directory plus every candidate gets a node authored from its own code, root first, then each depth level in parallel, each one within budget

### S2 - Review repairs and slims existing nodes [CHANGED - was: findings folded by one writer, over-budget nodes left over]

Given nodes some of which are stale or over budget
When the user runs `/viber:memory review` and approves writing
Then each node with findings or over budget is corrected by its own dispatch, top-down, and ends within budget; facts that could not fit are listed to the user

### S3 - Extend gives candidates their nodes [CHANGED - was: a discovery audit per candidate, then the shared writer]

Given candidate directories with no node
When the user runs `/viber:memory extend`
Then each approved candidate gets one dispatch that reads its area and either writes a node or answers that the area needs none

### S4 - The root's list of nodes stays true after a run [NEW]

Given a root node that lists the project's nodes
When a run creates or deletes any node
Then the root's list names exactly the nodes that exist when the run ends

### S5 - The build close keeps folding a build into memory [CHANGED - was: its budget doctrine lived in its own body]

Given a finished build with the memory switch on
When the close dispatches `memory-writer`
Then it folds the build's delta exactly as before, reading the same budget doctrine the user-run writer reads

### Edge cases

- A node deleted and not yet committed, staged or not -> the map shows it as absent, and its directory can become a candidate again.
- A node with no findings but over budget -> still corrected and brought within budget.
- A node with no findings and within budget -> left untouched.
- A candidate whose node an earlier wave already started through a split -> the facts already there are kept, the rest is authored around them.
- An ancestor outside this run already leaves the chain over budget -> the node is kept within its own budget and the user is told which ancestor is responsible; nothing outside the node is written.
- A fact two sibling areas share -> reported to the user as belonging in the parent, never moved there automatically.
- A node whose area is gone -> deleted, and the deletion is reported.

## Glossary

- wave - every target at the same depth below the root, dispatched together; the next wave starts only after the previous one returned. The root is wave 0.
- fix mode - correcting one existing node from its audit and bringing it within budget.
- create mode - authoring one node by reading its own area's code; no audit precedes it.
- planned set - every node this run intends to exist when it ends.
- node doctrine - the budgets, what a node carries, the ancestor rule and the compact/split order, shared by both memory writers.

## Acceptance criteria

1. After nodes are deleted and the deletion is not committed, staged or not, the map shows none of them as a node or as uncommitted work, ignores them in its totals and state, and lists their depth-1 or depth-2 directory as a candidate again when it qualifies.
2. After a successful reset, `/viber:memory` maps the layer again and builds its targets from that fresh map's candidates plus every directory the reset emptied.
3. `/viber:memory` writes in waves by path depth, root first, one dispatch per target node, every target of a wave dispatched together, the next wave only after the previous one returned.
4. Only existing nodes are audited; candidates and emptied directories go straight to create mode, and `memory-auditor` keeps only its verify direction.
5. `memory-node-writer` writes only the node its dispatch names (plus a split into a subdirectory's node), in fix or create mode, applies each of the four finding kinds through an explicit action, and never reads or restores content from git history.
6. Every node `memory-node-writer` writes ends within 12000 characters, and within 32000 over its chain whenever its ancestors leave room; each fact left out to get there is reported to the user; a node with no findings but over budget is corrected like any other.
7. A create dispatch on an area that needs no node writes nothing, and the user is told the area needs none.
8. After the last wave, when the root exists and the run created or deleted any node or wrote the root with a list that no longer matches, the root's list of nodes (if it carries one) names exactly the nodes that exist.
9. Facts shared by siblings and ancestors responsible for an over-budget chain are reported to the user; nothing moves a fact to a parent on its own.
10. The node doctrine lives in one plugin-level reference that both memory writers read, `memory-writer` serves the build close only, and `implementor` points it at that reference.
11. The plugin's catalog lists the new agent, and `viber/CLAUDE.md` plus the root `CLAUDE.md` state the new agent, the new reference and the changed knowledge-layer invariants.

## Scope

### File map

- modify - viber/skills/memory/scripts/memory-map.sh - a tracked node missing from the working tree is no node in the map
- modify - tests/viber/memory-map.test.ts - regression cases for a deleted, unstaged node
- add - viber/references/node-doctrine.md - the shared node doctrine
- modify - viber/agents/memory-writer.md - build-close input only, doctrine read from the reference
- modify - viber/skills/implementor/SKILL.md - points `memory-writer` at the reference
- add - viber/agents/memory-node-writer.md - the per-node writer, fix and create modes
- modify - viber/.claude-plugin/plugin.json - registers the new agent
- modify - viber/skills/memory/SKILL.md - re-map after reset, fix/create routing, waves, root reconcile, report
- modify - viber/agents/memory-auditor.md - verify direction only
- modify - viber/CLAUDE.md - counts, entry points, knowledge-layer, permissions and references invariants
- modify - CLAUDE.md - viber row of the memory-layer table

### Out of scope

- The `rules` skill, `rules-writer`, `rules-auditor` and `rules-map.sh`.
- The build close's behaviour in `implementor` beyond pointing `memory-writer` at the reference.
- superdev and every other plugin.
- Moving a shared fact to the parent automatically.
- `viber/README.md`: its memory lines stay true.
- Compacting `viber/CLAUDE.md`, whose chain is already over budget.

## Constraints

- Every skill and agent file is authored per `supercc:skill-designer` and linted at zero FAIL.
- The map script stays portable across bash 3.2 on macOS and Git-Bash on Windows, with no new dependency.
- Stack-agnostic: nothing in the new agent or the skill assumes a host ecosystem.
- No prompt bloat: the doctrine lives once, in the reference; neither writer restates it.
- Every task editing this repo's markdown or `plugin.json` gets its per-task review.
- No em dash or en dash in any file.

## Tasks

<!-- TASK -->
### T1 - Treat a deleted, unstaged node as absent in memory-map.sh
- TDD: required
- Covers: #1
- Uses: none
- Depends-on: none
- Files: viber/skills/memory/scripts/memory-map.sh, tests/viber/memory-map.test.ts
- Delivers: a map in which a tracked `CLAUDE.md` absent from the working tree is no node, no dirty entry and no reason to withhold a candidate, with its header contract saying so; `--reset` judgment unchanged
- Verification: node --test tests/viber/memory-map.test.ts -> every test passes, including new cases for a node deleted by `--reset` and left unstaged, and a node deleted with `git rm`
- DoD: a deleted, unstaged node prints no `node:` line; a deleted node, staged or not, prints no `dirty:` line; `total:` and `state:` ignore it; its depth-1 or depth-2 directory with three or more other tracked files prints a `cand:` line; `--reset` on a node whose deletion is uncommitted still exits 3 with `refused: <path> modified`; the header `Contract:` block states the rule; every pre-existing test still passes
<!-- /TASK -->

<!-- TASK -->
### T2 - Extract the node doctrine into a shared reference
- TDD: none
- Covers: #10
- Uses: C1, C4
- Depends-on: none
- Files: viber/references/node-doctrine.md, viber/agents/memory-writer.md, viber/skills/implementor/SKILL.md
- Delivers: the shared node doctrine as a plugin-level reference, `memory-writer` reduced to the build-close input shape and reading that reference, `implementor` passing it the C4 lines
- Verification: grep -n "node-doctrine.md" viber/agents/memory-writer.md && grep -n "12000" viber/references/node-doctrine.md && grep -n "memory-writer" viber/skills/implementor/SKILL.md && bash supercc/skills/skill-designer/scripts/lint_skill.sh viber/agents/memory-writer.md -> every grep matches and the linter reports FAIL=0
- DoD: the reference carries the four C1 sections; `memory-writer` restates none of them and reads `<refs>/node-doctrine.md` at the step that needs it; `memory-writer` keeps its write-over-budget-and-report last resort and its `OVER:` line; the `map:` input shape and every mention of `*-audit.md` are gone from `memory-writer`; its `description:` names only the implementor skill as caller; the implementor dispatch to `viber:memory-writer` carries the three C4 lines; the rules-writer and qa-writer dispatch lines in implementor name the lines they carry explicitly instead of "those same two"
<!-- /TASK -->

<!-- TASK -->
### T3 - Add the memory-node-writer agent
- TDD: none
- Covers: #5, #6, #7, #9, #11
- Uses: C1, C2, C3
- Depends-on: T2
- Files: viber/agents/memory-node-writer.md, viber/.claude-plugin/plugin.json
- Delivers: an agent that writes one node per dispatch in fix or create mode, within budget, takes the C2 input and returns the C3 lines; registered in the plugin's `agents[]`
- Verification: bash supercc/skills/skill-designer/scripts/lint_skill.sh viber/agents/memory-node-writer.md && grep -n "memory-node-writer" viber/.claude-plugin/plugin.json viber/agents/memory-node-writer.md && grep -n "node-doctrine.md" viber/agents/memory-node-writer.md && grep -n "planned:" viber/agents/memory-node-writer.md -> FAIL=0 and every grep matches in each named file
- DoD: frontmatter carries `name`, a description ending "Invoked only by the memory skill, never directly.", `tools`, `model: opus`, `effort: high` and `color`; the `## Input` section declares the C2 lines and the `## Output` section the C3 lines; the body reads `<refs>/node-doctrine.md` at the step that needs it and restates none of it; STALE, GONE, UNVERIFIABLE and MISS each map to an explicit action; it never reads or restores content from git history, and `Bash` serves only measuring sizes and deleting its own node when its area is gone; it writes no file but its own node, except a split into a subdirectory's node; create mode on a node that already exists keeps what is there and authors the rest; it never ends a node over 12000 characters, nor its chain over 32000 while its ancestors leave room, returning each left-out fact on `DROPPED:`; create mode on an area needing no node writes nothing and returns `VERDICT: NO-NODE`; a node carrying a list of nodes keeps it equal to `planned:`; `plugin.json` lists `./agents/memory-node-writer.md` in `agents[]` and nowhere in `skills[]`
<!-- /TASK -->

<!-- TASK -->
### T4 - Rework the memory skill into re-mapped, top-down writer waves
- TDD: none
- Covers: #2, #3, #4, #6, #7, #8, #9
- Uses: C2, C3
- Depends-on: none
- Files: viber/skills/memory/SKILL.md, viber/agents/memory-auditor.md
- Delivers: a memory skill that re-maps after a reset, audits existing nodes only, dispatches `viber:memory-node-writer` in waves by depth with the C2 lines, reconciles the root once when needed and reports the C3 lines; an auditor with the verify direction alone
- Verification: bash supercc/skills/skill-designer/scripts/lint_skill.sh viber/skills/memory && bash supercc/skills/skill-designer/scripts/lint_skill.sh viber/agents/memory-auditor.md && grep -n "viber:memory-node-writer" viber/skills/memory/SKILL.md && grep -n "planned:" viber/skills/memory/SKILL.md && ! grep -n "## Propose\|target: none\|viber:memory-writer" viber/skills/memory/SKILL.md viber/agents/memory-auditor.md -> both linters FAIL=0, the two positive greps match, the negated grep matches nothing
- DoD: after a reset exiting 0 the skill runs `"${CLAUDE_SKILL_DIR}/scripts/memory-map.sh"` again and takes its targets from that map's `cand:` lines plus every directory a `removed:` line emptied; only `node:` targets are audited; when an audit ran (review, both) one `AskUserQuestion` over the counters, the over-budget flags and the create targets precedes the first wave, while reset and extend go from target approval straight to the waves; a node target with four zero counters and an `ok` flag gets no dispatch while one with an over-budget flag does; writers go out one wave per path depth, root first, all of a wave in one message, the next only after the previous returned; each dispatch carries exactly the C2 lines; a dispatch created a node when it ran in create mode and returned `VERDICT: UPDATED`, or named a `FILES:` path outside the planned set; it deleted one when it returned `DELETED:`; after the last wave, when the root exists and either it was a target and the nodes that now exist differ from the `planned:` it was written with, or it was not a target and any dispatch created or deleted a node, the root gets one fix dispatch with `findings: none` and `planned:` set to the nodes that now exist; the final report repeats each `FILES:`, `DELETED:`, `DROPPED:`, `LIFT:`, `CHAIN:` line and each `NO-NODE` target; the auditor's input no longer accepts `target: none` and it has no discovery section
<!-- /TASK -->

<!-- TASK -->
### T5 - Document the new writer in the viber and root nodes
- TDD: none
- Covers: #11
- Uses: none
- Depends-on: T2, T3, T4
- Files: viber/CLAUDE.md, CLAUDE.md
- Delivers: both memory nodes stating twelve agents, four plugin-level references, the memory skill's writer and waves, and the knowledge-layer invariant rewritten for two memory writers each owning one entry
- Verification: grep -n "memory-node-writer" viber/CLAUDE.md viber/.claude-plugin/plugin.json && grep -n "node-doctrine.md" viber/CLAUDE.md viber/agents/memory-writer.md && grep -n "twelve agents" CLAUDE.md -> every grep matches in each named file
- DoD: `viber/CLAUDE.md` Purpose counts TWELVE agents and FOUR plugin-level references; its `memory` entry point and `agents/` list name `memory-node-writer`; the permissions invariant counts eleven of the twelve agents; the knowledge-layer invariant no longer says one writer per layer and names which writer each entry uses; the capped-layer invariant says `memory-node-writer` never writes over budget and reports left-out facts instead of `OVER:`; the split-exemption invariant covers all three writers and names `DELETED:` as how `memory-node-writer` reports a deletion; the `references/` invariant names `node-doctrine.md` and its two readers; the root `CLAUDE.md` viber row says twelve agents and names the node doctrine reference; `viber/CLAUDE.md` grows by no more than 800 characters
<!-- /TASK -->

## Contracts

### C1 - node doctrine reference

File: viber/references/node-doctrine.md

Title `Node doctrine`, four sections in this order:

- Budget - 12000 characters per node, 32000 over the chain (root, every ancestor, the node); measure with `wc -c` before writing.
- What a node carries - facts an agent cannot read off the code in a minute: invariants, contracts between parts, build and test commands, traps; never a narrative.
- Ancestor rule - a child never repeats its ancestor; a fact both could carry belongs to the ancestor.
- Over budget - first compact (what the code states plainly, what `.claude/rules/` carries, build narrative, what an ancestor states, what is no longer true), then split into an existing subdirectory's node where both sides land under the cap and the child owns its own contracts.

### C2 - memory-node-writer dispatch input

File: viber/agents/memory-node-writer.md

```
mode: fix | create
node: <repo-relative path of the one CLAUDE.md this dispatch owns>
findings: <repo-relative path of its *-audit.md> | none
planned: <every node path of the planned set, comma-separated, root first>
refs: ${CLAUDE_PLUGIN_ROOT}/references
```

`findings` is a path in fix mode after an audit, `none` in create mode and on the root reconcile dispatch.

### C3 - memory-node-writer return

File: viber/agents/memory-node-writer.md

```
VERDICT: UPDATED | NONE | NO-NODE
FILES: <every repo-relative path written or deleted, comma-separated>   only with UPDATED
SIZE: <chars> chain <chars>                                           only with UPDATED
DROPPED: <fact>                     one per fact left out to stay within budget
LIFT: <fact>                        one per fact shared with a sibling area
CHAIN: <ancestor path> <chars>      one per ancestor outside this run that leaves the chain over budget
DELETED: <path>                     one per node deleted, each also named on FILES:
```

### C4 - memory-writer build-close input

File: viber/skills/implementor/SKILL.md

```
spec: <run dir>/spec.md
notes: <run dir>/work/
refs: ${CLAUDE_PLUGIN_ROOT}/references
```
