Title: "superui design-extractor - capture subtle borders, shadows and gradients"


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

