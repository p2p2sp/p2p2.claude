
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


### Covered criteria
7. `superui/CLAUDE.md` states the new front-matter contract and the updated script contracts; no sentence remains claiming shadows live in the body only. The repo-root `CLAUDE.md` needs no edit - it never enumerates the seed's front-matter token model, and no skill or agent is added, removed or renamed.
