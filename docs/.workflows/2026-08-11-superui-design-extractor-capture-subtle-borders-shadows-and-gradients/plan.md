# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "superui design-extractor - capture subtle borders, shadows and gradients"

---
<!-- HEADER -->

## Goal
`design-extractor` measures, records and ships the subtle graphical treatments it is blind to today: hairline borders below the default colour tolerance, very light shadows, and low-amplitude gradients. Each one reaches `DESIGN.md` as a token - shadows and gradients in front matter plus a dedicated body table, hairline widths as `border.*` in the 3.7 body table - reaches every component spec as an explicit property line where `none` is a stated measurement rather than an omission, and is gated by both a deterministic bundle check and a reviewer category.

## Context
The pipeline drops subtle treatments by construction. `measure_geometry.ts` defaults to `--tol 8`, so a hairline whose per-channel delta is under 8 merges into its neighbouring run in `--edges`, and a soft shadow with `peakDelta <= 8` reports `extent=0`; `scanShadow` also breaks on the first within-tolerance pixel, so `peakDelta` is itself tolerance-gated. There is no gradient primitive at all - `sample_colors.ts --regions` flattens a gradient surface to one colour, and that is what feeds `surfaceOrder`. The shadow model carries no offset, blur, spread or colour, so a 3.8 token has nothing to build `0 1px 2px rgba(0,0,0,.05)` from. No agent mentions any of this: `foundation-analyst` has a mandatory-coverage block for colours only, and `bundle-reviewer`'s four categories cannot see a component written up as a flat rectangle. These are plugin SOURCE files - no build step, no lint; editing them is shipping.

## Acceptance criteria
1. `measure_geometry.ts --shadow` reports `samples[]` (per-step `offset`, `delta`, `hex`), `peakOffset` and `peakHex` alongside the existing `extent`, `peakDelta` and `bgHex`, in both the human-readable and the `--json` form; `peakDelta` and `samples[]` are tolerance-independent, so a shadow whose maximum per-channel delta is 3 is reported under the default `--tol 8` instead of vanishing.
2. `measure_geometry.ts --gradient x,y,w,h --axis h|v` exists and reports `startHex`, `midHex`, `endHex`, `totalDelta`, `maxDeviation` and a `verdict` of `flat|linear|nonlinear`; a synthetic 8-step linear ramp classifies as `linear`, a flat surface carrying +/-1 noise classifies as `flat`.
3. `DESIGN.md` front matter carries a `shadows` map (section-3.8 `shadow.*` tokens) and a `gradients` map (section-3.8 `gradient.*` tokens) alongside `colors`/`typography`/`spacing`/`rounded`, each value double-quoted so a `linear-gradient(180deg, #ffffff 0%, #f7f8fa 100%)` value survives YAML intact.
4. Section 3.8's rendered body is split by name prefix into `**Shadows**`, `**Gradients**` and a remaining table, mirroring the existing 3.7 radius/border split.
5. `validate_bundle.ts` emits one `FINDING: missing-effect-line <detail>` per missing property (up to three) for any `## <slug>` block in `DESIGN.components.md` lacking a `border:`, `shadow:` or `gradient:` property line, and emits nothing for a block carrying all three (including where the value is `none`).
6. `foundation-analyst`, `spec-writer`, `design-synthesizer` and `bundle-reviewer` carry their subtle-effects duties, and `design-extractor-builder` step 6 routes a `gradient.*` MISSING-TOKENS entry to the effects-motion analyst.
7. `superui/CLAUDE.md` states the new front-matter contract and the updated script contracts; no sentence remains claiming shadows live in the body only. The repo-root `CLAUDE.md` needs no edit - it never enumerates the seed's front-matter token model, and no skill or agent is added, removed or renamed.
8. `node --test "tests/**/*.test.ts"` passes from the repo root.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - feat(superui): report the full shadow falloff profile
- Covers: criteria #1, #8
- TDD: required

### Dependencies
- none

### Files
- modify - superui/scripts/measure_geometry.ts (`ShadowResult`, `scanShadow`, `main`, header comment)
- modify - tests/superui/measure_geometry.test.ts

### Test Commands
*Build*
- `node superui/scripts/measure_geometry.ts --help` - prints usage, exit 0

*Tests*
- `node --test tests/superui/measure_geometry.test.ts`
- `node --test "tests/**/*.test.ts"`

