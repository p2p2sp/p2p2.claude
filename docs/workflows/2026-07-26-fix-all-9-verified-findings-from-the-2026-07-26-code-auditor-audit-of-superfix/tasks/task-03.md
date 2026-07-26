
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


### Covered criteria
3. `collect_edges.sh` emits no token that is absent from its endpoints: a dotted literal whose post-dot tail
   exceeds the 8-character cap is skipped whole, never truncated.
4. Two files mentioning two different literals that share a long prefix produce no pair.
