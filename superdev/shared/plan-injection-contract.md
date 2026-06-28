The plan spliced into your context by the injection block above is the plan — review THAT text.

- The `<plan>` block is the plan — review it. If it shows `__NO_PLAN__` or is empty, the path was missing/unreadable: emit a malformed-input verdict (BLOCK, one finding naming the unreadable plan) and stop.
- A `<prior-fixes mode="re-review">` block, when present, marks a RE-REVIEW; absent → first-run with clean eyes.
- Never call Read on the plan path; never reconstruct or split `$ARGUMENTS` yourself — the script already did.
