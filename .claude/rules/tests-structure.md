---
paths:
  - "tests/**/*.test.ts"
---

# Test file structure

- Open every test file with a `/* ... */` header block naming the file, stating what it proves, and carrying any repo reality the reader needs. All 44 test files have one; `tests/superdev/read-config.test.ts:1-10` states "no build, no lint, no npm, no package.json" plus the exact command that runs it.
- Import the strict assert entry point and nothing else: `import { test } from "node:test"` and `import assert from "node:assert/strict"`. 44/44 files do this; never plain `node:assert`.
- Write flat top-level `test()` calls. `describe()` is used zero times in the suite - do not introduce it.
- Carry the `.ts` extension on every relative import: `import { runScript } from "../harness/run.ts"` (40/44 files). Node's type stripping resolves the real file, not an extensionless specifier.
- Resolve the script under test once, into a `const SUT`, from `import.meta.dirname`: `const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/read-config.sh")` (33/44 files).
- Name a test as a full sentence stating the input and the resulting behavior, and put the reason in parentheses when the case exists to protect against a specific mistake: `test("a path that does not exist falls back to mode 'all' (avoids a silent no-op commit against a typo'd path)")` in `tests/supergh/commit-args.test.ts`.
- The cross-platform traps (compare printed paths with `slash()`, deny reads with `denyRead()` and never `chmod`, gate symlink cases on `canSymlinkDir()`) already live in `tests/CLAUDE.md`, which loads for the same files. Do not restate them here.
