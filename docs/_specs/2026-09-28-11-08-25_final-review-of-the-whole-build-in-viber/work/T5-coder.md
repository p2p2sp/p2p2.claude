# T5 - coder notes

- `tests/portability.test.ts`'s fragment-call sweep reads the git index (`git ls-files`), not the
  working tree (documented in `tests/CLAUDE.md`): `viber/skills/implementor/fragments/final-review.true.md`
  is a brand-new file, so that one real-sweep assertion stays red until this task's own commit
  stages it - the coder role may stage nothing beyond a `git rm` removal. The mechanism itself is
  proven correct without staging: T1's own self-check ("fragmentCallViolations accepts a
  final-review call with a .true.md fragment for it (DoD.5)") already exercises this exact
  call+fragment shape and passes. 36/37 tests in the file pass; the 37th clears itself the moment
  the task lands.
- The task-coder `review` line is a new, plural sibling of the existing singular `report` line
  (final-review findings, never a task file); kept the Input section's per-line-a-bullet shape
  rather than folding it into the existing `report` prose, since it is a genuinely new case, not a
  variant of one already stated.
- The model-rule exception ("only coder, reviewer and repair-coder dispatches carry `model`") is
  stated inline in the fragment itself, since `viber:final-reviewer` and this step's `task-coder`
  dispatch are not literally named by that bullet's three role words.
