## Runs
- git ls-files -s superdev/scripts/commit-task.sh superdev/scripts/decompose.sh superdev/scripts/cleanup-run.sh superdev/scripts/stats-record.sh superdev/scripts/stats-report.sh superdev/scripts/checkpoint-update.sh superdev/scripts/record-decision.sh superdev/scripts/vibe-guard.sh | grep -c '^100755' -> 8
- node --test tests/portability.test.ts -> tests 21, pass 21, fail 0
- node --test tests/superdev/commit-task.test.ts -> tests 20, pass 20, fail 0
- node --test tests/superdev/decompose.test.ts -> tests 35, pass 35, fail 0

Approach step 1: the exec-bit change on commit-task.sh, decompose.sh and cleanup-run.sh (`git update-index --chmod=+x`) was already staged in the index when this dispatch started - `git ls-files -s` showed all eight scripts at `100755` before any edit, content unchanged (`git diff --cached` showed a mode-only diff, 0 insertions/deletions). No further chmod call was needed; verified with the first Task Checks line before touching the test files.
no deviations
