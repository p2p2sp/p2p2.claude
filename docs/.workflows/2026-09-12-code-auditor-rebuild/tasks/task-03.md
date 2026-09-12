
## Task 3 - feat(superfix): dependents counted by a lockstep-unique literal, recorded as dependents_stem
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #7, #8, #9, #20

### Dependencies
- Task 1 - blocks: Task 7

### Files
- modify - superfix/skills/code-auditor/scripts/collect_signals.sh (new `literal_map` computed before the probe loop, new lookup in the `--with-dependents` block replacing `base`/`stem` derivation, `printf` record gains `dependents_stem`, header Signals block and dotfile paragraph)
- modify - tests/superfix/collect_signals.test.ts (case `one JSONL record per tracked file, with exactly the documented keys` gains `dependents_stem`; new section `// --- dependents_stem ---`)
- modify - superfix/agents/scout.md (the `## Inputs you are given` bullet naming the signal keys adds `dependents_stem`)

### Test Commands
#### Build
- none (no build step in this repo)

#### Tests
- `node --test tests/superfix/collect_signals.test.ts` - expected: green, including the updated keys case and the new `dependents_stem` cases
- `node --test tests/superfix/rank.test.ts` - expected: green (regression guard only; `rank.ts` picks fixed `hotKeys` and ignores unknown signal keys, the rank fixtures carry no `dependents_stem`)
- `! grep -rn $'\u2013\|\u2014' superfix/skills/code-auditor/scripts/collect_signals.sh superfix/agents/scout.md tests/superfix/collect_signals.test.ts` - expected: no output, exit 0

### Approach
1. Before the pass-2 pipeline, when `WITH_DEPENDENTS=yes`, build `literal_map` (TAB-separated `path<TAB>literal`, literal empty for `-1`) with one `awk` program over the unscoped universe `git -c core.quotePath=false ls-files | noise_filter` (quoted paths starting with `"` skipped, as pass 2 does). Algorithm `lockstep_literals`: split each path on `/` into segments; `depth = 0`; `active = all paths`; repeat: for every active path compute `lit = join(last depth+1 segments, "/")` with the last segment's extension stripped by the existing rule (`${base%.*}` semantics, a dotfile keeps its full basename); count `lit` over active paths only; a path whose `lit` is unique is finalised with that literal; a path whose `lit` collides and has more than `depth+1` segments stays active; a colliding path with no segment left is finalised with the empty literal; `depth++` until `active` is empty.
2. Hand `literal_map` to the probe loop through a temp file created with `mktemp` and removed by an `EXIT` trap; inside the loop, replace `base="$(basename "$f")"` / `stem=...` with a lookup `stem="$(awk -F'\t' -v p="$f" '$1 == p { print $2; exit }' "$literal_map_file")"`.
3. Keep the `git grep -lI -- "$stem"` probe unchanged; when `stem` is empty set `dependents=-1`.
4. Emit `"dependents_stem":"<esc stem>"` after `dependents` when `dependents` is not `-1`, else `"dependents_stem":null` (also without `--with-dependents`).
5. Header: Signals block gains `dependents_stem  the literal dependents was counted by (null when -1)`; replace the dotfile paragraph with one describing the lockstep rule (uniqueness over the noise-filtered tracked set regardless of `--scope`, whole-string comparison, extend one segment from the right per round for every member of a colliding group, a member with no segment left drops out with `-1` and the rest keep extending).
6. Tests: update the keys case to the seven keys and assert `dependents_stem === null` without the flag. New fixture `buildCollisionFixture`: `a/index.ts`, `b/index.ts`, `lib/a/index.ts`, `index.ts` (root), plus `use1.md`..`use3.md` containing the literal `a/index`, `use4.md` containing `b/index`, `use5.md` containing `lib/a/index`, `widget.ts` with `consumer.md` mentioning `widget`. Cases: (a) `b/index.ts` -> `dependents 1`, `dependents_stem "b/index"`; `lib/a/index.ts` -> `dependents_stem "lib/a/index"` and `dependents 1`; `a/index.ts` -> `dependents -1`, `dependents_stem null` (its path is exhausted at `a/index` while `lib/a/index.ts` still carries the substring, and at depth 1 the two literals `a/index` and `a/index` collide; `lib/a/index.ts` extends, `a/index.ts` has no segment left); root `index.ts` -> `-1`/`null`; `widget.ts` -> `dependents 1`, `dependents_stem "widget"`. (b) A second fixture with only `a/index.ts`, `b/index.ts` and the `a/index` x3 / `b/index` x1 mentions asserts `3`/`1` and stems `a/index`/`b/index` (criterion 9 verbatim). (c) `--scope b --with-dependents` on fixture (b) still yields `dependents_stem "b/index"` (uniqueness judged repo-wide).

