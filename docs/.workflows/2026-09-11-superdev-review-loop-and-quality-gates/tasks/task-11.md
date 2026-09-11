
## Task 10 - feat(superdev): spec reviewer runs the full suite first and returns BLOCKED
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #11, #20, #21

### Dependencies
- 1, 6 - blocks: 11, 12

### Files
- modify - superdev/skills/superbuild-reviewer-spec/SKILL.md (`## Input` preloads for `stage`, `since`, `prior`, `decisions`; `## Contract`; new `## Gates` first step; `## Review`; `## Calibration`; `## Report`; `## Output format`)

### Test Commands
#### Build
- `node --test "tests/portability.test.ts"` - expected: all tests pass

#### Tests
- `grep -c "sed -n 's/^\[\[:space:\]\]\*\(stage\|since\|prior\|decisions\):" superdev/skills/superbuild-reviewer-spec/SKILL.md` - expected: `4`
- `grep -n '^## Gates\|^## Review' superdev/skills/superbuild-reviewer-spec/SKILL.md` - expected: two hits, `## Gates` on the lower line number
- `grep -n 'VERDICT: BLOCKED' superdev/skills/superbuild-reviewer-spec/SKILL.md` - expected: at least one hit
- `! grep -n 'base:' superdev/skills/superbuild-reviewer-spec/SKILL.md` - expected: no output, exit 0

### Approach
1. Through `supercc:skill-designer`, replace the `Base SHA:` preload with the four label preloads (`stage`, `since`, `prior`, `decisions`) in the existing `report:` pipeline shape and add the `## Contract` line pointing at `${CLAUDE_PLUGIN_ROOT}/references/review-contract.md` with the same missing-input rule as Task 9.
2. Insert `## Gates` as the first working step, referencing Task 1 `## Gates` for the procedure (results recorded before the coverage table) - no restatement.
3. In `## Review` keep the per-criterion coverage, plan consumption and deviations checks; on `stage: re-review` verdict every `prior` ID first (table per skeleton) and re-check only the criteria those IDs map to plus `git diff <since>..HEAD`; in `## Calibration` replace "Missing or partial -> Critical" with: missing or partial because code is missing -> Critical; unmet because of a decision recorded in the plan, the notes or the `decisions` file -> `### Needs decision` entry and `VERDICT: BLOCKED`; a `decisions` line is plan text.
4. Rewrite `## Report` to the contract skeleton with the spec-specific `## Coverage` table placed between `## Gates` and `## Prior findings`, and `## Output format` to the three-verdict channel. Lint with `lint_skill.sh`; keep the file under 100 lines.

### Edge cases
- No `Test Commands` in the plan and no documented command: `## Gates` states it and the review proceeds on reading alone, never PASS-by-assumption for a criterion that needs a run (say so in the coverage line).
- Criterion unmet by a plan-sanctioned fallback (the plan says "if the measurement does not confirm, revert"): BLOCKED, not Critical.

### Contracts
- Consumes Task 1; the report is consumed by Task 8's implementors via `task:`/`more:`.

### DoD
The spec reviewer runs the gates first, verdicts prior IDs on re-review, returns BLOCKED for decision-bound or unrunnable criteria, and writes the skeleton report; greps hold; portability sweep green.


### Covered criteria
11. Recenzenci buildu (`superbuild-reviewer-spec`, `superbuild-reviewer-change`, `simplebuild-reviewer`) przyjmują etykiety `stage: checkpoint|final|re-review`, `prior: <ścieżka poprzedniego raportu>` i `since: <SHA>`; `stage` i `since` są obowiązkowe zawsze (dla pierwszej rundy builda `since` to SHA bazy), `prior` jest obowiązkowe dla `stage: re-review` i dla każdej rundy po wcześniejszym raporcie, a pomijane tylko w pierwszej rundzie builda; brak `stage` lub `since`, albo brak `prior` przy `stage: re-review`, to błąd wejścia zwracany jako `VERDICT: FAIL` z powodem.
20. `superbuild-reviewer-spec` jako pierwszy krok uruchamia pełny zestaw (build, wszystkie `Test Commands` planu, integracja i e2e, gdy host je ma) i zapisuje wynik w raporcie przed sekcją pokrycia kryteriów.
21. Wszystkie trzy recenzenty buildu zwracają `VERDICT: BLOCKED` + `REVIEW: <ścieżka>`, gdy kryterium jest niespełnione przez decyzję zapisaną w planie lub notatkach (nie przez brak kodu) albo gdy istniejący zestaw e2e/integracyjny nie da się uruchomić; raport ma wtedy sekcję `### Needs decision` z ID i powodem.
