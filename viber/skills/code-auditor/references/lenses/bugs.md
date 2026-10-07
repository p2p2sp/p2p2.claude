# Bugs lens
Audits correctness: wrong results, lost failures, crashes, leaked resources and races, producers and consumers that disagree, and variants of mistakes already fixed once. An exploitable flaw belongs to the security lens, a slow path to the runtime performance or web performance lens, a weak or missing test to the tests lens, and structure or duplication without a wrong behaviour to the design lens.

## Hunts
### wrong-result
Off-by-one, inverted or short-circuited conditions, wrong operator or precedence, integer and float edge cases, empty input, unicode, timezone and encoding mistakes, state mutated by a caller. A finding only with a concrete input that produces a wrong output.

### silent-failure
Empty or broad catch blocks, errors logged then ignored, fallbacks or defaults that hide a failure, ignored return codes and exit statuses, `?.` or `|| default` chains that skip required work, missing `set -e` or `pipefail` in scripts. Report the failure that gets lost, not the pattern alone.

### crash-path
Null or undefined dereferences, unchecked indexing, recursion that never ends, `default` branches assumed unreachable that a real input reaches, partial writes when the process is killed.

### concurrency-resources
Check-then-act on files or state, shared mutable state across async boundaries, a missing `await`, file handles, processes, temp directories or listeners not released on the error path.

### contract-mismatch
A producer and a consumer each correct alone but disagreeing: a config key written versus read, JSON field names or nesting, a route versus its caller, a file format or delimiter, enum values, the meaning of an exit code, an env var name, a path relative to a different working directory. Read both sides and quote both lines.

### past-fix-variant
For each recent bug-fix commit, find the root cause and search for the same mistake elsewhere. Widen one element at a time, and stop once more than half the matches are noise.

## Excluded
- Pre-existing issues outside the diff, when the scope is a diff (a variant-wave hunt excepted).
- Style, naming, formatting, missing comments or docs, and anything a linter, type checker or compiler in the repository already reports.
- General quality or refactor advice, "could be cleaner".
- Speculative issues with no concrete triggering input, or needing a precondition the code rules out (validated upstream, enforced by a type, an unreachable caller). Trace the callers before filing.
- Violations silenced on purpose: a suppression comment, or a reason documented in a `CLAUDE.md`.
- Missing input validation on trusted, internal-only inputs.
- An empty catch whose skipped work is optional and documented as best-effort.
- Theoretical races with no shared state.

## Verify
Worktree: required

1. Read the cited lines and trace every caller and the guards between. A precondition that makes the trigger unreachable: REFUTED, quoting the guard.
2. Prove it in the clean worktree with the strongest oracle available: (a) a minimal failing test in the repository's own framework asserting the correct behaviour; (b) a command that exits non-zero, crashes or prints the wrong value; (c) a resource count that grows across runs (handles, temp directories, processes); (d) for a contract mismatch, an artifact the producer writes fed to the consumer that misbehaves, or both quoted lines plus one input showing the disagreement.
3. For a race, force the interleaving with an injected delay or barrier in the worktree. Never rely on timing luck.

Verdicts:
- VERIFIED: the oracle fails as predicted and the implied fix makes it pass.
- PARTIALLY VERIFIED: the bug is real but narrower than claimed; state the corrected scope.
- REFUTED: a guard or precondition is shown, or the oracle passes on the input of the claim's `## Reproduce`.
- INCONCLUSIVE: the proof needs a live external service, an unavailable OS or toolchain, a harness that will not run, or a race that cannot be forced.

Never upgrade a verdict on reasoning alone.

## Severity
- 9-10: data loss or corruption, or a silently wrong result on a main path.
- 7-8: a crash or wrong result on a common reachable path, or a contract mismatch breaking a feature end to end.
- 4-6: wrong behaviour only on edge-case input, a leak only under sustained use, a mishandled error with a visible but recoverable symptom.
- 1-3: lost error context or diagnostics only, or a race with no observed harm.
