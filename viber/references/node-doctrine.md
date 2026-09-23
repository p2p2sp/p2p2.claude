# Node doctrine

What a `CLAUDE.md` node holds and what it can afford. A node is loaded whole by every agent that opens a file under it, its ancestors with it, so what grows here is paid by every later task.

## Budget

- 12000 characters per node, 32000 over the chain a reader loads: the root, every ancestor, the node.
- Measure before you write: `wc -c` on the node and on each ancestor up to the root.
- A node at its cap takes a new fact only by giving one up. Growth is a decision, never the default.

## What a node carries

Facts an agent cannot read off the code in a minute: invariants, contracts between parts, the commands that build and test this area, traps. Never a narrative of what was built or how.

## Ancestor rule

A child never repeats its ancestor. Where both could carry a fact, it belongs to the ancestor.

## Over budget

In this order:

1. Compact: drop what the code now states plainly, what a `.claude/rules/` file carries, the narrative of what a build added or renamed, what an ancestor states, what is no longer true.
2. Split: move a block of facts belonging to one existing subdirectory into that subdirectory's node, the parent keeping what spans its children. A sibling node is never loaded beside this one, which is where the saving comes from. Only where both sides land under the cap and the child owns its own contracts, never a passthrough. A node carrying an index of nodes gains the new one in the same write.
