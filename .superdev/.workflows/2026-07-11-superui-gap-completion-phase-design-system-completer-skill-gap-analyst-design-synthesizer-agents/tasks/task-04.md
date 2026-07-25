
## Task 4 - feat(superui): teach provenance to token-composer, fidelity-reviewer and html-visualizer
- Covers: criteria #4

### Dependencies
- Task 3 - blocks: flags/markers must match design-synthesizer's output contract

### Files
- modify - superui/agents/token-composer.md (Merge job + Hard rules)
- modify - superui/agents/fidelity-reviewer.md (Inputs + What to do + Output)
- modify - superui/agents/html-visualizer.md (What to do + Hard rules)

### Test Commands
*Build*
- none (markdown only)

*Tests*
- `grep -l "org.superui.synthesized" superui/agents/token-composer.md superui/agents/fidelity-reviewer.md` - both listed
- `grep -c "SYNTHESIZED" superui/agents/html-visualizer.md` - ≥ 1

### Approach
1. token-composer.md: extend the Merge input line - a merge list may arrive as `SYNTHESIZED-TOKENS:` entries; each such token is written with `$extensions.org.superui.synthesized: true`, and existing synthesized flags in dtcg.yml are PRESERVED on merge. Extend Hard rules: the never-fabricate rule is unchanged - synthesized values are provided list entries; the flag is metadata the composer writes, never a license to invent.
2. fidelity-reviewer.md: in "What to do", exclude tokens carrying `$extensions.org.superui.synthesized` from the token spot-check, and exclude spec files/sections marked `**Provenance:** designed, not extracted` or `> SYNTHESIZED:` from pixel comparison - synthesized content has no source pixels BY DESIGN, not as a mismatch. In Output: report the count of skipped synthesized items alongside PASS/mismatches.
3. html-visualizer.md: in "What to do", render `> SYNTHESIZED:` notes the same way as `> NEEDS INPUT` notes, and render a spec's `**Provenance:** designed, not extracted` line as a visible note line in the sheet header area using existing chrome classes only (no new chrome).

### Edge cases
- A spec that is entirely synthesized (whole-file provenance) → fidelity-reviewer skips the file and says so; its sheet still renders normally.
- Merge list mixing measured MISSING-TOKENS and SYNTHESIZED-TOKENS entries → only the synthesized entries get the flag.

### Contracts
- consumes: `$extensions.org.superui.synthesized: true` (dtcg.yml token metadata), `**Provenance:** designed, not extracted` (spec meta line), `> SYNTHESIZED: <rationale>` (spec inline marker) - the single provenance vocabulary all three agents and Task 5 share.

### DoD
All three agent files updated, grep checks pass, no change to compose-job behavior or to the never-invent doctrine's meaning.


### Covered criteria
4. `superui/agents/token-composer.md` merge job writes `$extensions.org.superui.synthesized: true` on entries marked synthesized and preserves existing flags; `superui/agents/fidelity-reviewer.md` skips synthesized-flagged tokens and provenance-marked specs/sections and reports the skipped count; `superui/agents/html-visualizer.md` renders `> SYNTHESIZED:` notes and the spec `**Provenance:**` line.
