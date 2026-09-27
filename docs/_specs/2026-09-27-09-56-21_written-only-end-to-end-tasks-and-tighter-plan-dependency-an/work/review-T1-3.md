# Review T1 - round 3

## Blocking

1. `.claude/viber.yml:45` - nothing has changed since rounds 1 and 2. `issues: true` is still flipped to `issues: false`, and the file is still on T1's `extra` line, so it counts as T1's work and T1's commit would stage it. T1 does not need this change: neither `viber/scripts/plan-index.sh` nor `tests/viber/plan-index.test.ts` reads this repo's `.claude/viber.yml`, so the edit is wider than the smallest one the task forces. The coder's note (T1-coder.md line 3) says the file stays out of T1's commit, but the `extra` line contradicts it. Fix: whoever builds the gate input must take `.claude/viber.yml` off T1's `extra` line so the commit stages only the two `Files`, and the user commits the flip separately. Do not revert the line: the user's recent "issues off by default" commit (0d230ddb) points to a deliberate edit. The coder's code cannot close this finding, so resubmitting with the same `extra` line will fail again.

## Checked and holding

- Verification: `node --test tests/viber/plan-index.test.ts` ran 72 tests: 71 pass, 0 fail, 1 skipped. That skip was already there before this task.
- DoD.1: the new check in `viber/scripts/plan-index.sh` (just after the `anc` closure) catches it, and the test "a Depends-on entry another entry of the same line already reaches directly exits 4" covers it.
- DoD.2: the transitive `anc` closure catches it, and the test "... reaches only transitively exits 4" covers it.
- DoD.3: the `mode != "--split"` guard handles it, and the test "a redundant Depends-on entry validates under --split" covers it.
- DoD.4: the `t != k` / `anc` condition handles it, and the test "two Depends-on entries with no path between them ... validate" covers it.
- C1: the message text matches the contract exactly, and the tests assert both exit 4 and an empty stdout.
- Header: the exit-4 list now names the new case among the cases `--split` exempts.
- test-strategy.md: none of the new tests breaks a `(blocking)` rule.
