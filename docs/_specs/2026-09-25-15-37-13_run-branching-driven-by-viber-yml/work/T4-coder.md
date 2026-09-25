- `branch_report()` lives in run-branch.sh (sourced by plan-path.sh) and reuses br_mode/br_base/br_cur
  from `branch_setup` plus `branch_expand`/`slug_of` - no duplicate parsing.
- `<base>@{upstream}` errors ("not stored as a remote-tracking branch") unless the remote is a real
  configured remote (`remote.<name>.url` + `remote.<name>.fetch` mapping refs/heads/* to
  refs/remotes/<name>/*) - a bare `git update-ref refs/remotes/origin/main <sha>` plus
  `branch.main.remote`/`.merge` is NOT enough; the behind-count test configures both.
- `behind:` is computed by name (`git rev-parse --abbrev-ref --symbolic-full-name "$base@{upstream}"`
  then `git rev-list --count "$base..$upstream"`), never through `refs/heads/$base` directly, so a
  base with no local ref or no tracking config falls through to "unknown" under `errexit` via `|| true`.
- `new-exists` and `dirty` are read straight (`git show-ref`, `git status --porcelain`); `--branch`
  never calls `branch_land`, so it can never move HEAD - that is what makes DoD.5 trivially true.
- TDD: production code was already in place from the prior session; verified RED by temporarily
  renaming the `--branch` match string (not deleting code), confirmed the new tests failed on the
  expected usage-error path, then restored the match and confirmed GREEN with no other regressions
  (full `tests/viber/*.test.ts`, portability and orphan-tags suites all pass).
