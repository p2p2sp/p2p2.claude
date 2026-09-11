
## Task 3 - feat(superdev): cleanup-run.sh removes a completed phase and the run root after the last phase
- Covers: criteria #3, #8
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- Task 2 - blocks: none

### Files
- modify - superdev/scripts/cleanup-run.sh (slug derivation, removal section)
- modify - tests/superdev/cleanup-run.test.ts

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node --test "tests/superdev/cleanup-run.test.ts"` - expected: all existing tests pass unchanged plus the new phase tests

### Approach
1. After the completeness check and before the removal section, detect a phase workdir: `parent="$(dirname -- "$dir")"`; `is_phase=0`; when `"$(basename -- "$parent")" == phases` set `is_phase=1`, `root="$(dirname -- "$parent")"`, and derive `slug="$(basename -- "$root" | sed -e 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')-$(basename -- "$dir")"`; otherwise keep today's slug line.
2. After the existing target removal (both the no-git branch and the git branch), when `is_phase=1` check whether `phases/` still holds a subdirectory (`for p in "$parent"/*/; do [[ -d "$p" ]] && remaining=1; done`); when none remains, remove `root` the same way as the other targets (`git rm -r -f -q --ignore-unmatch -- "$root" >&2; rm -rf "$root"` in the git branch, `rm -rf "$root"` in the no-git branch) and set `root_removed=1`.
3. stdout lines: unchanged for a flat run; for a phase, `CLEANUP: <dir> (removed)` / `(removed - nothing to commit)` / `(removed - no git repository)` as today when other phases remain, and `CLEANUP: <dir> (removed - last phase, run root removed)` when the root was removed in a git repo with a commit (`(removed - last phase, run root removed - nothing to commit)` and `(removed - last phase, run root removed - no git repository)` for the other two branches). Commit message stays `chore(<prefix>): clean up run <slug>` with the phase slug from step 1.
4. Update the header contract comment with the phase behaviour (detection rule, slug, root removal, new stdout variants).
5. Extend `tests/superdev/cleanup-run.test.ts` with a second fixture builder `buildPhaseFiles(root, phaseName, opts)` writing `docs/.workflows/2026-01-02-demo/{intent.md,roadmap.md}` plus `phases/<phaseName>/{status.md,plan-header.md,tasks/,implementation/,intent.md}` where `plan-header.md`'s `Intent:` names the phase's own `intent.md`; tests: (a) two phases, first complete -> only `phases/01-a` removed, `phases/02-b`, `intent.md`, `roadmap.md` remain, stdout `CLEANUP: <dir> (removed)`, commit subject `chore(simplebuild): clean up run demo-01-a`; (b) single remaining phase complete -> phase and run root removed, stdout `(removed - last phase, run root removed)`, `docs/.workflows/2026-01-02-demo` gone; (c) incomplete phase -> skipped message, nothing removed; (d) no-git variant of (b).

### Edge cases
- The phase's `Intent:` file lives inside the removed phase dir -> `git rm --ignore-unmatch` + `rm -f` must not fail on the already-removed path.
- `phases/` holding stray files but no subdirectories -> counts as empty, root is removed.
- A phase dir passed with trailing `/` or leading `./` -> normalised before detection.

### Contracts
- `cleanup-run.sh <phase-dir> [prefix]` removes only that phase unless it was the last one; the run root is removed in the same commit. Consumed by simplebuild/superbuild Step 5 unchanged.

### DoD
Cleanup suite green: all existing tests untouched and the four phase tests passing.


### Covered criteria
3. `cleanup-run.sh` wywołany na ukończonym katalogu fazy (`.../phases/NN-<slug>`) usuwa tylko ten katalog; gdy po usunięciu w `phases/` nie ma już żadnego podkatalogu, usuwa w tym samym commicie także `phases/` i korzeń runu (`intent.md`, `roadmap.md`) i drukuje `CLEANUP: <dir> (removed - last phase, run root removed)`; slug commita fazy to `<slug runu bez daty>-<basename fazy>`; płaski run zachowuje dzisiejsze komunikaty i zachowanie.
8. `superdev/.claude-plugin/plugin.json` wymienia `./skills/roadmap/` i `./skills/roadmap-reviewer/`; `superdev/README.md`, root `CLAUDE.md` i komentarz `cleanup` w `superdev/skills/setup/assets/config.yml` opisują fazy; `node --test "tests/**/*.test.ts"` jest zielony (w tym `tests/portability.test.ts` dla nowego skryptu).
