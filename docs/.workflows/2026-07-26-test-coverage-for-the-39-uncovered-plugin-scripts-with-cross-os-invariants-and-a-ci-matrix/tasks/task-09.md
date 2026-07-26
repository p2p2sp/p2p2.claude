
## Task 9 - test(supergh): cover preflight.sh and body-path.sh
- Covers: criteria #3, #5
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/supergh/preflight.test.ts` (new dir `tests/supergh/`)
- add - `tests/supergh/body-path.test.ts`

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/supergh/preflight.test.ts`
- `node --test tests/supergh/body-path.test.ts`

### Approach
1. `preflight.test.ts`: drive `supergh/shared/scripts/preflight.sh` with a `withStub("gh", …)` whose body
   branches on `$1`. Assert the five lines always appear in the documented order -
   `GH_PRESENT`, `GH_AUTH`, `BRANCH`, `UPSTREAM`, `REPO` - and exit is always 0, across: no `gh` on PATH;
   `gh` present but `gh auth status` failing; not a git repo; a repo with no upstream; a repo with no
   `origin` remote; the fully happy path.
2. `body-path.test.ts`: assert the single stdout line matches
   `^\.temp/<prefix>/\d{8}-\d{6}-<slug>\.md$` (the timestamp comes from `date`, so match a pattern, never
   a literal) and that `.temp/<prefix>/` exists *before* the line is read.
3. Cover the slugify contract step by step: uppercase input; each Polish diacritic in both cases;
   punctuation collapsed to `-`; runs of `-` collapsed; leading and trailing `-` trimmed; a title longer
   than 40 chars cutting mid-word (back off to the last `-`) and cutting exactly on a boundary; a title of
   only punctuation → `untitled`; an empty title; an embedded newline and CR collapsed to a space so the
   one-line contract holds; a 4-byte emoji (the `LC_ALL=C` byte-semantics guard).
4. Assert exit 2 on missing arguments (`no args`, prefix only) and exit 1 when `.temp/<prefix>` cannot be
   created (pre-create `.temp/<prefix>` as a regular file).
5. Both scripts are `#!/bin/sh`, so run every case through `forEachShell("posix", …)`.

### Edge cases
A prefix containing a slash. A title of exactly 40 and exactly 41 characters. Two invocations within the
same second producing the same path. A read-only `cwd`.

### Contracts
`body-path.sh <prefix> <title>` → exactly one stdout line `.temp/<prefix>/<YYYYmmdd-HHMMSS>-<slug>.md`;
exit 0 / 2 missing args / 1 dir not creatable.

### DoD
Both test files green under every POSIX shell present, with a recorded skip for each absent one.


### Covered criteria
3. Every one of the 39 uncovered scripts has coverage under `tests/` - `tests/<plugin>/` for the four
   plugins, `tests/github/` for `.github/scripts/release.sh`; for the 36 full-coverage scripts (all but
   `vendor/jpeg-decode.ts`, `sample_colors.ts` and `release.sh`, which are scoped to their boundary),
   every documented stdout marker line and every documented exit code is asserted.
5. Every `#!/bin/sh` script is exercised under each POSIX shell present on the machine, and every
   bash-shebang script under each distinct bash major present; an absent shell is skipped with a recorded
   reason, never failed.
