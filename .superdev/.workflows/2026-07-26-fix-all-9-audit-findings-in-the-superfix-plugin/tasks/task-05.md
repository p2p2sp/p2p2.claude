
## Task 5 - fix(superfix): document the full edge record and its verbatim handoff in SKILL.md
- Covers: criteria #5
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/skills/code-auditor/SKILL.md (Phase 1 edge-sweep paragraph, Phase 2 edge-scout bullet)

### Test Commands
*Build*
- none - markdown-only change; this repo has no build step.

*Tests*
- `node -e 'const t=require("fs").readFileSync("superfix/skills/code-auditor/SKILL.md","utf8");const q=String.fromCharCode(96);const miss=["a","b","via","vias","fanout","shared"].filter(k=>!t.includes(q+k+q));console.log(miss.length?"MISSING "+miss.join(","):"KEYCHECK-OK")'` - expect KEYCHECK-OK.
- `bash superfix/skills/code-auditor/scripts/collect_edges.sh "$PWD/superfix" --max-fanout 8 | head -1 | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(Object.keys(JSON.parse(s)).sort().join(",")))'` - expect a,b,fanout,shared,via,vias, matching the key list now written in SKILL.md.
- `grep -n 'verbatim' superfix/skills/code-auditor/SKILL.md` - expect at least one match, on the Phase 2 edge-scout bullet; the file contains no occurrence today.

### Approach
1. In `superfix/skills/code-auditor/SKILL.md` Phase 1, change the sentence describing `collect_edges.sh`'s output to list all six emitted keys - `a`, `b`, `via`, `vias`, `fanout`, `shared` - and say what `vias` is: up to 3 ranked linking-literal candidates, with `via` always the first of them.
2. In the same sentence, point at `references/scoring.md` as the full edge-record schema, so the reference list at the end of the file is not the only route to it.
3. In Phase 2's edge-scout bullet, state that the edge record line from `edges.jsonl` is handed to the scout verbatim and is the single source of truth, mirroring the wording the file track already uses for signal lines.

### Edge cases
- `fanout` stays in the list even though `rank_edges.ts` does not project it - the paragraph documents the producer's output, not the gate's projection.
- The wording must not claim `edges.json` carries `vias`; `scoring.md` already records that the gate projects only `via` and `shared`.

### Contracts
Consumes `collect_edges.sh`'s six-key edge record and `agents/edge-scout.md`'s stated input (`a`, `b`, `via`, `vias`, `shared`); introduces no new field.

### DoD
`SKILL.md` names all six keys, states the verbatim handoff, and its key list matches the keys a live `collect_edges.sh` run emits.


### Covered criteria
5. `SKILL.md` Phase 1 lists all six keys `collect_edges.sh` emits per edge record (`a`, `b`, `via`, `vias`, `fanout`, `shared`) and states the record is handed to the edge-scout verbatim.
