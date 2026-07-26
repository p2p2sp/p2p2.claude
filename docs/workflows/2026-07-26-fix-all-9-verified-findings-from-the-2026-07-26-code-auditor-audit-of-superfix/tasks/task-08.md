
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


### Covered criteria
10. `synthesis.md`'s `findings.md` template renders `SEVERITY: N.N` on its own line, its documented final sort
    reads `findings.md` rather than `reports/`, its fold list states what to do with the critic's independent
    `SEVERITY`, and `INCONCLUSIVE` is defined when `CONFIDENCE` is already `low`.
