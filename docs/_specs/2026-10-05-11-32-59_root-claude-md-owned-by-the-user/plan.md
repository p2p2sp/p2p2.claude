---
source: C:/Projects/p2p2.claude/docs/_specs/2026-10-05-11-32-59_root-claude-md-owned-by-the-user/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Root CLAUDE.md owned by the user

## Goal

viber stops rewriting a host project's root `CLAUDE.md`. The memory layer writes the root once, when it does not exist yet, as a short file holding what every agent needs at session start (the build and test commands viber runs on). After that the root belongs to the user: builds and memory reviews report what they would change there instead of changing it.

## Problem

Today the build's memory close and `/viber:memory` both rewrite the root `CLAUDE.md`: a user's own lines in it can be compacted, moved or dropped by the next build. The root also grows with model-written prose (repo-wide facts, an index of nodes), and it is loaded whole at every session start by every agent. Context files written by a model lower agent success and raise cost, and repository overviews do not help agents find the relevant files; the guidance for a root instruction file is under 200 lines, minimal requirements only. Leaving it alone keeps the user's edits unsafe and the root expensive.

## Current behaviour

- `memory-writer` (build close under `build.memory`) folds what a build taught into any node, the root included, compacts and splits a node over budget, and may delete a node or section.
- `memory-node-writer` (`/viber:memory`) fixes an existing root from its audit findings, creates a root with any repo-wide facts within 12000 bytes, and keeps an index of every node in the root (`memory` step 8 reconciles that list).
- `memory-map.sh` flags any node, the root included, past 12000 bytes as `OVER-NODE`.
- The root only becomes a write target on an empty layer or after a reset: `extend` never targets a missing root while other nodes exist.
- `/viber:setup`, finding no `CLAUDE.md`, says to run `/init`, then paste a prompt.

### Must not change

- Nodes below the root: `memory-writer` and `memory-node-writer` still create, correct, split and delete them within 12000 bytes per node or section and 32000 per chain, and a node below the root keeps its own list of nodes.
- `memory-map.sh`'s line kinds, their order, its exit codes, and `--reset` refusing the whole call on one dirty path.
- `CLAUDE.local.md` is never read as a section, written or deleted.
- `/viber:setup` never edits `CLAUDE.md`, and its check of the five items on an existing root.

## Behaviour

### S1 - A build leaves the root alone [CHANGED - was: memory-writer rewrote the root like any node]

A build's memory close updates the nodes below the root and writes nothing to the root or a section beside it. What the build made false in the root, or a repo-wide fact it taught, reaches the user as a suggestion in the build summary.

Given a host whose root `CLAUDE.md` names `npm test` as the test command and holds a line the user wrote
When a build switches the test command to `npm run test:all` and closes with `build.memory` on
Then the root `CLAUDE.md` is byte-for-byte unchanged, and the build summary carries a `SUGGEST: CLAUDE.md:` line quoting the `npm test` sentence and what holds now

### S2 - The memory command creates a missing root [CHANGED - was: a root of any repo-wide facts up to 12000 bytes, carrying an index of nodes]

Given a host with no root `CLAUDE.md`, with or without nodes below it
When the user runs `/viber:memory` on an empty layer, or `extend` / `both`, or after a `reset` that removed the root
Then a root `CLAUDE.md` of at most 4000 bytes is written: one sentence on the project, the five items with the project's exact commands, at most a few traps spanning the whole repository, and nothing else

### S3 - A command the writer cannot find [NEW]

Given a host whose scripts and config name no fast command
When `/viber:memory` creates the root
Then the root omits that item, the report carries `MISSING: fast command`, followed by the prompt to paste into Claude

### S4 - The memory command reviews an existing root [CHANGED - was: memory-node-writer corrected and compacted the root]

Given an existing root `CLAUDE.md` with a stale sentence, an index of nodes, and 5200 bytes
When the user runs `/viber:memory review` and approves the root as a target
Then the root and every section beside it stay unchanged, and the report carries one `SUGGEST:` line per change: the stale sentence with what holds now, the index to remove, what to trim to come within 4000 bytes

### S5 - Setup on a project with no CLAUDE.md [CHANGED - was: run `/init`, then paste a prompt]

Given a host with no `CLAUDE.md`
When the user runs `/viber:setup`
Then its `CLAUDE.md:` line says to run `/viber:memory`, which writes the short root

### S6 - A reader learns who owns the root [CHANGED - was: the help page and README described every CLAUDE.md as updated by builds]

