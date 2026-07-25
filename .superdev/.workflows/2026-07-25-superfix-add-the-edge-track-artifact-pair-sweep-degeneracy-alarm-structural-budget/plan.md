# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "superfix: add the edge track - artifact-pair sweep, degeneracy alarm, structural budget"

---
<!-- HEADER -->

## Goal
`code-auditor` sweeps two units in every run: files (unchanged) and producer/consumer **pairs**. A contract defect that lives between two individually-correct files is now reachable: `collect_edges.sh` discovers candidate pairs deterministically, a cheap `edge-scout` classifies each pair `MATCH` / `MISMATCH` / `UNCLEAR`, `rank_edges.ts` ranks the non-`MATCH` ones by a deterministic pair-Impact, and detectives are dispatched to the union of file hotspots, edge hotspots, and a small budget of highest-degree files. `rank.ts` additionally reports when the per-file Opportunity distribution is degenerate, so a zero-hotspot run names itself instead of reading as "all clear".

## Context
Run `2026-07-25-superui` passed 0 of 32 files through the standard gate (28 files scored Opportunity 1, 4 scored 2, none reached 3), yet the two heaviest findings (SEV 5.5 and 5.0) came from dispatches made outside the gate. Both were contract mismatches between two files that are each correct in isolation, so no per-file scout could see them - the scouts answered correctly within their contract. This is an observability failure, not a calibration failure: the unit of assessment is the file, and the defect is not a property of any file. Lowering the threshold does not fix it (at T=1 all 32 files pass and the gate means nothing). The fix is a second unit of assessment. Source note: `.temp/code-reviewer/2026-07-25-superui/gate-observations.md`.

Two deviations from the interview worth flagging at approval: (1) `rank_edges.ts` writes its own `hotlist/edges.md` instead of appending a section to `hotlist.md` - appending is not idempotent on a re-run and `rank.ts` overwrites `hotlist.md` wholesale, which would make script ordering load-bearing; (2) `scoring.md` gets new schema sections documenting the fields `rank.ts` and `rank_edges.ts` emit, but its 1-5 rubric, 2x2 gate, T=3 defaults and "leave it" warning are untouched, exactly as decided.

## Acceptance criteria
1. `collect_edges.sh` emits one JSON line per candidate pair to stdout with `a`, `b`, `via`, `fanout`, `shared`; every line satisfies `a < b` lexicographically and `2 <= fanout <= --max-fanout`.
2. Pair discovery is stack-agnostic and deterministic: candidates come from path-like literals shared by two or more swept files, reusing `collect_signals.sh`'s deny-list, noise filter and portability conventions; no language-specific parsing, no `jq`.
3. A new `edge-scout` agent returns one strict-JSON line per pair carrying `verdict` of exactly `MATCH`, `MISMATCH` or `UNCLEAR`, echoes `a`/`b` byte-identical, and is registered in `superfix/.claude-plugin/plugin.json` `agents[]`.
4. `rank_edges.ts` drops `MATCH` verdicts, orders the rest by verdict class then a pair-Impact computed only from both endpoints' signals, caps dispatch with `--top-edges`, and writes `hotlist/edges.json` plus `hotlist/edges.md`.
5. `rank.ts` emits `opportunity_histogram` and `degenerate` in `hotlist.json` and states the degenerate case in one line of `hotlist.md`; for a non-degenerate run its hotspot/overflow/skipped output is otherwise unchanged.
6. `SKILL.md` runs the edge track unconditionally alongside the file track and dispatches detectives to the union of file hotspots, edge dispatch rows, and a degree budget of 2 highest-degree files from `edges.json` `degree[]` that are not already in that union. The degree budget is a `SKILL.md`-level rule read off `degree[]`, not a script flag.
7. `SKILL.md` states the real concurrency ceiling of 16 concurrent subagents instead of "tens at a time is normal", for both waves.
8. A detective dispatched from an edge receives both endpoints as entry points, and `synthesis.md`'s `ENTRY:` field accepts a pair.
9. `scoring.md` documents the new `hotlist.json` fields and the `edges.json` schema; its 1-5 rubric, 2x2 gate, T=3 defaults and 5x2 "leave it" warning are unchanged.
10. `superfix/CLAUDE.md` and the root `CLAUDE.md` list `edge-scout` and describe the pipeline as two-track.

<!-- /HEADER -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - feat(superfix): add the edge-scout agent
- Covers: criteria #3
- TDD: none

### Dependencies
- Task 1 - blocks: the agent's input is the edge record shape it defines.

