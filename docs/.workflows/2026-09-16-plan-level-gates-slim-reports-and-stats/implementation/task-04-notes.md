# Task 4 notes

## Runs
- grep -c '^## Dispatch strength' superdev/references/review-contract.md -> 1

Approach step 2 says keep the evidence rules untouched, but two of their clauses described what a
gate result puts into the report verbatim (`RESULT:`/`EXIT:`/`TAIL:` on SUCCESS, `SUMMARY:` on a
dispatched command), which the one-line-per-subsection shape of step 3 contradicts; both clauses now
point at the report line instead, substance unchanged.

Approach step 2 keeps the BLOCKED mapping but the Rules bullet
`no e2e or integration suite in this host` was dropped rather than rewritten: the new rule that a
`none - <reason>` subsection is not run, carries its reason into the report and never returns BLOCKED
covers it, and a second bullet would only restate it.

UNDERSPECIFIED: the `## Gates` report line for a subsection holding more than one command - one line
all the same, red when any command is red, wall time their sum, taken from `run.sh`'s `DURATION:`.

UNDERSPECIFIED: the `none - <reason>` gate line - the reason replaces the result and the wall time is
omitted, written `Integration - none - <reason>`.
