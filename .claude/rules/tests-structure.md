---
paths:
  - "tests/**/*.test.ts"
---

# Test file structure

- Open every test file with a `/* ... */` header block naming the file, stating what it proves, and carrying any repo reality the reader needs. Every test file has one.
- Import `test` from the harness and the strict assert entry point: `import { test } from "../harness/test.ts"` (never `node:test` directly - the harness one runs a file's cases concurrently) and `import assert from "node:assert/strict"`, never plain `node:assert`.
- Write flat top-level `test()` calls, all registered synchronously at load (no top-level `await`). `describe()` is used zero times in the suite - do not introduce it.
- Cases run concurrently within a file: a case shares no mutable state with another (each builds its own `withTempDir`/`withGitRepo` fixture), and every harness call is awaited - `runScript`, `repo.git`, `withTempDir`, `withGitRepo`, `withStub` and `forEachShell` all return a Promise. A callback parameter a helper forwards or calls is typed `() => void | Promise<void>` and awaited: a bare `=> void` type accepts an async function silently and drops its promise.
- Carry the `.ts` extension on every relative import: `import { runScript } from "../harness/run.ts"` (every file). Node's type stripping resolves the real file, not an extensionless specifier.
- Resolve the script under test once, into a `const SUT`, from `import.meta.dirname`: `const SUT = path.resolve(import.meta.dirname, "../../viber/scripts/config.sh")` (26/33 files).
- Name a test as a full sentence stating the input and the resulting behavior, and put the reason in parentheses when the case exists to protect against a specific mistake: `test("a path that does not exist resolves to mode 'missing', never 'all' (a typo'd or stale path must not widen the commit to every change)")` in `tests/viber/commit-args.test.ts`.
- The cross-platform traps (compare printed paths with `slash()`, deny reads with `denyRead()` and never `chmod`, gate symlink cases on `canSymlinkDir()`) already live in `tests/CLAUDE.md`, which loads for the same files. Do not restate them here.
- When a case stages `gh`'s ABSENCE by dropping PATH to `coreUtilsPath()`, first check whether a real `gh`/`gh.exe` already sits on one of those directories (it does on `ubuntu-latest`) and skip that case with a reason instead of asserting on it, rather than let it fail on a runner where the absence can't be staged: `const ghOnCorePath = coreUtilsPath().split(path.delimiter).some((dir) => ["gh", "gh.exe"].some((n) => fs.existsSync(path.join(dir, n))))`, then `{ skip: ghOnCorePath ? "a real gh sits in the core utilities directory, so its absence cannot be staged" : false }` (`tests/viber/issue-templates.test.ts:34-36,141`; the same guard runs in `post-comment.test.ts`, `issue-facts.test.ts`, `create-issue.test.ts` and `bootstrap.test.ts`).
