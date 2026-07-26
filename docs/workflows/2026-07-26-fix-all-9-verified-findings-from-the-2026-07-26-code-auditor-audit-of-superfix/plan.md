# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Fix all 9 verified findings from the 2026-07-26 code-auditor audit of superfix"

---
<!-- HEADER -->

## Goal
Every defect confirmed by the audit run `2026-07-26-bugs` is gone from the `superfix` source: the edge track
stops discarding its most promising pairs and stops emitting link literals that exist in neither endpoint, the
two ranking gates stop crashing on a legitimately empty sweep and stop corrupting their own decision tables,
the sweeps stop dropping tracked files silently, the clean-checkout recipe survives the verification it exists
for, and every reference/`CLAUDE.md` claim matches the shipped scripts.

## Context
The audit swept 15 files and 43 artifact pairs, dispatched 8 detectives and 8 critics, and returned 9 findings
- all `VERIFIED`, none `REFUTED`. Full report: `.temp/code-reviewer/2026-07-26-bugs/findings.md`; per-finding
PoCs and oracles: `.temp/code-reviewer/2026-07-26-bugs/reports/`. Findings 1 and 4 compound (a bad `via` feeds
a scout that has no verdict for "no contract"), so they are fixed in dependency order rather than in severity
order. Two conventions constrain every task: this repo has no build, test or lint at any level - editing
markdown IS shipping - so each task's verification is a fixture run of the real script or a grep assertion on
the edited file, and every task is therefore `TDD: none` (the shell/TS code here reads git and the filesystem
and writes stdout, which yields integration checks, not red-green cycles). Agent and skill markdown must stay
table-free and emoji-free per `.claude/rules/_skills.md`.

Scope note: finding 9 traces one false claim to `superui/CLAUDE.md:157`, outside the superfix subtree named in
the request. Task 10 fixes it there too - correcting only the copy in `superfix/CLAUDE.md` would leave the
source of the drift in the repo.

## Acceptance criteria
1. `rank_edges.ts` given a readable `--edges` file and a nonexistent `--verdicts` path exits 0 and writes a
   well-formed `edges.json` + `edges.md`; a nonexistent `--edges` path still exits non-zero.
2. A `reason` or `via` value containing `|` produces a table row in `edges.md` / `hotlist.md` with exactly as
   many cells as the header, and the raw unescaped value survives in `edges.json` / `hotlist.json`.
3. `collect_edges.sh` emits no token that is absent from its endpoints: a dotted literal whose post-dot tail
   exceeds the 8-character cap is skipped whole, never truncated.
