# Final review - slice 1 (T1, T2)

## Blocking

None.

## Minor

1. `tests/viber/commit-task.test.ts:2107-2108` - stale comment. It says "Staging a long list spawns several git processes per path, so each long-list case outlasts the harness default until staging is batched." That stopped being true once T2 landed: `stage_paths` in `viber/scripts/commit-task.sh:313` stages the list in a number of git processes that grows by chunk, and the T2 cases at the end of the same test file assert that count. Fix: say why `LONG_LIST_TIMEOUT` still exists (a 260-path repository seed and run stays slow on Windows), or drop the per-case timeout if the harness default is now enough, and remove the "until staging is batched" wording.
