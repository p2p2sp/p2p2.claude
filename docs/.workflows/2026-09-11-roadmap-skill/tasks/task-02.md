
## Task 2 - feat(superdev): decompose.sh adopts the full dirname of the Intent or Spec path
- Covers: criteria #2, #8
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- none - blocks: Task 3

### Files
- modify - superdev/scripts/decompose.sh (`run_dir_of`)
- modify - tests/superdev/decompose.test.ts

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node --test "tests/superdev/decompose.test.ts"` - expected: all tests pass, including the new phase-adoption test

### Approach
1. In `run_dir_of` replace the first-level truncation (`first="${tail%%/*}"`) with the full tail: after the `case` check, `tail="${d##*docs/.workflows/}"` and `printf '%s\n' "docs/.workflows/${tail}"`. Keep the `\` -> `/` normalisation and the empty-result contract.
2. Update the header comment block (lines describing "ścieżka zagnieżdżona głębiej niż jeden poziom adoptuje sam katalog biegu") to state that the FULL directory of the Intent:/Spec: file is adopted, so a phase directory `docs/.workflows/<run>/phases/NN-<slug>/` becomes the workdir, and the run root is never touched (superspec already saves `spec.md` next to the handed-off intent, so a phase's spec lands there without any change).
3. Add a test "adoption: an Intent: file under docs/.workflows/<run>/phases/01-<slug>/ adopts the phase directory, not the run root" modelled on the existing "adoption: an Intent: file already under docs/.workflows/<run>/" test: create `<run>/intent.md`, `<run>/roadmap.md` and `<run>/phases/01-layout/intent.md`, run with a simplePlan whose `intentPath` is the phase intent, assert `workdir: <run>/phases/01-layout`, `plan-header.md` and `tasks/task-01.md` inside the phase dir, and `readdirSync(<run>)` still equals `["intent.md", "phases", "roadmap.md"]`.
4. Run the whole decompose suite; existing adoption and fallback tests must stay green unchanged.

### Edge cases
- Absolute Windows path to a phase intent (`C:\...\docs\.workflows\<run>\phases\01-x\intent.md`) -> `docs/.workflows/<run>/phases/01-x`.
- Intent path outside `docs/.workflows/` -> unchanged fallback to the derived `<date>-<slug>` name.

### Contracts
- `workdir:` line = the directory holding the Intent:/Spec: file whenever that directory is under `docs/.workflows/`; consumed unchanged by simplebuild/superbuild and by `cleanup-run.sh` (Task 3).

### DoD
Decompose suite green with the new phase-adoption test.


### Covered criteria
2. `decompose.sh` adoptuje jako workdir pełny `dirname` ścieżki z linii `Intent:` (albo `Spec:`) leżącej pod `docs/.workflows/` - dla `docs/.workflows/<run>/phases/01-x/intent.md` workdir to `docs/.workflows/<run>/phases/01-x`, katalog `<run>` pozostaje nietknięty; płaski run i fallback do `docs/.workflows/<data>-<slug>` zachowują dzisiejsze zachowanie.
8. `superdev/.claude-plugin/plugin.json` wymienia `./skills/roadmap/` i `./skills/roadmap-reviewer/`; `superdev/README.md`, root `CLAUDE.md` i komentarz `cleanup` w `superdev/skills/setup/assets/config.yml` opisują fazy; `node --test "tests/**/*.test.ts"` jest zielony (w tym `tests/portability.test.ts` dla nowego skryptu).
