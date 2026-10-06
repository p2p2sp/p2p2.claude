# Node doctrine

What a `CLAUDE.md` node holds and what it can afford. A node is loaded whole by every agent that opens a file under it, its ancestors with it, so what grows here is paid by every later task.

## Root

The root, `CLAUDE.md` at the repository root, belongs to the user, as does every section beside it. `/viber:memory` writes it once, only where none exists; no writer rewrites an existing root or its sections: a change to either leaves as a `SUGGEST:` line for the user, the root over its cap included.

It holds, in this order: one sentence naming what the project is; the build command; the whole test suite command; the single test file command; the fast command (every test but integration and end-to-end); the layer marker convention; at most a few traps spanning the whole repository that the code does not show. Never a directory map, an index of nodes or a list of sections.

Every rule below but the root's cap binds the nodes below the root and their sections.

## Budget

- 4000 bytes for the root, 12000 per node below it and per section, 32000 over the chain a reader loads: the root, every ancestor, the node. A section is read on demand and never counts toward a chain.
- Measure before you write: `wc -c` on the node, on each section you touch and on each ancestor up to the root.
- A node at its cap takes a new fact only by giving one up. Growth is a decision, never the default.

## What a node carries

Facts an agent cannot read off the code in a minute: invariants, contracts between parts, the commands that build and test this area, traps, each under its heading of the template below (the commands under `## Commands`). Only what holds now: never a narrative of what was built or how, nor what changed, was renamed, replaced or used to hold; git and, where the project keeps them, its ADRs carry that history.

## Template

Every node below the root and every one of its sections takes this one form, so a reader finds the same kind of fact under the same heading everywhere. Every node or section a writer creates follows it, one a split or a new section creates included. The root and every section beside it stay outside the template: they hold the Root content above.

A node opens with the title `# <area> - <one-line responsibility>`, followed by 1-3 sentences on what the area owns and what it does not. A section opens with the title `# <area> - <activity the section is read for>`, followed by 1-3 sentences on what that activity covers and what it does not.

Then these headings, in this fixed order, each omitted when it would be empty:

1. `## Terms`: concepts with a meaning specific to this area; never a list of entities or aggregates.
2. `## Relationships`: who reads or calls this area and what it depends on; a node's list of child nodes.
3. `## Contracts`: interfaces and invariants.
4. `## Commands`: the commands that build and test this area.
5. `## Change together`: what is duplicated on purpose, so one edit changes every copy.
6. `## Traps`: what an agent would get wrong that the code does not show.
7. `## Sections`: the node's sections, each with the activity that requires it. A node only: a section carries no `## Sections`.

The title and the headings count toward the node budget like any other line, a section's toward its own.

## Ancestor rule

A child never repeats its ancestor. Where both could carry a fact, it belongs to the ancestor, except a fact about the area of one subdirectory carrying its own node: it belongs to that node, never to an ancestor. A fact spanning the whole repository belongs to the root and never to a node below it: it leaves as a `SUGGEST:` line.

## Sections

A section is `CLAUDE.<topic>.md` in the node's own directory, holding a block of the node's facts read only for one kind of work. Nothing loads it automatically, so the node's pointer is its only way in.

- Topic: lowercase letters, digits and hyphens. Never `local`: `CLAUDE.local.md` is the user's own file, loaded on its own.
- One level: a section carries no sections and no list of child nodes, and a node's list of child nodes, under `## Relationships`, never lists a section.
- The node lists each of its sections under `## Sections`, one line naming the file and the activity that requires reading it ("read `CLAUDE.tests.md` before editing tests"): an activity, never a topic.
- A section is part of its node for the ancestor rule: it never repeats an ancestor, and a child never repeats it.
- A node's list of sections always equals the sections beside it on disk: a section no node names is unreachable.

## Over budget

In this order:

1. Compact: drop what the code now states plainly, what a `.claude/rules/` file carries, the narrative of what a build added or renamed, what an ancestor states, what is no longer true. Never shorten a sentence at the cost of its meaning: move it.
2. Split: move a block of facts belonging to one existing subdirectory into that subdirectory's node, the parent keeping what spans its children. A sibling node is never loaded beside this one, which is where the saving comes from. Only where both sides land under the cap and the child owns its own contracts, never a passthrough. A node listing its child nodes under `## Relationships` gains the new one in the same write.
3. Section: move a block read only for one kind of work, owned by no subdirectory, into a new or existing section of this node. Only where the node and the section both land under the cap.

A section over its cap takes the same steps, its step 3 moving a block into another section of the same node.
