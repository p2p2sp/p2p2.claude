The bug: `pair_raw`'s awk had a "weak" fallback that, for an id-bearing dispatch, remembered
the FIRST verdict line lacking the dispatch's own id (a sibling/foreign one) and used it as the
answer if no matching-id verdict ever appeared. That let a foreign `VERDICT: PASS` stand in for
an own review still in flight. Fix: drop the `weak`/`weak_call`/`weak_verdict` state entirely -
a verdict line missing the dispatch's own id is now simply skipped (`next`), never remembered.
A dispatch with NO id (`cid == ""`) is unaffected: it still matches the first verdict after it.

Trap for the next editor: inside the awk program (single-quoted in bash), an apostrophe in a
comment terminates the shell's quoting and empties `pair_raw`, which the script reads as a
malformed pairing and silently fails open (allow) - no error, no crash, just a stealthy wrong
answer. Caught this in dry-run testing (`bash -x`), not from the test's own failure output.
Wrote comments with no apostrophes instead of trying to escape one (`'\''`) inside the block.

Verified with `bash -x` plus a hand-built fixture in the scratchpad dir before trusting the
Node test's red/green cycle, since the first "red" I watched was actually this quoting bug,
not the intended missing-behavior gap - re-confirmed the true red by fixing only the awk logic
change and rerunning.
