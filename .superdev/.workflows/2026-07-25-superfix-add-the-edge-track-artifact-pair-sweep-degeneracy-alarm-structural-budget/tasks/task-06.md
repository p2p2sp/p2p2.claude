
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


### Covered criteria
8. A detective dispatched from an edge receives both endpoints as entry points, and `synthesis.md`'s `ENTRY:` field accepts a pair.
