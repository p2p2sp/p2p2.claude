
## Task 2 - fix(superfix): escape markdown table cells in both ranking gates
- Covers: criteria #2
- TDD: none

### Dependencies
- Task 1 - blocks: shares `rank_edges.ts`, land the loader change first

### Files
- modify - superfix/skills/code-auditor/scripts/rank_edges.ts (new `mdCell` helper; the three `lines.push` row templates)
- modify - superfix/skills/code-auditor/scripts/rank.ts (new `mdCell` helper; the three `lines.push` row templates)

### Test Commands
*Build*
- `cd /Users/dario/Projects/p2p2.claude && node superfix/skills/code-auditor/scripts/rank.ts; echo exit=$?` - usage error, non-zero exit

*Tests*
- `cd /Users/dario/Projects/p2p2.claude && mkdir -p .temp/superfix-fix/t2 && printf '{"a":"x.ts","b":"y.ts","via":"user.dto.ts","fanout":2,"shared":1}\n' > .temp/superfix-fix/t2/e.jsonl && printf '{"a":"x.ts","b":"y.ts","verdict":"MISMATCH","reason":"dto declares --a|--b but schema knows --a"}\n' > .temp/superfix-fix/t2/v.jsonl && node superfix/skills/code-auditor/scripts/rank_edges.ts --edges .temp/superfix-fix/t2/e.jsonl --verdicts .temp/superfix-fix/t2/v.jsonl --top-edges 20 --run-id t2 --job j --out-json .temp/superfix-fix/t2/edges.json --out-md .temp/superfix-fix/t2/edges.md && sed 's/\\[|]//g' .temp/superfix-fix/t2/edges.md | awk -F'|' '/^\| 1 \|/ {print NF-2}'` - prints `8` (the `sed` drops escaped pipes first, since `awk -F'|'` splits on them too)
- `cd /Users/dario/Projects/p2p2.claude && grep -cF 'declares --a\|--b' .temp/superfix-fix/t2/edges.md` - prints `1`; the same grep printed `0` before this task, which is what discriminates the fix
- `cd /Users/dario/Projects/p2p2.claude && grep -cF 'declares --a|--b' .temp/superfix-fix/t2/edges.json` - prints `1` (raw value unescaped in JSON)
- `cd /Users/dario/Projects/p2p2.claude && printf '{"path":"x.ts","impact":4,"opportunity":4,"impact_reason":"core","opportunity_reason":"flag --a|--b drift"}\n' > .temp/superfix-fix/t2/s.jsonl && node superfix/skills/code-auditor/scripts/rank.ts --scores .temp/superfix-fix/t2/s.jsonl --min-impact 3 --min-opportunity 3 --top 20 --run-id t2 --job j --out-json .temp/superfix-fix/t2/hotlist.json --out-md .temp/superfix-fix/t2/hotlist.md && sed 's/\\[|]//g' .temp/superfix-fix/t2/hotlist.md | awk -F'|' '/^\| 1 \|/ {print NF-2}'` - prints `6`
- `cd /Users/dario/Projects/p2p2.claude && grep -cF 'flag --a\|--b drift' .temp/superfix-fix/t2/hotlist.md` - prints `1`

### Approach
1. Add `function mdCell(s: string): string` to both scripts - replace `|` with `\|` and any `\r`/`\n` with a single space; document it as markdown-surface only.
2. In `rank_edges.ts`, wrap `r.reason` and `r.via` with `mdCell(...)` in the dispatch, overflow and match row templates.
3. In `rank.ts`, wrap the `reason` value (and `path`) with `mdCell(...)` in the hotspots, overflow and skipped row templates, keeping the existing `pyStr` call inside.
4. Leave every `JSON.stringify` / `pyJsonDumps` path untouched so the JSON outputs keep the raw value.

### Edge cases
- A reason containing several pipes: one row, all pipes escaped.
- A reason containing a newline: collapsed to a space, row stays on one line.

### Contracts
- `mdCell(string) -> string`; JSON schemas unchanged.

### DoD
Both cell-count assertions print the header's column count, both escaped-pipe greps find the escape, and the
JSON output still carries the raw unescaped text.


### Covered criteria
2. A `reason` or `via` value containing `|` produces a table row in `edges.md` / `hotlist.md` with exactly as
   many cells as the header, and the raw unescaped value survives in `edges.json` / `hotlist.json`.