Given a user reading viber's help page or README
When they look up `build.memory`, `/viber:memory`, the size limits or what to do before the first run
Then they read that `/viber:memory` writes the root once where none exists, that no build or review rewrites it, that changes to it arrive as suggestions, and that the root stays within 4000 bytes

### Edge cases

- Root missing, root sections present (`CLAUDE.<topic>.md` at the repository root) -> the new root is written, every such section is left as it is and reported as a suggestion, unreachable from the root.
- An existing root past 4000 bytes -> the memory map flags it over budget; the writer suggests what to trim and never compacts it.
- An existing root carrying a directory map or an index of nodes -> one suggestion per such block, naming its removal.
- A build that deleted an area the root describes -> the root keeps the passage; a suggestion names it.
- A rules review moving a fact to the root -> the user records it; `/viber:memory` never writes it into an existing root.
- A plan whose change alters a command the root names -> no task edits the root; the build's suggestion carries the change.

## Glossary

- root node - the `CLAUDE.md` at the repository root, loaded at every session start; the user's file once it exists.
- suggestion - a proposed change to the root or a section beside it, shown to the user in a build summary or memory report, which no agent applies.
- missing item - one of the five items the root writer found no exact command or convention for, shown to the user with the prompt to paste.

## Acceptance criteria

1. The build's memory writer never writes, creates or deletes the root `CLAUDE.md` or a `CLAUDE.<topic>.md` beside it; each change it would make there returns as a `SUGGEST:` line that the build summary repeats verbatim; nodes below the root are updated as before.
2. `/viber:memory` writes the root `CLAUDE.md` only where none exists (an empty layer, `extend` or `both` with no root node, or after a `reset` that removed it); an existing root and its sections are never written, each change returned as a `SUGGEST:` line its report repeats verbatim.
3. A root written by `/viber:memory` holds one sentence on the project, the build, whole-suite, single-test-file and fast commands and the layer marker convention, and at most a few repo-wide traps, with no directory map, index of nodes or section, within 4000 bytes; the memory map flags a root past 4000 bytes `OVER-NODE`.
4. An item the root writer finds no exact command or convention for returns as a `MISSING:` line, and the report repeats each one followed by the setup prompt to paste.
5. `/viber:setup` on a project with no `CLAUDE.md` tells the user to run `/viber:memory`.
6. The node doctrine, the help page and the README state who writes the root, what it holds and its 4000-byte cap; the `Memory-owned` plan rule keeps the root out of every task and names the user as its owner.

## Scope

### File map

- modify - viber/skills/memory/scripts/memory-map.sh - the root's 4000-byte budget on its `node:` line
- modify - tests/viber/memory-map.test.ts - the budget cases, root and below-root
- modify - viber/references/node-doctrine.md - the root section: owner, content, cap; the ancestor rule and over-budget steps for nodes below the root
- modify - viber/agents/memory-writer.md - never the root; `SUGGEST:` lines
- modify - viber/skills/implementor/fragments/memory.true.md - repeats the writer's `SUGGEST:` lines in the build summary
- modify - viber/references/plan-rules.md - `Memory-owned` keeps every `CLAUDE.md`, the root included, out of tasks and names the root's owner
- modify - viber/skills/setup/templates/viber.yml - the `build.memory` comment
- modify - viber/agents/memory-node-writer.md - root creation, `MISSING:`, `SUGGEST:` on an existing root, no index in the root
- modify - viber/skills/memory/SKILL.md - root as a create target under `extend`/`both`, root budget, reconcile skipping the root, relaying `SUGGEST:`/`MISSING:` plus the prompt
- modify - viber/skills/rules/SKILL.md - a `MOVE:` naming the root is the user's to record
- modify - viber/skills/setup/SKILL.md - `/viber:memory` in place of `/init`
- modify - viber/skills/setup/assets/help.html - the setup, memory, build-close and limits text
- modify - viber/README.md - `build.memory`, "Before your first run", the memory paragraph

### Out of scope

