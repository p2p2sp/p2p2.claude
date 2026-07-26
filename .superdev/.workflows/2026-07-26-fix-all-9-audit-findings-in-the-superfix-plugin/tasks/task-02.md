
## Task 2 - fix(superfix): harden the ranking gates against off-spec and BOM-prefixed input
- Covers: criteria #2
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/skills/code-auditor/scripts/rank.ts (`loadJsonl`, `main`)
- modify - superfix/skills/code-auditor/scripts/rank_edges.ts (`loadJsonl`)

### Test Commands
*Build*
- `mkdir -p .temp/superfix-fix/t2 && printf '{"path":"a.ts","impact":5,"opportunity":5}\n{"path":"c.ts","impact":4,"opportunity":4}\n' > .temp/superfix-fix/t2/ok.jsonl && node superfix/skills/code-auditor/scripts/rank.ts --scores .temp/superfix-fix/t2/ok.jsonl --min-impact 3 --min-opportunity 3 --top 20 --run-id t2 --job bugs --out-json .temp/superfix-fix/t2/h.json --out-md .temp/superfix-fix/t2/h.md; echo "exit=$?"` - expect exit=0 (the script still runs on valid input).

*Tests*
- `printf '{"path":"a.ts","impact":5,"opportunity":5}\n[{"path":"b.ts"}]\n{"path":"c.ts","impact":4,"opportunity":4}\n' > .temp/superfix-fix/t2/bad.jsonl && node superfix/skills/code-auditor/scripts/rank.ts --scores .temp/superfix-fix/t2/bad.jsonl --min-impact 3 --min-opportunity 3 --top 20 --run-id t2 --job bugs --out-json .temp/superfix-fix/t2/h.json --out-md .temp/superfix-fix/t2/h.md 2> .temp/superfix-fix/t2/err.txt; echo "exit=$?"; grep -c 'warn: skipping' .temp/superfix-fix/t2/err.txt; grep -o '"scored": [0-9]*' .temp/superfix-fix/t2/h.json` - expect exit=0, a warn count of 1 whose text names the skipped record, and "scored": 2.
- `for v in null true 42 '"str"'; do printf '{"path":"a.ts","impact":5,"opportunity":5}\n%s\n' "$v" > .temp/superfix-fix/t2/v.jsonl; node superfix/skills/code-auditor/scripts/rank.ts --scores .temp/superfix-fix/t2/v.jsonl --min-impact 3 --min-opportunity 3 --top 20 --run-id t2 --job bugs --out-json .temp/superfix-fix/t2/h.json --out-md .temp/superfix-fix/t2/h.md >/dev/null 2>&1 || echo "CRASH on $v"; done; echo SHAPES-DONE` - expect SHAPES-DONE with no CRASH line.
- `printf '\357\273\277{"path":"a.ts","impact":5,"opportunity":5}\n{"path":"c.ts","impact":4,"opportunity":4}\n' > .temp/superfix-fix/t2/bom.jsonl && node superfix/skills/code-auditor/scripts/rank.ts --scores .temp/superfix-fix/t2/bom.jsonl --min-impact 3 --min-opportunity 3 --top 20 --run-id t2 --job bugs --out-json .temp/superfix-fix/t2/h.json --out-md .temp/superfix-fix/t2/h.md; grep -o '"scored": [0-9]*' .temp/superfix-fix/t2/h.json` - expect "scored": 2 (the BOM line is no longer dropped).
- `printf '\357\273\277{"a":"x.ts","b":"y.ts","via":"s.ts","vias":["s.ts"],"fanout":2,"shared":1}\n' > .temp/superfix-fix/t2/edges.jsonl && printf '{"a":"x.ts","b":"y.ts","verdict":"MISMATCH","reason":"r"}\n' > .temp/superfix-fix/t2/verdicts.jsonl && node superfix/skills/code-auditor/scripts/rank_edges.ts --edges .temp/superfix-fix/t2/edges.jsonl --verdicts .temp/superfix-fix/t2/verdicts.jsonl --top-edges 20 --run-id t2 --job bugs --out-json .temp/superfix-fix/t2/e.json --out-md .temp/superfix-fix/t2/e.md; echo "exit=$?"; grep -o '"unscored": [0-9]*' .temp/superfix-fix/t2/e.json` - expect exit=0 and "unscored": 0 (the BOM-prefixed edge record joins its verdict instead of being dropped).
- `rm -rf .temp/superfix-fix/t2 && echo CLEANUP-OK` - expect CLEANUP-OK.

### Approach
1. In `rank.ts` `main`, replace the `throw new TypeError(...)` guard for a non-Map `rec` with a `console.error` warn line built the same way as the existing `warn: skipping record without numeric impact/opportunity` line (via `pyRepr`), followed by `continue` - mirroring the `s instanceof Map` guard already used for the signals rows in the same function.
2. Delete the now-false comment above that guard claiming the throw mirrors an original Python crash; no Python source remains in the tree.
3. In `rank.ts` `loadJsonl`, set the `TextDecoder` option `ignoreBOM` to `false` so a leading byte-order mark is stripped instead of being fed into `parseJson`.
4. In `rank_edges.ts` `loadJsonl`, strip a leading byte-order mark from the decoded text alongside the existing CRLF normalisation; its row loops already guard non-object rows, so no other change is needed there.

### Edge cases
- `null`, `true`, a bare number, a bare string and a JSON array are all valid JSON and all must be skipped with a warning, not thrown on.
- A scores file that is entirely off-spec must still produce a valid, empty hotlist rather than a crash.
- BOM stripping must remove at most one leading marker and must leave a file without one byte-identical.
- The warn line must identify the skipped record so the operator can fix the input.

### Contracts
`scores.jsonl` / `edge_scores.jsonl` stay one-JSON-object-per-line as documented in `scoring.md`; this task only changes what happens to a line that violates that contract. No output schema field is added or removed.

### DoD
`rank.ts` exits 0 on every off-spec line shape, emits a warn line naming the skipped record, writes both outputs and reports the correct surviving count; both gates read a BOM-prefixed first line as data.


### Covered criteria
2. `rank.ts` exits 0 and writes both outputs when its scores file contains a line that is valid JSON but not an object, warning on stderr instead of throwing; and `rank.ts` and `rank_edges.ts` both parse a BOM-prefixed first line instead of discarding it.
