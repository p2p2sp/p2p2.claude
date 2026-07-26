
## Task 3 - feat(superui): add design-synthesizer agent
- Covers: criteria #3 (design-synthesizer half)

### Dependencies
- Task 2 - blocks: consumes the `[G<n>]` gap-entry contract

### Files
- add - superui/agents/design-synthesizer.md
- modify - superui/.claude-plugin/plugin.json (agents[] gains "./agents/design-synthesizer.md")

### Test Commands
*Build*
- `python3 -c "import json; json.load(open('superui/.claude-plugin/plugin.json'))"` - exit 0

*Tests*
- Manual read-through: frontmatter fields, extrapolate-first rule, SYNTHESIZED-TOKENS output format, hard rules present

### Approach
1. Frontmatter: `name: design-synthesizer`, folded `description: >-` with scope guard ("Designs the user-APPROVED gaps of one scope in a design-system completion run - extrapolates from the existing tokens/specs first, generic professional standards second. Emits a synthesized-tokens list and provenance-marked spec content; never edits dtcg.yml. Spawn one per approved scope, in parallel."), `tools: Read, Write, Glob, Grep`.
2. Inputs: the approved `[G<n>]` gap entries for ONE scope (one component/pattern slug, or one token category); design-system dir (dtcg.yml, specs, DESIGN.md); pro-designer references dir path (fallback doctrine); extractor's spec-template reference + example-spec paths (when writing spec content); output paths - the spec file (when spec work) and a synthesized-tokens list file.
3. Work order per gap: FIRST extrapolate from the measured system (derive a missing hover/pressed from the system's own state treatment and scales, a missing dark value from the system's existing light->dark relationships, a missing semantic role by aliasing the primitive already used); ONLY where the system offers no basis, fall back to pro-designer reference standards. Record which basis was used in the rationale.
4. Spec output: new spec files follow the template structure with a `**Provenance:** designed, not extracted` line appended to the meta line; synthesized sections inside an existing measured spec get a `> SYNTHESIZED: <rationale>` marker (modeled on the sanctioned `> NEEDS INPUT` convention). Token references by NAME only; a needed value with no token becomes a synthesized-tokens entry, never a raw value in the spec.
5. Output message: paths written + the synthesized-tokens list per Contracts (or `SYNTHESIZED-TOKENS: none`). Hard rules: NEVER edit dtcg.yml, tokens.css, inventory.md, or any file outside the given output paths; one scope only; never talk to the user.

### Edge cases
- An approved gap that turns out to be extrapolatable to an EXISTING token (pure alias) → emit the alias as a synthesized-tokens entry (value = `{existing.path}`), do not duplicate the raw value.
- A gap whose synthesis would contradict a measured value → return it as a `> NEEDS INPUT` item instead of overriding measurement.

### Contracts
- Synthesized-tokens list (token-composer merge input, marked): header `SYNTHESIZED-TOKENS:` then `- <proposed.token.name> = <value> (evidence: synthesized - <basis rationale>) [G<n>]` - mirrors spec-writer's MISSING-TOKENS shape so token-composer's merge job consumes it unchanged, plus the synthesized marking Task 4 teaches the composer to flag.

### DoD
Agent file present per repo agent pattern, plugin.json valid and listing both new agents, output contract consistent with Tasks 2/4/5.


### Covered criteria
3. `superui/agents/gap-analyst.md` and `superui/agents/design-synthesizer.md` exist with frontmatter per repo pattern (`name`, `description` with routing/scope guard, `tools`) and both are listed in `plugin.json` `agents[]` (and in no `skills[]`).