- The rules layer (`rules-writer`, `rules-auditor`, `rules-map.sh`, `rule-admission.md`) keeps its behaviour; only the `rules` skill's one sentence on a `MOVE:` to the root changes.
- `memory-auditor` keeps auditing the root like any node: its findings vocabulary and output line are unchanged.
- `CLAUDE.local.md`.
- This repo's own `CLAUDE.md` nodes and sections (`viber/CLAUDE.memory-rules.md`, `viber/agents/CLAUDE.md`, `viber/skills/CLAUDE.md`): brought in line by the build's memory close (`Memory-owned`), never by a task.
- `.claude/viber.yml` of this repo (its `build.memory` comment mirrors the template's; the user's own config).
- `final-reviewer`'s "report nothing living in a `CLAUDE.md`" under `memory: true`.
- `viber/skills/setup/assets/viber-flow-en.svg` and `viber-flow-pl.svg`: "Your CLAUDE.md learns what the build taught" stays true of the nodes below the root and of the suggestions for the root.

## Solution requirements

- Every script runs under bash 3.2 (macOS) and Git Bash (Windows); no heredoc.
- Text states only what holds now, never what changed.
- Tokens: the root and every agent instruction stay as short as the behaviour allows.
- No source attribution anywhere.

## Tasks

<!-- TASK -->
### T1 - Flag a root node past 4000 bytes in the memory map
- TDD: required
- Covers: #3
- Uses: C1
- Depends-on: none
- Files: viber/skills/memory/scripts/memory-map.sh, tests/viber/memory-map.test.ts
- Delivers: the map's `node: CLAUDE.md` line reads `OVER-NODE` past 4000 bytes; every other node and every section keep the 12000-byte cap and every chain the 32000-byte cap; the script header states the root budget; the existing budget cases that used a root of 12000 bytes are rebuilt on a small root, keeping what each proves.
- Verification: node --test tests/viber/memory-map.test.ts -> every case passes, the root-budget cases among them; grep -n "4000" viber/skills/memory/scripts/memory-map.sh -> a hit in the header comment and one in the budget code
- DoD: a root of 4001 bytes reads `node: CLAUDE.md 4001 chain 4001 OVER-NODE`; a root of 4000 bytes reads `ok`; a node below the root of 12000 bytes reads `ok` and one of 12001 bytes `OVER-NODE`; a root section of 12000 bytes reads `ok`; a chain past 32000 still reads `OVER-CHAIN`; the header's `node` paragraph names the 4000-byte root budget
<!-- /TASK -->

<!-- TASK -->
### T2 - State the root node doctrine
- TDD: none
- Covers: #3, #6
- Uses: C1, C2, C3
- Depends-on: T1
- Files: viber/references/node-doctrine.md
- Delivers: a root section stating the root's owner (the user, written once by the memory command where none exists, never rewritten by any writer), its content and its 4000-byte cap, and that a change to an existing root leaves as a `SUGGEST:` line; the budget, ancestor rule and over-budget steps applying to nodes below the root, the ancestor rule keeping a repo-wide fact out of every node below the root.
- Verification: grep -n "4000" viber/references/node-doctrine.md viber/skills/memory/scripts/memory-map.sh -> a hit in each file
- DoD: the doctrine names the 4000-byte root cap beside the 12000 and 32000 caps; the doctrine lists the root's content as in `C1` and its exclusions (directory map, index of nodes, list of sections); the doctrine states that no writer rewrites an existing root and that a change to it leaves as a `SUGGEST:` line; the ancestor rule keeps a repo-wide fact out of every node below the root
<!-- /TASK -->

<!-- TASK -->
### T3 - Keep the build's memory writer off the root
- TDD: none
- Covers: #1, #6
- Uses: C2
- Depends-on: T2
- Files: viber/agents/memory-writer.md, viber/skills/implementor/fragments/memory.true.md, viber/skills/setup/templates/viber.yml
- Delivers: `memory-writer` writes, creates and deletes only nodes below the root and their sections; a root sentence the build made false, a passage on an area the build deleted, or a repo-wide fact the build taught returns as a `SUGGEST:` line beside `VERDICT: UPDATED` or `VERDICT: NONE`; the implementor's memory fragment repeats every `SUGGEST:` line verbatim in the final summary; the template's `build.memory` comment says the close updates the nodes below the root.
- Verification: grep -n "SUGGEST:" viber/agents/memory-writer.md viber/skills/implementor/fragments/memory.true.md -> a hit in each file; node --test tests/viber/bootstrap.test.ts -> every case passes
- DoD: `memory-writer.md` forbids writing, creating or deleting the root `CLAUDE.md` and a `CLAUDE.<topic>.md` beside it; `memory-writer.md` returns a root sentence the build made false as a `SUGGEST:` line; `memory-writer.md` returns a root passage on an area the build deleted as a `SUGGEST:` line; `memory-writer.md` returns a repo-wide fact the build taught as a `SUGGEST:` line, never as a new node; `memory-writer.md`'s Output lists the `SUGGEST:` line in `C2`'s shape; `memory.true.md` repeats every `SUGGEST:` line verbatim in the final summary; the template comment under `build.memory` names the nodes below the root
<!-- /TASK -->

