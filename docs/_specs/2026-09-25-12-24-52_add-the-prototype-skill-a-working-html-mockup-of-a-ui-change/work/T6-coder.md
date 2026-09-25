# T6 coder notes

- Added `ghOnCorePath` constant check immediately after SUT definition, identical to the guard pattern in post-comment.test.ts, issue-facts.test.ts, and create-issue.test.ts.
- Wrapped the "templates exist but gh is not on PATH" test with `{ skip: ... }` option that skips the case with a reason when `coreUtilsPath()` contains a real `gh` or `gh.exe`, matching the contract from DoD.1.
- Test now passes on CI runners like ubuntu-latest where `gh` sits in the core utilities directory, and still runs as today on machines without such a `gh`.
