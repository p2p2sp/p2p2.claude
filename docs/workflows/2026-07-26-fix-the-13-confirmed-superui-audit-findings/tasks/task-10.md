
## Task 10 - fix(superui): connect the spec-writer NEEDS-INPUT channel to the builder return
- Covers: criteria #10
- TDD: none

### Dependencies
- none - blocks: nothing

### Files
- modify - superui/agents/spec-writer.md (`## Output`)
- modify - superui/skills/design-extractor-builder/SKILL.md (steps 2 and 5, `## Return`)

### Test Commands
*Build*
- none - markdown only; this repo has no build step

*Tests*
- `grep -c "NEEDS-INPUT" superui/skills/design-extractor-builder/SKILL.md` - expect at least 2 (steps 2 and 5 now collect it; today 0)
- `grep -c "NEEDS-INPUT: <count>" superui/agents/spec-writer.md` - expect 0

### Approach
1. In `spec-writer.md:54`, change the return channel from `NEEDS-INPUT: <count>` to a `NEEDS-INPUT:` block carrying the marker lines verbatim, one per line, or `NEEDS-INPUT: none` - the same block shape the neighbouring `MISSING-TOKENS:` channel already uses, so the two read alike.
2. In `design-extractor-builder/SKILL.md` step 5 (`:88-89`), extend the collect line to gather every `NEEDS-INPUT:` block alongside the `MISSING-TOKENS:` blocks it already collects, skipping entries reporting `none`.
3. In step 2 (`:63-70`), add the matching collect instruction for the `> NEEDS INPUT: <what>` marker `agents/foundation-analyst.md:43` carries in its final message - the item is already in the builder's context, only the instruction to keep it is missing.
4. In `## Return` (`:140-141`), scope the "minus every one step 7 resolved" subtraction to registry `unknowns` only: `build_registry.ts:459` matches a `resolved` entry to an `unknowns` entry by section plus `what`, which can never match a spec-inline or message-borne marker.
5. Fix the step 7 wording at `:111`, which says to record counts "from the analyst's final message" when step 7's agent is the `design-synthesizer`.

### Edge cases
- A spec-writer with no gaps returns `NEEDS-INPUT: none` and must contribute nothing to the return.
- The markers also survive inline in `DESIGN.components.md`; that stays true and is not a substitute for the summary.
- Steps 2, 5 and 6 can each contribute markers - the return must not drop one source while relaying another.

### Contracts
`spec-writer` final message: spec path, a `MISSING-TOKENS:` block or `none`, and a `NEEDS-INPUT:` block or `none`. The builder's return relays every standing item as text, never a count.

### DoD
A run in which a spec-writer records an unmeasurable component state surfaces that state in the user-facing final report, not only buried inside the satellite.


### Covered criteria
10. Every `> NEEDS INPUT` item a `spec-writer` records reaches the builder's return message as an item, not a count.
