
## Task 6 - fix(superfix): render the degree list in edges.md and escape its path cells
- Covers: criteria #6
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/skills/code-auditor/scripts/rank_edges.ts (the `edges.md` writer block in `main`, using the existing `mdCell` helper)
- modify - superfix/skills/code-auditor/references/scoring.md (the sentence enumerating what `edges.md` renders)

### Test Commands
*Build*
- `mkdir -p .temp/superfix-fix/t6 && printf '{"a":"src/a|b.ts","b":"src/c.ts","via":"shared.dto.ts","vias":["shared.dto.ts"],"fanout":2,"shared":1}\n' > .temp/superfix-fix/t6/edges.jsonl && printf '{"a":"src/a|b.ts","b":"src/c.ts","verdict":"MISMATCH","reason":"dto shape differs"}\n' > .temp/superfix-fix/t6/verdicts.jsonl && node superfix/skills/code-auditor/scripts/rank_edges.ts --edges .temp/superfix-fix/t6/edges.jsonl --verdicts .temp/superfix-fix/t6/verdicts.jsonl --top-edges 20 --run-id t6 --job bugs --out-json .temp/superfix-fix/t6/edges.json --out-md .temp/superfix-fix/t6/edges.md; echo "exit=$?"` - expect exit=0.

*Tests*
- `grep -cF 'src/a|b.ts' .temp/superfix-fix/t6/edges.md` - expect 0; grep exits 1 when it finds nothing and that is the pass. No table cell anywhere in the file may carry the raw pipe, so this one assertion covers the dispatch row and the degree row alike and cannot be satisfied by escaping only one of them.
- `grep -cF 'src/a\|b.ts' .temp/superfix-fix/t6/edges.md` - expect 2 with this single-record fixture (the same path escaped twice: once in the dispatch row, once in the degree row, since `degree` is built from both endpoints of every edge record). Do not add a second record to the fixture without adjusting this count.
- `grep -ci degree .temp/superfix-fix/t6/edges.md` - expect a non-zero count.
- `grep -cF '"a": "src/a|b.ts"' .temp/superfix-fix/t6/edges.json` - expect 1 (the JSON output keeps the raw, unescaped path; pinning the `a` field avoids also matching the `degree[].path` entry).
- `printf '' > .temp/superfix-fix/t6/empty.jsonl && node superfix/skills/code-auditor/scripts/rank_edges.ts --edges .temp/superfix-fix/t6/empty.jsonl --verdicts .temp/superfix-fix/t6/empty.jsonl --top-edges 20 --run-id t6e --job bugs --out-json .temp/superfix-fix/t6/e2.json --out-md .temp/superfix-fix/t6/e2.md; echo "exit=$?"; grep -ci degree .temp/superfix-fix/t6/e2.md` - expect exit=0 and 0 (no empty degree block; the trailing grep exits 1, which is the pass).
- `grep -c 'blocks for .*degree' superfix/skills/code-auditor/references/scoring.md` - expect 1; the pattern requires the enumeration sentence to name the degree block, so it fails before the edit and passes only after it.
- `rm -rf .temp/superfix-fix/t6 && echo CLEANUP-OK` - expect CLEANUP-OK.

### Approach
1. In `rank_edges.ts`'s markdown writer, wrap `r.a` and `r.b` in the existing `mdCell` helper at all four table-row call sites (dispatch, overflow, match, no_contract), matching how `via` and `reason` are already handled there.
2. After the existing details blocks, push a details block summarised as the structural degree list (top 20 paths by pair count) containing a two-column Path / Degree table built from the `degree` array, emitted only when that array is non-empty, with each path passed through `mdCell`.
3. Update the comment above the writer to name the degree block alongside overflow, match and no_contract.
4. In `references/scoring.md`, extend the sentence describing what `edges.md` renders so it names the degree block, resolving its contradiction with SKILL.md's promise of the structural degree list. That sentence currently wraps across two physical lines with "blocks for" opening the second one - keep the word "degree" on that same line so the line-based assertion can see it.

### Edge cases
- An empty `degree` array (no edge records at all) must emit no block and no empty table.
- A path containing a pipe must render escaped in every one of the four existing tables plus the new degree table.
- `edges.json` keeps the raw unescaped path - `mdCell` is markdown-surface only, as its own comment states.
- The degree list stays capped at 20 rows; the block must not imply it shows every path.

### Contracts
`edges.json` schema is unchanged - it already carries `degree`; only `edges.md` gains a section.

### DoD
`edges.md` contains the degree block and escaped path cells, `edges.json` still carries the raw path, an empty run emits no degree block, and `scoring.md`'s enumeration matches what the writer emits.


### Covered criteria
6. `edges.md` contains the structural degree list, and every A/B cell is markdown-escaped like the Via/Reason cells already are.