4. Two files mentioning two different literals that share a long prefix produce no pair.
5. A tracked path that git C-quotes (`"` or `\` in the name) produces one stderr warning naming it, in both
   `collect_signals.sh` and `collect_edges.sh`, instead of vanishing silently at exit 0.
6. `dependents` for a non-ASCII filename that only mentions its own stem is 0, not 1.
7. For a pair linked by both an artifact literal and a lower-fanout syntax literal, the emitted `via` is the
   artifact literal, and the record carries a `vias` list of up to 3 candidates, best first.
8. `edge-scout` can return `NO_CONTRACT`; `rank_edges.ts` counts it in its own bucket, keeps it out of
   `dispatch` and `overflow`, satisfies
   `counts.match + counts.mismatch + counts.unclear + counts.no_contract + counts.unscored == counts.pairs`,
   and no row whose reason denies a contract lands under the `MATCH` heading.
9. The clean-checkout recipe in `detective.md`, `critic.md` and `synthesis.md` uses
   `git worktree remove --force`, and its recovery ladder carries a rung for
   `contains modified or untracked files`.
10. `synthesis.md`'s `findings.md` template renders `SEVERITY: N.N` on its own line, its documented final sort
    reads `findings.md` rather than `reports/`, its fold list states what to do with the critic's independent
    `SEVERITY`, and `INCONCLUSIVE` is defined when `CONFIDENCE` is already `low`.
11. `scoring.md`'s `hotlist.json` example is reproducible: feeding its own `opportunity_histogram` to `rank.ts`
    at its own `top` and gates yields its own `counts`, and its `overflow` row's `rank` is the first rank past
    the cap.
12. No `CLAUDE.md` in the repo claims superfix is the only plugin without hooks or that superui degrades on
    `NODE_MISSING`; the root and superfix `CLAUDE.md` verdict vocabulary and edge-record description match the
    shipped scripts.

<!-- /HEADER -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - fix(superfix): skip over-long literals instead of truncating them mid-word
- Covers: criteria #3, #4
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/skills/code-auditor/scripts/collect_edges.sh (the `grep -oE` literal extractor in the pass-2 `while` loop, plus the header's Fields/noise paragraphs)

### Test Commands
*Build*
- `cd /Users/dario/Projects/p2p2.claude && bash -n superfix/skills/code-auditor/scripts/collect_edges.sh; echo exit=$?` - `exit=0`

*Tests*
- `cd /Users/dario/Projects/p2p2.claude && rm -rf .temp/superfix-fix/t3 && mkdir -p .temp/superfix-fix/t3 && cd .temp/superfix-fix/t3 && git init -q . && git config user.email t@t.t && git config user.name t && printf 'producer registers com.example.UserServiceImpl at boot\n' > producer.md && printf 'consumer mocks com.example.UserServiceMock in tests\n' > consumer.md && git add -A && git commit -qm init && bash ../../../superfix/skills/code-auditor/scripts/collect_edges.sh . | wc -l` - prints `0`
- `cd /Users/dario/Projects/p2p2.claude/.temp/superfix-fix/t3 && printf 'producer writes user.dto.ts\n' >> producer.md && printf 'consumer reads user.dto.ts\n' >> consumer.md && git commit -qam link && bash ../../../superfix/skills/code-auditor/scripts/collect_edges.sh .` - one record with `"via":"user.dto.ts"`
- `cd /Users/dario/Projects/p2p2.claude && bash superfix/skills/code-auditor/scripts/collect_edges.sh superfix 2>/dev/null | grep 'quotePat"' | wc -l` - prints `0` (`wc -l` rather than `grep -c`, which would exit 1 on no match)

### Approach
1. Replace the extractor with a boundary-aware form: match `[A-Za-z0-9_][A-Za-z0-9_.-]*\.[A-Za-z0-9]{1,8}` only where it is not followed by another `[A-Za-z0-9_.-]` character - use `grep -oE` on the current pattern extended with a trailing `([^A-Za-z0-9_.-]|$)` group and strip that trailing character, or post-filter the match stream, whichever keeps the pipeline `set -euo pipefail`-safe and BSD/macOS-`grep` portable.
2. Verify the emitted token equals the source token: a literal whose post-dot tail is longer than 8 characters yields no token at all.
3. Update the header comment: state that an over-long tail means the literal is skipped, not shortened, and why (a truncated token names nothing in either endpoint).

### Edge cases
- Token at end of line and at end of file - both must still match.
- Two adjacent tokens on one line separated by a space or a comma - both must match.
- A token followed by `)` or `"` - still matches.
- A repo where every literal is over-long: empty stdout, exit 0.

### Contracts
- Edge record fields unchanged; the token universe shrinks to boundary-complete literals.

### DoD
The fabricated-pair fixture emits 0 records, the positive-control fixture emits the `user.dto.ts` pair, and a
sweep of `superfix/` contains no `quotePat` token.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - fix(superfix): warn on C-quoted tracked paths and stop over-counting dependents
- Covers: criteria #5, #6
- TDD: none

### Dependencies
- Task 3 - blocks: shares `collect_edges.sh`

### Files
- modify - superfix/skills/code-auditor/scripts/collect_signals.sh (the pass-2 `KEPT_EXTS` `awk` filter, the `dependents` `git grep -lI`, header comment)
- modify - superfix/skills/code-auditor/scripts/collect_edges.sh (the pass-2 `KEPT_EXTS` `awk` filter inside `raw_pairs`, header comment)

