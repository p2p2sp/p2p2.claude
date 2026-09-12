
## Task 1 - feat(superfix): collect_signals.sh accepts --scope <dir> and sweeps only that subtree
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #2, #20

### Dependencies
- none - blocks: Task 2, Task 3

### Files
- modify - superfix/skills/code-auditor/scripts/collect_signals.sh (argument loop over `"$@"`, new `SCOPE` variable, new `scope_filter()` function, header comment Usage and Signals blocks)
- modify - tests/superfix/collect_signals.test.ts (new section `// --- --scope ---`, new fixture `buildScopeFixture`)

### Test Commands
#### Build
- none (no build step in this repo: bash executed directly, TypeScript run by Node type stripping)

#### Tests
- `node --test tests/superfix/collect_signals.test.ts` - expected: all cases pass, new `--scope` cases included
- `! grep -rn $'\u2013\|\u2014' superfix/skills/code-auditor/scripts/collect_signals.sh tests/superfix/collect_signals.test.ts` - expected: no output, exit 0

### Approach
1. Replace the existing `for arg in "$@"` loop in `collect_signals.sh` with the index-driven `while [ $i -lt ${#args[@]} ]` shape `collect_edges.sh` uses for `--max-fanout`, so `--scope <value>` is read as a two-token option into `SCOPE` while `--with-dependents` and `positional[]` binding keep their current behaviour.
2. Normalise `SCOPE` once after `cd "$ROOT"`: strip a leading `./`, strip every trailing `/`; `.` or empty means no scope.
3. Add `scope_filter()` placed after `noise_filter()`: with `SCOPE` empty it is `cat`; otherwise `awk -v d="$SCOPE" '$0 == d || index($0, d "/") == 1'` (a value without a newline is safe for `-v` on BSD awk). Insert it into the pass-2 pipeline between the extension `awk` and the `while IFS= read -r f` loop, so pass 1 (extension discovery) and every git probe keep running over the whole repo and only the emitted record set shrinks.
4. Materialise the filtered pass-2 list into a variable (`candidates="$(... | scope_filter)"`) and feed the probe loop from it (`<<< "$candidates"`, skipping the empty line an empty list produces), so `N` can be counted first; when `SCOPE` is set print one stderr line `scope: <SCOPE> (<N> files)` next to the existing `sweep extensions:` line.
5. Update the header comment: Usage line `bash collect_signals.sh [window_days] [repo_root] [--with-dependents] [--scope <dir>]`, one paragraph on scope semantics (record set only, probes and pass 1 stay repo-wide, `<dir>` is repo-root-relative).
6. Tests: `buildScopeFixture` commits `src/alpha.ts`, `src/deep/beta.ts`, `lib/gamma.ts`, `srcx/delta.ts` (a sibling whose name shares the prefix) and `README.md` mentioning `alpha` and `gamma`. Cases: (a) `--scope src` emits exactly `src/alpha.ts` and `src/deep/beta.ts` and no `srcx/delta.ts`; (b) `--scope ./src/` normalises to the same set; (c) `--scope src --with-dependents` yields for `src/alpha.ts` the same `dependents` (1), `churn` and `fix_commits` values as a run with `--with-dependents` and no `--scope` (assert equality of the two records field by field); (d) `--scope` may appear before or after the positionals (`["30", "--scope", "src"]` and `["--scope", "src", "30", "."]`); (e) invalid scope values from Failure modes.

### Failure modes
- when `--scope` value is an absolute path (starts with `/` or matches `^[A-Za-z]:`) -> response exit 2 with no stdout, log one stderr line `collect_signals.sh: --scope must be a repo-root-relative directory: <value>`, test asserts status 2, empty stdout, matching stderr
- when `--scope` value contains a `..` segment -> response exit 2 with no stdout, log the same stderr line, test asserts status 2 and empty stdout
- when `--scope` is the last argument with no value -> response exit 2 with no stdout, log `collect_signals.sh: --scope requires a directory argument`, test asserts status 2
- when `--scope` matches zero tracked files -> response exit 0 with empty stdout (a valid empty sweep, the skill validates existence before calling), log stderr `scope: <dir> (0 files)`, test asserts status 0, empty stdout, stderr contains `(0 files)`

### Contracts
- `--scope <dir>` grammar: two tokens, position-independent, value repo-root-relative, `./` prefix and trailing `/` tolerated, `.` or empty means whole repo; validation: absolute paths and `..` segments rejected with exit 2 - consumed by Task 2 (identical grammar in `collect_edges.sh`) and Task 7 (the skill passes it in Phase 1)
- Record set under scope: a path `p` is kept iff `p == dir` or `p` starts with `dir/`; every probe (churn, fix_commits, recency, loc, dependents) is computed exactly as without scope - consumed by Task 3 (the literal universe stays unscoped)
- stderr line `scope: <dir> (<N> files)` - consumed by Task 2 (same line, `pairs` instead of `files`)

### DoD
`node --test tests/superfix/collect_signals.test.ts` green with the new `--scope` cases; a scoped run's record for a scoped file equals the unscoped run's record; the dash scan on both files prints nothing.


### Covered criteria
2. `collect_signals.sh --scope <dir>` emituje rekordy wyłącznie dla śledzonych plików pod `<dir>`, a wartości `churn`, `fix_commits` i `dependents` tych plików są identyczne z wartościami z runu bez `--scope`.
20. `node --test "tests/**/*.test.ts"` przechodzi pod bash i Git-Bash, a `tests/superfix/` zawiera przypadki dla `--scope` w obu skryptach sweepu (kryteria 2 i 3), dla `dependents_stem` i dla scenariusza z kryterium 9.
