
## Task 2 - feat(superfix): collect_edges.sh accepts --scope <dir> and keeps pairs with at least one endpoint inside it
- TDD: none
- Model: opus
- Effort: medium
- Covers: criteria #3, #20

### Dependencies
- Task 1 - blocks: Task 7

### Files
- modify - superfix/skills/code-auditor/scripts/collect_edges.sh (existing `while [ $i -lt ${#args[@]} ]` argument loop, new `SCOPE` variable, new `in_scope()` awk filter on `pair_tsv`, header comment Usage and Edge cases blocks)
- modify - tests/superfix/collect_edges.test.ts (new section `// --- --scope ---`, new fixture `buildScopedPairFixture`)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node --test tests/superfix/collect_edges.test.ts` - expected: all cases pass, new `--scope` cases included
- `! grep -rn $'\u2013\|\u2014' superfix/skills/code-auditor/scripts/collect_edges.sh tests/superfix/collect_edges.test.ts` - expected: no output, exit 0

### Approach
1. Add `--scope <value>` to the existing index-driven argument loop next to `--max-fanout`, store in `SCOPE`, normalise exactly as Task 1 (leading `./`, trailing `/`, `.` or empty means whole repo), reuse Task 1's validation rule.
2. Leave `raw_pairs`, `sorted_pairs` and the pairing `awk` untouched so literal counting, `fanout`, the ambient drop and `via`/`vias` scoring remain repo-wide.
3. Filter `pair_tsv` before the final JSON loop with `awk -F'\t' -v d="$SCOPE" '$1 == d || index($1, d "/") == 1 || $2 == d || index($2, d "/") == 1'` when `SCOPE` is set; a pair survives iff `a` or `b` lies under the scope.
4. Print `scope: <dir> (<N> pairs)` on stderr after the filter when `SCOPE` is set, alongside the existing `literals:` line.
5. Update the header: Usage `bash collect_edges.sh [repo_root] [--max-fanout K] [--scope <dir>]`, one paragraph stating the at-least-one-endpoint rule and that fanout stays repo-wide.
6. Tests: `buildScopedPairFixture` commits `shared.md` and `other.md` (tracked artifacts, never endpoints: `collect_edges.sh` pairs the files that MENTION a literal), `src/a.ts`, `src/b.ts` and `lib/c.ts` (all three mention `shared.md`), and `lib/d.ts` which together with `lib/c.ts` mentions `other.md`. Cases: (a) `--scope src` emits exactly `src/a.ts <-> src/b.ts`, `lib/c.ts <-> src/a.ts` and `lib/c.ts <-> src/b.ts` (the last two have one endpoint outside the scope) and no `lib/c.ts <-> lib/d.ts` pair; (b) each surviving pair's `fanout` is 3, equal to the same pair's `fanout` in the unscoped run (a filter placed before pairing would yield 2); (c) `--scope` before and after `[repo_root]` and `--max-fanout`; (d) the invalid values from Failure modes.

### Failure modes
- when `--scope` value is absolute or contains `..` -> response exit 2 with no stdout, log `collect_edges.sh: --scope must be a repo-root-relative directory: <value>`, test asserts status 2 and empty stdout
- when `--scope` is the last argument with no value -> response exit 2, log `collect_edges.sh: --scope requires a directory argument`, test asserts status 2
- when no pair has an endpoint in scope -> response exit 0 with empty stdout (the documented "no pairs" contract), log `scope: <dir> (0 pairs)`, test asserts status 0 and empty stdout

### Contracts
- Pair scope rule: emit iff `a` or `b` is under `<dir>` (Task 1's path predicate applied to either endpoint); `fanout`, `shared`, `via`, `vias` unchanged by scope - consumed by Task 7 (Phase 1 command and the detective brief for an edge whose other endpoint lies outside the scope)

### DoD
`node --test tests/superfix/collect_edges.test.ts` green with the new cases; a scoped run never emits a pair with both endpoints outside the scope and never changes a surviving pair's `fanout`; the dash scan prints nothing.


### Covered criteria
3. `collect_edges.sh --scope <dir>` emituje parę wtedy i tylko wtedy, gdy co najmniej jeden z jej końców leży pod `<dir>`; para z obydwoma końcami poza `<dir>` nie pojawia się w wyniku.
20. `node --test "tests/**/*.test.ts"` przechodzi pod bash i Git-Bash, a `tests/superfix/` zawiera przypadki dla `--scope` w obu skryptach sweepu (kryteria 2 i 3), dla `dependents_stem` i dla scenariusza z kryterium 9.
