
## Task 4 - docs(superdev): describe the run-directory layout
- Covers: criterion #7
- TDD: none

### Dependencies
- Task 2 - blocks: the intent path shape documented here.
- Task 3 - blocks: the spec path shape documented here.

### Files
- modify - superdev/README.md (Quick start steps 3 and 6, the `cleanup` switch row, the `intent` and `superspec` skill rows)
- modify - CLAUDE.md (the superdev bullet, the `docs/.workflows/` repository-layout entry, the host-repo `docs/` invariant)
- modify - superdev/skills/setup/assets/config.yml (`cleanup` comment)
- modify - tests/superdev/bootstrap.test.ts (the asserted `cleanup:` line)
- modify - docs/assets/superdev-flow.svg (the `superspec` node's mono path label)

### Test Commands
#### Build
- none - editing markdown, YAML, JSON and SVG is shipping; the repo has no build and no lint.

#### Tests
- `node --test "tests/superdev/bootstrap.test.ts"`
- `node --test "tests/**/*.test.ts"`

### Approach
1. In `superdev/README.md`, replace `docs/.workflows/<date>-<slug>-intent.md` with `docs/.workflows/<run>/intent.md` and `docs/.workflows/<date>-<slug>.md` with `docs/.workflows/<run>/spec.md`, and reword the two "workdir, spec, intent" phrasings to "the run's working directory".
2. In `CLAUDE.md`, replace the single `docs/.workflows/<date>-<slug>-intent.md` occurrence with `docs/.workflows/<run>/intent.md` (no spec shape appears there), reword the one "workdir, spec, intent" phrasing, and reword the `docs/.workflows/` repository-layout entry plus the host-repo `docs/` invariant so both describe intent and spec as living inside the run directory.
3. Change the `cleanup` comment in `superdev/skills/setup/assets/config.yml` to `# Remove the run's working dir (docs/.workflows/<run>) after a completed build`, keeping the file's existing column alignment, then mirror the new line byte-for-byte into the single asserted string in `tests/superdev/bootstrap.test.ts` (the `defaults: … cleanup=false` summary asserted elsewhere is unaffected).
4. Replace the `superspec` node's mono label in `docs/assets/superdev-flow.svg` with `docs/.workflows/&lt;run&gt;/spec.md` - shorter than the current label, so the 440-wide node still fits it.

### Edge cases
- The `config.yml` comment is asserted verbatim by a test: change both in the same task or the suite fails.
- The SVG is embedded by `superdev/README.md` through a relative path; edit the label text only, never the file's location or its viewBox.

### Contracts
- none.

### DoD
No `docs/.workflows/<date>-<slug>-intent.md` or `docs/.workflows/<date>-<slug>.md` path shape survives in `superdev/README.md`, `CLAUDE.md`, `config.yml` or the flow SVG, and `node --test "tests/**/*.test.ts"` is green.


### Covered criteria
7. `superdev/README.md`, the root `CLAUDE.md`, the `cleanup` comment in `superdev/skills/setup/assets/config.yml` with its assertion in `tests/superdev/bootstrap.test.ts`, and the spec-path label in `docs/assets/superdev-flow.svg` describe the new layout.
