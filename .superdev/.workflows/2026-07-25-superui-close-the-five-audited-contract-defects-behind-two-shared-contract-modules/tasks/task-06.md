
## Task 6 - fix(superui): give spec-writer a channel for its NEEDS INPUT gaps
- Covers: criterion #11
- TDD: none

### Dependencies
- Task 5 - blocks: both tasks edit `spec-writer.md`

### Files
- modify - superui/agents/spec-writer.md (Output)

### Test Commands
*Build*
- none - markdown only, no script parses this file

*Tests*
- `rg -n 'NEEDS INPUT' superui/agents/spec-writer.md` - shows a match inside the `## Output` section, alongside the existing matches in the body and Hard rules
- `rg -n 'NEEDS INPUT' superui/agents/foundation-analyst.md` - confirms the sibling agent's existing marker clause under "The three exits for anything unmeasurable", which the new spec-writer wording mirrors

### Approach
1. Extend the `## Output` section so the final message ends with the spec path, the `MISSING-TOKENS:` block, and a count of the `> NEEDS INPUT` markers written inline in the spec, or `NEEDS-INPUT: none`, phrased in the same shape as `foundation-analyst.md`'s final-message clause.
2. Keep the Hard rules line stating that `> NEEDS INPUT:` inline is the only way to surface a gap in the artifact - the new clause reports the count, it does not move the marker out of the spec, which is where the consumer reads it.

### Edge cases
- A spec with no gaps reports `NEEDS-INPUT: none` rather than omitting the clause, so the builder can distinguish "no gaps" from "agent forgot".

### Contracts
- `spec-writer`'s final message gains a `NEEDS-INPUT: <count>` or `NEEDS-INPUT: none` clause; the spec file's inline `> NEEDS INPUT:` markers are unchanged.

### DoD
`spec-writer.md`'s Output section names the NEEDS-INPUT clause, and the inline-marker rule in Hard rules is still present and unmodified.


### Covered criteria
11. `spec-writer.md` pins the spec heading floor at `##` and its Output section carries a `> NEEDS INPUT` clause.
