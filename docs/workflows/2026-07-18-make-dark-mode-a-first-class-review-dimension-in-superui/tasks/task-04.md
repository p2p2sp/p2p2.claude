
## Task 4 - feat(superui): add a conditional dark fidelity-review scope
- Covers: criteria #8, #9

### Dependencies
- none - blocks: Task 5

### Files
- modify - superui/skills/design-system-extractor/SKILL.md (step 7 "Fidelity review fan-out")
- modify - superui/agents/fidelity-reviewer.md ("Inputs you are given"; "What to do")

### Test Commands
*Build*
- none

*Tests*
- `grep -n "dark" superui/skills/design-system-extractor/SKILL.md` - expect the conditional dark scope in step 7
- `grep -n "dark" superui/agents/fidelity-reviewer.md` - expect the dark-scope handling
- `grep -n "provenance: designed" superui/agents/fidelity-reviewer.md` - expect the root-marker wholesale skip intact

### Approach
1. In extractor step 7, add one dark scope to the fan-out list, conditional on
   `<run>/source-map.md`'s `## Dark-mode coverage` reporting dark screens - no dark screens, no
   extra dispatch. It gets the dark screens, the artifact paths, the sampler path, and output
   `<run>/review-dark.md`; routing of its mismatches follows the existing re-dispatch convention.
2. In `fidelity-reviewer.md` "Inputs you are given", state that the verification scope may be a
   dark scope (the dark screens plus their light counterparts).
3. In "What to do", add the dark-scope branch: run only the colour-bearing checks - surface and
   elevation order on the dark screens via `--regions`, accent discipline in dark, and a spot-check
   of `$extensions.org.superui.dark` values against the dark pixels. State explicitly that geometry,
   radii, and state form are theme-invariant and are NOT re-checked in a dark scope.
4. Leave the root-provenance wholesale skip, the synthesized skips, the report format, and the hard
   rules untouched.

### Edge cases
- Dark screens exist but no token carries a dark value -> report it as a finding, not silence.
- A dark screen with no light counterpart -> order and accent checks still apply; pair-based
  comparison is reported as uncertainty per the existing uncertainty rule.
- Root marker `provenance: designed` -> the dark scope is skipped wholesale like every other scope.

### Contracts
- `<run>/review-dark.md` - the existing fidelity report format, no new fields.

### DoD
The extractor dispatches a dark scope only when dark screens exist, and `fidelity-reviewer` runs
colour-only checks for it without repeating theme-invariant checks.


### Covered criteria
8. `design-system-extractor/SKILL.md` step 7 dispatches one additional dark scope, only when the
   source map reports dark screens.
9. `fidelity-reviewer.md` handles a dark scope with colour-only checks (surface/elevation order,
   accent discipline, dark-value spot-check) and does not repeat geometry or state checks there.
