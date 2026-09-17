---
paths:
  - "tests/**/*.ts"
  - "superdev/scripts/*.sh"
  - "superdev/hooks/scripts/*.sh"
  - "superdev/skills/*/scripts/*.sh"
  - "superfix/skills/code-auditor/scripts/*.sh"
  - "supergh/shared/scripts/*.sh"
  - "supergh/skills/*/scripts/*.sh"
  - "superui/skills/pro-designer/scripts/*.sh"
  - ".github/scripts/*.sh"
---

# Running the test suite

- Run the whole suite from the repo root exactly as CI does: `node --test --test-concurrency=8 "tests/**/*.test.ts"` (the command in `.github/workflows/ci.yml:36`). Measured: 59 s, 603 tests across 45 files, 600 pass / 3 skipped. The quoted `**` glob also picks up the root-level `tests/harness.test.ts` and `tests/portability.test.ts`.
- Default to a selective run while iterating and keep the full suite for the handover, not for every edit: one file is `node --test tests/superdev/read-config.test.ts` (16 tests, ~3.4 s) against ~59 s for everything.
- Select one plugin's subset with a QUOTED glob: `node --test "tests/superui/*.test.ts"` (16 tests). The quotes are mandatory - the shell must not expand the glob, `node --test` resolves it itself.
- NEVER pass a bare directory. `node --test tests/superui/` does not select the files inside it: Node resolves the argument as a module path and reports the failure as a failed test named `tests\superui`, so a wrong argument reads like a red suite rather than like a usage error.
- Select a single case with `--test-name-pattern`: `node --test --test-name-pattern "a commented-out" tests/superdev/read-config.test.ts` runs exactly 1 test. It combines with a glob: `node --test --test-concurrency=8 --test-name-pattern "fail-open" "tests/superdev/*.test.ts"` runs 24 tests across that directory.
- `--test-name-pattern` takes a JavaScript regular expression, not a literal string. Anchor it on a distinctive plain-word fragment of the test name instead of pasting the whole name, whose punctuation (`(`, `[`, `.`, `?`) is regex syntax.
- There are no suite names to filter on: `describe()` appears zero times in the 44 test files, so `--test-name-pattern` matches top-level `test()` names only.
- After editing a shipped script, run that script's own test file before anything else - `tests/` mirrors the plugin layout: `superdev/scripts/read-config.sh` is covered by `tests/superdev/read-config.test.ts`, `.github/scripts/release.sh` by `tests/github/release.test.ts`, `supergh/shared/scripts/preflight.sh` by `tests/supergh/preflight.test.ts`.
- There is no package.json, no npm script and no test-runner config anywhere in the repo. `node --test` runs the `.ts` files directly through Node's native TypeScript type stripping (Node v26 in use); do not add a runner, a build step or a lint step to make a test run.
