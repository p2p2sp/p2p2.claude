
## Task 8 - fix(superfix): tell the scout that dependents is always present and -1 means unknown
- Covers: criteria #8
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/agents/scout.md (`## Inputs you are given`)

### Test Commands
*Build*
- none - markdown-only change; this repo has no build step.

*Tests*
- `grep 'dependents' superfix/agents/scout.md | grep -c optional` - expect 0 (no line describing `dependents` still calls it optional); grep exits 1 when it finds nothing and that is the pass.
- `grep -c -- '-1' superfix/agents/scout.md` - expect a non-zero count (the sentinel is defined).
- `bash superfix/skills/code-auditor/scripts/collect_signals.sh 180 "$PWD/superfix" | head -1 | grep -c '"dependents":-1'` - expect 1, confirming the field is always present and equal to -1 when the flag is omitted, exactly as the new wording says.

### Approach
1. In `superfix/agents/scout.md`'s inputs list, drop the word "optional" from the `dependents` field and state that the field is always present.
2. Add one clause: `-1` means the sweep did not compute dependents - treat it as unknown, not as low reach, and fall back to reading the file for Impact.
3. Keep the existing "never fabricate a signal value" hard rule untouched - the new clause tells the scout what to do instead of fabricating.

### Edge cases
- The clause must not invite the scout to invent a dependents count; the documented fallback is reading the file, which the rubric's override clause already permits.
- Wording must stay consistent with `rank_edges.ts`'s treatment of the same sentinel, where `-1` contributes 0, i.e. counts as no evidence rather than as a low value.

### Contracts
Consumes the `signals.jsonl` record emitted by `collect_signals.sh` (`churn`, `fix_commits`, `recency_days`, `loc`, `dependents`); no field added or renamed.

### DoD
`scout.md` no longer calls `dependents` optional, defines `-1`, and a live `collect_signals.sh` run without `--with-dependents` produces exactly the record shape it now describes.


### Covered criteria
8. `scout.md` states that `dependents` is always present and that `-1` means "not computed", not low reach.
