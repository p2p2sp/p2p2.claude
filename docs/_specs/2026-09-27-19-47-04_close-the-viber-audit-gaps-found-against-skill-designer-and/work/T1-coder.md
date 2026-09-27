# T1 coder notes

- `planner-review.md`'s Input section now reproduces C1's `input:` block verbatim (label plus
  placeholder line), followed by one sentence saying Faithful is skipped when it's absent - kept
  as prose right after the block rather than folded into the Check bullet, so DoD.1's "absent
  input skipping Faithful" reads as an Input-section rule, not a Check-section one.
- The Faithful Check bullet states "is a Blocking finding" directly (not routed through
  Calibration's general wording) since DoD.2 asked for the bullet itself to make that call.
- Both reviewers got the identical "explore the codebase broadly..." sentence (file map, callers,
  other affected files) - kept the two reviewers' surrounding sentences (refs, "no fixed format")
  untouched on either side of it.
- Left `plan-gate.sh`'s `dispatch_with` wording and `planner/SKILL.md`'s dispatch untouched -
  T2/T3 own passing the actual `input:` block at call sites; T1 only shapes the agents' own
  contract for when it's present.
