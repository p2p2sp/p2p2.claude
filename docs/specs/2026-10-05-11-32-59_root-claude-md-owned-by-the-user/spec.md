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