### Test Commands
*Build*
- `cd /Users/dario/Projects/p2p2.claude && bash -n superfix/skills/code-auditor/scripts/collect_signals.sh && bash -n superfix/skills/code-auditor/scripts/collect_edges.sh; echo exit=$?` - `exit=0`

*Tests*
- `cd /Users/dario/Projects/p2p2.claude && rm -rf .temp/superfix-fix/t4 && mkdir -p .temp/superfix-fix/t4 && cd .temp/superfix-fix/t4 && git init -q . && git config user.email t@t.t && git config user.name t && printf 'hello\n' > 'plain.md' && printf 'hello\n' > 'quote".md' && printf 'hello\n' > 'back\slash.md' && git add -A && git commit -qm init && bash ../../../superfix/skills/code-auditor/scripts/collect_signals.sh 30 . 2>&1 >/dev/null | grep -c 'quoted path'` - prints `2`
- `cd /Users/dario/Projects/p2p2.claude/.temp/superfix-fix/t4 && bash ../../../superfix/skills/code-auditor/scripts/collect_edges.sh . 2>&1 >/dev/null | grep -c 'quoted path'` - prints `2`
- `cd /Users/dario/Projects/p2p2.claude && rm -rf .temp/superfix-fix/t4b && mkdir -p .temp/superfix-fix/t4b && cd .temp/superfix-fix/t4b && git init -q . && git config user.email t@t.t && git config user.name t && printf 'café is here\n' > 'café.md' && printf 'plain is here\n' > 'plain.md' && git add -A && git commit -qm init && bash ../../../superfix/skills/code-auditor/scripts/collect_signals.sh 30 . --with-dependents | grep 'café'` - the record shows `"dependents":0` (the file body must carry the accented stem, or the probe matches nothing and the assertion passes vacuously)
- `cd /Users/dario/Projects/p2p2.claude && bash superfix/skills/code-auditor/scripts/collect_signals.sh 90 superfix --with-dependents 2>/dev/null | wc -l` - prints `15`, the file count this sweep has always returned for `superfix/` (no-regression baseline)

