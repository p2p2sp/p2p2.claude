
## Task 4 - feat(superfix): report a degenerate Opportunity distribution in rank.ts
- Covers: criteria #5, #9
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/skills/code-auditor/scripts/rank.ts (`main`)
- modify - superfix/skills/code-auditor/references/scoring.md (the ``## Hotlist schema (`hotlist.json`)`` section)

### Test Commands
*Build*
- `sh superfix/skills/code-auditor/scripts/check_node.sh` - expect `NODE_OK ...`; use the returned command as `node` below.

*Tests*
- `mkdir -p .temp/superfix-verify && printf '{"path":"a.ts","impact":5,"opportunity":1}\n{"path":"b.ts","impact":4,"opportunity":2}\n' > .temp/superfix-verify/scores.degen.jsonl` then `node superfix/skills/code-auditor/scripts/rank.ts --scores .temp/superfix-verify/scores.degen.jsonl --out-json .temp/superfix-verify/h1.json --out-md .temp/superfix-verify/h1.md` then `node -e "const j=require('./.temp/superfix-verify/h1.json'); if(j.degenerate!==true) throw new Error('degenerate'); if(j.opportunity_histogram['1']!==1||j.opportunity_histogram['2']!==1) throw new Error('hist'); if(j.counts.hotspots!==0) throw new Error('hotspots'); console.log('ok')"` - expect `ok`.
- `grep -c 'DEGENERATE' .temp/superfix-verify/h1.md` - expect `1`.
- `printf '{"path":"a.ts","impact":5,"opportunity":4}\n' > .temp/superfix-verify/scores.ok.jsonl` then `node superfix/skills/code-auditor/scripts/rank.ts --scores .temp/superfix-verify/scores.ok.jsonl --out-json .temp/superfix-verify/h2.json --out-md .temp/superfix-verify/h2.md` then `node -e "const j=require('./.temp/superfix-verify/h2.json'); if(j.degenerate!==false) throw new Error('degenerate'); if(j.counts.hotspots!==1) throw new Error('hotspots'); if(j.hotspots[0].score!==20) throw new Error('score'); console.log('ok')"` - expect `ok`.
- `! grep -q 'DEGENERATE' .temp/superfix-verify/h2.md` - expect exit 0, i.e. no alarm line on a non-degenerate run.

### Approach
1. In `main`, after `rows` is built and before `counts` is assembled, compute an `opportunity_histogram` as a `Map` with string keys `"1"` through `"5"` in order, counting rows by their clamped `opportunity`, and a boolean `degenerate` that is true when `rows.length > 0` and the maximum `opportunity` across `rows` is below `args.minOpportunity`.
2. Set both onto the output map immediately after `counts`, so `hotlist.json` gains `opportunity_histogram` and `degenerate` and no existing key moves or changes.
3. When `degenerate` is true, push one line into `lines` directly after the existing `Scored N files ...` summary line: `DEGENERATE OPPORTUNITY DISTRIBUTION: no scored file reached min opportunity <N> (max was <M>). The per-file sweep returned no information - read the edge track before concluding "all clear".`
4. Leave `quadrant`, `reason`, the sort, the three-way partition, the `--top` cap and all table rendering untouched.
5. Extend the ``## Hotlist schema (`hotlist.json`)`` section of `scoring.md` with the two new fields and the `degenerate` definition; leave the rubric, combine formula, tie-breaking and "leave it" warning unchanged.

### Edge cases
- Zero scored rows - `degenerate` is `false` and the histogram is all zeros; an empty run is not a degenerate distribution, it is an empty one.
- All rows clearing `--min-opportunity` - `degenerate` is `false` and `hotlist.md` gains no extra line.
- Scores outside 1..5 - the histogram counts the clamped value, matching what every other field already reports.
- `pyJsonDumps` preserves `Map` insertion order, so histogram keys render as `"1"` through `"5"`.

### Contracts
Adds two top-level keys to `hotlist.json`: `opportunity_histogram` (object, keys `"1"`..`"5"`, integer counts) and `degenerate` (boolean). No existing key changes shape.

### DoD
The degenerate fixture yields `degenerate: true`, the histogram above, zero hotspots and one `DEGENERATE` line in `hotlist.md`; the non-degenerate fixture yields `degenerate: false`, one hotspot with `score` 20 and no `DEGENERATE` line; `scoring.md` documents both fields.


### Covered criteria
5. `rank.ts` emits `opportunity_histogram` and `degenerate` in `hotlist.json` and states the degenerate case in one line of `hotlist.md`; for a non-degenerate run its hotspot/overflow/skipped output is otherwise unchanged.
9. `scoring.md` documents the new `hotlist.json` fields and the `edges.json` schema; its 1-5 rubric, 2x2 gate, T=3 defaults and 5x2 "leave it" warning are unchanged.
