## Roadmap

Part 3 of 4 - Baseline test run behind a switch in `viber.yml`

1. Edge cases in the plan (built)
2. Fast path: a small change with no plan document (built)
3. Baseline test run behind a switch in `viber.yml` (this plan)
4. Full autonomy with a ruling register
   - The build decides conflicts, ambiguities and stalled tasks itself instead of asking.
   - Every such decision is recorded as a ruling with its reason and its cost if wrong.
   - The final summary lists every ruling.
   - `VERDICT: DENIED` stays a stop.
   - It consumes part 3's list of pre-existing failures.
