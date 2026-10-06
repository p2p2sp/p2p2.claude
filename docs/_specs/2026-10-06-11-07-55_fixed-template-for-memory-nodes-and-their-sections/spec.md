To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Fixed template for memory nodes and their sections

## Goal

viber `memory`'s `CLAUDE.md` nodes below the root and their `CLAUDE.<topic>.md` sections have no fixed form: the same kind of content lands under different headings, so every reader and every writer guesses the structure. One stack-agnostic template, defined once, gives every node and section the same headings in the same order, and the audit catches a node that departs from it so `/viber:memory` can bring it back.

## Acceptance criteria

1. `memory-node-writer` in create mode writes every node and section in the template of C1.
2. `memory-auditor` reports a `SHAPE` finding for form only - a missing or incomplete title, a heading outside the set, headings out of order, an empty heading - in a node or a section, and never for the root `CLAUDE.md` or a section beside it.
3. The `AUDIT:` line carries a `shape <n>` counter, and `memory`'s confirm step keeps a fix target whose `shape` count is not zero.
4. `memory-node-writer` in fix mode rewrites a node and its sections into the template on a `SHAPE` finding and keeps every fact, a fact left out to stay within budget returning on `DROPPED:`.
5. `memory-writer` places each new fact under its template heading, adding that heading in template order when absent, and never rearranges the rest of a node.
6. The template lives in one place: `node-doctrine.md`.
7. The help page describes, in both languages, that the auditor checks each file's form against the template and that both writers keep files in it.

## Scope

### File map

- modify - viber/references/node-doctrine.md - the template: headings (`## Commands` among them, child nodes under `## Relationships`), order, title forms for node and section, empty-heading rule, no entity or aggregate lists, every file a writer creates following it; headings count toward the node budget; the root exempt
- modify - viber/agents/memory-auditor.md - the `SHAPE` finding, its `refs:` input line and the `shape <n>` counter on `AUDIT:`
- modify - viber/skills/memory/SKILL.md - the auditor dispatch's `refs:` line, the `AUDIT:` line it relays, step 6 keeping a target with shape findings
- modify - viber/agents/memory-node-writer.md - create mode writes the template; fix mode acts on `SHAPE`; a `MISS` lands under its template heading
- modify - viber/agents/memory-writer.md - a new fact lands under its template heading without rearranging the node; a node it adds follows the template
- modify - viber/skills/setup/assets/help.html - the memory walkthrough, the `/viber:memory` card, the build close's memory step, the `key-build-memory` entry and the `memory-auditor`, `memory-node-writer` and `memory-writer` entries

### Out of scope

- The root `CLAUDE.md` and sections beside it: they keep the doctrine's Root content; a repo-wide term reaches it only as a `SUGGEST:` line.
- A global glossary file.
- `.claude/rules/`, the `rules` skill, `rules-auditor`, `rules-writer` and their `AUDIT:` line, which keeps its own counters.
- `memory-map.sh` and its budgets (12000 / 32000 / 4000), unchanged.
- This repository's own `CLAUDE.md` nodes and sections, reshaped by the user separately.
- `viber/skills/CLAUDE.md`, `viber/references/CLAUDE.md` (the auditor becomes a reader of `node-doctrine.md`), `viber/CLAUDE.memory-rules.md` (the new `AUDIT:` counter): memory-owned, updated by the build's close.