<!-- TASK -->
### T4 - Create a minimal root where none exists
- TDD: none
- Covers: #2, #3, #4
- Uses: C1, C3
- Depends-on: T2
- Files: viber/agents/memory-node-writer.md, viber/skills/memory/SKILL.md
- Delivers: `memory-node-writer` in create mode on a root that does not exist writes it per `C1` within 4000 bytes, the commands taken from the project's own scripts and config, never guessed, and returns one `MISSING:` line per item it could not find; it leaves every root section untouched and returns each on a `SUGGEST:` line; the `memory` skill adds the repository root as a create target under `extend` and `both` when the map carries no `node: CLAUDE.md` line, and repeats every `MISSING:` line followed by the content of setup's `claude-md-prompt.txt`, read with `Read`, in a code block.
- Verification: grep -n "MISSING:" viber/agents/memory-node-writer.md viber/skills/memory/SKILL.md -> a hit in each file; grep -n "claude-md-prompt.txt" viber/skills/memory/SKILL.md -> a hit; test -f viber/skills/setup/templates/claude-md-prompt.txt -> exit 0
- DoD: `memory-node-writer.md` creates the root only when it does not exist, with `C1`'s content and cap; `memory-node-writer.md`'s Output lists the `MISSING:` line in `C3`'s shape; `memory-node-writer.md` leaves a root section untouched on root creation and names it on a `SUGGEST:` line; `memory/SKILL.md`'s step 2 adds the repository root as a create target under `extend` and `both` when no `node: CLAUDE.md` line is mapped; `memory/SKILL.md`'s report repeats each `MISSING:` line and then the prompt file's content; `memory/SKILL.md`'s `allowed-tools` and tool-set sentence allow `Read` on that prompt file alone
<!-- /TASK -->

<!-- TASK -->
### T5 - Report changes to an existing root as suggestions
- TDD: none
- Covers: #2
- Uses: C1, C3
- Depends-on: T4
- Files: viber/agents/memory-node-writer.md, viber/skills/memory/SKILL.md, viber/skills/rules/SKILL.md
- Delivers: `memory-node-writer` on a root that exists, in either mode, writes nothing to it or a section beside it and returns `VERDICT: NONE` with one `SUGGEST:` line per `STALE` or `GONE` finding, per `MISS` finding whose fact falls within `C1`'s content list (any other `MISS` is dropped), per block the doctrine excludes from the root, and one naming what to trim when the root is past 4000 bytes; the root carries no list of nodes; the `memory` skill names the root budget in step 1, never counts the root as off in step 8, and repeats every `SUGGEST:` line verbatim in its report; the `rules` skill says a `MOVE:` naming the root `CLAUDE.md` is the user's to record.
- Verification: grep -n "SUGGEST:" viber/agents/memory-node-writer.md viber/skills/memory/SKILL.md -> a hit in each file; grep -n "4000" viber/skills/memory/SKILL.md viber/skills/memory/scripts/memory-map.sh -> a hit in each file
- DoD: `memory-node-writer.md` never writes or deletes an existing root or a section beside it; `memory-node-writer.md` returns `VERDICT: NONE` with `SUGGEST:` lines in `C3`'s shape for an existing root; `memory-node-writer.md` suggests from a root `MISS` only when its fact falls within `C1`'s content list; `memory-node-writer.md`'s list-of-nodes rule excludes the root; `memory/SKILL.md`'s `description:` says it brings every node below the root within budget; `memory/SKILL.md`'s step 1 names `OVER-NODE` past 4000 bytes for the root; `memory/SKILL.md`'s step 8 never marks the root off; `memory/SKILL.md`'s report repeats each `SUGGEST:` line verbatim; `rules/SKILL.md`'s `MOVE:` sentence names the root as the user's to record
<!-- /TASK -->

