
## Task 1 - feat(superui): add parse_design_md.ts reconstructing a registry from DESIGN.md
- Covers: criteria #1, #10
- TDD: required

### Dependencies
- none

### Files
- add - superui/scripts/parse_design_md.ts (main, parseFrontMatter, parseBodyTables)
- add - tests/superui/parse_design_md.test.ts

### Test Commands
*Build*
- none (no build step in this repo)

*Tests*
- `node --test "tests/superui/parse_design_md.test.ts"`
- `node --test "tests/**/*.test.ts"`

### Approach
1. Apply the `tdd` skill discipline (strict red-green-refactor) for this task.
2. Write `parse_design_md.ts` with CLI `parse_design_md.ts DESIGN_MD OUTPUT_JSON`: read `DESIGN.md`, parse the `### 3.N` body tables (the authoritative source - the front matter is a derived subset) into `{ tokens, textStyles, surfaceOrder, accentUsage, unknowns: [] }` matching the registry shape `build_registry.ts` emits. A `Source` column value `proposed` sets `proposed: true` (no `evidence`); `measured` rows get `evidence: null` (the parser cannot reconstruct evidence and no consumer needs it). Parse 3.3 into `surfaceOrder`, 3.4 into `accentUsage`, 3.5 style rows into `textStyles`. Reuse `SECTION_TITLES` / section regexes from `superui/scripts/section-model.ts`.
3. Self-verify per script convention (re-read OUTPUT_JSON, assert non-empty `tokens`), print one `PARSE_DESIGN_OK tokens=<n> textStyles=<n> -> <OUTPUT_JSON>` line, exit 0; exit 1 on unreadable/malformed input, exit 2 on usage errors; document the I/O contract in the header comment.
4. Tests: a round-trip case (build a fixture registry, render it with `render_design_md.ts`, parse the output, assert tokens/textStyles/surfaceOrder/accentUsage survive), a proposed-token case, an error case (missing file, no tables). Follow `tests/superui/render_design_md.test.ts` harness patterns and `slash()` from `tests/harness/paths.ts`.

### Edge cases
- `DESIGN.md` with empty maps/tables (a minimal system) -> valid JSON with empty collections, still exit 0 when at least one token exists; zero tokens overall -> exit 1 naming the file.
- Multi-line or escaped cell values (quoted hex, family stacks with commas) parse without truncation.
- `> NEEDS INPUT` blockquote lines inside sections are ignored (unknowns stay `[]`).

### Contracts
- New CLI: `parse_design_md.ts DESIGN_MD OUTPUT_JSON` -> registry-shaped JSON consumed by spec-writer dispatches, `validate_bundle.ts --mode platform`, component-synthesizer and bundle-reviewer. `unknowns` is always `[]`; `evidence` is always `null`.

### DoD
`parse_design_md.ts` round-trips a rendered fixture bundle; both test commands green.


### Covered criteria
1. `superui/scripts/parse_design_md.ts` exists and reconstructs a registry-shaped JSON (`tokens`, `textStyles`, `surfaceOrder`, `accentUsage`, `unknowns: []`) from a rendered `DESIGN.md` body; a round-trip test (render a fixture registry, parse it back) passes under `node --test`.
10. `node --test "tests/**/*.test.ts"` passes from the repo root.
