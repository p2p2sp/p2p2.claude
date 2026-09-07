
## Task 9 - Sync documentation and the flow diagram
- Covers: criteria #9, #10
- TDD: none

### Dependencies
- Task 6 - blocks: the docs layer must be gone before the docs stop mentioning it
- Task 8 - blocks: describes the final intent/spec/plan chain

### Files
- modify - superdev/README.md (Quick start steps 2-6, `## Config switches` table, `### Knowledge layers` table, `### Entry and environment` intent row)
- modify - README.md (superdev row, line 38: `product docs` -> `a build changelog`)
- modify - CLAUDE.md (superdev bullet lines 49-53; `docs/.workflows/` layout entry lines 149-150; `docs/` invariant lines 199-208; `.temp` capture dirs line 214)
- modify - superui/CLAUDE.md (line 72: `docs/product/` -> `docs/changelog/`)
- modify - docs/assets/superdev-flow.svg (line 425 text -> `changelog: true → superdev-changelog-writer (after adr)`; line 426 -> `wave 1 in parallel, changelog after it · a failed delegation does not block`; line 432 switches text -> `adr · rules · memory · changelog · cleanup`)

### Test Commands
#### Build
- none - the repo has no build step

#### Tests
- `grep -rn "docs/product\|superdev-docs" --include=*.md --include=*.svg --include=*.json --include=*.yml --include=*.sh --include=*.ts . | grep -v "^./docs/.workflows"` -> no output
- `node --test "tests/**/*.test.ts"` -> `# fail 0`

### Approach
1. `superdev/README.md`: Quick start step 3 gains "or stop here - the confirmed synthesis is saved to `docs/.workflows/<date>-<slug>-intent.md` and `intent <path>` resumes it"; step 6 describes the two close-out waves and the optional cleanup; switch table rows `changelog` (writes `docs/changelog/<run>.md` + index line) and `cleanup` (removes the run's working files after a completed build) replace `docs`; knowledge-layers table drops `superdev-docs`, the writer row becomes `superdev-memory-writer` / `superdev-rules-writer` / `superdev-changelog-writer`.
2. Root `README.md` superdev row wording.
3. `CLAUDE.md`: superdev bullet describes the changelog layer (writer fork only, `changelog` switch, `docs/changelog/`), the intent file and the `cleanup` switch; layout entry for `docs/.workflows/` becomes "per-run working files of superdev builds (intent, spec, plan copy, tasks, implementation reports) - removed by `cleanup-run.sh` after a completed build when `cleanup: true`; the changelog is the history"; the `docs/` invariant lists `docs/changelog/` (gated by `changelog`) instead of `docs/product/` and adds the intent file to the `docs/.workflows/` description; `.temp` capture dirs become `{memory,rules}`.
4. `superui/CLAUDE.md` line 72 and the SVG texts.
5. Run the full suite once.

### Edge cases
- The SVG text must stay inside the existing node box widths - keep the strings no longer than the current longest line in that box.

### Contracts
- none

### DoD
Repo-wide grep clean; full `node --test` run green.


### Covered criteria
9. `superdev/README.md`, `README.md`, `CLAUDE.md`, `superui/CLAUDE.md` and `docs/assets/superdev-flow.svg` describe the changelog layer, the `changelog` and `cleanup` switches, the intent file and `docs/.workflows/` as per-run working files removed after a completed build when `cleanup: true`; `grep -rn "docs/product\|superdev-docs" --include=*.md --include=*.svg --include=*.json --include=*.yml --include=*.sh --include=*.ts .` (excluding `docs/.workflows/`) returns nothing; `.claude/superdev.yml` in this repo carries the five keys, all `false`.
10. `node --test "tests/**/*.test.ts"` passes from the repo root.
