# docs/archive/superdev/tests - superdev's old regression tests, kept unrunnable

Holds the 23 `*.test.ts` files that once covered superdev's bundled scripts and hooks, one file per script or hook (`decompose.test.ts`, `review-plan.test.ts`, `session-start.test.ts`, ...). They are a record of what each superdev script promised, not a suite: nothing runs them and they do not run as they sit.

## Relationships

- Each file locates its script under test as `path.resolve(import.meta.dirname, "../../superdev/<path>")`. The files were written for `tests/superdev/`, but from this directory that path still lands on `docs/archive/superdev/<path>`, so the script paths resolve.
- Each file imports its helpers from `../harness/*.ts` (`runScript`, `withTempDir`, `withGitRepo`, `withStub`, `coreUtilsPath`, `forEachShell`, `canSymlinkDir`, `slash`). From here that is `docs/archive/superdev/harness/`, which does not exist, so every file fails at import. The same helpers are exported today by `tests/harness/`.

## Traps

- The header comment in each file gives `node --test tests/superdev/<file>.test.ts`. That path does not exist, and CI's `tests/**/*.test.ts` glob and file count never reach `docs/`.
- The headers name the bash `*.test.sh` runners these files replaced (`bootstrap.test.sh`, `read-config.test.sh`, `review-plan.test.sh`). None of those runners remains.
- `session-start.test.ts` builds a fake plugin root in a temp dir, with its own `hooks/content/manifest.md`, to prove the hook never injects it. The archived plugin itself has no `hooks/content/`.
