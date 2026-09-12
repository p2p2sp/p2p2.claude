# Task 6 notes

Failure mode 2 (target with no `CLAUDE.md` and no `.claude/rules/`) is written in two places instead of one: the Glob fallback for build/test entry points sits in `## Method` step 1, and the "say so in `## Contract shape`" obligation sits in `## Hard rules` (never-invent-history bullet) - keeping the derivation rule next to the rule it is an exception to reads better than a fourth Method branch.
UNDERSPECIFIED: the profiler's success return line - the task pinned only the Write-failure branch (return the profile text). Decided: one line `profile written: <output path>` on success, so Task 7's Phase 0 gate reads the path from the message and still checks the file itself.