### Files
- add - superfix/agents/edge-scout.md (frontmatter `name`/`description`/`model`/`tools`, `## Inputs you are given`, `## What to do`, `## Output`, `## Hard rules`)
- modify - superfix/.claude-plugin/plugin.json (`agents[]`)

### Test Commands
*Build*
- `node -e "JSON.parse(require('fs').readFileSync('superfix/.claude-plugin/plugin.json','utf8')); console.log('ok')"` - expect `ok`.

*Tests*
- `grep -c 'edge-scout' superfix/.claude-plugin/plugin.json` - expect `1`.
- `head -6 superfix/agents/edge-scout.md` - expect frontmatter with `model: haiku` and `tools: Read, Grep, Glob`.

### Approach
1. Write `superfix/agents/edge-scout.md` mirroring `superfix/agents/scout.md`'s shape: `model: haiku`, `tools: Read, Grep, Glob`, `description` carrying the routing guard "Invoked only by the code-auditor skill, never directly."
2. State the inputs: one edge record (`a`, `b`, `via`, `shared`) and the run's `job.md`; state the single question - does the shape one end writes match the shape the other end reads, with `via` as the thing that crosses between them.
3. Specify the output as one strict-JSON line, `{"a":"<path>","b":"<path>","verdict":"MATCH|MISMATCH|UNCLEAR","reason":"<=20 words"}`, with `a` and `b` echoed byte-identical to the input record because they are the join key; for a batch of records emit one such line per pair, matching the batch clause in `superfix/agents/scout.md`.
4. Write the anti-degeneracy rule as a hard rule: `MATCH` requires positively confirming both sides agree; not having read enough to confirm is `UNCLEAR`, never `MATCH`; deep tracing means stop and return `UNCLEAR` because that is the detective's job.
5. Add `"./agents/edge-scout.md"` to `agents[]` in `superfix/.claude-plugin/plugin.json`.

### Edge cases
- One or both endpoints unreadable - `UNCLEAR` with reason `"unreadable"`; never fabricate a verdict.
- Endpoints that turn out not to share a real contract (the literal was coincidental) - `MATCH` with the reason naming the coincidence, so `rank_edges.ts` filters it out.
- No file writes: the agent has no `Write` or `Bash` tool, matching `scout.md`.

### Contracts
Introduces the edge verdict record, one per line in the agent's final message:
`{"a":"<path>","b":"<path>","verdict":"MATCH|MISMATCH|UNCLEAR","reason":"<text>"}`. Consumed by `rank_edges.ts` (Task 3) after the skill appends it to `scores/edge_scores.jsonl`.

### DoD
`plugin.json` parses and lists `./agents/edge-scout.md`; the agent file exists with the frontmatter above and states the `MATCH`-requires-confirmation rule.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - feat(superfix): add rank_edges.ts, the deterministic edge gate
- Covers: criteria #4, #9
- TDD: none

### Dependencies
- Task 1 - blocks: reads the edge records it emits.
- Task 2 - blocks: reads the edge verdict records it emits.

### Files
- add - superfix/skills/code-auditor/scripts/rank_edges.ts (`parseArgs`, `loadJsonl`, `pairImpact`, `main`)
- modify - superfix/skills/code-auditor/references/scoring.md (new section `## Edge gate (edges.json)`)

### Test Commands
*Build*
- `sh superfix/skills/code-auditor/scripts/check_node.sh` - expect `NODE_OK node` or `NODE_OK node --experimental-strip-types`; use the returned command wherever `node` appears below.

