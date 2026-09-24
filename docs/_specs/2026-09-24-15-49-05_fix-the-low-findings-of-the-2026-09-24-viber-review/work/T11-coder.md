# T11 coder notes

One regex swap in `bootstrap.sh`'s `.gitignore` existing-entry check:
`^[[:space:]]*(\*\*/|/)?\.temp(/(\*\*?)?)?[[:space:]]*$` accepts a bare `.temp`, `.temp/`,
`/.temp`, `/.temp/`, `.temp/*`, `.temp/**` and `**/.temp/`, and still rejects `!.temp/`
(negation doesn't start with `.` right after the optional anchor, so it falls through to append).

Added 5 new tests (rooted `/.temp/`, `.temp/**`, `.temp/*`, `**/.temp/`, and the negation
`!.temp/` case that must still append) alongside the existing bare/commented-out cases; all 24
tests in the file pass.

Also marked the matching finding in `docs/reviews/2026-09-24_viber-review.md:106` WYKONANE, per
the task Goal ("marks it done in the review document") - reported as EXTRA since the plan gave
that file no owning task's `Files` line.

The `check-playwright.sh` half of criterion #9 (multi-`package.json` detection) is out of this
task's `Files` and untouched here - it belongs to a sibling task.

Working tree carries many other files modified by parallel in-flight tasks (other coders in the
same run); left entirely alone.
