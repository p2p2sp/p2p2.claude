
## Task 8 - docs(superfix): align scoring.md with what rank.ts emits
- Covers: criteria #13
- TDD: none

### Dependencies
- Task 3 - blocks: the schema documents the output shape Task 3 changes

### Files
- modify - superfix/skills/code-auditor/references/scoring.md (`## Hotlist schema (hotlist.json)`, `## Tie-breaking & caps`)

### Test Commands
*Build*
- none - references ship as markdown

*Tests*
- `grep -n 'counts' superfix/skills/code-auditor/references/scoring.md` - expect the object documented with its sum invariant
- `grep -n 'overflow' superfix/skills/code-auditor/references/scoring.md` - expect the bucket documented
- `grep -n 'min_impact\|min_opportunity' superfix/skills/code-auditor/references/scoring.md` - expect the two independent minimums documented in place of `threshold`
- `grep -n '50\|clamp' superfix/skills/code-auditor/references/scoring.md` - expect both the skipped-table cap and the 1..5 clamping documented
- regenerate a hotlist from the `/tmp/sfx-t3` fixtures (rebuild them from Task 3's fixture bullet if the directory is absent) using the absolute-path `rank.ts` invocation from Task 3, and compare the documented schema key by key against the emitted `hotlist.json` - expect no key present in one and absent from the other

### Approach
1. Replace `threshold` with `min_impact` / `min_opportunity` in the documented `hotlist.json` schema, and add the `overflow` array and the `counts` object, stating the invariant that the `counts` members sum to `scored`.
2. Document that `hotlist.md` renders at most 50 skipped rows and that scores outside 1..5 are clamped rather than rejected.
3. Rewrite the `--top N` paragraph in `## Tie-breaking & caps` so it describes capping dispatch while keeping the full gate-clearing record, matching Task 3's behaviour.
4. Note that `run_id` and `job` are populated from the `--run-id` / `--job` flags that Phase 3 now passes.

### Edge cases
- The 1-5 rubric table in this file is hand-copied into `job.md` by Phase 0. Leave that table byte-identical so the copy-paste contract does not drift.

### Contracts
Documentation only - no runtime behaviour changes.

### DoD
All five Test Commands pass, and every key emitted by `rank.ts` appears in the documented schema.


### Covered criteria
13. `references/scoring.md` documents the `counts` object, the overflow bucket, the two independent minimums, the 50-row cap on the skipped table, and the 1..5 clamping of out-of-range scores.