*Tests*
- `mkdir -p .temp/superfix-verify && printf '{"a":"x.ts","b":"y.ts","verdict":"MISMATCH","reason":"shape differs"}\n{"a":"p.ts","b":"q.ts","verdict":"MATCH","reason":"agree"}\n{"a":"r.ts","b":"s.ts","verdict":"UNCLEAR","reason":"could not settle"}\n' > .temp/superfix-verify/edge_scores.jsonl` then `printf '{"a":"x.ts","b":"y.ts","via":"d.json","fanout":2,"shared":1}\n{"a":"p.ts","b":"q.ts","via":"e.json","fanout":2,"shared":1}\n{"a":"r.ts","b":"s.ts","via":"f.json","fanout":3,"shared":2}\n' > .temp/superfix-verify/edges.fixture.jsonl` then `printf '{"path":"x.ts","churn":9,"fix_commits":1,"recency_days":2,"loc":100,"dependents":4}\n{"path":"y.ts","churn":1,"fix_commits":0,"recency_days":9,"loc":50,"dependents":1}\n{"path":"r.ts","churn":0,"fix_commits":0,"recency_days":-1,"loc":10,"dependents":-1}\n{"path":"s.ts","churn":0,"fix_commits":0,"recency_days":-1,"loc":10,"dependents":-1}\n' > .temp/superfix-verify/signals.fixture.jsonl`
- `node superfix/skills/code-auditor/scripts/rank_edges.ts --edges .temp/superfix-verify/edges.fixture.jsonl --verdicts .temp/superfix-verify/edge_scores.jsonl --signals .temp/superfix-verify/signals.fixture.jsonl --top-edges 20 --run-id t1 --job reliability/bugs --out-json .temp/superfix-verify/edges.json --out-md .temp/superfix-verify/edges.md` - expect a one-line stdout summary and exit 0.
- `node -e "const j=require('./.temp/superfix-verify/edges.json'); if(j.counts.match!==1) throw new Error('match'); if(j.dispatch.length!==2) throw new Error('dispatch'); if(j.dispatch[0].verdict!=='MISMATCH') throw new Error('order'); if(j.dispatch[0].pair_impact!==15) throw new Error('impact '+j.dispatch[0].pair_impact); if(!j.degree.length) throw new Error('degree'); console.log('ok')"` - expect `ok`.

### Approach
1. Write `rank_edges.ts` as native TypeScript run by Node type stripping - a plain flag loop for `parseArgs`, `JSON.parse` per line for `loadJsonl`, `JSON.stringify(x, null, 2)` for output. Do not port anything from `rank.ts`'s Python-compat layer.
2. Accept `--edges`, `--verdicts`, `--signals`, `--top-edges` (default 20), `--run-id`, `--job`, `--out-json`, `--out-md`; require `--edges`, `--verdicts`, `--out-json`, `--out-md` and exit 2 with a usage line otherwise.
3. Implement `pairImpact(a, b, signals)` as `churn_a + churn_b + dependents_a + dependents_b`, treating a missing row or a `-1` sentinel as 0. Use only Impact-side signals: `fix_commits` is an Opportunity prior and the edge track carries no Opportunity axis.
4. Join verdicts to edge records on the `a`+`b` pair; drop `MATCH` rows into a `match` bucket; sort the rest by verdict class (`MISMATCH` before `UNCLEAR`), then `pair_impact` descending, then `shared` descending, then `a` and `b` lexicographically; assign `rank` over the whole sorted list, then split at `--top-edges` into `dispatch` and `overflow`.
5. Compute `degree` from the full edge record set as the count of pairs each path participates in, sorted descending and capped at 20 rows; write `edges.json` with `run_id`, `job`, `top_edges`, `counts` (`pairs`, `match`, `mismatch`, `unclear`, `unscored`, `dispatch`), `dispatch[]`, `overflow[]`, `match[]`, `degree[]`, and write `edges.md` as a ranked table plus a `<details>` block for `match`.
6. Add a `## Edge gate (edges.json)` section to `scoring.md` documenting the edge record, the verdict record, the `pairImpact` formula, the sort order, and the `edges.json` field list; change nothing in the existing rubric, combine-formula, tie-breaking or hotlist sections.

### Edge cases
- A verdict with no matching edge record, or an edge record with no verdict - counted in `counts.unscored`, warned once on stderr naming the pair, never dispatched.
- A verdict string outside the three allowed values - warn on stderr and treat it as `UNCLEAR`, because discarding it would silently lose a pair.
- Missing `--signals` or a path absent from it - `pair_impact` falls back to 0; ranking still runs and stays deterministic through the lexicographic tie-break.
- Empty `--edges` or `--verdicts` - write both outputs with zero rows and exit 0; an empty edge track is a valid result.
- Malformed JSONL line - warn on stderr with the line number and continue, matching `rank.ts`'s `loadJsonl` behaviour.

### Contracts
Introduces `edges.json`: `{run_id, job, top_edges, counts:{pairs,match,mismatch,unclear,unscored,dispatch}, dispatch:[{rank,a,b,via,shared,verdict,pair_impact,reason}], overflow:[...], match:[...], degree:[{path,degree}]}`. Consumes the Task 1 edge record and the Task 2 verdict record. `degree[]` is consumed by `SKILL.md`'s structural budget (Task 5).

### DoD
The fixture run above produces `edges.json` with `counts.match == 1`, two dispatch rows ordered `MISMATCH` before `UNCLEAR`, `pair_impact == 15` on the top row, a non-empty `degree[]`, and a rendered `edges.md`; `scoring.md` carries the new section with its pre-existing sections untouched.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - feat(superfix): run the edge track in the code-auditor pipeline
- Covers: criteria #6, #7
- TDD: none