### Approach
1. Add a first rule to both pass-2 `awk` filters: a line whose first character is `"` is a C-quoted path (git quotes for `"`/`\` regardless of `core.quotePath=false`), whose parsed extension becomes `md"` and fails the kept-extension test - which is exactly where it disappears today. Print one warning naming the raw line to `/dev/stderr` (the `> "/dev/stderr"` form already used in `collect_edges.sh`'s pairing `awk`), wording containing `quoted path`, then `next`. The guard must sit before the extension test so extensionless quoted paths warn too.
2. Leave the loops' `[ -f "$f" ]` guards untouched - no quoted line reaches them any more.
3. Add `-c core.quotePath=false` to the `git grep -lI` call that computes `dependents`, so its output is comparable with the raw `$f` the `grep -vxF` self-exclusion filters on.
4. Update both header comments: name the quoted-path case in the edge-case list as a warn-and-skip at the awk stage, and note that `esc()` therefore never sees a quote or backslash today.

### Edge cases
- A non-ASCII path stays swept (already handled by `core.quotePath=false`) and must not trigger the new warning.
- A repo with zero quoted paths and no non-ASCII basenames produces byte-identical output to before this task. A non-ASCII basename is the one intended difference: step 3 flips its `dependents` from the inflated value to the correct one.

### Contracts
- Emitted JSONL schema unchanged; one new stderr warning class shared by both sweeps.

### DoD
Both sweeps warn twice on the quoted-path fixture, the non-ASCII fixture reports `dependents:0`, and the
`superfix/` sweep still emits its 15 records.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - feat(superfix): pick `via` by artifact evidence and carry the runner-up literals
- Covers: criteria #7
- TDD: none

### Dependencies
- Task 3 - blocks: the literal stream must be boundary-complete before it is ranked
- Task 4 - blocks: shares `collect_edges.sh`

### Files
- modify - superfix/skills/code-auditor/scripts/collect_edges.sh (new tracked-basename set beside `kept_exts`; the pairing `awk` END block's `pair_via`/`pair_fanout` comparison; the emitter `printf`; header comment)
- modify - superfix/agents/edge-scout.md (`## Inputs you are given`, `## What to do` step 1)
- modify - superfix/skills/code-auditor/references/scoring.md (the edge-record example and its field prose)

### Test Commands
*Build*
- `cd /Users/dario/Projects/p2p2.claude && bash -n superfix/skills/code-auditor/scripts/collect_edges.sh; echo exit=$?` - `exit=0`

*Tests*
- `cd /Users/dario/Projects/p2p2.claude && rm -rf .temp/superfix-fix/t5 && mkdir -p .temp/superfix-fix/t5 && cd .temp/superfix-fix/t5 && git init -q . && git config user.email t@t.t && git config user.name t && printf 'reads doc.md and calls Array.from here\n' > a.md && printf 'writes doc.md and calls Array.from too\n' > b.md && printf 'the shared doc\n' > doc.md && git add -A && git commit -qm init && bash ../../../superfix/skills/code-auditor/scripts/collect_edges.sh .` - one record with `"via":"doc.md"` and a `"vias"` array whose first element is `doc.md`
- `cd /Users/dario/Projects/p2p2.claude && bash superfix/skills/code-auditor/scripts/collect_edges.sh superfix 2>/dev/null | grep 'rank_edges.ts"' | grep '"via":"Array.from"' | wc -l` - prints `0`
- `cd /Users/dario/Projects/p2p2.claude && bash superfix/skills/code-auditor/scripts/collect_edges.sh superfix 2>/dev/null | head -1` - valid JSON with keys `a`, `b`, `via`, `vias`, `fanout`, `shared`

### Approach
1. Build a tracked-basename set next to `kept_exts` (`git -c core.quotePath=false ls-files | noise_filter`, strip directories, `sort -u`) and hand it plus `kept_exts` to the pairing `awk` through `ENVIRON`, the same way pass 2 already does.
2. In the `awk` END block, score each linking literal: 2 when it is a tracked basename, 1 when its extension is in the kept-extension set, else 0; select `pair_via` by higher score first, then lower `fanout`, then lexicographically smaller literal - replacing the current fanout-only comparison.
3. Accumulate each pair's linking literals, order them by that same key, and emit the first three as a JSON array field `vias` alongside the unchanged `via`/`fanout`/`shared`.
4. Update the header's "Fields per pair" and tie-break paragraphs to state the artifact-first rule and why lowest-fanout alone is inverted for code-to-code pairs.
5. In `edge-scout.md`, list `vias` in the inputs and instruct step 1 to judge the pair on the strongest real contract among `vias`, treating `via` as the lead candidate; keep the file table-free.
6. In `scoring.md`, add `vias` to the edge-record example and describe the selection rule in one sentence.

### Edge cases
- A pair whose only linking literal is syntax noise: `vias` holds that single literal, `via` is unchanged from today's behaviour.
- `shared` of 1: `vias` has exactly one element.
- More than three linking literals: `vias` is capped at three, `shared` still counts all of them.
- A literal that is both a tracked basename and kept-extension: scored 2, no double counting.

### Contracts
- Edge record gains `vias: string[]` (1..3 entries, best first); `a`, `b`, `via`, `fanout`, `shared` unchanged.
- `rank_edges.ts` projects its rows from `a`/`b`/`via`/`shared` only, so `vias` stays a scout-facing prior and
  deliberately does not surface in `edges.json` / `edges.md` - no change needed there.

### DoD
The `doc.md` vs `Array.from` fixture selects `doc.md`, the real `superfix/` sweep no longer names `Array.from`
for the two ranking gates, and every emitted record carries a `vias` array.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - fix(superfix): make the clean-checkout recipe survive its own verification
- Covers: criteria #9
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/agents/detective.md (the `## Method` step 3 worktree block and its recovery list)
- modify - superfix/agents/critic.md (the same block under `## Method`)
- modify - superfix/skills/code-auditor/references/synthesis.md (`## Clean-checkout verification (anti-self-poisoning)` block)

### Test Commands
*Build*
- `cd /Users/dario/Projects/p2p2.claude && grep -c 'git worktree remove --force' superfix/agents/detective.md superfix/agents/critic.md superfix/skills/code-auditor/references/synthesis.md` - each at least `1`

*Tests*
- `cd /Users/dario/Projects/p2p2.claude && grep -c 'contains modified or untracked files' superfix/agents/detective.md superfix/agents/critic.md superfix/skills/code-auditor/references/synthesis.md` - each at least `1`
- `cd /Users/dario/Projects/p2p2.claude && grep -n 'git worktree remove' superfix/agents/detective.md superfix/agents/critic.md superfix/skills/code-auditor/references/synthesis.md | grep -v -- '--force' | wc -l` - prints `0`
- `cd /Users/dario/Projects/p2p2.claude && rm -rf .temp/superfix-fix/t7 && mkdir -p .temp/superfix-fix/t7 && cd .temp/superfix-fix/t7 && git init -q . && git config user.email t@t.t && git config user.name t && printf 'x\n' > f.md && git add -A && git commit -qm init && git worktree add wt HEAD >/dev/null 2>&1 && printf 'poc\n' > wt/poc.txt && git worktree remove --force wt; echo exit=$?` - `exit=0`, proving the documented command works with replay artifacts present

### Approach
1. In all three files, change the cleanup line of the recipe to `git worktree remove --force <verify-worktree-path>` and add one sentence: the replay leaves untracked artifacts, which a bare `remove` refuses.
2. Add a recovery rung: `fatal: ... contains modified or untracked files` -> re-run with `--force`; if that still fails, `rm -rf <verify-worktree-path>` then `git worktree prune`, then retry `git worktree add`.
3. Reorder the existing `already exists` rung so it points at the `--force` removal, keeping the orphaned-directory (`is not a working tree`) rung intact.
4. Keep the three copies semantically identical, table-free, and in each file's existing indentation.

### Edge cases
- Artifacts that are gitignored: bare `remove` would have succeeded; `--force` is still correct and idempotent.
- A worktree already gone from disk but still registered: the `prune` rung still applies.

### Contracts
- none

### DoD
All three files carry `--force` on every `git worktree remove`, both new ladder rungs are present, and the
scratch-repo command exits 0 with a PoC artifact in the worktree.

<!-- /TASK -->

---

<!-- TASK -->

## Task 8 - fix(superfix): tag severity greppably and fold the critic's verdict completely
- Covers: criteria #10
- TDD: none

### Dependencies
- Task 7 - blocks: shares `synthesis.md`

### Files
- modify - superfix/skills/code-auditor/references/synthesis.md (`Fold each verdict` list, `## Severity scoring (greppable)` sort one-liner, `## findings.md (final output)` template)

### Test Commands
*Build*
- `cd /Users/dario/Projects/p2p2.claude && grep -c '^SEVERITY: N.N' superfix/skills/code-auditor/references/synthesis.md` - `1`; this grep prints `0` before the task (today's `SEVERITY:` lines are `<0.0-10.0>` and the critic's), which is what discriminates the fix

*Tests*
- `cd /Users/dario/Projects/p2p2.claude && grep 'reports | sort' superfix/skills/code-auditor/references/synthesis.md | wc -l` - prints `0`
- `cd /Users/dario/Projects/p2p2.claude && grep -c 'findings.md | sort' superfix/skills/code-auditor/references/synthesis.md` - `1` (the sort one-liner now reads the folded artifact)
- `cd /Users/dario/Projects/p2p2.claude && grep -c 'already low' superfix/skills/code-auditor/references/synthesis.md` - at least `1` (the INCONCLUSIVE bullet now defines the already-lowest case)
- `cd /Users/dario/Projects/p2p2.claude && grep -c "critic's independent" superfix/skills/code-auditor/references/synthesis.md` - at least `2` (the VERIFIED and PARTIALLY VERIFIED bullets now both name the severity source)
- `cd /Users/dario/Projects/p2p2.claude && mkdir -p .temp/superfix-fix/t8 && printf '# Findings - x\n\n## 1. Title\nSEVERITY: 9.2\nCONFIDENCE: high\n\n## 2. Other\nSEVERITY: 3.0\nCONFIDENCE: low\n' > .temp/superfix-fix/t8/findings.md && grep -c '^SEVERITY:' .temp/superfix-fix/t8/findings.md` - prints `2`, matching the template's shape

### Approach
1. Rewrite the `findings.md` template entry so the heading carries the title only and `SEVERITY: N.N` plus `CONFIDENCE: <level>` each sit on their own line beneath it.
2. Repoint the final-sort one-liner at the folded artifact - `grep -n '^SEVERITY:' .temp/code-reviewer/<run-id>/findings.md | sort -t: -k3 -rn` - and reframe it as a self-check that the emitted file is severity-sorted, since `reports/` is never rewritten by the fold.
3. Extend the `VERIFIED` fold bullet: adopt the critic's independent `SEVERITY` when it names a number, keep the detective's when it says `unchanged`, and note the adopted value in the entry.
4. Extend the `INCONCLUSIVE` bullet: an entry already low stays low, and the missing oracle is still named.
5. Give `PARTIALLY VERIFIED` the same treatment as `VERIFIED` for the critic's independent number, so every verdict states its severity source.

### Edge cases
- A critic returning `SEVERITY: unchanged`: the filed number survives.
- A finding folded to a narrower scope with no critic number: severity lowered by the fold, as today.

### Contracts
- `findings.md` entry shape: heading, then `SEVERITY: N.N`, then `CONFIDENCE: <low|medium|high>`, each on its own line.

### DoD
`grep -c '^SEVERITY:'` on a template-shaped file counts every finding, the documented sort names `findings.md`,
and all four fold bullets state what happens to severity and confidence.

<!-- /TASK -->

---

<!-- TASK -->

## Task 9 - fix(superfix): make the hotlist.json example in scoring.md reproducible
- Covers: criteria #11
- TDD: none

### Dependencies
- Task 5 - blocks: shares `scoring.md`
- Task 6 - blocks: shares `scoring.md`

### Files
- modify - superfix/skills/code-auditor/references/scoring.md (the `## Hotlist schema (hotlist.json)` example block)

### Test Commands
*Build*
- `cd /Users/dario/Projects/p2p2.claude && grep -n '"top":' superfix/skills/code-auditor/references/scoring.md` - shows the corrected cap

*Tests*
- `cd /Users/dario/Projects/p2p2.claude && mkdir -p .temp/superfix-fix/t9 && node -e 'const o=[];const h={1:14,2:8,3:6,4:8,5:6};for(const k of Object.keys(h))for(let i=0;i<h[k];i++)o.push(JSON.stringify({path:`f${k}_${i}.ts`,impact:5,opportunity:+k,impact_reason:"i",opportunity_reason:"o"}));require("fs").writeFileSync(".temp/superfix-fix/t9/s.jsonl",o.join("\n")+"\n")' && node superfix/skills/code-auditor/scripts/rank.ts --scores .temp/superfix-fix/t9/s.jsonl --min-impact 3 --min-opportunity 3 --top 18 --run-id ex --job reliability/bugs --out-json .temp/superfix-fix/t9/h.json --out-md .temp/superfix-fix/t9/h.md && node -e 'const c=require("/Users/dario/Projects/p2p2.claude/.temp/superfix-fix/t9/h.json");console.log(JSON.stringify(c.counts),JSON.stringify(c.opportunity_histogram),c.overflow[0].rank)'` - prints counts `{"scored":42,"hotspots":18,"overflow":2,"skipped":22}`, the histogram, and first overflow rank `19`
- `cd /Users/dario/Projects/p2p2.claude && grep -A24 'Hotlist schema' superfix/skills/code-auditor/references/scoring.md | grep -E '"top"|"counts"|"opportunity_histogram"|"rank":19'` - the example's numbers equal the command's output

### Approach
1. Set the example's `"top"` to 18 so `hotspots: 18` + `overflow: 2` with a first overflow `rank` of 19 is reachable.
2. Replace `opportunity_histogram` with a distribution that sums to 42 and supplies exactly 20 rows at opportunity >= 3 - `{"1":14,"2":8,"3":6,"4":8,"5":6}` - so `counts` and the histogram agree.
3. Leave the surrounding prose rules untouched; they were verified correct.

### Edge cases
- The example must stay consistent with the `--top` caps-dispatch-not-record rule stated above it.

### Contracts
- none

### DoD
Running `rank.ts` on the example's own histogram at its own `top` and gates reproduces the example's `counts`,
histogram and overflow rank.

<!-- /TASK -->

---

<!-- TASK -->

## Task 10 - docs(superfix): correct the false CLAUDE.md claims and sync the edge-track contract
- Covers: criteria #12
- TDD: none

### Dependencies
- Task 5 - blocks: documents the new `vias` field
- Task 6 - blocks: documents the fourth verdict

### Files
- modify - superfix/CLAUDE.md (the intro paragraph's uniqueness claim, the `code-auditor` env-check sentence, the edge-track bullet's verdict list)
- modify - CLAUDE.md (the superfix bullet's verdict list)
- modify - superui/CLAUDE.md (the `NODE_MISSING` sentence that over-generalizes across superui's two script-dependent skills)

### Test Commands
*Build*
- `cd /Users/dario/Projects/p2p2.claude && grep 'only plugin' superfix/CLAUDE.md | wc -l` - prints `0` (prints `1` before the task - the phrase wraps across lines 9-10, so match `only plugin`, not `only plugin with`)

*Tests*
- `cd /Users/dario/Projects/p2p2.claude && grep 'skip-with-note' superfix/CLAUDE.md | wc -l` - prints `0`
- `cd /Users/dario/Projects/p2p2.claude && grep -c 'NO_CONTRACT' CLAUDE.md superfix/CLAUDE.md` - each at least `1`
- `cd /Users/dario/Projects/p2p2.claude && grep -c 'pro-designer' superfix/CLAUDE.md` - `1`; prints `0` before the task, so it proves the comparison was narrowed to the one superui skill that degrades
- `cd /Users/dario/Projects/p2p2.claude && grep 'that skill stops the script-dependent parts' superui/CLAUDE.md | wc -l` - prints `0` (the over-generalizing sentence is gone at its source)
- `cd /Users/dario/Projects/p2p2.claude && grep -c 'vias' superfix/CLAUDE.md` - at least `1`

### Approach
1. In `superfix/CLAUDE.md`, drop the "only plugin with no hooks/ and no injected manifest" clause, keeping the accurate "no hooks/, no injected manifest" statement about superfix itself.
2. In the same file, narrow the env-check comparison to `superui`'s `pro-designer` (which degrades) and note that `design-extractor-builder` hard-stops exactly like superfix.
3. In `superui/CLAUDE.md`, fix the `NODE_MISSING` sentence at the source so it distinguishes the two script-dependent skills instead of generalizing.
4. In both `superfix/CLAUDE.md` and the root `CLAUDE.md`, update the edge-track verdict list to the four-value vocabulary and say the gate keeps `MATCH` and `NO_CONTRACT` out of dispatch.
5. In `superfix/CLAUDE.md`'s edge-track bullet, mention the artifact-first `via` selection and the `vias` runner-up list as the pair record's shape.

### Edge cases
- `supergh/CLAUDE.md` already states its own no-hooks fact correctly - leave it alone.
- Do not touch the root file's cross-plugin invariants beyond the verdict list.

### Contracts
- none

### DoD
No `CLAUDE.md` carries either false claim, both the root and superfix files name the four verdicts, and
`superui/CLAUDE.md` distinguishes its degrading skill from its hard-stopping one.

<!-- /TASK -->
