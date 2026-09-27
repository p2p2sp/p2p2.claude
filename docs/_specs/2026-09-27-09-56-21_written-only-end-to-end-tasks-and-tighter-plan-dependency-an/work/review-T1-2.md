# Review T1 - round 2

## Blocking

1. `.claude/viber.yml:45` - `issues: true` is still flipped to `issues: false`, and the file is still on this task's `extra` list, so T1's commit would include it. Nothing in T1 needs this change. `viber/scripts/plan-index.sh` and `tests/viber/plan-index.test.ts` never read this repo's `.claude/viber.yml`. The change is wider than the smallest edit the task forces. The coder's note says the user made this edit and that it is kept out of T1's commit. The `extra` line contradicts that note, because it hands the file to T1's commit. Fix: take `.claude/viber.yml` off T1's `extra` list so the commit stages only `viber/scripts/plan-index.sh` and `tests/viber/plan-index.test.ts`, and let the user commit the flip separately. Do not revert the line without the user's consent: the evidence (commit 0d230ddb, "issues off by default") points to the user making the edit on purpose.

## Checked and holding

- Verification: `node --test tests/viber/plan-index.test.ts` gave 72 tests, 71 passed, 0 failed, 1 skipped. The skip was already there before this task.
- DoD.1: `plan-index.sh` lines 515-528 (the check that skips under `mode != "--split"` and reads the `anc` closure) implement it. The test "a Depends-on entry another entry of the same line already reaches directly exits 4" covers it.
- DoD.2: the transitive `anc` closure implements it. The test "... reaches only transitively exits 4" covers it.
- DoD.3: the `--split` guard implements it. The test "a redundant Depends-on entry validates under --split" covers it.
- DoD.4: the `t != k` / `anc` condition implements it. The test "two Depends-on entries with no path between them ... validate" covers it.
- C1: the message text matches the contract exactly. Exit 4 and an empty stdout are both asserted.
- Header: the exit-4 list names the new case among those `--split` exempts.