### Dependencies
- Task 1 - blocks: the Phase 1 edge sweep command.
- Task 2 - blocks: the Phase 2 edge-scout fan-out.
- Task 3 - blocks: the Phase 3 edge gate command and the `degree[]` budget source.

### Files
- modify - superfix/skills/code-auditor/SKILL.md (`### Phase 0 - Frame`, `### Phase 1 - Sweep (cheap signal collection)`, `### Phase 2 - Score (fan out the scouts, cheap model)`, `### Phase 3 - Gate (drop the noise, build the hotlist)`, `### Phase 4 - Dispatch detectives (frontier model, top-N only)`, `## Output the user sees`, `## Subagents this skill drives`)

### Test Commands
*Build*
- `head -7 superfix/skills/code-auditor/SKILL.md` - expect the frontmatter block unchanged.

*Tests*
- `grep -c 'collect_edges.sh' superfix/skills/code-auditor/SKILL.md` - expect at least `1`.
- `grep -c 'rank_edges.ts' superfix/skills/code-auditor/SKILL.md` - expect at least `1`.
- `grep -c 'edge-scout' superfix/skills/code-auditor/SKILL.md` - expect at least `2`.
- `! grep -q 'tens at a time is normal' superfix/skills/code-auditor/SKILL.md` - expect exit 0, i.e. the claim is gone.
- `grep -c '16 concurrent' superfix/skills/code-auditor/SKILL.md` - expect at least `1`.
- `grep -c 'with-dependents' superfix/skills/code-auditor/SKILL.md` - expect at least `1`.
- `grep -c 'degree' superfix/skills/code-auditor/SKILL.md` - expect at least `1`.

### Approach
1. Phase 0 - extend the `mkdir -p` workspace line so it also creates `worktrees`, and state that the run sweeps two units, files and pairs.
2. Phase 1 - add `--with-dependents` to the existing `collect_signals.sh` invocation so the `dependents` prior `scoring.md` already tells scouts to use stops being `-1`, and add a second command block running `collect_edges.sh <repo-root> --max-fanout 8 > .temp/code-reviewer/<run-id>/signals/edges.jsonl`.
3. Phase 2 - after the existing scout instructions, add the edge fan-out: one `edge-scout` (`subagent_type: superfix:edge-scout`) per edge record or small batch, given the record and `job.md`, appending each verdict line to `.temp/code-reviewer/<run-id>/scores/edge_scores.jsonl`; state that `UNCLEAR` is the correct verdict when the cheap tier cannot settle the pair and that it is a dispatch reason, not a rejection.
4. Phase 2 and Phase 4 - replace "Launch them in parallel; tens at a time is normal" with the real ceiling of at most 16 concurrent subagents and successive waves beyond that, and make Phase 4's "Run in waves if the tier has concurrency limits" name the same number.
5. Phase 3 - add the `rank_edges.ts` command block writing `hotlist/edges.json` and `hotlist/edges.md`, and state that both hotlists are shown to the user before frontier spend.
6. Phase 4 - define the dispatch set as the union of `hotlist.json` `hotspots`, `edges.json` `dispatch`, and the top 2 rows of `edges.json` `degree[]` not already in that union; state the degree budget as a rule in this phase's prose, not as a flag on any script. An edge dispatch gives the detective both endpoints as entry points; a degree-slot dispatch states in the brief that the file was selected by graph degree rather than by score.
7. Update `## Output the user sees` to list `edges.md` alongside `hotlist.md`, and add `superfix:edge-scout` to `## Subagents this skill drives`.

### Edge cases
- Empty `edges.jsonl` - the edge track contributes nothing and the run proceeds on the file track alone; do not treat it as an error.
- `degenerate: true` in `hotlist.json` - report it to the user in the closing summary rather than reporting zero hotspots as a clean result.
- A file appearing in both the file hotlist and an edge dispatch row - dispatch one detective, not two, with the edge as the richer entry.
- A degree-slot file already covered by the union - skip it and take the next row, so the budget is never spent twice on one file.
- `--with-dependents` costs O(n) `git grep` calls on top of the sweep; note the cost next to the flag so a very large target can drop it deliberately.

### Contracts
Consumes `edges.jsonl` (Task 1), the edge verdict record (Task 2), and `edges.json` (Task 3). Produces `.temp/code-reviewer/<run-id>/scores/edge_scores.jsonl` and the dispatch set feeding Phase 4.

