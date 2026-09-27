# Review T1 - round 1

## Blocking

1. `.claude/viber.yml:45` - `issues: true` flipped to `issues: false`. This is on the task's `extra` list, so it counts as T1's work, but nothing in T1 needs it: the task only adds the redundant-dependency rule to `viber/scripts/plan-index.sh` and its tests, and neither the script nor `tests/viber/plan-index.test.ts` reads this repo's `.claude/viber.yml`. The edit goes further than the smallest change the task forces. Fix: take the change out of T1's work. Revert the line to `issues: true`, or, if the user made the edit on purpose, leave it out of T1's commit and let it land separately.

## Checked and holding

- Verification: `node --test tests/viber/plan-index.test.ts` gave 71 passed, 0 failed, 1 skipped. The skip was already there before this task. The four new tests pass.
- DoD.1: `plan-index.sh` lines 515-528 do the check, and the test "a Depends-on entry another entry of the same line already reaches directly exits 4" covers it.
- DoD.2: the `anc` closure (transitive) holds it, and the test "... reaches only transitively exits 4" covers it.
- DoD.3: the `mode != "--split"` guard holds it, and the test "a redundant Depends-on entry validates under --split" covers it.
- DoD.4: the test "two Depends-on entries with no path between them ... validate" covers it.
- C1: the message text matches the contract exactly. Tests check exit 4 and an empty stdout.
- Header: the exit-4 list now names the new case among the ones `--split` exempts ("The last three cases").
