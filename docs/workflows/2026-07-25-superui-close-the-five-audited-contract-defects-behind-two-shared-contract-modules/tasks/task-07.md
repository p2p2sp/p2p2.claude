
## Task 7 - docs(superui): align CLAUDE.md with the new scripts and scripted step 8
- Covers: criterion #12
- TDD: none

### Dependencies
- Task 1 - blocks: documents `section-model.ts`
- Task 3 - blocks: documents `inventory-format.ts`
- Task 4 - blocks: documents `copy_screens.ts` and the scripted step 8
- Task 5 - blocks: documents the changed `assemble_specs.ts` demotion rule

### Files
- modify - superui/CLAUDE.md (Scripts inventory, Skills (flat-named, single domain))

### Test Commands
*Build*
- none - markdown only

*Tests*
- `rg -n 'section-model|inventory-format|copy_screens' superui/CLAUDE.md` - three new script entries present
- `rg -n 'vendor/' superui/CLAUDE.md` - the relative-import sentence no longer claims `vendor/` is the only target
- `rg -n 'design-extractor-builder' superui/CLAUDE.md` - the step-8 description names the script rather than an inline copy

### Approach
1. Add three entries to the Scripts inventory: `section-model.ts` and `inventory-format.ts` as the two shared contract modules naming their consumers, and `copy_screens.ts` as the canonical-screen copier.
2. Rewrite the relative-import sentence so it names the two new intra-`scripts/` imports alongside the existing `vendor/` ones, since it currently asserts `vendor/` is the only relative-import target.
3. Update the `assemble_specs.ts` entry so the heading rule reads "h1 and h2 both to h3, h3-h5 down one, h6 clamped, fenced regions skipped", replacing the current "body `## ` headings demoted to `### `" wording.
4. Update the `design-extractor-builder` skill description so canonical-screen copying is listed among its scripted steps rather than work the orchestrator does itself.

### Edge cases
- none

### Contracts
- none - documentation only; `CLAUDE.md` is dev-time orientation and is never read at runtime by any skill.

### DoD
All Task 7 test commands return matches, and every script named in the Scripts inventory exists at the path given.


### Covered criteria
12. `superui/CLAUDE.md` documents the three new scripts and the scripted step 8, and no longer states that `vendor/` is the only relative-import target.
