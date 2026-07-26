
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


### Covered criteria
4. `collect_edges.sh` emits the candidate pair for a filename written at the end of a sentence (`report.md.`), and the emitted `via` carries no trailing punctuation.
