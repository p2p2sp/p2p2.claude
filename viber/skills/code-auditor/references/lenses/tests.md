# Tests lens
Audits whether the tests would catch a real regression: code that runs under test but is never checked, assertions that pass whatever the code does, mocks that replace the behaviour under test, untested error paths and boundaries, flaky tests, and tests that are skipped or never run. A defect in the production code itself belongs to the bugs lens, an exploitable flaw to the security lens, a slow path to a performance lens, and test style or structure without a missed regression to the design lens.

## Hunts
### pseudo-tested
Critical code that tests execute but nothing checks: emptying a function body, returning the type's default or flipping one condition leaves every test green. The core angle, and a finding only when a mutant survives.

### hollow-assertions
Tests that pass whatever the code does: no assertion, `assert true`, `toBeDefined` or `toBeTruthy` on an always-set value, a snapshot standing in for logic, assertions only on mocks (`toHaveBeenCalled`) instead of outputs or state.

### over-mocking
The code under test mocked away, or a test repeating the implementation's call sequence: it breaks on a harmless refactor and survives a real behaviour change. A finding names the behaviour change that would pass.

### untested-error-paths
Catch blocks, error returns, validation rejections and off-by-one limits on a critical flow that no test reaches. The reachability probe tells a path no test reaches from one a test reaches without checking it.

### flaky-tests
Async waits, sleeps, the real clock, randomness, dependence on test order or shared state, the network, unordered collections. A finding needs a reproduced mixed result.

### dead-tests
`skip`, `only`, `todo` or `@Disabled` hiding a regression; a stray `.only` silently runs nothing else. A slow end-to-end test as the only cover for logic a unit test could pin.

## Excluded
- Coverage percentage on its own, and anything argued only from it.
- Generated, vendored, migration-snapshot and fixture code.
- Trivial getters, setters, DTOs and constants.
- Test style, naming, DAMP or DRY and readability.
- Arid code: logging, metrics and tracing, caching and memoization, sleeps, timeouts and deadlines, capacity hints, feature-flag plumbing.
- Gaps in unreachable, dead or non-critical code.
- A gap already closed by a test at a higher layer: the mutant is killed there.
- Golden-file tests whose snapshot is the deliberate contract, such as CLI output.
- Slow tests that are not also flaky.

## Verify
Worktree: required

The oracle is a surviving mutant for a coverage or assertion finding and a reproduced failure for a flakiness finding. Apply each mutant inside the clean checkout, run the test, and restore the line before the next mutant.

Mutation procedure:
1. Run the target test unchanged; it must pass. A failing baseline goes to the flake procedure, or INCONCLUSIVE.
2. Reachability probe: replace the cited line with a throw or panic and run again. The test still passes: it never reaches the line, VERIFIED as a coverage gap. It fails: continue.
3. One mutant per line, in this order: extreme mutation (empty body, or the type's default), relational operator flip or boundary move, `&&` and `||` swapped, statement or call deleted, arithmetic change last.
4. Equivalence check before running: skip arid nodes and equivalent forms (`size() == 0` to `<= 0`, null-check rewrites, cache removal, float literals), and write one sentence on the observable behaviour the mutant changes. Not writable: the mutant is equivalent, REFUTED.
5. Run only the affected test, with the single-test command of the run file's `## Conventions`, else `node --test FILE`, `npx jest FILE -t NAME`, `npx vitest run FILE`, `pytest FILE::NAME`, `go test -run NAME ./pkg` or `cargo test NAME`.

Flake procedure:
1. Run the test 20 times unchanged; any mixed result is VERIFIED.
2. Shuffle the order only with `jest --randomize --seed <S>` (Jest 29.2 or newer), `vitest --sequence.shuffle.tests`, `pytest -p randomly --randomly-seed=<S>` and `go test -run <NAME> -shuffle=on -count=20` (Go 1.17 or newer). For `node:test`, rely on repeated runs alone.
3. Run it alone and inside the whole suite; a different result is order dependence, VERIFIED.

Verdicts:
- VERIFIED: the mutant survives, the throw probe passes, or the flake reproduces.
- PARTIALLY VERIFIED: the mutant survives the cited test but the full suite kills it (wrong layer or misattributed test).
- REFUTED: the cited test kills the mutant, or another test the hunter missed does, or the mutant is equivalent.
- INCONCLUSIVE: the test needs a database, external service, credentials, Docker or a GPU, or runs only in CI; the baseline fails in the worktree; the build exceeds the time budget; no mutant compiles; judging the mutant needs domain knowledge; a flake does not reproduce within 20 runs, which is not proof of absence.

## Severity
Set by how critical the behaviour escaping the tests is, not by the kind of smell.
- 9-10: a mutant survives or a flake hides in auth, security, money, data loss, migrations or concurrency safety; a stray `.only` or skip disables a critical suite.
- 7-8: a mutant survives in core business logic that would cause user-facing errors; a flaky test gates merges on the main branch.
- 5-6: an untested error path or boundary with limited impact; a skip hides a known regression in non-critical code.
- 1-4: over-mocking, a change-detector test or a misplaced layer with no surviving mutant, and other smells. A finding with no surviving mutant and no reproduced flake scores at most 4.
