# Bugs lens
Audits correctness: wrong results, lost failures, crashes and hangs, races and inconsistent state, producers and consumers that disagree, and variants of mistakes already fixed once. A crash, hang or handle, lock, port or process exhaustion any input triggers stays here, attacker input included; any other exploitable flaw belongs to the security lens, memory growth and missing timeouts to the runtime performance lens, a slow path to the runtime performance or web performance lens, a weak or missing test to the tests lens, and structure or duplication without a wrong behaviour to the design lens.

## Hunts
### wrong-result
Off-by-one, inverted or short-circuited conditions, wrong operator or precedence, integer overflow, float or rounding error on money, a unit or scale mixed up (ms and s, cents and units), reference versus value equality, NaN, a sort without a comparator, empty input, unicode and encoding, timezone, DST and calendar mistakes, a closure capturing a loop variable or stale state, state shared through an alias, a mutable default or a shallow copy. A finding only with a concrete input that produces a wrong output.

### silent-failure
Empty, log-only or TODO catch blocks, a catch broad enough to turn a recoverable error into an abort or the wrong branch, a `finally` that returns over the error, fallbacks or defaults that hide a failure, ignored return codes, exit statuses and promise rejections, success reported after a partial failure (exit 0, HTTP 2xx, `ok: true`), `?.` or `|| default` chains that skip required work, missing `set -e` or `pipefail` in scripts. Report the failure that gets lost, not the pattern alone.

### crash-hang
Null or undefined dereferences, unchecked indexing, casts, type assertions and `unwrap` or `!`, parsing that throws on a real input, division by zero, recursion or loops that never end, a wait or lock that never returns, `default` branches assumed unreachable that a real input reaches, handles, processes, temp directories, locks, listeners or timers not released on the error path or on unmount.

### race-state
Check-then-act on files, rows or state; a read-modify-write that loses an update; an order that holds only by timing (a use before an async init completes); a missing `await`, or a promise, task or goroutine never awaited, stored or joined; a lock held across `await` or taken in inconsistent order; a retry or redelivery that repeats a non-idempotent side effect; a multi-step write an error or kill leaves half done; a cache or derived copy not invalidated when its source changes; a state transition allowed from the wrong state.

### contract-mismatch
A producer and a consumer each correct alone but disagreeing: a config key written versus read, JSON field names or nesting, a route versus its caller, a file format or delimiter, enum values, the meaning of an exit code, an env var name, a path relative to a different working directory. Also data an earlier version persisted read by the current one (a migration versus its model), units or time zone across the boundary, and a library call used against its documented semantics (a dropped result of a non-mutating call, a `replace` that changes only the first match, swapped arguments). Read both sides and quote both lines.

### past-fix-variant
For each recent bug-fix commit, find the root cause, check the fix covers every path that reaches it, and search for the same mistake elsewhere. Widen one element at a time, and stop once more than half the matches are noise.

## Excluded
- Pre-existing issues outside the diff, when the scope is a diff (a variant-wave hunt excepted).
- Style, naming, formatting, missing comments or docs, general quality or refactor advice ("could be cleaner"), and anything a linter, type checker or compiler in the repository already reports.
- Speculative issues with no concrete triggering input, or needing a precondition the code rules out (validated upstream, enforced by a type the runtime checks, an unreachable caller; a cast or unvalidated parse rules nothing out). Trace the callers before filing. A race needs shared state, and files, database rows and external services are shared state.
- Violations silenced on purpose: a suppression comment, or a reason documented in a `CLAUDE.md`.
- Missing input validation on trusted, internal-only inputs; a config file, CLI argument or environment variable a user edits is not internal.
- An empty catch whose skipped work is optional and documented as best-effort.

## Verify
Worktree: required

1. Read the cited lines and trace every caller and the guards between. A precondition that makes the trigger unreachable: REFUTED, quoting the guard. A claim that falls under `## Excluded`: REFUTED, naming the bullet.
2. The expected behaviour comes from outside the code under test: a spec, doc or docstring, a test, the other side of a contract, or a self-evident symptom (crash, hang, data loss, an error escaping). Name, docs, tests and callers all agreeing with the current behaviour: REFUTED as intended; nothing stating the intent: INCONCLUSIVE, naming the missing spec. Then prove it in the clean worktree with the strongest oracle available: (a) a minimal failing test in the repository's own framework asserting the correct behaviour, calling the unmodified production entry point and failing on its assertion (not on an import, fixture or setup error) before the fix and passing after it; (b) a command that exits non-zero, crashes or prints the wrong value; (c) a resource count that grows across runs (handles, temp directories, processes); (d) for a contract mismatch, an artifact the producer writes fed to the consumer that misbehaves, or both quoted lines plus one input showing the disagreement.
3. For a race, force the interleaving with an injected delay or barrier, or a deferred promise or channel the test resolves in the bad order, in the worktree. Never rely on timing luck.

Verdicts:
- VERIFIED: the oracle fails as predicted and the implied fix makes it pass.
- PARTIALLY VERIFIED: the bug is real but narrower than claimed; state the corrected scope.
- REFUTED: a guard or precondition is shown, the claim falls under `## Excluded`, or the oracle passes on the input of the claim's `## Reproduce`.
- INCONCLUSIVE: the proof needs a live external service, an unavailable OS or toolchain, a harness that will not run, a race that cannot be forced, or no source states the intended behaviour.

Never upgrade a verdict on reasoning alone.

## Severity
- 9-10: data loss or corruption on any reachable path, or a silently wrong result on a main path.
- 7-8: a crash, hang or wrong result on a common reachable path, or a contract mismatch breaking a feature end to end.
- 4-6: wrong behaviour only on edge-case input, a leak only under sustained use, a mishandled error with a visible but recoverable symptom.
- 1-3: lost error context or diagnostics only, or a wrong value only in output nobody consumes (a log line, a debug view).
