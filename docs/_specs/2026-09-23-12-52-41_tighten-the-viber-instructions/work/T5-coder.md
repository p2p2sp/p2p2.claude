Prior attempt made no edits (Edit/Write were disabled mid-session); started clean, all three files were still at their pre-task text.

qa-writer's language rule was already a single sentence; I only reworded it to name "the specification's own language" directly (was two clauses phrased as "the language the user is conversing in, which is...") and trimmed one rationale clause elsewhere to clear the 2800-char ceiling by 5 bytes.

closeup needed ~350 bytes of prose cut (idempotency rationale, the "why the archive commit matters" clause, the qa-writer mention, and the D<n> anchor rationale) to land at 2765/2800 after removing the qa-writer sentence and dropping effort to medium.

test-runner's failure output now has two bullets (build-failed vs. test-failed) sharing the same three output sub-lines (VERDICT/REPORT/FAILED), since DoD.5 froze the pre-existing sub-lines and only allowed the runner's new build case.

closeup.md carries a pre-existing lint WARN (possible italics with *...*) from the unrelated `*-coder.md` glob on line 16 - untouched, not mine, and DoD.8 only requires FAIL=0.

Review round 1 (Critical): the build-failed bullet named no return lines, leaving DoD.1's `VERDICT: FAIL`/`REPORT`/`FAILED` undefined for a build failure. Merged the build-failed and per-test-failure bullets into one, sharing the same three sub-lines, with `FAILED: 0` for the build case - kept within the 1900-char ceiling (1855/1900).
