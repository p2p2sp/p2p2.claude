# T3 coder notes

- Only the planner-path `dispatch_with` line in `plan-gate.sh` changed; the plain-plan-review
  branch, every allow/deny decision, and the awk/pairing logic are untouched, per DoD.3.
- New test sits right after the existing "names refs: and memory:" test (same shape, same
  fixture helpers) so the two read as one pair proving the planner-path reason's full contents.
- Wording follows C1 literally: `input:` is glossed as "the confirmed interview summary or bug
  diagnosis the plan answers, verbatim" to match `planner-review.md`'s block description without
  duplicating its exact placeholder text (which belongs to the dispatch payload, not the deny
  reason prose).
- `viber/agents/planner-review.md` (C1's own file) was already written by T1 and untouched here.
