## Task 3 notes

- `USAGE` (the compact synopsis line) was left unchanged; only `HELP`'s per-flag description lines were
  extended with the independent-minimums / --top-caps-dispatch wording, since `USAGE` carries no flag
  descriptions to reword in the first place - why: matches the task's own framing ("flag descriptions"),
  which only exist in `HELP`.
- `skipped` is computed via a single forward partition loop alongside `gateClearing` rather than a second
  `.filter(quadrant !== "HOTSPOT")` pass - why: satisfies the approach's instruction to stop deriving
  `skipped` as a filter-complement of the (now pre-cap) hotspots list, while keeping identical output.
- no other deviations.
