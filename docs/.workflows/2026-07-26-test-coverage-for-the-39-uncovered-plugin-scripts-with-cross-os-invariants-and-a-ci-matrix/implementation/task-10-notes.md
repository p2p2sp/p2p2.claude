# Task 10 - implementation notes

- The "user.email unset" edge case in `commit.test.ts` asserts a
  platform-tolerant invariant (exit 0 implies HEAD moved, non-zero implies
  it did not) instead of a hard "must fail" - this machine's git falls back
  to an autodetected username@hostname identity with only a warning rather
  than refusing, so a fixed expected outcome would be flaky across git
  versions/platforms; the meaningful property (never claim success without
  a real commit landing) still had to be verified.
- No other deviations from the task's Approach / Contracts / Edge cases.
