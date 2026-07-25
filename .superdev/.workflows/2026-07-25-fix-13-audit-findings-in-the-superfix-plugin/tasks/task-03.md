
## Task 3 - fix(superfix): make the rank.ts gate report honestly
- Covers: criteria #6, #7, #8
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/skills/code-auditor/scripts/rank.ts (`quadrant`, `main`, `USAGE`, `HELP`)

### Test Commands
*Build*
- none - `rank.ts` is executed directly by Node's native type stripping. Run `sh /Users/dario/Projects/p2p2.claude/superfix/skills/code-auditor/scripts/check_node.sh` first: it must print `NODE_OK node`, which is the form the commands below use. If it prints `NODE_OK node --experimental-strip-types`, use that form in place of `node` below. If it prints `NODE_MISSING`, stop - this task cannot be verified without a supported Node.

*Tests*
- build the fixture pair once: `mkdir -p /tmp/sfx-t3`, then write to `/tmp/sfx-t3/signals.jsonl` the three lines `{"path":"a.ts","churn":90,"fix_commits":3,"recency_days":0,"loc":16,"dependents":2}`, `{"path":"b.ts","churn":8,"fix_commits":3,"recency_days":0,"loc":128,"dependents":1}`, `{"path":"c.ts","churn":3,"fix_commits":1,"recency_days":0,"loc":73,"dependents":2}`; and to `/tmp/sfx-t3/scores.jsonl` the three lines `{"path":"a.ts","impact":4,"opportunity":4,"impact_reason":"i","opportunity_reason":"o"}`, `{"path":"b.ts","impact":4,"opportunity":4,"impact_reason":"i","opportunity_reason":"o"}`, `{"path":"c.ts","impact":3,"opportunity":2,"impact_reason":"i","opportunity_reason":"o"}`
- `node /Users/dario/Projects/p2p2.claude/superfix/skills/code-auditor/scripts/rank.ts --scores /tmp/sfx-t3/scores.jsonl --signals /tmp/sfx-t3/signals.jsonl --min-impact 5 --min-opportunity 3 --top 20 --out-json /tmp/sfx-t3/a.json --out-md /tmp/sfx-t3/a.md` - expect `a.ts` and `b.ts` (impact 4) absent from `hotspots`
- `node /Users/dario/Projects/p2p2.claude/superfix/skills/code-auditor/scripts/rank.ts --scores /tmp/sfx-t3/scores.jsonl --signals /tmp/sfx-t3/signals.jsonl --min-impact 2 --min-opportunity 3 --top 20 --out-json /tmp/sfx-t3/b.json --out-md /tmp/sfx-t3/b.md` - expect `c.ts` (opportunity 2) absent from `hotspots`
- `node /Users/dario/Projects/p2p2.claude/superfix/skills/code-auditor/scripts/rank.ts --scores /tmp/sfx-t3/scores.jsonl --signals /tmp/sfx-t3/signals.jsonl --min-impact 3 --min-opportunity 3 --top 20 --out-json /tmp/sfx-t3/c.json --out-md /tmp/sfx-t3/c.md` - regression on the tie-break: expect `a.ts` (churn 90) ranked above `b.ts` (churn 8) at equal 4x4, and `c.ts` in `skipped` with quadrant `already-fine`
- write 26 score lines to `/tmp/sfx-t3/many.jsonl` of which 25 clear a 3/3 gate, then `node /Users/dario/Projects/p2p2.claude/superfix/skills/code-auditor/scripts/rank.ts --scores /tmp/sfx-t3/many.jsonl --min-impact 3 --min-opportunity 3 --top 20 --out-json /tmp/sfx-t3/d.json --out-md /tmp/sfx-t3/d.md` (no `--signals`) - expect no gate-clearing path missing from the union of the output arrays, and the `counts` members to sum to `counts.scored`
- copy `/tmp/sfx-t3/scores.jsonl` to `/tmp/sfx-t3/drift.jsonl` with `a.ts` renamed to `sub/a.ts`, then `node /Users/dario/Projects/p2p2.claude/superfix/skills/code-auditor/scripts/rank.ts --scores /tmp/sfx-t3/drift.jsonl --signals /tmp/sfx-t3/signals.jsonl --min-impact 3 --min-opportunity 3 --top 20 --out-json /tmp/sfx-t3/e.json --out-md /tmp/sfx-t3/e.md` - expect a stderr line naming `sub/a.ts`

### Approach
1. Change `quadrant(impact, opportunity, t)` to `quadrant(impact, opportunity, minImpact, minOpportunity)`, comparing each axis against its own minimum, and delete the `Math.min(args.minImpact, args.minOpportunity)` collapse in `main`. Replace the emitted `threshold` scalar with `min_impact` and `min_opportunity` keys, and drop `threshold` entirely - a single scalar cannot carry two independent axes.
2. Reword the `hotlist.md` summary line that currently prints `threshold ${t}` so it reports both minimums, since the scalar it read no longer exists.
3. In `main`, stop defining `skipped` as `quadrant !== "HOTSPOT"`. Partition the ranked rows so every row lands in exactly one bucket: `hotspots` (gate-clearing, capped by `--top`), `overflow` (gate-clearing beyond the cap), and `skipped` (did not clear the gate). Emit all three in `hotlist.json`, extend `counts` with an `overflow` member so `hotspots + overflow + skipped === scored`, and render the overflow rows in `hotlist.md` under their own labelled section between the hotspot table and the skipped details block.
4. In the merge loop in `main`, emit a stderr warning in the existing `warn: …` phrasing used by `loadJsonl` when a scores record's `path` has no entry in `sigByPath` and `--signals` was supplied.
5. Update `USAGE` and `HELP` so the flag descriptions state that the two minimums are independent and that `--top` caps dispatch rather than the record.

### Edge cases
- `--top` larger than the hotspot count, `--top 0`, and a negative `--top` must not throw, and `counts` must still sum to `scored`.
- `--signals` omitted entirely: no unjoined-path warnings at all, since there is nothing to join against.
- Existing behaviour that must NOT change: the tie-break order (score desc, impact desc, churn desc), the four quadrant strings, the 1..5 clamping, the 50-row cap on the skipped table, and exit-2-with-usage on bad arguments.

### Contracts
`hotlist.json` replaces `threshold` with `min_impact` / `min_opportunity`, gains an `overflow` array, and gains a `counts.overflow` member; the `counts` members sum to `counts.scored`. `quadrant()` takes two thresholds. `hotlist.md` gains one labelled overflow section and a summary line naming both minimums.

### DoD
All six Test Commands behave as described, including the tie-break regression.


### Covered criteria
6. `--min-impact` and `--min-opportunity` each gate their own axis: `--min-impact 5 --min-opportunity 3` excludes an impact-4 file, and `--min-impact 2 --min-opportunity 3` does not admit an opportunity-2 file.
7. Every file that clears the gate appears in `hotlist.json` and `hotlist.md`; the members of `counts` sum to `counts.scored`, and `--top N` caps dispatch, not the record.
8. `rank.ts` writes a stderr warning naming each scores path that matched no signals row.
