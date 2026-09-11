# Task 11 review 3 - findings

## Important

- `superdev/skills/superbuild/SKILL.md:31` and `superdev/skills/simplebuild/SKILL.md:31` (with the
  `### Fix loop` branch table at `superbuild/SKILL.md:114-122` / `simplebuild/SKILL.md:109-117`) -
  the "no report" state is defined as "a reviewer returning without a `VERDICT:` line, or with a
  `REVIEW:` line naming a file that does not exist". Covered criterion #24 defines it more broadly:
  "fork recenzenta bez linii `VERDICT:` lub bez raportu na dysku". The gap is a documented, realistic
  return shape: all three build reviewers return `VERDICT: FAIL` + `REASON: missing input <label>`
  and write NO report on an input error
  (`superdev/skills/superbuild-reviewer-change/SKILL.md:33`,
  `superdev/skills/superbuild-reviewer-spec/SKILL.md:33`,
  `superdev/skills/simplebuild-reviewer/SKILL.md:33`, and the same rule in
  `superdev/references/review-contract.md` `## Labels`, which this task's `### Contracts` consumes in
  full). That return has a `VERDICT:` line and no `REVIEW:` line, so it is not the implemented "no
  report" state, and it matches no branch of `### Fix loop` either - the FAIL branch is keyed on
  `VERDICT: FAIL` + `REVIEW: <report>`. The orchestrator is left to improvise at a checkpoint, at a
  final review and at a re-review; the likely improvisation is the FAIL branch, which dispatches the
  implementor with `task: <report>` at a file that was never written - exactly the escalate-only
  state criterion #24 reserves for `AskUserQuestion`. The per-task reviewer path already handles the
  identical shape explicitly (`superbuild/SKILL.md:97`), so the omission is confined to the new loop.
  Fix: widen the "no report" bullet in both files so it also covers a reviewer returning a verdict
  with no report on disk (no `REVIEW:` line, or a `REASON:` line instead of one), keeping the two
  `## Mandatory Rules` sections byte-identical, and record the wording change in
  `task-11-notes.md`.
