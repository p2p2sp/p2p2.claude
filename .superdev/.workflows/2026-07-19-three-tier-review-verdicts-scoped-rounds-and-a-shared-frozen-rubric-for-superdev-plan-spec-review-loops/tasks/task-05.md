
## Task 5 — docs: list superdev/references as plugin-level shared assets
- Covers: criteria #6

### Dependencies
- Task 1 — blocks: none

### Files
- modify - CLAUDE.md (repository layout + shared-assets sentences)

### Test Commands
*Build*
- none — markdown-only repo, no build step

*Tests*
- grep -q 'superdev/references/' CLAUDE.md

### Approach
1. In root `CLAUDE.md`, edit the single occurrence of "plugin-level shared assets/scripts live in `superdev/scripts/` and `superui/scripts/`..." (the "Repository layout" plugin-dir paragraph) to include `superdev/references/`.
2. In the "What this repo is" shared-scripts paragraph (the sentence beginning "plus deterministic helper scripts bundled either under an individual skill's own `scripts/` dir..."), extend the plugin-level enumeration so `superdev` is listed as keeping shared scripts and references at plugin root (`superdev/scripts/`, `superdev/references/`), mirroring how `superui` is described.

### Edge cases
- Touch only the shared-assets sentences — no other CLAUDE.md content is in scope.

### Contracts
- none

### DoD
Root CLAUDE.md names `superdev/references/`; grep test passes; git diff shows CLAUDE.md as the only file changed by this task.


### Covered criteria
6. Root `CLAUDE.md` lists `superdev/references/` among plugin-level shared assets.
