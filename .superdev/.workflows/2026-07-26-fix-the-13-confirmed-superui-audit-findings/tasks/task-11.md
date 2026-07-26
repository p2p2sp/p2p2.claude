
## Task 11 - fix(superui): correct the reviewer-gate rationale and the stale measurement claim
- Covers: criteria #11
- TDD: none

### Dependencies
- none - blocks: nothing

### Files
- modify - superui/skills/design-extractor-builder/SKILL.md (`## Ground rules`, the `bundle-reviewer` bullet)
- modify - superui/agents/bundle-reviewer.md (the "every value came from a deterministic script" claim)

### Test Commands
*Build*
- none - markdown only; this repo has no build step

*Tests*
- `grep -c "an input this skill receives rather than authors" superui/skills/design-extractor-builder/SKILL.md` - expect 0 (the false clause wraps across lines 42-43, so match the single-line half of it, not the wrapped phrase)
- `grep -c "sample_colors.ts.*measure_geometry.ts" superui/agents/bundle-reviewer.md` - expect 0

### Approach
1. Rewrite the `bundle-reviewer` bullet at `design-extractor-builder/SKILL.md:42-44`. Its current justification - that `dedup` and `accent-sprawl` trace back to the inventory - is false for `accent-sprawl`: that check reads `registry.json`'s `accentUsage` (`agents/bundle-reviewer.md:19`), a field the colors analyst this same skill dispatches at step 2 authors, and `build_registry.ts` never reads `inventory.md` at all. State the true reason instead: reviewer findings are judgment calls over a finished bundle, not structural defects, so they are carried verbatim for the user rather than re-dispatched.
2. Make that carve-out explicit against the re-dispatch convention directly above it at `:35-41`, so a `state-form` finding - literally "a malformed spec output" under that convention - has one unambiguous handling rule.
3. In `agents/bundle-reviewer.md:28`, drop the claim that every bundle value came from a deterministic script. It stopped being true when `design-synthesizer` introduced `proposed: true` values; replace it with the actual invariant from `superui/CLAUDE.md`: a measured value traces to a pixel sample, a proposed value carries a `Source: proposed` marker.

### Edge cases
- The operative directive "never a gate" is correct and must survive the rewrite - only its stated reason is wrong.
- `bundle-reviewer`'s four judgment categories stay exactly complementary to `validate_bundle.ts`'s four structural ones; do not move a check between them.
- Task 5 makes the `Source: proposed` marker true for section 3.10 as well, so the replacement wording is accurate once both land.

### Contracts
No interface change - both files are prompts. The reviewer's `FINDING: <category> <detail>` / `CLEAN` wire format is untouched.

### DoD
Every reason `design-extractor-builder/SKILL.md` states for its handling of reviewer findings is verifiable against the agents and scripts it dispatches.


### Covered criteria
11. `design-extractor-builder/SKILL.md`'s stated reason for not gating on reviewer findings is factually true, and `agents/bundle-reviewer.md` no longer claims every bundle value came from a deterministic script.
