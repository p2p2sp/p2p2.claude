---
source: C:/Projects/p2p2.claude/docs/_specs/2026-10-06-11-07-55_fixed-template-for-memory-nodes-and-their-sections/plan.md
---

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

## Tasks

<!-- TASK -->
### T1 - Define the node template in the node doctrine
- TDD: none
- Covers: #6
- Uses: C1
- Depends-on: none
- Files: viber/references/node-doctrine.md
- Delivers: a `## Template` part of the doctrine holding C1 whole: both title forms, the boundary sentences, the seven headings in their fixed order with what each holds, the empty-heading rule, the section variant, `## Terms` naming concepts and never listing entities or aggregates, every node or section a writer creates (a split and a new section included) following it, headings counting toward the budget, the root outside it; "What a node carries" and "Sections" agree with it (commands under `## Commands`, the list of sections under `## Sections`, a list of child nodes under `## Relationships`).
- Verification: `grep -n "^## Template" viber/references/node-doctrine.md && grep -n "node-doctrine.md" viber/agents/memory-writer.md viber/agents/memory-node-writer.md` -> both commands print a line: the doctrine declares the part and both writers already read the doctrine.
- DoD: the `## Template` part lists `## Terms`, `## Relationships`, `## Contracts`, `## Commands`, `## Change together`, `## Traps`, `## Sections` in that order; it states the node title `# <area> - <responsibility>` and the section title `# <area> - <activity>`, each followed by 1-3 boundary sentences; it states an empty heading is omitted and a section carries no `## Sections`; it states `## Terms` never lists entities or aggregates; it places an area's build and test commands under `## Commands` and a list of child nodes under `## Relationships`; it states headings and title count toward the node budget; it states a node or section created by a split or a new section follows the template; it states the root is outside the template.
<!-- /TASK -->

<!-- TASK -->
### T2 - Report template departures from the memory audit
- TDD: none
- Covers: #2, #3
- Uses: C1, C2, C3, C4
- Depends-on: T1
- Files: viber/agents/memory-auditor.md, viber/skills/memory/SKILL.md
- Delivers: the auditor reads the doctrine's `## Template` through `refs:`, writes one `SHAPE:` line per form departure of the node or a section (never for the root), and counts them on `AUDIT:`; the memory skill's step 5 passes four labelled lines with `refs:`, relays the new `AUDIT:` line and keeps a target with shape findings in step 6.
- Verification: `grep -n "SHAPE:" viber/agents/memory-auditor.md && grep -n "shape <n>" viber/agents/memory-auditor.md viber/skills/memory/SKILL.md && grep -n "^refs:" viber/agents/memory-auditor.md && grep -n "Four labelled lines each" viber/skills/memory/SKILL.md` -> every command prints at least one line, `shape <n>` in both files.
- DoD: the auditor reads `<refs>/node-doctrine.md`'s `## Template` before judging form; the findings vocabulary carries `SHAPE:` as in C2; the auditor names the four departures of C2 and exempts the root; the `AUDIT:` line in both files matches C3; the auditor's input carries the `refs:` line of C4; step 5's dispatch reads "Four labelled lines each" and carries the `refs:` line of C4; step 6 drops only a target whose five counters are zero.
<!-- /TASK -->

<!-- TASK -->
### T3 - Write and repair nodes in the template
- TDD: none
- Covers: #1, #4
- Uses: C1, C2
- Depends-on: T2
- Files: viber/agents/memory-node-writer.md
- Delivers: create mode authors nodes and sections in the doctrine's `## Template`; fix mode acts on each `SHAPE` line by rewriting the file into the template while keeping every fact; a `MISS` fact lands under its template heading; the `## Root` part stays as it is.
- Verification: `grep -n "SHAPE" viber/agents/memory-node-writer.md && grep -n "SHAPE:" viber/agents/memory-auditor.md && grep -n "## Template" viber/agents/memory-node-writer.md viber/references/node-doctrine.md` -> every command prints a line, `## Template` in both files.
- DoD: fix mode carries a `SHAPE` bullet beside `STALE`, `GONE`, `UNVERIFIABLE`, `MISS`, `OK`; that bullet keeps every fact, sending a budget cut to `DROPPED:`; create mode names the doctrine's `## Template`; the `MISS` bullet places the fact under its template heading; the `## Root` part is unchanged; no heading name of C1 is listed in the agent.
<!-- /TASK -->

