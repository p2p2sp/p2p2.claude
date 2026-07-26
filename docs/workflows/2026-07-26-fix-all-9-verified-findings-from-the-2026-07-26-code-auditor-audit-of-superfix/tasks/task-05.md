
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


### Covered criteria
7. For a pair linked by both an artifact literal and a lower-fanout syntax literal, the emitted `via` is the
   artifact literal, and the record carries a `vias` list of up to 3 candidates, best first.
