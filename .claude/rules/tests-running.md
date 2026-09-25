---
paths:
  - "tests/**/*.ts"
  - "superfix/skills/code-auditor/scripts/*.sh"
  - "supercc/skills/*/scripts/*.sh"
  - "superui/skills/pro-designer/scripts/*.sh"
  - "viber/scripts/*.sh"
  - "viber/hooks/scripts/*.sh"
  - "viber/skills/*/scripts/*.sh"
  - ".github/scripts/*.sh"
---

# Running the test suite

- Run the whole suite from the repo root exactly as CI does: `node --test --test-concurrency=8 "tests/**/*.test.ts"` (the command in `.github/workflows/ci.yml:36`). The suite has 36 test files. The quoted `**` glob also picks up the root-level `tests/harness.test.ts`, `tests/portability.test.ts` and `tests/orphan-tags.test.ts`.
- Default to a selective run while iterating and keep the full suite for the handover, not for every edit: one file is `node --test tests/viber/config.test.ts` against minutes for everything.
- Select one plugin's subset with a QUOTED glob: `node --test "tests/superui/*.test.ts"` (16 tests), `node --test --test-concurrency=8 "tests/viber/*.test.ts"` (608 tests across 22 files, 607 pass plus 1 pre-existing skip). The quotes are mandatory - the shell must not expand the glob, `node --test` resolves it itself.
- NEVER pass a bare directory. `node --test tests/superui/` does not select the files inside it: Node resolves the argument as a module path and reports the failure as a failed test named `tests\superui`, so a wrong argument reads like a red suite rather than like a usage error.
- Select a single case with `--test-name-pattern`: `node --test --test-name-pattern "a commented-out" tests/viber/config.test.ts` runs exactly 1 test. It combines with a glob: `node --test --test-concurrency=8 --test-name-pattern "fail-open" "tests/viber/*.test.ts"`.
- `--test-name-pattern` takes a JavaScript regular expression, not a literal string. Anchor it on a distinctive plain-word fragment of the test name instead of pasting the whole name, whose punctuation (`(`, `[`, `.`, `?`) is regex syntax.
- There are no suite names to filter on: `describe()` appears zero times in the test files, so `--test-name-pattern` matches top-level `test()` names only.
- After editing a shipped script, run that script's own test file before anything else - `tests/` mirrors the plugin layout: `viber/scripts/config.sh` is covered by `tests/viber/config.test.ts`, `.github/scripts/release.sh` by `tests/github/release.test.ts`, `viber/skills/commit/scripts/commit.sh` by `tests/viber/commit.test.ts`. The mirror flattens a plugin's subdirectories: viber's `scripts/`, `hooks/scripts/` and every `skills/<name>/scripts/` all land in `tests/viber/` under the script's own basename (`viber/hooks/scripts/plan-gate.sh` -> `tests/viber/plan-gate.test.ts`). `supercc/skills/skill-designer/scripts/lint_skill.sh` has no test file at all.
- There is no package.json, no npm script and no test-runner config anywhere in the repo. `node --test` runs the `.ts` files directly through Node's native TypeScript type stripping (Node v26 in use); do not add a runner, a build step or a lint step to make a test run.
