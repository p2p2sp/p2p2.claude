## Roadmap

Part 1 of 4 - Edge cases in the plan

1. Edge cases in the plan (this plan)
2. Fast path: a small change with no plan document
   - A small, well-scoped change to existing code gets a short design shown in chat instead of a plan file.
   - The build starts only after the user's explicit "yes".
   - No plan file and no run directory.
3. Baseline test run behind a switch in `viber.yml`
   - The switch lives in `viber.yml`.
   - With it on, the test runner runs once before the first task dispatch.
   - A red baseline asks continue or abort and records the pre-existing failures.
   - The final test run treats only new failures as repair work.
4. Full autonomy with a ruling register
   - The build decides conflicts, ambiguities and stalled tasks itself instead of asking.
   - Every such decision is recorded as a ruling with its reason and its cost if wrong.
   - The final summary lists every ruling.
   - `VERDICT: DENIED` stays a stop.
   - It consumes part 3's list of pre-existing failures.
