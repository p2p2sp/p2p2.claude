
## Task 5 - feat(superui): platform-aware component agents and the component-synthesizer
- Covers: criterion #5
- TDD: none

### Dependencies
- Task 4 - blocks: the `platform reference:` input contract these agents consume

### Files
- modify - superui/agents/component-scout.md (Input, What to do, new Gaps rules)
- modify - superui/agents/spec-writer.md (Input, Variant versus state)
- modify - superui/agents/bundle-reviewer.md (Input, What to review)
- add - superui/agents/component-synthesizer.md

### Test Commands
*Build*
- none (no build step in this repo)

*Tests*
- `node --test "tests/**/*.test.ts"` (regression only - no script touched)

### Approach
1. `component-scout.md`: add optional `platform reference:` input (path). When present: use its `## Component taxonomy` for atomic/composite classification vocabulary, and diff the deduplicated inventory against `## Expected components checklist` into a fourth section `## Gaps` (after `## Inconsistencies`), one line per missing component: `- <slug> - <Display name> · atomic|composite · expected: <one-clause reason from the checklist>` - no `canonical:`, no `appears:`. When absent: no `## Gaps` section, current behavior.
2. `spec-writer.md`: add optional `platform reference:` input; when present, take the state list vocabulary in "Variant versus state" from its `## Interaction states` and apply `## Spec guidance` deltas; keep hover/disabled/error phrasing as examples only.
3. `bundle-reviewer.md`: add optional `platform reference:` input; `state-form` and `accent-sprawl` judgments use its `## Interaction states` vocabulary when present.
4. Add `component-synthesizer.md` modeled on `design-synthesizer.md`: frontmatter `description: Invoked only by superui design-extractor skills, never directly.`, `tools: Read, Write, Glob, Grep`, `model: sonnet`, `effort: high`, `skills: [pro-designer]`. Input: ONE `## Gaps` entry line, the registry JSON path (parsed from `DESIGN.md`), the platform reference path, the output spec path, optional re-dispatch inputs (previous spec + findings). Duty: write one component spec using ONLY existing registry tokens (dotted refs in backticks) grounded in pro-designer standards and the platform reference; the spec opens with `> NEEDS ATTENTION: invented, not observed - review before use`, carries `canonical: none`, the three effect lines per part, the same heading floor (`##`+) and machine surface as `spec-writer` specs; never a raw value - a value no token covers becomes a prose note plus a `MISSING-TOKENS:` entry in the final message. Hard rules: one spec only, never measure, never edit `DESIGN.md` or the registry.

### Edge cases
- Checklist item already covered by an observed component under a different name -> not a gap; `component-scout` matches by job, not by name, and notes the mapping in `## Inconsistencies`.
- Re-dispatched `component-scout` with strike constraints regenerates `inventory.md` in full without the struck gap entries (existing full-regeneration convention).

### Contracts
- `## Gaps` entry line format above (`·`-delimited, index 1 = `atomic|composite`, `expected:` instead of `canonical:`). `parseInventoryEntries(inventoryMd, "## Gaps")` parses these entries pattern-shaped (slug reliable; its `kind`/`canonical` fields not meaningful for a gap entry) - consumers use the slug and the raw line only; do NOT extend the parser.
- `component-synthesizer` final message: spec path + `MISSING-TOKENS:` block or `none` (mirrors `spec-writer`).

### DoD
Four agent files carry the contracts above; regression suite green.


### Covered criteria
5. `superui/agents/component-scout.md`, `superui/agents/spec-writer.md` and `superui/agents/bundle-reviewer.md` each accept an optional `platform reference:` input path and use it (taxonomy + checklist -> `## Gaps` section in the inventory; state vocabulary; platform-aware review); `superui/agents/component-synthesizer.md` exists, preloads `pro-designer` via `skills:`, and writes one invented spec per gap entry from registry tokens only, opening with `> NEEDS ATTENTION: invented, not observed` and carrying `canonical: none` plus the three effect lines.
