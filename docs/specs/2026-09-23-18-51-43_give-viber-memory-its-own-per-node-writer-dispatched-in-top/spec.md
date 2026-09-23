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
