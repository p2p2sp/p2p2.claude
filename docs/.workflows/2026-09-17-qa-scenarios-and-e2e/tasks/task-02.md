
## Task 2 - Report Playwright tooling in setup
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Narzędzia raportowane przez setup` (#3), `Testy skryptów zielone` (#16)

### Dependencies
- `Add the qa, e2e-ui and e2e-api config switches` (Task 1) - blocks: the `bootstrap.test.ts` expected stdout this task extends already carries the nine-key defaults line

### Files
- add - superdev/scripts/check-playwright.sh
- add - tests/superdev/check-playwright.test.ts
- modify - superdev/skills/setup/scripts/bootstrap.sh (call of `check-playwright.sh` after the config block, header comment)
- modify - tests/superdev/bootstrap.test.ts (`seed-when-absent` and `idempotence` expected stdout)
- modify - superdev/skills/setup/SKILL.md (`## Bootstrap` description, `## Output` block)

### Task Checks
- tests/superdev/check-playwright.test.ts - node --test tests/superdev/check-playwright.test.ts
- tests/superdev/bootstrap.test.ts - node --test tests/superdev/bootstrap.test.ts

### Approach
1. Write `check-playwright.sh` (shebang `#!/usr/bin/env bash`, `set -u`, exit 0 always, header comment with the contract) and give it the exec bit in the index with `git update-index --chmod=+x superdev/scripts/check-playwright.sh` (the preload of Task 7 invokes it directly): resolve `root` as `git rev-parse --show-toplevel` falling back to the cwd; with `command -v playwright-cli` succeeding print `playwright-cli: found <first line of playwright-cli --version>`; with `command -v` failing print `playwright-cli: not found`; then print `@playwright/test: found` when `<root>/package.json` exists and `grep -q '"@playwright/test"'` matches, else `@playwright/test: not found`. argv none.
2. In `bootstrap.sh`, after the `superdev.yml` block, run `"${skill_dir}/../../scripts/check-playwright.sh"` and pass its stdout through; extend the header comment's stdout contract with the two new line shapes.
3. Write `check-playwright.test.ts` on the shared harness (`runScript`, `withTempDir`, `withStub` from `tests/harness/stub.ts`). PATH isolation, because `stubDirs` only prepends to the real PATH and a host with a global `playwright-cli` would flip the not-found cases: every case passes `opts.env.PATH` set to the one directory that resolves `grep` on the current PATH (scan `process.env.PATH` entries for `grep` or `grep.exe`), so only core utilities resolve; the found case additionally prepends a `withStub` dir via `stubDirs` whose `playwright-cli` prints `1.2.3` on `--version`. Cases: not found; found with version; found with `--version` exiting 1 (`found (version unknown)`); `@playwright/test: found` with a fixture `package.json` naming it under `devDependencies`; `not found` without a `package.json`; stdout compared as exact strings.
4. In `bootstrap.test.ts`, extend the exact expected stdout of `seed-when-absent` and `idempotence` with the two tooling lines (`playwright-cli: not found`, `@playwright/test: not found`) and run those two cases with the same `opts.env.PATH` isolation as step 3.
5. In `setup/SKILL.md`, describe the two tooling lines in `## Bootstrap` and add them to the `## Output` message shape; state that setup installs nothing.

### Failure modes
- when `playwright-cli --version` fails or prints nothing -> response `playwright-cli: found (version unknown)`, log nothing, test check-playwright.test.ts (stub exiting 1 on `--version`)
- when `./package.json` is unreadable -> response `@playwright/test: not found`, log nothing, test check-playwright.test.ts (no package.json case)

### Contracts
- `check-playwright.sh` stdout: exactly two lines, `playwright-cli: found <version> | found (version unknown) | not found` and `@playwright/test: found | not found`, exit 0 - consumed by `Add the e2e skill` (Task 7)

### DoD
Both test files pass; `/superdev:setup` output ends with the two tooling lines; no install command exists in either script.


### Covered criteria
3. Narzędzia raportowane przez setup - Wynik `setup` zawiera jedną linię o dostępności `playwright-cli` i jedną o `@playwright/test` w repo hosta, a setup niczego nie instaluje.
16. Testy skryptów zielone - Zestaw testów skryptów z repo root przechodzi z trzema nowymi kluczami i nowymi liniami raportu setup.
