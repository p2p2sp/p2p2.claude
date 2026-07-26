
## Task 1 - fix(superfix): let the edge gate survive a legitimately empty sweep
- Covers: criteria #1
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/skills/code-auditor/scripts/rank_edges.ts (`loadJsonl`, `main`)

### Test Commands
*Build*
- `cd /Users/dario/Projects/p2p2.claude && node superfix/skills/code-auditor/scripts/rank_edges.ts; echo exit=$?` - prints USAGE, `exit=2`

*Tests*
- `cd /Users/dario/Projects/p2p2.claude && mkdir -p .temp/superfix-fix/t1 && : > .temp/superfix-fix/t1/edges.jsonl && node superfix/skills/code-auditor/scripts/rank_edges.ts --edges .temp/superfix-fix/t1/edges.jsonl --verdicts .temp/superfix-fix/t1/absent.jsonl --top-edges 20 --run-id t1 --job reliability/bugs --out-json .temp/superfix-fix/t1/edges.json --out-md .temp/superfix-fix/t1/edges.md; echo exit=$?` - `exit=0`, stdout `edges: 0 dispatched from 0 pairs (0 match, 0 unscored) -> …`, both output files written
- `cd /Users/dario/Projects/p2p2.claude && node superfix/skills/code-auditor/scripts/rank_edges.ts --edges .temp/superfix-fix/t1/absent.jsonl --verdicts .temp/superfix-fix/t1/edges.jsonl --out-json .temp/superfix-fix/t1/x.json --out-md .temp/superfix-fix/t1/x.md; echo exit=$?` - non-zero exit, ENOENT names the `--edges` path

### Approach
1. Give `loadJsonl(p: string, missingOk = false): Row[]` an early `if (missingOk && !fs.existsSync(p)) return []`, leaving the read otherwise uncaught.
2. In `main`, call it as `loadJsonl(args.verdicts, true)`; leave `args.edges` and `args.signals` calls unchanged.
3. Update the `loadJsonl` header comment: the verdicts file is absent exactly when the sweep found zero pairs, which `collect_edges.sh` documents as a valid result; every other input must still exist.

### Edge cases
- `--edges` present with rows, `--verdicts` absent: every pair becomes `unscored`, one stderr warning per pair - loud, not silent.
- An unreadable (not missing) verdicts file still throws.

### Contracts
- `loadJsonl(path, missingOk?)` -> `Row[]`; unchanged `edges.json` schema.

### DoD
Both test commands behave as stated and the zero-pair `edges.json` carries
`counts {pairs:0, match:0, mismatch:0, unclear:0, unscored:0, dispatch:0}` with `degree: []`.


### Covered criteria
1. `rank_edges.ts` given a readable `--edges` file and a nonexistent `--verdicts` path exits 0 and writes a
   well-formed `edges.json` + `edges.md`; a nonexistent `--edges` path still exits non-zero.
