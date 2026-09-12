UNDERSPECIFIED: order of --scope validation vs the unborn-HEAD check - the task pinned "normalise after cd "$ROOT"" but not where validation sits relative to the exit-1 unborn-HEAD guard; decided validation runs first, so an invalid --scope always exits 2 with exactly one stderr line regardless of repo state (and the test can assert a single stderr line).
UNDERSPECIFIED: which value the `scope: <dir> (<N> files)` stderr line prints - decided the NORMALISED scope (`./src/` reports `scope: src`), so the line always names the subtree actually matched.
UNDERSPECIFIED: rejection pattern for a `..` segment and for an absolute path - decided the shell case patterns `/* | [A-Za-z]:* | .. | ../* | */../* | */..` applied to the normalised value, so `..foo` (not a `..` segment) stays a legal scope.
Approach step 2 strips a leading `./` repeatedly rather than once (`././src` normalises to `src`), a strict superset of the step's single strip - a partially normalised value would silently match nothing.
Approach step 6 case (c) asserts all six record fields equal between the scoped and unscoped run (not only dependents/churn/fix_commits) - the contract is "the record is identical", and path/recency_days/loc cost nothing extra to compare.
C1: fixed
touched: superfix/skills/code-auditor/scripts/collect_signals.sh
touched: tests/superfix/collect_signals.test.ts
Beyond the raw absolute-path check the finding asked for, the absolute patterns are kept in the post-normalisation case too: a raw value like `.//foo` normalises to `/foo`, which the raw check never sees, so dropping them there would reopen the same hole by another route.
UNDERSPECIFIED: which value the rejection message names for an absolute scope - decided the RAW value (`--scope /` prints `: /`), because normalisation can erase it to the empty string; a `..` rejection still names the normalised value, as recorded in the earlier round.
Removed the stray second blank line after the `sweep extensions:` printf that the report's Notes flagged - it was drift from this task's own diff, inside the task's Files, not a separate change.
