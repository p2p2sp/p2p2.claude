# Review T5 - round 1

## Blocking

1. tests/viber/plan-path.test.ts:1837-1852 (T5 DoD.3) - the test carries two acts in one body: it runs `--land` and asserts its stdout (no `branch:`, no `target:`), then runs the no-argument form and asserts that stdout too. That breaks the test-strategy rule "Every test can fail on a regression, asserts something and carries one act: several actions in one body means several tests. (blocking)". Fix: split it into two tests. (a) Mode off, `--land` of a plan with `work: feature`: no `branch:` and no `target:` line. (b) Mode off, the no-argument form over a run with `work: feature` already on disk. Write the plan file directly, the way the DoD.2 test does, so the landing is arrangement and not a second act. It prints no `branch:` or `target:` line and HEAD stays on `main`.

## Minor

- viber/scripts/plan-path.sh:402 - `emit` calls `branch_entry` again, which overwrites `br_entry`/`br_why` after `branch_land`. Nothing reads them after `emit` today. A short comment there would stop a later caller from relying on the source plan's values.
