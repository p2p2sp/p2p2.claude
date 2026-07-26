
## Task 7 - fix(superfix): make the edges.json example reproducible and scope the degree claim
- Covers: criteria #7
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/skills/code-auditor/references/scoring.md (the `edges.json` schema example block)
- modify - superfix/skills/code-auditor/SKILL.md (the Phase 3 sentence describing the degree list)

### Test Commands
*Build*
- none - markdown-only change; this repo has no build step.

*Tests*
- `node -e 'const F=String.fromCharCode(96).repeat(3);const t=require("fs").readFileSync("superfix/skills/code-auditor/references/scoring.md","utf8");const b=t.split(F+"json\n").slice(1).map(x=>x.split(F)[0]);const o=JSON.parse(b[b.length-1]);const ok=o.counts.match===o.match.length&&o.counts.no_contract===o.no_contract.length;console.log(ok?"EXAMPLE-CONSISTENT":"EXAMPLE-BROKEN");process.exit(ok?0:1)'` - expect EXAMPLE-CONSISTENT and exit 0; this parses the example, so it also proves the block is still valid JSON and subsumes any grep on the individual buckets.
- `grep -q 'degree (pair count) of every path' superfix/skills/code-auditor/SKILL.md && echo STILL-THERE || echo SCOPED-OK` - expect SCOPED-OK.

### Approach
1. In `references/scoring.md`'s `edges.json` example, give the `match` array and the `no_contract` array one representative row each, using the same field set as a bucket row (`a`, `b`, `via`, `shared`, `verdict`, `pair_impact`, `reason`), so each array length equals its own counter.
2. Leave `overflow` empty - it genuinely is at `top_edges: 20` - and leave the one-row `dispatch` and one-row `degree` abbreviations alone; the audit refuted those as defects, they are the file's established house style.
3. In `SKILL.md` Phase 3, change the description of the degree list from the structural degree of every path to the top 20 highest-degree paths, matching `scoring.md` and the script's 20-row cap.

### Edge cases
- The example must stay valid JSON - the first test command parses it.
- The two added rows must not carry `rank`: `rank_edges.ts` assigns `rank` only to ranked rows, never to the match or no_contract buckets.

### Contracts
Documents the existing `edges.json` schema emitted by `rank_edges.ts`; adds no field and changes no behaviour.

### DoD
The example parses and satisfies both count-versus-array invariants, and `SKILL.md` no longer overstates the degree list's coverage.


### Covered criteria
7. `scoring.md`'s `edges.json` example satisfies `counts.match == match.length` and `counts.no_contract == no_contract.length`; `SKILL.md` no longer claims the degree list reports every path.
