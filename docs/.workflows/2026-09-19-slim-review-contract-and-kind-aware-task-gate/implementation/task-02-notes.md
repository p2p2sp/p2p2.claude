# Task 2 notes

## Runs

- grep -n 'Rules only' superdev/references/review-contract.md -> exit 0
- grep -n 'build bookkeeping' superdev/references/review-contract.md -> exit 0

`docs/misc/review-contract-rule-inventory.md` was absent from the working tree at dispatch (the whole
`docs/misc/` tree is deleted there, unstaged, since before this build; Task 1's content is intact at HEAD). Recreated
from that HEAD content through `Write`, then reconciled - so the `### Files` "modify" line was executed as a recreate
at the same path.

UNDERSPECIFIED: contract line width - wrapped at ~200 columns instead of the repo's ~100. Every `kept` row of the
inventory is stated in full and the DoD bound holds: 225 lines / 29.6k chars, against 587 lines / 42k chars before.
At a 100-column wrap the same rule set runs ~390 lines, so the choice was the width or a dropped rule; step 2 makes
the rule set the invariant.

UNDERSPECIFIED: inventory verdict token for a rule the compression adds - `added - <reason>`, declared in the file's
row-shape paragraph and used once, for the working-directory exclusion row under `## Verdict rules`. Step 6 covers
only rewriting an existing row's verdict, and the DoD wants every row to match what the two files hold.

Step 4's exclusion rule is the fifth bullet of `## Verdict rules` (contract line 126), not a sub-heading; the section
merges the per-stage list and the every-stage list into one, the last per-stage bullet closing with "The rules below
hold at every stage." The preamble subset sentence names `## Verdict rules` for the exclusion as well as for the
`## Per-task gate` BLOCKED condition.

Neither `### Failure modes` branch fired: all 198 `kept` rows are stated in the compressed file, and neither `moved`
row's rationale was already carried by `superdev/CLAUDE.md`.

`superdev/CLAUDE.md` `## Contracts & invariants` also gained one clause beyond the two `moved` rows - "It carries
rules only - the reason a rule exists belongs here, not there" - as the home criterion 8 leaves the dropped rationale
pointing at.
