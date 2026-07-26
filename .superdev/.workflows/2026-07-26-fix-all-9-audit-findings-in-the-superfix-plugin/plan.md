# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Fix all 9 audit findings in the superfix plugin"

---
<!-- HEADER -->

## Goal
Every defect confirmed by the 2026-07-26 superfix audit is repaired in the plugin source: the clean-checkout verification recipe is anchored to the audited repo instead of the session cwd, both ranking gates survive off-spec and BOM-prefixed input, `collect_edges.sh` stops silently dropping filenames written at the end of a sentence, `edges.md` renders the degree list it promises with escaped path cells, and the five drifted documentation contracts (Phase 5 fold restatement, the edge-record key list, the degree scope claim, the `scoring.md` edges example, the `scout.md` sentinel) once again match what the scripts actually do.

## Context
The `/superfix:code-auditor` self-audit swept the plugin on both tracks and produced 9 critic-verified findings (`.temp/code-reviewer/2026-07-26-superfix/findings.md`), severity 5.0 down to 1.5. Three of them share one failure mode - a rule written in two or three files, then edited in only one - which is why the fixes cluster in `SKILL.md`, `synthesis.md` and the two agent definitions. The plugin ships markdown and scripts only: there is no build, test or lint step anywhere in this repo and no `package.json`, so every task is verified by executing the real script against fixtures under `.temp/superfix-fix/` or by a grep / `node -e` assertion against the edited file. Every test command below writes `node`; run `sh superfix/skills/code-auditor/scripts/check_node.sh` first and substitute the command it reports after `NODE_OK` - on Node 22.6 to 23.5 that is `node --experimental-strip-types`, and bare `node` will not run the `.ts` gates there. Each task removes its own `.temp/superfix-fix/` fixtures when it finishes. No skill or agent is added, removed or renamed, so `.claude-plugin/plugin.json` and `superfix/CLAUDE.md` need no change.

## Acceptance criteria
1. Every verification-worktree command in `detective.md`, `critic.md` and `synthesis.md` is anchored with `git -C <target-root>`; running the recipe from a directory whose repo is NOT the audited repo yields a worktree of the audited repo, with the audited file present.
2. `rank.ts` exits 0 and writes both outputs when its scores file contains a line that is valid JSON but not an object, warning on stderr instead of throwing; and `rank.ts` and `rank_edges.ts` both parse a BOM-prefixed first line instead of discarding it.
3. `SKILL.md` Phase 5 step 2 no longer restates the per-verdict fold rules - it defers to the table in `synthesis.md` only.
4. `collect_edges.sh` emits the candidate pair for a filename written at the end of a sentence (`report.md.`), and the emitted `via` carries no trailing punctuation.
5. `SKILL.md` Phase 1 lists all six keys `collect_edges.sh` emits per edge record (`a`, `b`, `via`, `vias`, `fanout`, `shared`) and states the record is handed to the edge-scout verbatim.
6. `edges.md` contains the structural degree list, and every A/B cell is markdown-escaped like the Via/Reason cells already are.
7. `scoring.md`'s `edges.json` example satisfies `counts.match == match.length` and `counts.no_contract == no_contract.length`; `SKILL.md` no longer claims the degree list reports every path.
8. `scout.md` states that `dependents` is always present and that `-1` means "not computed", not low reach.
9. `synthesis.md`'s severity self-check is a command that produces output (fails) when `findings.md` is not severity-sorted.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - fix(superfix): anchor the clean-checkout recipe to the audited repo
- Covers: criteria #1
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/agents/detective.md (`## Inputs you are given`, `## Method` step 3)
- modify - superfix/agents/critic.md (`## Inputs you are given`, `## Method` step 2)
- modify - superfix/skills/code-auditor/references/synthesis.md (`## Clean-checkout verification (anti-self-poisoning)`)
- modify - superfix/skills/code-auditor/SKILL.md (Phase 4 dispatch bullet, Phase 5 step 1)

### Test Commands
*Build*
- none - markdown-only change; this repo has no build step.

