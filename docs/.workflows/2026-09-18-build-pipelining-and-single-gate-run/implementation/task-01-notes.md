# task-01 notes

## Runs

- grep -n 'gates: <path>' superdev/references/review-contract.md -> exit 0, match at line 64
- grep -n 'range: <SHA>..<SHA>' superdev/references/review-contract.md -> exit 0, match at line 44
- grep -n 'runs no gate command itself' superdev/references/review-contract.md -> exit 0, match at line 220

Step 6: dropped the `run.sh` heredoc code block and its two mechanics bullets (`EOF` at column 0,
`command:`/`expect-exit:`/`timeout:`) along with the transport paragraph - they are the reviewer's
call shape, and the reviewer no longer calls anything; the `expect:` bullet and the raw-`Bash`
bullet stayed because cases 1-3 and the evidence rules still read them.

Failure mode 1 landed as a sentence appended to the retired-`base:` paragraph of `## Labels`
(`runner:` retired, served by `gates:`, `NOTE: plan defect - stale runner label`) rather than a
label entry, so the DoD's "no `runner:` label entry" holds.

Failure mode 2 landed in the `## Labels` input-errors paragraph: `gates` added to the missing-label
list there together with the unreadable-file case, instead of a new paragraph.

Step 7's orchestrator-side dispatch rule sits directly after the new range paragraph of
`## Per-task gate`, not next to the `What the orchestrator does with it` list - that list is the
BLOCKED handling only, and the pipelining rule follows from reading committed ranges.

Two `## Gates` lines outside the steps' wording were pulled into agreement with the new owner: the
`RESULT: SUCCESS` evidence bullet now says "the handed entry" rather than "the printed block", and
the per-round rule bullet names the orchestrator's single run.

UNDERSPECIFIED: lines of a gate block entry - `### Contracts` enumerates subsection, `RESULT`,
`STATUS`, `EXIT`, `DURATION`, `LOG`; the entry description also names `TAIL` and `REASON` "where the
run printed them", because case 1 reads `run.sh`'s `REASON:` and the evidence rules read `TAIL:`.