### Approach
1. Apply the `tdd` skill discipline (strict red-green-refactor) for every step below; `scanShadow` is a pure function over an `RgbImage`, so each behaviour lands as a failing test first.
2. Extend `ShadowResult` with `samples: { offset: number; delta: number; hex: string }[]`, `peakOffset: number` and `peakHex: string`; keep `extent`, `peakDelta` and `bgHex`.
3. Rewrite `scanShadow`'s walk: step outward from the edge for at most 32 samples - today's `steps <= margin` guard admits 33 iterations; pin the intended count at exactly `margin` samples and assert it in a test - pushing one `samples[]` entry per step (`offset` 0-based from the edge, `delta` = `maxChannelDelta` against `bg`, `hex` = that pixel). Stop early only after `SETTLE_RUN` (3) consecutive steps whose `delta <= SETTLE_DELTA` (1) - a fixed floor, never `--tol` - so the profile of a delta-3 shadow is walked in full.
4. Derive from the walked samples: `extent` = count of leading samples whose `delta > tol` (today's semantics, unchanged); `peakDelta` = max `delta` over all walked samples; `peakOffset` / `peakHex` = the offset and hex of that maximum (first occurrence on a tie); `peakDelta = 0`, `peakOffset = 0` and `peakHex = bgHex` when no sample was walked. Truncate `samples[]` after the LAST sample whose `delta > SETTLE_DELTA` - the trailing settle steps are walked to prove the falloff ended, never retained - so a 4px falloff yields exactly 4 entries.
5. Wire the new fields into `main`'s shadow branch for `--json`, and into the human-readable output as `extent=N peakDelta=N peakOffset=N peakHex=#xxxxxx bgHex=#xxxxxx` followed by one `sample <offset> <delta> <hex>` line per entry.
6. Update the file header's `--shadow` mode paragraph and its OUT contract to describe the profile and the tolerance-independence of `samples[]` / `peakDelta`.

### Edge cases
- Box edge flush against the image border: the walk starts out of bounds and yields zero samples - report `extent=0 peakDelta=0 peakOffset=0 peakHex=<bgHex>` and an empty `samples[]`, never a crash.
- A neighbouring element within the 32px margin: the settle rule stops the walk once the falloff has returned to background for 3 consecutive steps, so the neighbour is not sampled as a shadow peak.
- A shadow still above `SETTLE_DELTA` at step 32: the walk ends at the margin; `samples[]` is truncated there by design.

### Contracts
`ShadowResult` gains `samples: { offset: number; delta: number; hex: string }[]`, `peakOffset: number`, `peakHex: string`. `extent` and `bgHex` keep their current meaning; `peakDelta` becomes the maximum over the walked profile rather than over the above-tolerance prefix.

### DoD
`--shadow` on a synthetic image whose edge carries a 4px falloff peaking at delta 3 reports `peakDelta=3` with a 4-entry `samples[]` under the default `--tol 8`; both test commands green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - feat(superui): add the --gradient measurement mode
- Covers: criteria #2, #8
- TDD: required

### Dependencies
- Task 1 - blocks: none functionally; both edit `measure_geometry.ts`, so Task 1 lands first to keep the header and `main` edits sequential.

### Files
- modify - superui/scripts/measure_geometry.ts (`GradientResult`, `scanGradient`, `OPTION_NAMES`, `ParsedArgs`, `parseArgs`, `usageText`, `main`, header comment)
- modify - tests/superui/measure_geometry.test.ts

### Test Commands
*Build*
- `node superui/scripts/measure_geometry.ts --help` - usage lists `--gradient`, exit 0

*Tests*
- `node --test tests/superui/measure_geometry.test.ts`
- `node --test "tests/**/*.test.ts"`

### Approach
1. Apply the `tdd` skill discipline (strict red-green-refactor) for every step below; `scanGradient` is a pure function over an `RgbImage`.
2. Add `export function scanGradient(img: RgbImage, box: Box, axis: Axis): GradientResult`, walking the box's midline on the chosen axis (the same midline `scanRuns` uses) and reading every pixel along it.
3. Compute `startHex` / `endHex` from the first and last pixel, `midHex` from the middle pixel, `totalDelta` = `maxChannelDelta(start, end)`, and `maxDeviation` = the largest `maxChannelDelta` between any sampled pixel and the linear interpolation of `start`->`end` at that position.
4. Classify into `verdict`: `flat` when `totalDelta < 3`; otherwise `linear` when `maxDeviation <= Math.max(2, totalDelta * 0.25)`; otherwise `nonlinear`. Thresholds are fixed constants in the module, not flags.
5. Register the mode: add `--gradient` to `OPTION_NAMES` and `ParsedArgs`, include it in `main`'s `modeCount` exclusivity check, require `--axis h|v` exactly as `--edges` does, and emit `startHex=... midHex=... endHex=... totalDelta=N maxDeviation=N verdict=<v>` (human) or the equivalent keys (`--json`).
6. Update `usageText`, `helpText` and the file header's mode list, IN contract and exit-code notes to include `--gradient`.

### Edge cases
- A box 1px wide/tall on the sampled axis: `start`, `mid` and `end` collapse to the same pixel - `totalDelta = 0`, `maxDeviation = 0`, `verdict = flat`.
- Dithering noise on a flat surface: `totalDelta < 3` keeps the verdict `flat`, so `--gradient` never invents a ramp out of compression noise.
- A two-tone surface (a hard split, not a ramp): `maxDeviation` far exceeds the linear band, so the verdict is `nonlinear`, not `linear`.
- Reused `--tol` is not consulted by this mode; the classification is tolerance-independent.

### Contracts
`GradientResult { startHex: string; midHex: string; endHex: string; totalDelta: number; maxDeviation: number; verdict: "flat" | "linear" | "nonlinear" }`. CLI: `--gradient x,y,w,h --axis h|v`, mutually exclusive with `--edges` / `--radius` / `--shadow` / `--ink`.

### DoD
A synthetic 8-step vertical ramp classifies `linear` with the measured endpoint hexes; a flat surface with +/-1 noise classifies `flat`; both test commands green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - feat(superui): ship shadows and gradients in DESIGN.md front matter and split section 3.8
- Covers: criteria #3, #4, #8
- TDD: required

### Dependencies
- none

### Files
- modify - superui/scripts/render_design_md.ts (`buildFrontMatter`, new `renderShadowsAndEffects`, `renderSubsectionBody` case `"3.8"`, header comment)
- modify - tests/superui/render_design_md.test.ts

### Test Commands
*Build*
- `node superui/scripts/render_design_md.ts --help` - prints usage, exit 0

*Tests*
- `node --test tests/superui/render_design_md.test.ts`
- `node --test "tests/**/*.test.ts"`

### Approach
1. Apply the `tdd` skill discipline (strict red-green-refactor) for every step below; `buildFrontMatter` and the 3.8 renderer are pure functions over a `Registry`.
2. Export `buildFrontMatter` so the test can assert on its output directly, matching how `renderSubsectionBody` and `renderTextStyles` are already exported.
3. In `buildFrontMatter`, after the `rounded` block, emit `shadows:` from `tokensForSection(registry, "3.8")` filtered on the `shadow.` name prefix and `gradients:` from the same section filtered on `gradient.`, each key through `yamlKey` and each value through `yamlScalar`; emit `shadows: {}` / `gradients: {}` when empty, exactly as `rounded` does.
4. Add `function renderShadowsAndEffects(rows: TokenRow[]): string` mirroring `renderRadiiAndBorders`: a `**Shadows**` table (`shadow.` prefix), a `**Gradients**` table (`gradient.` prefix), and the remaining rows in a plain `Name | Value` table only when non-empty. Point `renderSubsectionBody`'s `case "3.8"` at it.
5. Update the header comment's front-matter list (point 1) to include `shadows` and `gradients` and drop shadows from the "body only" sentence.

### Edge cases
- No 3.8 tokens at all: front matter emits `shadows: {}` and `gradients: {}`; the 3.8 body still renders `none` through the existing `hasContent` path.
- A `linear-gradient(180deg, #ffffff 0%, #f7f8fa 100%)` value: `yamlScalar` double-quotes it, so the `#` never starts a YAML comment and the commas stay inside the scalar - assert the emitted line verbatim.
- A 3.8 token matching neither prefix (e.g. `blur.overlay`): lands in the remaining table, never dropped.
- A proposed 3.8 token: the existing `renderTokenTable` Source/Notes columns keep working inside each split table.

### Contracts
Front matter gains two top-level maps, `shadows` and `gradients`, both `<dotted-token>: "<value>"`. `buildFrontMatter` becomes an exported symbol.

### DoD
A registry with `shadow.card` and `gradient.surface.hero` renders both front-matter maps quoted and both `**Shadows**` / `**Gradients**` body tables; both test commands green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - feat(superui): gate component specs on explicit border, shadow and gradient lines
- Covers: criteria #5, #8
- TDD: required

### Dependencies
- none

### Files
- modify - superui/scripts/validate_bundle.ts (`FindingCategory`, new `checkEffectLines`, `main`, header comment)
- modify - tests/superui/validate_bundle.test.ts

### Test Commands
*Build*
- `node superui/scripts/validate_bundle.ts --help` - prints usage, exit 0

*Tests*
- `node --test tests/superui/validate_bundle.test.ts`
- `node --test "tests/**/*.test.ts"`

### Approach
1. Apply the `tdd` skill discipline (strict red-green-refactor) for every step below; `checkEffectLines` is a pure function over the bundle's file contents.
2. Add `"missing-effect-line"` to `FindingCategory`.
3. Add `export function checkEffectLines(bundleDir: string): Finding[]`: read `DESIGN.components.md` only (patterns describe composition, not painted surfaces), split it into blocks on `^## ` (`assemble_specs.ts` guarantees the slug wrappers are the only `## ` headings), and for each block require a line matching `/^[ \t>|*-]*\*{0,2}(border|shadow|gradient)\*{0,2}[ \t]*:/im` per property - horizontal-whitespace classes only, never `\s`, which under `/m` would straddle lines (the same reason `CANONICAL_LINE_RE` in `inventory-format.ts` uses `[ \t]*`). Emit one finding per missing property naming the slug and the property.
4. Call it in `main` after `checkSections` and before `checkForbidden`, appending to the same findings array so the existing `FINDING:` printing and exit-1 behaviour apply unchanged.
5. Document the new category in the header's "Finding categories" list - including that `none` is a satisfying value and that patterns are out of scope - and add `checkEffectLines` to the header's OUT contract, which enumerates the emission order verbatim.

### Edge cases
- `DESIGN.components.md` absent, or present as `assemble_specs.ts`'s "None catalogued." stub with no `## ` wrapper: zero blocks, zero findings.
- A property line written as a table cell or a bold label (`**shadow:**`, `| shadow: none |`): the leading-decoration allowance in the regex accepts it, matching how `CANONICAL_LINE_RE` already tolerates markdown decoration.
- `shadow: none` satisfies the check - absence of an effect is a measurement, and the semantic case (declared `none` against a measured `shadow.card`) belongs to `bundle-reviewer`'s `flat-render`, not here.
- A slug block mentioning `border-radius:` must not satisfy the `border` requirement; anchor the property word so `border-radius` does not match.

### Contracts
`FindingCategory` gains `"missing-effect-line"`. `checkEffectLines(bundleDir: string): Finding[]` - new exported symbol, read-only.

### DoD
A satellite whose `## card` block carries `border:`, `shadow:` and `gradient:` lines yields no finding; one missing `gradient:` yields exactly one `FINDING: missing-effect-line` naming `card`; both test commands green.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - docs(superui): record the front-matter contract change and the new script contracts
- Covers: criterion #7
- TDD: none

### Dependencies
- Task 1 - blocks: the scripts inventory describes the shadow profile.
- Task 2 - blocks: the scripts inventory describes `--gradient`.
- Task 3 - blocks: the front-matter invariant describes `shadows` / `gradients`.
- Task 4 - blocks: the scripts inventory describes `missing-effect-line`.

### Files
- modify - superui/CLAUDE.md ("The handoff bundle" front-matter bullet, "Scripts inventory" entries for `measure_geometry.ts`, `render_design_md.ts`, `validate_bundle.ts`, and the `design-synthesizer` / `bundle-reviewer` agent bullets)

### Test Commands
*Build*
- none - repo memory files, no build step

*Tests*
- `node --test "tests/**/*.test.ts"` - regression only; no test covers memory files

### Approach
1. "The handoff bundle", first bullet: change the front-matter token list to `colors`, `typography`, `spacing`, `rounded`, `shadows`, `gradients`, and delete ONLY the word `shadows` from the "live in the body only" enumeration - `borders` stays, because Task 3 lifts just the 3.8 `shadow.`/`gradient.` prefixes and `border.*` remains a 3.7 body token.
2. "Scripts inventory": extend the `measure_geometry.ts` entry to five modes including `--gradient` and the shadow falloff profile; the `render_design_md.ts` entry with the two new front-matter maps and the 3.8 prefix split; the `validate_bundle.ts` entry with the `missing-effect-line` finding.
3. "Agents": note `design-synthesizer`'s measured-`none` rule, `bundle-reviewer`'s fifth `flat-render` category, and that `gradient.*` / `shadow.*` belong to the `effects-motion` analyst alone.
4. Re-read the file for a surviving sentence claiming shadows are body-only; remove any that remains. Leave the repo-root `CLAUDE.md` untouched - it describes the seed as "YAML front-matter tokens + a prose body" without enumerating the token model, so no statement there goes stale (per its own header note, the root file holds only repo-wide facts).

### Edge cases
- Do not restate script internals the header comments already own - the memory file carries orientation, the script headers carry the contract.
- Leave the marketplace catalog, `plugin.json` and versioning untouched; no skill or agent is added, removed or renamed.

### Contracts
none

### DoD
`superui/CLAUDE.md` no longer claims shadows live in the body only, describes the `shadows`/`gradients` front-matter maps, and its scripts inventory matches the three changed scripts; the full suite stays green.

<!-- /TASK -->