### DoD
`SKILL.md` names `collect_edges.sh`, `edge-scout` and `rank_edges.ts` in the phases above, carries the union dispatch rule and the degree budget, contains no "tens at a time" claim, and states the 16-concurrent ceiling.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - fix(superfix): let a detective take an edge pair as its entry
- Covers: criteria #8
- TDD: none

### Dependencies
- Task 5 - blocks: the dispatch that supplies two entry points.

### Files
- modify - superfix/skills/code-auditor/references/synthesis.md (`## Detective report schema`, `ENTRY:` line)
- modify - superfix/agents/detective.md (`## Inputs you are given`)

### Test Commands
*Build*
- `grep -n 'ENTRY:' superfix/skills/code-auditor/references/synthesis.md` - expect exactly one line.

*Tests*
- `grep -c 'pair' superfix/skills/code-auditor/references/synthesis.md` - expect at least `1`.
- `grep -c 'pair' superfix/agents/detective.md` - expect at least `1`.

### Approach
1. In `synthesis.md`, change the `ENTRY:` schema line to accept either one path or a pair, giving the pair form explicitly as `<path A> <-> <path B>`.
2. In `synthesis.md`, state under the detective report schema that an edge entry means the contract between the two endpoints is the first thing to check and that `LOCATION` may name either endpoint or both.
3. In `detective.md`'s inputs section, change the single-hotspot input to "one hotspot path, or two paths when the entry is an edge", keeping the existing "entry point, not a fence" framing for both forms.
4. Leave the clean-checkout verification recipe, the critic verdict schema, the dedup rules and the severity anchors untouched.

### Edge cases
- A single-path entry must keep working exactly as before; the pair form is additive.
- An edge whose real defect sits in a third file the pair pulls in - the existing "entry point, not a fence" rule already covers it; do not add a rule.
- `NO FINDING` for an edge - still one report file with the pair recorded in `checked:`, so coverage evidence stays honest.

### Contracts
`ENTRY:` in the detective report schema accepts `<path>` or `<path A> <-> <path B>`. No other field changes.

### DoD
`synthesis.md`'s `ENTRY:` line documents the pair form and `detective.md` states it accepts two entry paths; no other section of either file changed.

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - docs(superfix): sync the CLAUDE.md files with the two-track pipeline
- Covers: criteria #10
- TDD: none

### Dependencies
- Task 1 - blocks: names the new script.
- Task 2 - blocks: names the new agent.
- Task 3 - blocks: names the new script.
- Task 5 - blocks: describes the pipeline the skill now runs.

### Files
- modify - superfix/CLAUDE.md (`## Layout (superfix internals)`, the ``## Components (qualified `superfix:<name>`)`` section)
- modify - CLAUDE.md (the `superfix` bullet under `## What this repo is`, and the `agents[]` clause under `## Cross-plugin architecture invariants`)

### Test Commands
*Build*
- `grep -c 'edge-scout' superfix/CLAUDE.md CLAUDE.md` - expect at least `1` in each file.

*Tests*
- `grep -c 'collect_edges.sh' superfix/CLAUDE.md` - expect at least `1`.
- `grep -c 'rank_edges.ts' superfix/CLAUDE.md` - expect at least `1`.
- `grep -n 'edge-scout' CLAUDE.md` - expect a hit on the superfix agent enumeration line under the self-documentation invariant.

### Approach
1. In `superfix/CLAUDE.md`, add `collect_edges.sh` and `rank_edges.ts` to the `skills/` line of the layout block and `edge-scout.md` to the `agents/` line.
2. In `superfix/CLAUDE.md`'s components section, describe the `code-auditor` pipeline as two-track - the per-file sweep and gate as today, plus the pair sweep, the `edge-scout` fan-out and the edge gate - and add `edge-scout` to the agent-roles paragraph as cheap-tier contract triage whose `UNCLEAR` verdict is a dispatch reason.
3. Record the plugin-specific invariant that the edge track carries no Opportunity axis, because an axis defined as a property of one file is exactly what the per-file gate already failed to observe.
4. In the root `CLAUDE.md`, add `edge-scout` to the superfix agent enumeration in the self-documentation invariant and extend the `superfix` bullet under `## What this repo is` to say the sweep scores files and pairs.

### Edge cases
- Both files are dev-time only and never reach the skill at runtime; describe the source layout, do not restate agent instructions.
- Keep the root file repo-wide - superfix-specific detail belongs in `superfix/CLAUDE.md` only.

### Contracts
none

### DoD
Both `CLAUDE.md` files name `edge-scout`; `superfix/CLAUDE.md` names both new scripts, describes the two-track pipeline and records the no-Opportunity-axis invariant.

<!-- /TASK -->
