
## Runs

- grep -n "DECISION:" superdev/agents/superbuild-task-implementor.md -> exit 0
- grep -n "DECISION:" superdev/agents/simplebuild-task-implementor.md -> exit 0
- grep -n "VERDICT: BLOCKED" superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md -> exit 0

Approach step 3 puts the split-rule sentence and the two line bullets in their own block under the delta
list, not inside it: a paragraph between bullets breaks the list, and the block also has to carry
the fix-mode paragraph that follows it. The delta list keeps a one-line pointer bullet in the slot
the old `UNDERSPECIFIED:` bullet held, so nothing reading that list top to bottom misses the rule.

UNDERSPECIFIED: the gate sentence of the notes step, which read `Only on PASS, and only when notes
was given` and would have forbidden the very write the stop of Approach step 2 requires - resolved as one
named exception in that same sentence (the stop writes its `DECISION:` lines there and nothing
else), rather than a second notes step or a rewrite of the gate.

The stop bullet (Approach step 2) names `## task`, `## plan-header`, `## decisions` and the task's own
sections only - not `## spec`, which simplebuild has no label for - so the bullet is byte-identical
in both agents; the spec as a contradiction source stays where the contract puts it, inside the
`DECISION:` line definition.

Both `## Input` bullets carry the `D<n>` numbering rule, so the `DECISION:` bullet in the notes step
cites `## Input`'s `decisions` label instead of restating it.
