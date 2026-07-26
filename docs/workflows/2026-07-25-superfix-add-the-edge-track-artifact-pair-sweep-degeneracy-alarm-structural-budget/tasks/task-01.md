
## Task 1 - feat(superfix): add collect_edges.sh, the artifact-pair sweep
- Covers: criteria #1, #2
- TDD: none

### Dependencies
- none

### Files
- add - superfix/skills/code-auditor/scripts/collect_edges.sh (`esc`, `noise_filter`, `DENY_EXT`, candidate discovery, literal extraction, pair emission)

### Test Commands
*Build*
- `bash -n superfix/skills/code-auditor/scripts/collect_edges.sh` - expect no output, exit 0.

*Tests*
- `mkdir -p .temp/superfix-verify && bash superfix/skills/code-auditor/scripts/collect_edges.sh . > .temp/superfix-verify/edges.jsonl` - expect exit 0, non-empty file, stderr carrying the kept-literal count line.
- `node -e "const ls=require('fs').readFileSync('.temp/superfix-verify/edges.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse); if(!ls.length) throw new Error('no pairs'); for(const e of ls){ if(!(e.a<e.b)) throw new Error('unordered '+e.a+' '+e.b); if(e.fanout<2||e.fanout>8) throw new Error('fanout '+e.fanout); if(!e.via||!e.shared) throw new Error('missing via/shared'); } console.log('ok',ls.length)"` - expect `ok <n>`, exit 0.
- `bash superfix/skills/code-auditor/scripts/collect_edges.sh . --max-fanout 2 > .temp/superfix-verify/edges.k2.jsonl` then `node -e "const fs=require('fs'); const n=s=>fs.readFileSync(s,'utf8').split('\n').filter(Boolean); const k2=n('.temp/superfix-verify/edges.k2.jsonl').map(JSON.parse); if(k2.length>n('.temp/superfix-verify/edges.jsonl').length) throw new Error('not monotonic'); for(const e of k2){ if(e.fanout!==2) throw new Error('fanout '+e.fanout); } console.log('ok',k2.length)"` - expect `ok <n>`, exit 0.

### Approach
1. Reuse from `collect_signals.sh`, copied verbatim so the two sweeps cover the same universe: the unborn-HEAD guard, `esc()`, `DENY_EXT`, `noise_filter()`, and the two-pass candidate discovery (pass 1 discovers the repo's extension set, pass 2 selects files with a kept extension plus extensionless files, `git -c core.quotePath=false` on both, `kept_exts` handed to `awk` via `ENVIRON`).
2. Bind `ROOT` (default `.`) positionally and strip `--max-fanout <K>` (default 8) out of the positional stream before binding, the same way `collect_signals.sh` strips `--with-dependents`.
3. For every candidate file, extract path-like literals with `grep -oE '[A-Za-z0-9_][A-Za-z0-9_.-]*\.[A-Za-z0-9]{1,8}'`, lowercase the extension for the deny check, drop any token whose extension matches `DENY_EXT`, drop the token equal to the file's own basename, and emit `path<TAB>token` lines.
4. `sort -u` the stream, then with `awk` count distinct files per token and keep only tokens whose count is `>= 2` and `<= MAX_FANOUT`; report dropped-as-ambient and kept token counts on stderr.
5. For each kept token emit every unordered distinct pair with `a < b`; aggregate per pair across tokens so each pair appears once, setting `via` to the lowest-`fanout` linking token (ties broken by lexicographic token), `fanout` to that token's count, and `shared` to the number of distinct linking tokens; print one JSON line per pair with `esc()` applied to `a`, `b`, `via`.

### Edge cases
- Unborn HEAD - one explanatory stderr line, exit 1, no stdout, before any work; same contract as `collect_signals.sh`.
- No pairs found - empty stdout and exit 0. An empty edge track is a valid result, not an error.
- Token with fanout 1 produces no pair; token above `--max-fanout` is dropped as ambient (`package.json`, `README.md`) and counted on stderr.
- A file `grep` cannot read - one stderr warning naming the file, `continue`; the stream does not abort.
- Every `grep` / `git grep` / pipeline stage guarded with `|| true` so a no-match rc=1 does not trip `set -euo pipefail`.
- Non-ASCII paths - `-c core.quotePath=false` on both `git ls-files` passes, as in `collect_signals.sh`.

### Contracts
Introduces the edge record, one per line on stdout:
`{"a":"<path>","b":"<path>","via":"<literal>","fanout":<int>,"shared":<int>}` with `a < b` lexicographically. Consumed by the `edge-scout` agent (Task 2) and `rank_edges.ts` (Task 3).

### DoD
`bash -n` clean; running the script at this repo's root emits valid JSONL where every record satisfies `a < b`, `2 <= fanout <= 8`, and non-empty `via`; lowering `--max-fanout` monotonically reduces the record count.


### Covered criteria
1. `collect_edges.sh` emits one JSON line per candidate pair to stdout with `a`, `b`, `via`, `fanout`, `shared`; every line satisfies `a < b` lexicographically and `2 <= fanout <= --max-fanout`.
2. Pair discovery is stack-agnostic and deterministic: candidates come from path-like literals shared by two or more swept files, reusing `collect_signals.sh`'s deny-list, noise filter and portability conventions; no language-specific parsing, no `jq`.
