
## Task 7 - docs(superdev): register roadmap skills and document phases
- Covers: criteria #8
- TDD: none
- Model: sonnet
- Effort: low

### Dependencies
- Task 5 - blocks: none

### Files
- modify - superdev/.claude-plugin/plugin.json (`skills`)
- modify - superdev/README.md (Quick start step 3, Config switches `cleanup` row, Entry and environment table, Knowledge layers `superdev:changelog-writer` row)
- modify - CLAUDE.md (superdev bullet in `## What this repo is`, `docs/.workflows/` row in `## Repository layout`, `docs/.workflows/` clause in `## Cross-plugin architecture invariants`)
- modify - superdev/skills/setup/assets/config.yml (`cleanup` comment)
- modify - tests/superdev/bootstrap.test.ts (the asserted `cleanup` comment string)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node --test "tests/**/*.test.ts"` - expected: whole suite green

### Approach
1. `plugin.json`: insert `"./skills/roadmap/"` and `"./skills/roadmap-reviewer/"` after `"./skills/intent/"`.
2. `README.md`: in Quick start step 3 add a **Roadmap** bullet (work too large for one spec; `roadmap.md` plus `phases/NN-<slug>/intent.md`; each phase starts with `intent <phase intent>`; `roadmap <roadmap.md>` resumes); in the `cleanup` switch row add "a phase's directory, and the run root after its last phase"; in the Entry and environment table add rows `roadmap` and `roadmap-reviewer` (fork); in the changelog-writer row mention the phase entry id `<run>-<phase>`.
3. `CLAUDE.md`: extend the superdev bullet with one sentence on `roadmap` / `roadmap-reviewer` / `roadmap-status.sh`; extend the `docs/.workflows/` layout row and the invariant clause with `roadmap.md` and `phases/NN-<slug>/` as nested workdirs.
4. `config.yml`: change the `cleanup` comment to `# Remove the run's (or phase's) working dir after a completed build`; update the identical string asserted in `tests/superdev/bootstrap.test.ts`.
5. No em dash or en dash anywhere in the touched text.

### Edge cases
- none

### Contracts
- none

### DoD
Catalog and docs mention both new skills and the phase layout; full suite green.


### Covered criteria
8. `superdev/.claude-plugin/plugin.json` wymienia `./skills/roadmap/` i `./skills/roadmap-reviewer/`; `superdev/README.md`, root `CLAUDE.md` i komentarz `cleanup` w `superdev/skills/setup/assets/config.yml` opisują fazy; `node --test "tests/**/*.test.ts"` jest zielony (w tym `tests/portability.test.ts` dla nowego skryptu).