<!-- TASK -->
### T6 - Point setup at the memory command for a missing CLAUDE.md
- TDD: none
- Covers: #5
- Uses: none
- Depends-on: T4
- Files: viber/skills/setup/SKILL.md
- Delivers: on `CLAUDE.md: missing` setup's line tells the user to run `/viber:memory`, which writes the short root, with no prompt block and no mention of `/init`; the present-file check and its prompt are unchanged.
- Verification: grep -n "run /viber:memory" viber/skills/setup/SKILL.md -> one hit; grep -c "/init" viber/skills/setup/SKILL.md -> 0
- DoD: setup's `CLAUDE.md: missing` line names `/viber:memory`; `setup/SKILL.md` names no `/init`; the `CLAUDE.md: present` branch still prints the prompt block for a missing item
<!-- /TASK -->

<!-- TASK -->
### T7 - Document the root's owner in the help page and README
- TDD: none
- Covers: #6
- Uses: C1
- Depends-on: T3, T5, T6
- Files: viber/skills/setup/assets/help.html, viber/README.md
- Delivers: in both languages, the help page's getting-started step 3, setup paragraph and card, memory guide, memory card, limits, build-close list, `build.memory` key and the two memory agents state that `/viber:memory` writes the root once where none exists, that no build or review rewrites it, that changes to it arrive as suggestions, and the 4000-byte root cap; the README's `build.memory` row, "Before your first run" and memory paragraph say the same in short.
- Verification: node --test tests/viber/help.test.ts -> every case passes; grep -n "4000" viber/skills/setup/assets/help.html viber/skills/memory/scripts/memory-map.sh -> a hit in each file; grep -c "/init" viber/skills/setup/assets/help.html -> 0
- DoD: the help page names the 4000-byte root cap in both languages; the help page names `/viber:memory` and no `/init` for a project with no `CLAUDE.md`; the help page's `build.memory` key and `memory-writer` entry say the build leaves the root to the user; the README's "Before your first run" names `/viber:memory`; the README's `build.memory` row says the root stays the user's
<!-- /TASK -->

<!-- TASK -->
### T8 - Keep the root out of plan tasks in the Memory-owned rule
- TDD: none
- Covers: #6
- Uses: C2
- Depends-on: T3
- Files: viber/references/plan-rules.md
- Delivers: the `Memory-owned` rule still bars every `CLAUDE.md`, the root included, from a task's `Files` under `build.memory`, and gives the reason per node: the nodes below the root belong to the build's close, the root to the user, a change to it reaching the user only as the close's `SUGGEST:` line.
- Verification: grep -n "SUGGEST:" viber/references/plan-rules.md viber/agents/memory-writer.md -> a hit in each file
- DoD: `plan-rules.md`'s `Memory-owned` bullet bars the root `CLAUDE.md` from every task's `Files`; `plan-rules.md`'s `Memory-owned` bullet names the root as the user's file; `plan-rules.md`'s `Memory-owned` bullet names the `SUGGEST:` line as the root change's only route; the bullet keeps its `(review)` tag
<!-- /TASK -->

## Contracts

### C1 - Root node budget and content

File: viber/skills/memory/scripts/memory-map.sh, viber/references/node-doctrine.md

Root node: `CLAUDE.md` at the repository root.
Budget: 4000 bytes; map line `node: CLAUDE.md <bytes> chain <bytes> ok | OVER-NODE`, `OVER-NODE` past 4000. Every other node and every section: 12000; every chain: 32000.
Content, in this order: one sentence naming what the project is; the build command; the whole test suite command; the single test file command; the fast command (every test but integration and end-to-end); the layer marker convention; at most a few traps spanning the whole repository that the code does not show.
Never: a directory map, an index of nodes, a list of sections.

### C2 - Build suggestion line

File: viber/agents/memory-writer.md, viber/skills/implementor/fragments/memory.true.md

```
SUGGEST: <CLAUDE.md | CLAUDE.<topic>.md>: "<quoted sentence>" -> <what holds now>
SUGGEST: CLAUDE.md: <fact to add>
```

One line per change, beside `VERDICT: UPDATED` or `VERDICT: NONE`; the path is repo-relative and always at the repository root.

### C3 - Memory command root lines

File: viber/agents/memory-node-writer.md, viber/skills/memory/SKILL.md

```
SUGGEST: <CLAUDE.md | CLAUDE.<topic>.md>: "<quoted sentence>" -> <what holds now>
SUGGEST: <CLAUDE.md | CLAUDE.<topic>.md>: <change to make>
MISSING: build command | whole test suite command | single test file command | fast command | layer marker convention
```

`SUGGEST:` lines beside `VERDICT: NONE` for an existing root, or beside `VERDICT: UPDATED` naming a root section left unreachable by a new root; `MISSING:` lines beside `VERDICT: UPDATED` on root creation, one per item.
