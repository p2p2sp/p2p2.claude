
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


### Covered criteria
12. No `CLAUDE.md` in the repo claims superfix is the only plugin without hooks or that superui degrades on
    `NODE_MISSING`; the root and superfix `CLAUDE.md` verdict vocabulary and edge-record description match the
    shipped scripts.
