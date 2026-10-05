After a `VERDICT: FAIL` fix that changes the plan's title, issue reference or a task's `Repro:` line, re-run the branch report before dispatching again:

- When the input carries a `Work:` line, ask nothing: recompute `branch:` from the report's `new:` for the `work:` entry, leaving a `Branch:` line's choice standing; a `new:` reading `-` takes the question of the branch step, "stay" offered only when `current-is-base:` reads `no`.
- Otherwise repeat the branch question only when that report's `entry:` lines or its offered answers actually changed, else leave the recorded `work:` and `branch:` keys standing.
- Show the run branch line of the branch step again whenever a recompute changes `branch:`, the "no run branch, commits land on `current:`" form included.
