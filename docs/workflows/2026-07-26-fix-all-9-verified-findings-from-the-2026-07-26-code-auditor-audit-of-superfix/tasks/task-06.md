
## Task 6 - feat(superfix): give the edge track a NO_CONTRACT verdict
- Covers: criteria #8
- TDD: none

### Dependencies
- Task 2 - blocks: shares `rank_edges.ts` row rendering
- Task 5 - blocks: shares `edge-scout.md` and `scoring.md`'s edge sections

### Files
- modify - superfix/agents/edge-scout.md (`## What to do` step 3, `## Output`, `## Hard rules`)
- modify - superfix/skills/code-auditor/scripts/rank_edges.ts (`VALID_VERDICTS`, `main`'s bucket loop, `counts`, the `edges.md` sections)
- modify - superfix/skills/code-auditor/references/scoring.md (`## Edge gate (edges.json)` verdict prose, `edges.json` schema block)
- modify - superfix/skills/code-auditor/SKILL.md (Phase 2 edge paragraph, Phase 3 `rank_edges.ts` paragraph, Phase 4 dispatch bullet, `## Output the user sees` item 2)

### Test Commands
*Build*
- `cd /Users/dario/Projects/p2p2.claude && node superfix/skills/code-auditor/scripts/rank_edges.ts; echo exit=$?` - usage error, `exit=2`

*Tests*
- `cd /Users/dario/Projects/p2p2.claude && mkdir -p .temp/superfix-fix/t6 && printf '{"a":"a.ts","b":"b.ts","via":"u.dto.ts","vias":["u.dto.ts"],"fanout":2,"shared":1}\n{"a":"c.ts","b":"d.ts","via":"Array.from","vias":["Array.from"],"fanout":2,"shared":1}\n' > .temp/superfix-fix/t6/e.jsonl && printf '{"a":"a.ts","b":"b.ts","verdict":"MISMATCH","reason":"dto adds a field"}\n{"a":"c.ts","b":"d.ts","verdict":"NO_CONTRACT","reason":"shared literal is a language builtin"}\n' > .temp/superfix-fix/t6/v.jsonl && node superfix/skills/code-auditor/scripts/rank_edges.ts --edges .temp/superfix-fix/t6/e.jsonl --verdicts .temp/superfix-fix/t6/v.jsonl --top-edges 20 --run-id t6 --job j --out-json .temp/superfix-fix/t6/edges.json --out-md .temp/superfix-fix/t6/edges.md && node -e 'const c=require("/Users/dario/Projects/p2p2.claude/.temp/superfix-fix/t6/edges.json");console.log(JSON.stringify(c.counts), c.dispatch.length, c.no_contract.length)'` - `counts` shows `no_contract:1`, `dispatch` length `1`, `no_contract` length `1`, and the five count members sum to `pairs`
- `cd /Users/dario/Projects/p2p2.claude && grep -c 'NO_CONTRACT\|no contract' .temp/superfix-fix/t6/edges.md` - at least `1`; the `Match (contract confirmed` block does not contain the `c.ts` row
- `cd /Users/dario/Projects/p2p2.claude && grep -rc 'NO_CONTRACT' superfix/agents/edge-scout.md superfix/skills/code-auditor/references/scoring.md superfix/skills/code-auditor/SKILL.md` - each at least `1`

### Approach
1. In `edge-scout.md`, split the current `MATCH` bullet: `MATCH` means only "both sides agree"; add `NO_CONTRACT` for "the shared literal is coincidental - no contract to check"; update the `## Output` verdict union and the hard rule that today routes coincidence into `MATCH`.
2. In `rank_edges.ts`, add `NO_CONTRACT` to `VALID_VERDICTS`, push those rows into a new `noContractBucket` beside `matchBucket`, add `no_contract` to `counts` and a top-level `no_contract` array to the emitted object.
3. Render the new bucket in `edges.md` as its own `<details>` block titled as no-contract (not dispatched), leaving the `MATCH` block's title accurate.
4. In `scoring.md`, extend the verdict sentence to the four-value set, state that an out-of-set string is still coerced to `UNCLEAR`, update the counts identity and the `edges.json` schema block.
5. In `SKILL.md`, update the Phase 2 verdict sentence, the Phase 3 sentence that says the gate drops `MATCH`, the Phase 4 dispatch bullet, and the Output item so all four verdicts appear consistently.

### Edge cases
- A verdict string outside the four values: still coerced to `UNCLEAR` with the existing stderr warning.
- A run with only `NO_CONTRACT` verdicts: `dispatch` and `overflow` empty, exit 0, `edges.md` still written.
- Old verdict files with three-value vocabulary keep working unchanged.

### Contracts
- Verdict vocabulary: `MATCH | MISMATCH | UNCLEAR | NO_CONTRACT`.
- `edges.json` gains `counts.no_contract` and a `no_contract[]` array; `dispatch`/`overflow`/`match`/`degree` unchanged.

### DoD
The fixture yields the counts identity with `no_contract:1`, the no-contract pair is absent from `dispatch`,
`overflow` and the `MATCH` block, and all four files name the new verdict.


### Covered criteria
8. `edge-scout` can return `NO_CONTRACT`; `rank_edges.ts` counts it in its own bucket, keeps it out of
   `dispatch` and `overflow`, satisfies
   `counts.match + counts.mismatch + counts.unclear + counts.no_contract + counts.unscored == counts.pairs`,
   and no row whose reason denies a contract lands under the `MATCH` heading.
