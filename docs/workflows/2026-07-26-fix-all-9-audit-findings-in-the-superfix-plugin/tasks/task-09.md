
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


### Covered criteria
9. `synthesis.md`'s severity self-check is a command that produces output (fails) when `findings.md` is not severity-sorted.