*Tests*
- `rm -rf .temp/superfix-fix/t1 && mkdir -p .temp/superfix-fix/t1/host .temp/superfix-fix/t1/target/src && git init -q .temp/superfix-fix/t1/host && printf 'host\n' > .temp/superfix-fix/t1/host/host.txt && git -C .temp/superfix-fix/t1/host add -A && git -C .temp/superfix-fix/t1/host -c user.email=t@t -c user.name=t commit -qm init && git init -q .temp/superfix-fix/t1/target && printf 'x\n' > .temp/superfix-fix/t1/target/src/app.py && git -C .temp/superfix-fix/t1/target add -A && git -C .temp/superfix-fix/t1/target -c user.email=t@t -c user.name=t commit -qm init && git -C "$PWD/.temp/superfix-fix/t1/target" worktree add --detach "$PWD/.temp/superfix-fix/t1/wt" HEAD >/dev/null && test -f .temp/superfix-fix/t1/wt/src/app.py && echo ANCHORED-OK` - expect ANCHORED-OK (the anchored form checks out the target repo, not the host repo the cwd sits in).
- `git -C "$PWD/.temp/superfix-fix/t1/target" worktree remove --force "$PWD/.temp/superfix-fix/t1/wt" && rm -rf .temp/superfix-fix/t1 && echo CLEANUP-OK` - expect CLEANUP-OK.
- `grep -c 'git -C <target-root> worktree add --detach' superfix/agents/detective.md superfix/agents/critic.md superfix/skills/code-auditor/references/synthesis.md` - expect 1 for each of the three files.
- `grep -c 'git -C <target-root> worktree remove --force' superfix/agents/detective.md superfix/agents/critic.md superfix/skills/code-auditor/references/synthesis.md` - expect a non-zero count for each file.
- `grep -c 'git -C <target-root> worktree prune' superfix/agents/detective.md superfix/agents/critic.md superfix/skills/code-auditor/references/synthesis.md` - expect a non-zero count for each file (the recovery blocks are anchored too).

### Approach
1. In `superfix/agents/detective.md`, extend the `job.md` input bullet to state that `job.md` carries `Target root:` - the repo every worktree command must be anchored to - and change the worktree-path bullet to say the supplied path is absolute.
2. In the same file's `## Method` step 3, rewrite the fenced recipe as `git -C <target-root> worktree add --detach <verify-worktree-path> HEAD` / `git -C <target-root> worktree remove --force <verify-worktree-path>`, and prefix `git -C <target-root>` onto every git command inside the two recovery blocks (`prune`, `remove --force`, `add`). The recovery retries keep their existing wording - a bare `git -C <target-root> worktree add` with no `--detach` - so `--detach` appears exactly once per file, on the recipe line.
3. Add one sentence under the recipe: `<target-root>` is the `Target root:` from `job.md`; substitute both placeholders literally in every command (shell variables do not persist between tool calls), because without `-C` git operates on whatever repo the session cwd sits in and silently checks out the wrong tree.
4. Leave untouched the prose sentence explaining that a bare `git worktree remove` refuses to delete untracked artifacts - it describes why `--force` is needed and is not a command to run.
5. Apply steps 1-4 to `superfix/agents/critic.md` (`## Inputs you are given`, `## Method` step 2) and to the `## Clean-checkout verification (anti-self-poisoning)` section of `superfix/skills/code-auditor/references/synthesis.md`, keeping the git command lines identical across all three copies so future drift is diffable. Do NOT homogenise the surrounding comment: `critic.md` replays "the claimed reproduction" while `detective.md` and `synthesis.md` replay "your PoC", and each is correct for its reader.
6. In `superfix/skills/code-auditor/SKILL.md`, change the Phase 4 dispatch bullet and the Phase 5 step 1 sentence to hand each detective and critic an absolute verification-worktree path.

