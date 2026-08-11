
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


### Covered criteria
3. `DESIGN.md` front matter carries a `shadows` map (section-3.8 `shadow.*` tokens) and a `gradients` map (section-3.8 `gradient.*` tokens) alongside `colors`/`typography`/`spacing`/`rounded`, each value double-quoted so a `linear-gradient(180deg, #ffffff 0%, #f7f8fa 100%)` value survives YAML intact.
4. Section 3.8's rendered body is split by name prefix into `**Shadows**`, `**Gradients**` and a remaining table, mirroring the existing 3.7 radius/border split.
8. `node --test "tests/**/*.test.ts"` passes from the repo root.
