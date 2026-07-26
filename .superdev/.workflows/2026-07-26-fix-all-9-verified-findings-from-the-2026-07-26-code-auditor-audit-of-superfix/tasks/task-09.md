
## Task 9 - fix(superfix): make the hotlist.json example in scoring.md reproducible
- Covers: criteria #11
- TDD: none

### Dependencies
- Task 5 - blocks: shares `scoring.md`
- Task 6 - blocks: shares `scoring.md`

### Files
- modify - superfix/skills/code-auditor/references/scoring.md (the `## Hotlist schema (hotlist.json)` example block)

### Test Commands
*Build*
- `cd /Users/dario/Projects/p2p2.claude && grep -n '"top":' superfix/skills/code-auditor/references/scoring.md` - shows the corrected cap

*Tests*
- `cd /Users/dario/Projects/p2p2.claude && mkdir -p .temp/superfix-fix/t9 && node -e 'const o=[];const h={1:14,2:8,3:6,4:8,5:6};for(const k of Object.keys(h))for(let i=0;i<h[k];i++)o.push(JSON.stringify({path:`f${k}_${i}.ts`,impact:5,opportunity:+k,impact_reason:"i",opportunity_reason:"o"}));require("fs").writeFileSync(".temp/superfix-fix/t9/s.jsonl",o.join("\n")+"\n")' && node superfix/skills/code-auditor/scripts/rank.ts --scores .temp/superfix-fix/t9/s.jsonl --min-impact 3 --min-opportunity 3 --top 18 --run-id ex --job reliability/bugs --out-json .temp/superfix-fix/t9/h.json --out-md .temp/superfix-fix/t9/h.md && node -e 'const c=require("/Users/dario/Projects/p2p2.claude/.temp/superfix-fix/t9/h.json");console.log(JSON.stringify(c.counts),JSON.stringify(c.opportunity_histogram),c.overflow[0].rank)'` - prints counts `{"scored":42,"hotspots":18,"overflow":2,"skipped":22}`, the histogram, and first overflow rank `19`
- `cd /Users/dario/Projects/p2p2.claude && grep -A24 'Hotlist schema' superfix/skills/code-auditor/references/scoring.md | grep -E '"top"|"counts"|"opportunity_histogram"|"rank":19'` - the example's numbers equal the command's output

### Approach
1. Set the example's `"top"` to 18 so `hotspots: 18` + `overflow: 2` with a first overflow `rank` of 19 is reachable.
2. Replace `opportunity_histogram` with a distribution that sums to 42 and supplies exactly 20 rows at opportunity >= 3 - `{"1":14,"2":8,"3":6,"4":8,"5":6}` - so `counts` and the histogram agree.
3. Leave the surrounding prose rules untouched; they were verified correct.

### Edge cases
- The example must stay consistent with the `--top` caps-dispatch-not-record rule stated above it.

### Contracts
- none

### DoD
Running `rank.ts` on the example's own histogram at its own `top` and gates reproduces the example's `counts`,
histogram and overflow rank.


### Covered criteria
11. `scoring.md`'s `hotlist.json` example is reproducible: feeding its own `opportunity_histogram` to `rank.ts`
    at its own `top` and gates yields its own `counts`, and its `overflow` row's `rank` is the first rank past
    the cap.