<!-- TASK -->
### T4 - Place build facts under template headings
- TDD: none
- Covers: #5
- Uses: C1
- Depends-on: T1
- Files: viber/agents/memory-writer.md
- Delivers: a new fact lands under its template heading, the heading added in template order when absent, the rest of the node left as it stands; a child node the writer adds follows the template.
- Verification: `grep -n "## Template" viber/agents/memory-writer.md viber/references/node-doctrine.md` -> both files print a line.
- DoD: the writer names the doctrine's `## Template` for placing a new fact; it adds a missing heading in template order; it states it never rearranges headings or facts it did not write; a node it adds follows the template; the "existing voice and structure" line no longer contradicts placement under template headings; no heading name of C1 is listed in the agent.
<!-- /TASK -->

<!-- TASK -->
### T5 - Describe the template check on the help page
- TDD: none
- Covers: #7
- Uses: C3
- Depends-on: T3, T4
- Files: viber/skills/setup/assets/help.html
- Delivers: the memory walkthrough, the `/viber:memory` card and the `memory-auditor` entry say, in English and Polish, that the auditor also checks each file's form against a fixed template and counts departures as `shape`; the `memory-node-writer` and `memory-writer` entries, the build close's memory step and the `key-build-memory` entry say the writers keep files in that template. No heading of the template is listed on the page.
- Verification: `grep -n "<code>shape</code>" viber/skills/setup/assets/help.html && grep -n "shape <n>" viber/skills/memory/SKILL.md && node --test tests/viber/help.unit.test.ts` -> both greps print a line and the help test passes.
- DoD: the `/viber:memory review` walkthrough says the auditor also checks each file's form against the template in both languages; the `skill-memory` card names the `shape` counter in both languages; the `agent-memory-auditor` entry mentions the form check in both languages; the `agent-memory-node-writer` entry mentions the template in both languages; the `agent-memory-writer` entry says it places new facts under the template headings in both languages; the build close's memory step and the `key-build-memory` entry mention the template in both languages; `tests/viber/help.unit.test.ts` passes.
<!-- /TASK -->

## Contracts

### C1 - Node template

File: viber/references/node-doctrine.md

```
Doctrine part: ## Template
Node:    # <area> - <one-line responsibility>
         <1-3 sentences: what the area owns, what it does not>
Section: # <area> - <activity the section is read for>
         <1-3 sentences: what the activity covers, what it does not>
Headings, fixed order, each omitted when it would be empty:
  ## Terms             concepts with a meaning specific to this area; never a list of entities or aggregates
  ## Relationships     who reads or calls this area, what it depends on; a node's list of child nodes
  ## Contracts         interfaces and invariants
  ## Commands          the commands that build and test this area
  ## Change together
  ## Traps
  ## Sections          the node's sections, each with the activity that requires it (node only)
Headings and title count toward the node budget.
Every node or section a writer creates follows it, through a split or a new section included.
Root CLAUDE.md and sections beside it: outside the template.
```

### C2 - SHAPE finding

File: viber/agents/memory-auditor.md

```
SHAPE: <CLAUDE.md | CLAUDE.<topic>.md>: <departure>
<departure> is one of:
  missing or incomplete title
  heading outside the template: <heading>
  out of order: <heading>
  empty heading: <heading>
Never written for the root CLAUDE.md or a section beside it.
```

### C3 - AUDIT line

File: viber/agents/memory-auditor.md, viber/skills/memory/SKILL.md

```
AUDIT: <target> stale <n> gone <n> unverifiable <n> shape <n> miss <n> -> <path of the findings file>
```

### C4 - Auditor refs input

File: viber/agents/memory-auditor.md, viber/skills/memory/SKILL.md

```
target: <repo-relative path of one CLAUDE.md>
scope: <repo-relative directory the target describes>
out: .temp/viber/<id>/
refs: ${CLAUDE_PLUGIN_ROOT}/references
```
