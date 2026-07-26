
## Task 3 - feat(superfix): add rank_edges.ts, the deterministic edge gate
- Covers: criteria #4, #9
- TDD: none

### Dependencies
- Task 1 - blocks: reads the edge records it emits.
- Task 2 - blocks: reads the edge verdict records it emits.

### Files
- add - superfix/skills/code-auditor/scripts/rank_edges.ts (`parseArgs`, `loadJsonl`, `pairImpact`, `main`)
- modify - superfix/skills/code-auditor/references/scoring.md (new section `## Edge gate (edges.json)`)

### Test Commands
*Build*
- `sh superfix/skills/code-auditor/scripts/check_node.sh` - expect `NODE_OK node` or `NODE_OK node --experimental-strip-types`; use the returned command wherever `node` appears below.

*Tests*
- `mkdir -p .temp/superfix-verify && printf '{"a":"x.ts","b":"y.ts","verdict":"MISMATCH","reason":"shape differs"}\n{"a":"p.ts","b":"q.ts","verdict":"MATCH","reason":"agree"}\n{"a":"r.ts","b":"s.ts","verdict":"UNCLEAR","reason":"could not settle"}\n' > .temp/superfix-verify/edge_scores.jsonl` then `printf '{"a":"x.ts","b":"y.ts","via":"d.json","fanout":2,"shared":1}\n{"a":"p.ts","b":"q.ts","via":"e.json","fanout":2,"shared":1}\n{"a":"r.ts","b":"s.ts","via":"f.json","fanout":3,"shared":2}\n' > .temp/superfix-verify/edges.fixture.jsonl` then `printf '{"path":"x.ts","churn":9,"fix_commits":1,"recency_days":2,"loc":100,"dependents":4}\n{"path":"y.ts","churn":1,"fix_commits":0,"recency_days":9,"loc":50,"dependents":1}\n{"path":"r.ts","churn":0,"fix_commits":0,"recency_days":-1,"loc":10,"dependents":-1}\n{"path":"s.ts","churn":0,"fix_commits":0,"recency_days":-1,"loc":10,"dependents":-1}\n' > .temp/superfix-verify/signals.fixture.jsonl`
- `node superfix/skills/code-auditor/scripts/rank_edges.ts --edges .temp/superfix-verify/edges.fixture.jsonl --verdicts .temp/superfix-verify/edge_scores.jsonl --signals .temp/superfix-verify/signals.fixture.jsonl --top-edges 20 --run-id t1 --job reliability/bugs --out-json .temp/superfix-verify/edges.json --out-md .temp/superfix-verify/edges.md` - expect a one-line stdout summary and exit 0.
- `node -e "const j=require('./.temp/superfix-verify/edges.json'); if(j.counts.match!==1) throw new Error('match'); if(j.dispatch.length!==2) throw new Error('dispatch'); if(j.dispatch[0].verdict!=='MISMATCH') throw new Error('order'); if(j.dispatch[0].pair_impact!==15) throw new Error('impact '+j.dispatch[0].pair_impact); if(!j.degree.length) throw new Error('degree'); console.log('ok')"` - expect `ok`.

### Approach
1. Write `rank_edges.ts` as native TypeScript run by Node type stripping - a plain flag loop for `parseArgs`, `JSON.parse` per line for `loadJsonl`, `JSON.stringify(x, null, 2)` for output. Do not port anything from `rank.ts`'s Python-compat layer.
2. Accept `--edges`, `--verdicts`, `--signals`, `--top-edges` (default 20), `--run-id`, `--job`, `--out-json`, `--out-md`; require `--edges`, `--verdicts`, `--out-json`, `--out-md` and exit 2 with a usage line otherwise.
3. Implement `pairImpact(a, b, signals)` as `churn_a + churn_b + dependents_a + dependents_b`, treating a missing row or a `-1` sentinel as 0. Use only Impact-side signals: `fix_commits` is an Opportunity prior and the edge track carries no Opportunity axis.
4. Join verdicts to edge records on the `a`+`b` pair; drop `MATCH` rows into a `match` bucket; sort the rest by verdict class (`MISMATCH` before `UNCLEAR`), then `pair_impact` descending, then `shared` descending, then `a` and `b` lexicographically; assign `rank` over the whole sorted list, then split at `--top-edges` into `dispatch` and `overflow`.
5. Compute `degree` from the full edge record set as the count of pairs each path participates in, sorted descending and capped at 20 rows; write `edges.json` with `run_id`, `job`, `top_edges`, `counts` (`pairs`, `match`, `mismatch`, `unclear`, `unscored`, `dispatch`), `dispatch[]`, `overflow[]`, `match[]`, `degree[]`, and write `edges.md` as a ranked table plus a `<details>` block for `match`.
6. Add a `## Edge gate (edges.json)` section to `scoring.md` documenting the edge record, the verdict record, the `pairImpact` formula, the sort order, and the `edges.json` field list; change nothing in the existing rubric, combine-formula, tie-breaking or hotlist sections.

### Edge cases
- A verdict with no matching edge record, or an edge record with no verdict - counted in `counts.unscored`, warned once on stderr naming the pair, never dispatched.
- A verdict string outside the three allowed values - warn on stderr and treat it as `UNCLEAR`, because discarding it would silently lose a pair.
- Missing `--signals` or a path absent from it - `pair_impact` falls back to 0; ranking still runs and stays deterministic through the lexicographic tie-break.
- Empty `--edges` or `--verdicts` - write both outputs with zero rows and exit 0; an empty edge track is a valid result.
- Malformed JSONL line - warn on stderr with the line number and continue, matching `rank.ts`'s `loadJsonl` behaviour.

### Contracts
Introduces `edges.json`: `{run_id, job, top_edges, counts:{pairs,match,mismatch,unclear,unscored,dispatch}, dispatch:[{rank,a,b,via,shared,verdict,pair_impact,reason}], overflow:[...], match:[...], degree:[{path,degree}]}`. Consumes the Task 1 edge record and the Task 2 verdict record. `degree[]` is consumed by `SKILL.md`'s structural budget (Task 5).

### DoD
The fixture run above produces `edges.json` with `counts.match == 1`, two dispatch rows ordered `MISMATCH` before `UNCLEAR`, `pair_impact == 15` on the top row, a non-empty `degree[]`, and a rendered `edges.md`; `scoring.md` carries the new section with its pre-existing sections untouched.


### Covered criteria
4. `rank_edges.ts` drops `MATCH` verdicts, orders the rest by verdict class then a pair-Impact computed only from both endpoints' signals, caps dispatch with `--top-edges`, and writes `hotlist/edges.json` plus `hotlist/edges.md`.
9. `scoring.md` documents the new `hotlist.json` fields and the `edges.json` schema; its 1-5 rubric, 2x2 gate, T=3 defaults and 5x2 "leave it" warning are unchanged.
