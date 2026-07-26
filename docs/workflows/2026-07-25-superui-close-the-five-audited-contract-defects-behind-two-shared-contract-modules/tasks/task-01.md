
## Task 1 - fix(superui): reject tokens in the field-backed sections 3.3 and 3.4
- Covers: criteria #1, #2, #3
- TDD: none

### Dependencies
- none

### Files
- add - superui/scripts/section-model.ts (SECTION_IDS, SECTION_TITLES, TOKEN_BACKED_SECTIONS, isTokenSection, TOKEN_SECTION_RE, UNKNOWN_SECTION_RE)
- modify - superui/scripts/build_registry.ts (TOKEN_SECTION_RE, UNKNOWN_SECTION_RE, validateToken, unknownKey)
- modify - superui/scripts/render_design_md.ts (SECTION_TITLES)
- modify - superui/agents/foundation-analyst.md (Duty split, Colors - mandatory coverage, Hard rules)
- modify - superui/agents/design-synthesizer.md (Coherence and collision rules, Output - one fragment)

### Test Commands
*Build*
- `node superui/scripts/build_registry.ts -h` - prints the usage line, exit 0 (a broken import or parse error fails here)
- `node superui/scripts/render_design_md.ts -h` - prints the usage line, exit 0

*Tests*
- `node superui/scripts/build_registry.ts .temp/superui-fix/t1/frag-bad33 .temp/superui-fix/t1/out.json` - exit 1, stderr names the token and section 3.3
- `node superui/scripts/build_registry.ts .temp/superui-fix/t1/frag-bad34 .temp/superui-fix/t1/out.json` - exit 1, stderr names section 3.4
- `node superui/scripts/build_registry.ts .temp/superui-fix/t1/frag-good .temp/superui-fix/t1/out.json` - exit 0, prints `REGISTRY_OK tokens=<N> unknowns=<M> -> ...`
- `node superui/scripts/render_design_md.ts .temp/superui-fix/t1/out.json .temp/superui-fix/t1/inventory.md .temp/superui-fix/t1/DESIGN.md` - exit 0, the six emitted `### 3.N` headings (3.1, 3.2, 3.3, 3.4, 3.8, 3.10) keep their current titles; 3.5, 3.6, 3.7 and 3.9 render through `renderSubsectionBody` with no `### 3.N` heading, and `SECTION_TITLES` still holds all ten entries
- `rg -c '\\x00' superui/scripts/build_registry.ts` - returns 1 after the fix and 0 before it, since the separator is now the two-character escape rather than a raw byte. A pattern like `TOKEN_SECTION_RE` does not discriminate: both its occurrences sit before the NUL and already match today.

### Approach
1. Create `section-model.ts` exporting `SECTION_IDS` (`"3.1"`..`"3.10"` in order), `SECTION_TITLES: Record<string, string>` carrying the ten titles currently in `render_design_md.ts`, `TOKEN_BACKED_SECTIONS` (3.1, 3.2, 3.5, 3.6, 3.7, 3.8, 3.9 - excluding the field-backed 3.3/3.4 and the derived 3.10), `isTokenSection(id: string): boolean`, and `TOKEN_SECTION_RE` / `UNKNOWN_SECTION_RE` built from those sets rather than written as literals. Header comment states the three provenance classes and that a section absent from `TOKEN_BACKED_SECTIONS` has no renderer for tokens.
2. In `build_registry.ts`, delete the local `TOKEN_SECTION_RE` and `UNKNOWN_SECTION_RE` declarations and import both from `./section-model.ts`; extend `validateToken`'s section `ShapeError` message to name the field that does cover the section (`surfaceOrder` for 3.3, `accentUsage` for 3.4) so the agent gets a corrective instruction, not just a rejection.
3. In `build_registry.ts`, replace the literal NUL byte separator inside `unknownKey` with the two-character escape `\x00` so the source is pure ASCII and the runtime key is unchanged.
4. In `render_design_md.ts`, delete the local `SECTION_TITLES` object and import it from `./section-model.ts`, leaving every renderer and `renderBody`'s dispatch untouched.
5. In `foundation-analyst.md`, rewrite the `colors` duty-split line so 3.3 and 3.4 are named as covered exclusively via `surfaceOrder` / `accentUsage` and never by a token, phrased in the same shape as the existing 3.10 exclusion; add to Hard rules that `surfaceOrder` and `accentUsage` belong to the colors analyst alone.
6. In `design-synthesizer.md`, narrow the token `section` range in the Output section from `3.1`..`3.9` to `3.1`, `3.2`, `3.5`-`3.9`, since after step 2 the two excluded ids are rejected at the registry; and state that a proposal touching accent usage is a semantic token in 3.2, never an `accentUsage` entry.

### Edge cases
- A fragment carrying a token in 3.10 must keep failing with the existing message - the new 3.3/3.4 rejection must not replace that path.
- An `unknowns` entry in 3.3, 3.4, or 3.10 stays legal: only `TOKEN_SECTION_RE` narrows, `UNKNOWN_SECTION_RE` keeps accepting 3.1-3.10.
- A `resolved` entry is validated by the same routine as `unknowns` and must keep accepting 3.10.

### Contracts
- `section-model.ts` exports `SECTION_IDS: string[]`, `SECTION_TITLES: Record<string, string>`, `TOKEN_BACKED_SECTIONS: ReadonlySet<string>`, `isTokenSection(id: string): boolean`, `TOKEN_SECTION_RE: RegExp`, `UNKNOWN_SECTION_RE: RegExp`.
- Consumes the existing `notes-<foundation>.json` fragment shape `{ foundation, tokens, surfaceOrder, accentUsage, textStyles, unknowns, resolved }` unchanged.

### DoD
All Task 1 test commands produce the stated exit codes and output, `DESIGN.md` renders with its ten subsection titles unchanged from before the task, and `rg` reads `build_registry.ts` as text.


### Covered criteria
1. `build_registry.ts` exits 1 naming the token and its section when a fragment carries a token with `section: "3.3"` or `"3.4"`; tokens in 3.1, 3.2, 3.5-3.9 still merge.
2. `build_registry.ts` and `render_design_md.ts` both take the section list from `superui/scripts/section-model.ts`; neither declares its own list of section ids.
3. `superui/scripts/build_registry.ts` contains no NUL byte, so ripgrep reads it as text.