### Failure modes
- when `mktemp` fails -> response exit 1 with no further stdout, log `collect_signals.sh: cannot create literal map temp file`, test none (environmental; documented in header only)
- when a path has no entry in `literal_map` (a file that appeared between passes) -> response `dependents=-1`, `dependents_stem null` for that record, log stderr warning `collect_signals.sh: warning: no literal for <path>`, test none - a race between two `git ls-files` passes cannot be staged in a fixture; the keys case guarantees the null shape
- when the literal is empty for a path -> response `dependents -1`, `dependents_stem null`, log none, test case (a) root `index.ts`

### Contracts
- `signals.jsonl` record: `{"path","churn","fix_commits","recency_days","loc","dependents","dependents_stem"}` in that order, `dependents_stem` a JSON string or `null` - consumed by Task 7 (Phase 1 description) and read by `scout.md` (this task updates its input bullet); `rank.ts` and `rank_edges.ts` ignore unknown keys (verified by the rank test run)
- Lockstep literal rule as stated in Approach step 1 - consumed by Task 8 (CLAUDE.md script inventory sentence)

### DoD
Both test files green; the collision fixture yields `1 / 1 / -1 / -1 / 1` with the stems named above; the criterion 9 fixture yields `3` and `1`; the dash scan prints nothing.


### Covered criteria
7. Literał zliczania jest wyznaczany wśród wszystkich śledzonych plików repo po filtrze szumu, niezależnie od `--scope`. Literał startowy pliku to jego `<stem>` (dotychczasowa reguła, z regułą dotfile bez zmian). Literał "powtarza się", gdy inny plik z tego zbioru wyznacza dokładnie ten sam literał (porównanie całych łańcuchów, nie sufiksów). Gdy literał pliku się powtarza, każdy plik z kolidującej grupy dokłada kolejny segment katalogu od prawej (`a/index`, potem `lib/a/index`) i porównanie jest powtarzane w tym samym kroku rozszerzania dla całej grupy (lockstep), aż literał pliku stanie się unikalny lub ścieżka pliku się wyczerpie; plik, który wyczerpał ścieżkę, wypada z grupy, a pozostałe rozszerzają dalej. Plik, którego ścieżka wyczerpała się bez unikalnego literału (w tym plik w korzeniu repo o powtórzonym `<stem>`), otrzymuje `dependents: -1` i `dependents_stem: null`. Plik z unikalnym literałem startowym liczy jak dotychczas po samym `<stem>`.
8. Każdy rekord `signals.jsonl` z `dependents` różnym od `-1` niesie pole `dependents_stem` równe literałowi użytemu do zliczania; rekord z `dependents: -1` niesie `dependents_stem: null`.
9. W repo z plikami `a/index.ts`, `b/index.ts`, trzema plikami zawierającymi literał `a/index` i jednym plikiem zawierającym literał `b/index` (żaden z nich nie jest samym `index.ts`), `dependents` wynosi odpowiednio 3 dla `a/index.ts` i 1 dla `b/index.ts`, a `dependents_stem` odpowiednio `a/index` i `b/index`.
20. `node --test "tests/**/*.test.ts"` przechodzi pod bash i Git-Bash, a `tests/superfix/` zawiera przypadki dla `--scope` w obu skryptach sweepu (kryteria 2 i 3), dla `dependents_stem` i dla scenariusza z kryterium 9.
