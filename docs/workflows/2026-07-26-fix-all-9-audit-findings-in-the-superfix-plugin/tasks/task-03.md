
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


### Covered criteria
3. `SKILL.md` Phase 5 step 2 no longer restates the per-verdict fold rules - it defers to the table in `synthesis.md` only.
