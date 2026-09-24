Added the `(review)` rule as "Memory-owned" in plan-rules.md's `## Tasks` section, placed before "Covers" since it governs task Files like the "Owned" rule above it.

`planner` step 3 now passes `memory: <value>` sourced from the config block the skill's own `!` preload already resolves at load time (no new read needed).

`planner-review`'s Input line lists `memory:` alongside the existing `refs` and states the missing-line default is `false`, matching config.sh's own fail-open convention for switches.

No other section of planner-review.md (Check, Calibration, Output) needed touching per the task's DoD scope; gating the rule itself is left to the reviewer's existing "Gate every (review) rule" instruction, which already covers a new rule added to plan-rules.md.
