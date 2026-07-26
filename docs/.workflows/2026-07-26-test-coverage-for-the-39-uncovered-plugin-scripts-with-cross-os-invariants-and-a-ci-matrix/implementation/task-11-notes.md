# Task 11 - implementation notes

- `check-base.sh`'s BASE_EXISTS=1 fixtures use `git update-ref
  refs/remotes/origin/<base>` to fake a remote-tracking ref instead of a
  real `origin` remote + fetch/push - `git rev-parse --verify` and `git
  branch -r` only read refs under `refs/remotes/*`, so this proves the
  same behavior with zero network/push surface, in line with the plan's
  "no test performs network I/O" invariant.
- No other deviations from the task's Approach / Contracts / Edge cases.