### Edge cases
- Audited root is a subdirectory of a larger repo (this repo's own case): `git -C <subdir>` still resolves the enclosing repo - the recipe must not assume the target root is a repo root.
- A relative worktree path passed with `-C` would resolve INSIDE the audited tree; the absolute-path requirement in step 6 is what prevents that.
- The recovery blocks are part of the same defect: an unanchored prune or remove in recovery re-introduces the bug on the retry path.
- `rm -rf <verify-worktree-path>` in the recovery blocks is a filesystem call, not a git call - it stays unanchored and unchanged.

### Contracts
`job.md` already carries `Target root: <path>` (written by SKILL.md Phase 0 step 5); this task consumes it, it does not change it. The caller-to-agent handoff gains no new field - only the requirement that the worktree path is absolute.

### DoD
All three recipe copies are anchored with identical git command lines, every git command in the recipes and their recovery blocks carries `git -C <target-root>`, and the cross-repo test prints ANCHORED-OK.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - fix(superfix): drop the stale critic-verdict fold restatement from SKILL.md
- Covers: criteria #3
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/skills/code-auditor/SKILL.md (Phase 5 step 2)

### Test Commands
*Build*
- none - markdown-only change; this repo has no build step.

*Tests*
- `grep -q 'keeps only the confirmed sub-claims' superfix/skills/code-auditor/SKILL.md && echo STILL-THERE || echo RESTATEMENT-GONE` - expect RESTATEMENT-GONE.
- `grep -c 'per the table in' superfix/skills/code-auditor/SKILL.md` - expect 1 (the deference pointer survives).
- `grep -c 'adopt it as the filed severity' superfix/skills/code-auditor/references/synthesis.md` - expect 1 (the authority is untouched).

### Approach
1. In `superfix/skills/code-auditor/SKILL.md` Phase 5 step 2, delete the inline enumeration of the four verdict outcomes, keeping only the instruction to fold each verdict into `findings.md` per the table in `synthesis.md`.
2. Add one clause naming `synthesis.md` as the sole authority on how a verdict changes `SEVERITY` and `CONFIDENCE`, so a future editor has no second place to update.
3. Leave Phase 5 steps 3, 4 and 5 untouched - the audit refuted the claim that step 4 is superseded, because `synthesis.md` carries the same instruction.

### Edge cases
- Do not delete the pointer itself: with the restatement gone, `synthesis.md` becomes the only source of the fold rules and Phase 5 step 1 must still order the orchestrator to read it.
- The four verdict token names must remain reachable from the Phase 5 flow via that read.

### Contracts
None introduced. The critic's `VERDICT:` / `SEVERITY:` output shape and the fold table both continue to live in `synthesis.md`.

### DoD
`SKILL.md` Phase 5 step 2 contains no per-verdict rule text, the `synthesis.md` deference pointer is intact, and `synthesis.md` is unmodified.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - fix(superfix): stop collect_edges.sh dropping a filename at the end of a sentence
- Covers: criteria #4
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/skills/code-auditor/scripts/collect_edges.sh (the token-extraction `grep -oE` boundary group, the trailing-boundary `case` strip, and the header comment above them)

### Test Commands
*Build*
- `bash -n superfix/skills/code-auditor/scripts/collect_edges.sh; echo "exit=$?"` - expect exit=0.

*Tests*
- `rm -rf .temp/superfix-fix/t4 && mkdir -p .temp/superfix-fix/t4 && git init -q .temp/superfix-fix/t4 && printf '# writes report.md.\n' > .temp/superfix-fix/t4/consumer.sh && printf '# see report.md\n' > .temp/superfix-fix/t4/producer.sh && printf 'x\n' > .temp/superfix-fix/t4/report.md && git -C .temp/superfix-fix/t4 add -A && git -C .temp/superfix-fix/t4 -c user.email=t@t -c user.name=t commit -qm init && bash superfix/skills/code-auditor/scripts/collect_edges.sh "$PWD/.temp/superfix-fix/t4" --max-fanout 8` - expect one line pairing consumer.sh with producer.sh carrying "via":"report.md" with no trailing dot.
- `bash superfix/skills/code-auditor/scripts/collect_edges.sh "$PWD/superfix" --max-fanout 8 | grep -c '"via":"[^"]*[^A-Za-z0-9]"'` - expect 0 (no emitted via ends in punctuation); grep exits 1 when it finds nothing and that is the pass.
- `bash superfix/skills/code-auditor/scripts/collect_edges.sh "$PWD" --max-fanout 8 | wc -l > .temp/superfix-fix/t4-after.txt; awk 'NR==FNR{b=$1;next}{print ($1>=b)?"COUNT-OK":"COUNT-REGRESSED"}' .temp/superfix-fix/t4-baseline.txt .temp/superfix-fix/t4-after.txt` - expect COUNT-OK against the baseline file written in Approach step 1; the change only admits literals, never removes them.
- `rm -rf .temp/superfix-fix/t4 .temp/superfix-fix/t4-baseline.txt .temp/superfix-fix/t4-after.txt && echo CLEANUP-OK` - expect CLEANUP-OK (run last, after the count comparison).

### Approach
1. Before editing anything, record the baseline pair count to a file the third test command reads back: `mkdir -p .temp/superfix-fix && bash superfix/skills/code-auditor/scripts/collect_edges.sh "$PWD" --max-fanout 8 | wc -l > .temp/superfix-fix/t4-baseline.txt`.
2. Widen the boundary group of the token-extraction `grep -oE` pattern from `([^A-Za-z0-9_.-]|$)` to `([^A-Za-z0-9_.-]|\.[^A-Za-z0-9_-]|\.$|$)`, so a dot terminates the token when it is not followed by a token-continuation character.
3. Replace the single-character trailing-boundary `case` strip with a loop that peels every trailing character that is not alphanumeric - a real token always ends alphanumerically because the pattern requires `\.[A-Za-z0-9]{1,8}`, so this cannot truncate a genuine literal.
4. Rewrite the header comment above the pattern to describe the boundary as it now behaves: an over-long post-dot tail is still skipped whole, and a sentence-final dot no longer suppresses the whole token.
5. Leave `-` and `_` as continuation characters: `report.md-based` is a distinct token, not punctuation.

### Edge cases
- `report.md.` at end of line (the `\.$` alternative) and `report.md. Then` mid-line (the `\.[^A-Za-z0-9_-]` alternative) must both yield `report.md`.
- `com.example.UserServiceImpl` must still be skipped whole, never truncated to an 8-char stand-in.
- Version fragments and prose abbreviations are re-admitted as low-value literals; they are ranked last by the existing artifact-first via scoring and dropped by `--max-fanout` when ambient, so `via` for a recovered pair must still be the artifact filename.
- Multiple trailing punctuation characters must all be peeled, not just one.

### Contracts
The emitted edge record keeps its six fields (`a`, `b`, `via`, `vias`, `fanout`, `shared`); only which literals reach the pairing stage changes. `via` is still `vias[0]` and still a real substring present in both endpoints.

### DoD
`bash -n` passes, the sentence-final fixture yields the pair with a clean `via`, no emitted `via` on a real sweep ends in a non-alphanumeric character, and the full-repo pair count does not drop below the recorded baseline.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 8 - fix(superfix): tell the scout that dependents is always present and -1 means unknown
- Covers: criteria #8
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/agents/scout.md (`## Inputs you are given`)

### Test Commands
*Build*
- none - markdown-only change; this repo has no build step.

*Tests*
- `grep 'dependents' superfix/agents/scout.md | grep -c optional` - expect 0 (no line describing `dependents` still calls it optional); grep exits 1 when it finds nothing and that is the pass.
- `grep -c -- '-1' superfix/agents/scout.md` - expect a non-zero count (the sentinel is defined).
- `bash superfix/skills/code-auditor/scripts/collect_signals.sh 180 "$PWD/superfix" | head -1 | grep -c '"dependents":-1'` - expect 1, confirming the field is always present and equal to -1 when the flag is omitted, exactly as the new wording says.

### Approach
1. In `superfix/agents/scout.md`'s inputs list, drop the word "optional" from the `dependents` field and state that the field is always present.
2. Add one clause: `-1` means the sweep did not compute dependents - treat it as unknown, not as low reach, and fall back to reading the file for Impact.
3. Keep the existing "never fabricate a signal value" hard rule untouched - the new clause tells the scout what to do instead of fabricating.

### Edge cases
- The clause must not invite the scout to invent a dependents count; the documented fallback is reading the file, which the rubric's override clause already permits.
- Wording must stay consistent with `rank_edges.ts`'s treatment of the same sentinel, where `-1` contributes 0, i.e. counts as no evidence rather than as a low value.

### Contracts
Consumes the `signals.jsonl` record emitted by `collect_signals.sh` (`churn`, `fix_commits`, `recency_days`, `loc`, `dependents`); no field added or renamed.

### DoD
`scout.md` no longer calls `dependents` optional, defines `-1`, and a live `collect_signals.sh` run without `--with-dependents` produces exactly the record shape it now describes.

<!-- /TASK -->

---

<!-- TASK -->

## Task 9 - fix(superfix): make the severity self-check able to fail
- Covers: criteria #9
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/skills/code-auditor/references/synthesis.md (`## Severity scoring (greppable)`)

### Test Commands
*Build*
- none - markdown-only change; this repo has no build step.

*Tests*
- `mkdir -p .temp/superfix-fix/t9 && printf '## 1. a\nSEVERITY: 3.0\n\n## 2. b\nSEVERITY: 10.0\n\n## 3. c\nSEVERITY: 8.5\n' > .temp/superfix-fix/t9/findings.md && diff <(grep -n '^SEVERITY:' .temp/superfix-fix/t9/findings.md) <(grep -n '^SEVERITY:' .temp/superfix-fix/t9/findings.md | sort -t: -k3 -rn -s) > /dev/null && echo FALSE-PASS || echo CHECK-CATCHES-UNSORTED` - expect CHECK-CATCHES-UNSORTED.
- `printf '## 1. a\nSEVERITY: 10.0\n\n## 2. b\nSEVERITY: 8.5\n\n## 3. c\nSEVERITY: 3.0\n' > .temp/superfix-fix/t9/findings.md && diff <(grep -n '^SEVERITY:' .temp/superfix-fix/t9/findings.md) <(grep -n '^SEVERITY:' .temp/superfix-fix/t9/findings.md | sort -t: -k3 -rn -s) > /dev/null && echo CHECK-PASSES-SORTED || echo FALSE-FAIL` - expect CHECK-PASSES-SORTED.
- `printf '## 1. a\nSEVERITY: 3.5\n\n## 2. b\nSEVERITY: 3.5\n\n## 3. c\nSEVERITY: 2.0\n' > .temp/superfix-fix/t9/findings.md && diff <(grep -n '^SEVERITY:' .temp/superfix-fix/t9/findings.md) <(grep -n '^SEVERITY:' .temp/superfix-fix/t9/findings.md | sort -t: -k3 -rn -s) > /dev/null && echo TIES-OK || echo TIE-FALSE-FAIL` - expect TIES-OK (two entries sharing a severity must not be reported as out of order).
- `grep -c 'diff <(grep -n' superfix/skills/code-auditor/references/synthesis.md` - expect 1 (the documented check is the diff form).
- `grep -c 'sort -t: -k3 -rn -s' superfix/skills/code-auditor/references/synthesis.md` - expect 1 (the documented sort is stable).
- `rm -rf .temp/superfix-fix/t9 && echo CLEANUP-OK` - expect CLEANUP-OK.

### Approach
1. In `synthesis.md`'s `## Severity scoring (greppable)` section, replace the grep-piped-to-sort one-liner with the diff form that compares the file's own `SEVERITY:` order against the sorted order, using `sort -t: -k3 -rn -s`.
2. Keep the `-s` (stable) flag: without it sort falls back to a whole-line comparison for equal severities and reorders tied entries, so the check would report a correctly sorted file as broken - a findings list routinely carries several ties.
3. Replace the surrounding sentence so it states the pass condition explicitly: empty output means the file is already severity-sorted, any output names the entries that are out of order.
4. Keep the existing note that `reports/` is never rewritten by the fold, so sorting it proves nothing about the final file.

### Edge cases
- Process substitution requires bash or zsh; both are covered by the plugin's supported shells (zsh on macOS, bash on Linux, Git-Bash on Windows), so do not fall back to a POSIX-only form that cannot fail.
- Two findings sharing a severity must not be reported as out of order - this is what `-s` guarantees, and it is the common case rather than an exotic one.
- A `findings.md` with zero or one `SEVERITY:` line produces empty output from both sides and correctly passes.

### Contracts
Consumes the `SEVERITY: N.N`-on-its-own-line format that the same section mandates; changes no output shape.

### DoD
The documented check produces output on a deliberately unsorted `findings.md` and no output on a sorted one.

<!-- /TASK -->

---

<!-- repeat Task <N> per unit of work; leave intact all comment markers; keep tasks small, independently testable, and builder-executable unattended (no interactive human step) -->
