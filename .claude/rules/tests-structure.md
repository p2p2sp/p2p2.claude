---
paths:
  - "tests/**/*.test.ts"
---

# Test file structure

- Open every test file with a `/* ... */` header block naming the file, stating what it proves, and carrying any repo reality the reader needs. Every test file has one.
- Import the strict assert entry point and nothing else: `import { test } from "node:test"` and `import assert from "node:assert/strict"`. Every file does this; never plain `node:assert`.
- Write flat top-level `test()` calls. `describe()` is used zero times in the suite - do not introduce it.
- Carry the `.ts` extension on every relative import: `import { runScript } from "../harness/run.ts"` (every file). Node's type stripping resolves the real file, not an extensionless specifier.
- Resolve the script under test once, into a `const SUT`, from `import.meta.dirname`: `const SUT = path.resolve(import.meta.dirname, "../../viber/scripts/config.sh")` (26/33 files).
- Name a test as a full sentence stating the input and the resulting behavior, and put the reason in parentheses when the case exists to protect against a specific mistake: `test("a path that does not exist resolves to mode 'missing', never 'all' (a typo'd or stale path must not widen the commit to every change)")` in `tests/viber/commit-args.test.ts`.
- The cross-platform traps (compare printed paths with `slash()`, deny reads with `denyRead()` and never `chmod`, gate symlink cases on `canSymlinkDir()`) already live in `tests/CLAUDE.md`, which loads for the same files. Do not restate them here.
