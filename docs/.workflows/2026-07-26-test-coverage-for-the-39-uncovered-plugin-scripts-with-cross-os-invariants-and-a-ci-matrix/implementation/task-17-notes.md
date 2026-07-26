
## Task 17 notes
- Added a bash-availability gate alongside the required jq gate (`tests/github/release.test.ts` skips
  the whole file when either is missing, not just jq) - Approach step 6 only mentions jq, but release.sh
  is invoked via an explicit bash interpreter (its exec bit isn't set, matching the real workflow's
  `bash .github/scripts/release.sh`), so a bash-less machine needs the same skip-not-fail treatment.
- The "target tag that already exists -> exit 3" case cannot be produced through ordinary tag state:
  release.sh always computes `new` from `current` (the highest existing matching tag), and `new` is
  provably > `current` for every part, so a real tag can never already occupy `new` by the time the
  normal `git tag --list` picks up `current`. To exercise the exit-3 branch faithfully as the
  stale-listing/race-window guard it actually is, that one test adds a `git` passthrough stub (fakes
  only the `tag --list` call to report a lower "current"; every other invocation execs the real `git`)
  - not mentioned in the Approach, but necessary to reach that code path at all.
- Every `.stdout` assertion on the printed version reads only the last stdout line (`lastStdoutLine`)
  rather than the whole trimmed output, because `git commit`'s own summary line is never redirected by
  release.sh and lands on stdout ahead of the script's final `echo "$new"` whenever a real commit occurs.
