
## Task 5 - docs(superui): make the agents hunt and record subtle effects
- Covers: criterion #6
- TDD: none

### Dependencies
- Task 1 - blocks: the analyst's instructions cite the `--shadow` profile fields.
- Task 2 - blocks: the analyst's instructions cite the `--gradient` mode.
- Task 4 - blocks: `spec-writer`'s pinned property lines are what `checkEffectLines` parses.

### Files
- modify - superui/agents/foundation-analyst.md (new `## Subtle effects - mandatory coverage`, `## Colors - mandatory coverage`, `## Measurement law`)
- modify - superui/agents/spec-writer.md (`## Section list - component entry`, `## The spec file's machine-readable surface - pin exactly`)
- modify - superui/agents/design-synthesizer.md (`## Two duties, one fragment`, `## Coherence and collision rules`)
- modify - superui/agents/bundle-reviewer.md (intro paragraph, `## What to review`, `## Output - strict`, `## Hard rules`)
- modify - superui/skills/design-extractor-builder/SKILL.md (`### 6 - Resolve missing tokens`)

### Test Commands
*Build*
- none - markdown agent/skill sources, no build step in this repo

*Tests*
- `node --test "tests/**/*.test.ts"` - regression only; no test covers markdown

### Approach
1. `foundation-analyst.md`: add a `## Subtle effects - mandatory coverage` block mirroring the existing colors one, with the coverage split by duty so no analyst is told to write outside it (the `## Hard rules` "one foundation only" line stays as-is):
   - `dimensions` (3.7): `--edges --tol 2` on all four edges of every distinct surface and control - the default tolerance merges a hairline into its neighbouring run - and a 1-3px run so found becomes a `border.*` token.
   - `effects-motion` (3.8): `--shadow` on all four sides (read `samples[]`/`peakOffset`/`peakHex`; derive offset from opposing sides, blur from the falloff length, colour from `peakHex`) and `--gradient` on both axes. `shadow.*` and `gradient.*` are CSS shorthand strings and belong to this analyst ALONE.
   - Both: `none` is recorded as a measured result, never an omission.
2. `foundation-analyst.md`, `## Colors - mandatory coverage`: run `--gradient` on each `--regions` rect BEFORE transcribing `surfaceOrder`; on a non-`flat` verdict, re-run `--regions` with the rect centred on the ramp midpoint and transcribe THAT printed rank - the existing "never rank surfaces by eye, only by the sampler's own printed order" rule is untouched, only the rect moves. Add the hairline's colour as a semantic 3.2 token. State explicitly that the colors analyst writes NO `gradient.*` and no `border.*` token - 3.8 and 3.7 are outside its duty split, and a second fragment declaring the same key makes `build_registry.ts`'s `detectCollisions` exit 1.
3. `foundation-analyst.md`, `## Measurement law`: add `--gradient x,y,w,h --axis h|v` to the geometry-script command string, which currently lists only `--edges | --radius | --shadow | --ink`.
4. `spec-writer.md`: require a `border:`, `shadow:` and `gradient:` line per part, with `none` legal and omission not; add those three lines to the pinned machine-readable surface next to `canonical:` and the backtick token refs.
5. `design-synthesizer.md`: extend the shadows/effects completion duty to gradients, and forbid proposing a shadow or gradient where a measured `none` exists - a measured `none` is a value, not a gap.
6. `bundle-reviewer.md`: add the fifth category `flat-render` (a spec declaring `shadow: none` while the registry carries a measured `shadow.card`; a state described by a colour change alone where a shadow or border change was measured), add it to the `FINDING:` category vocabulary in `## Output - strict`, and fix every stale enumeration in the same pass - `## Output - strict`'s "across all four checks", `## Hard rules`' "Review only the four categories above", and the intro paragraph's list of what `validate_bundle.ts` already caught, which Task 4 extends with `missing-effect-line` - so nothing in the file cancels the new category.
7. `design-extractor-builder/SKILL.md` step 6: add `gradient.*` to the effects-motion branch of the MISSING-TOKENS routing table.

### Edge cases
- Keep every edit inside the repo's agent-authoring rules: no tables, no emoji, no caller narrative, bullets over prose.
- Do not add a gate: `bundle-reviewer` findings stay advisory and are never re-dispatched, per the builder's existing ground rules.

### Contracts
`spec-writer` output gains three pinned per-part lines (`border:`, `shadow:`, `gradient:`) that `checkEffectLines` parses. `bundle-reviewer`'s category vocabulary gains `flat-render`.

### DoD
All five files carry the named blocks; `bundle-reviewer.md` says five categories in all three places (`## What to review`, `## Output - strict`, `## Hard rules`); the builder's step-6 routing names `gradient.*`; no analyst is instructed to write a token outside its duty split; the full suite stays green.


### Covered criteria
6. `foundation-analyst`, `spec-writer`, `design-synthesizer` and `bundle-reviewer` carry their subtle-effects duties, and `design-extractor-builder` step 6 routes a `gradient.*` MISSING-TOKENS entry to the effects-motion analyst.
