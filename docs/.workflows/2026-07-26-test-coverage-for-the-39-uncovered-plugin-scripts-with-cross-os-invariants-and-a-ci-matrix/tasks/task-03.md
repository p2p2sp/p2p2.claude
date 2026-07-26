
## Task 3 - ci: run the test suite on Linux, macOS and Windows with Node 24
- Covers: criteria #1, #8
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `.github/workflows/tests.yml`
- modify - `CLAUDE.md` (the `tests/` entry in "Repository layout (top level)")

### Test Commands
*Build*
- none

*Tests*
- `node --test "tests/**/*.test.ts"`

### Approach
1. Add `.github/workflows/tests.yml`: triggers `push` and `pull_request`, job `Tests` with
   `strategy.fail-fast: false`, `matrix.os: [ubuntu-latest, macos-latest, windows-latest]`,
   `runs-on: ${{ matrix.os }}`, `defaults.run.shell: bash` so the quoted glob is passed to Node
   unexpanded on every OS.
2. Steps: `actions/checkout@v6` with `fetch-depth: 0` (the `release.sh` and `collect_signals.sh` tests
   need real history), `actions/setup-node@v5` with `node-version: 24`, then a guard step
   `count=$(git ls-files 'tests/**/*.test.ts' | wc -l); [ "$count" -gt 0 ]`, then
   `run: node --test "tests/**/*.test.ts"`.
3. The guard step is mandatory, not defensive dressing: verified in this repo, a glob matching zero files
   makes `node --test` report 0 tests and exit 0, so a mistyped path would turn the whole matrix green
   while running nothing.
4. Do not touch `.github/workflows/release-version.yml`; the new workflow runs on GitHub-hosted runners,
   not the `self-hosted` runner that workflow pins.
5. In the `tests/` entry of `CLAUDE.md`, replace only the bare `` `node --test` `` command string with the
   verified whole-suite form `` `node --test "tests/**/*.test.ts"` `` and add that a bare directory
   argument does not work. Targeted string replacement, not a rewrite of the entry - Task 1 step 7 has
   already appended the harness-convention sentences to the same entry and they must survive.

### Edge cases
Windows checkout converting LF to CRLF - Task 2's line-ending invariant runs inside the matrix and is what
catches it. A shell other than bash on Windows would expand the glob before Node sees it, hence the pinned
`defaults.run.shell: bash`.

### Contracts
none

### DoD
The workflow file parses as valid YAML, names exactly the three OSes and Node 24, and running
`node --test "tests/**/*.test.ts"` locally reproduces the CI command verbatim.


### Covered criteria
1. `node --test "tests/**/*.test.ts"` runs the whole suite from the repo root and is green; that command is
   documented in root `CLAUDE.md`.
8. `.github/workflows/tests.yml` runs the suite on `ubuntu-latest`, `macos-latest` and `windows-latest` with
   Node 24, on push and pull_request; `.github/workflows/release-version.yml` is unchanged.
