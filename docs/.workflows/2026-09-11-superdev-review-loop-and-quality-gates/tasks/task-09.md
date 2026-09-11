
## Task 9 - feat(superdev): code reviewers review by stage with IDs, debt file and BLOCKED
- TDD: none
- Model: opus
- Effort: xhigh
- Covers: criteria #5, #8, #10, #12, #13, #14, #15, #16, #21, #33

### Dependencies
- 1, 6 - blocks: 11, 12

### Files
- modify - superdev/skills/superbuild-reviewer-change/SKILL.md (`## Input` preloads for `stage`, `since`, `prior`, `decisions`; `## Contract`; `## Scope` per stage; `## Gates`; `## Review`; `## Calibration`; `## Report`; `## Output format`)
- modify - superdev/skills/simplebuild-reviewer/SKILL.md (same sections; plan-alignment gate kept for `checkpoint`/`final`, skipped on `re-review`; BLOCKED for header criteria)

### Test Commands
#### Build
- `node --test "tests/portability.test.ts"` - expected: all tests pass (every new `!` preload is a `printf | tr | sed | head` pipeline like the existing `report:` one, or a quoted `resolve-input.sh` call)

#### Tests
- `grep -c "sed -n 's/^\[\[:space:\]\]\*\(stage\|since\|prior\|decisions\):" superdev/skills/superbuild-reviewer-change/SKILL.md` - expected: `4`
- `grep -c "sed -n 's/^\[\[:space:\]\]\*\(stage\|since\|prior\|decisions\):" superdev/skills/simplebuild-reviewer/SKILL.md` - expected: `4`
- `! grep -n 'Strengths\|base:' superdev/skills/superbuild-reviewer-change/SKILL.md superdev/skills/simplebuild-reviewer/SKILL.md` - expected: no output, exit 0
- `grep -n 'VERDICT: BLOCKED' superdev/skills/superbuild-reviewer-change/SKILL.md superdev/skills/simplebuild-reviewer/SKILL.md` - expected: at least one hit per file
- `grep -n 'review-contract.md' superdev/skills/superbuild-reviewer-change/SKILL.md superdev/skills/simplebuild-reviewer/SKILL.md` - expected: one hit per file
- `grep -n 'debt.md' superdev/skills/superbuild-reviewer-change/SKILL.md superdev/skills/simplebuild-reviewer/SKILL.md` - expected: at least one hit per file

### Approach
1. Through `supercc:skill-designer`, in both skills replace the `Base SHA:` preload with four preloads of the existing `report:` pipeline shape for `stage:`, `since:`, `prior:` and `decisions:` (the `resolve-input.sh` preload keeps `plan spec` / `plan-header plan`; `prior` and `decisions` are optional file paths the skill Reads itself when non-empty). Add a `## Contract` line: Read `${CLAUDE_PLUGIN_ROOT}/references/review-contract.md` first; its `## Labels`, `## Finding IDs`, `## Report skeleton`, `## Verdict rules`, `## Debt file` and `## Decisions file` sections are binding; a missing `stage`/`since`, or a missing `prior` on `stage: re-review`, returns `VERDICT: FAIL` + `REASON: missing input <label>` and writes no report.
2. Rewrite `## Scope` (in `simplebuild-reviewer` this section does not exist yet - add it before `## Review`) per stage exactly as Task 1 `## Verdict rules` defines them (checkpoint: full read of `git diff <since>..HEAD`; final: the same plus the integration mandate over the whole build - contracts consumed across tasks per the plan's `### Contracts`, `CARRY:` lines from the notes dir, failure branches crossing tasks; re-review: verdict table for every `prior` ID first, then only the fix diff, no rank inflation, new Critical/Important only when fix-introduced). Style, polish and naming are never findings at any stage.
3. Add `## Gates` as the first working step, referencing Task 1 `## Gates` for the whole procedure (which commands, rerun rule after a fix, BLOCKED on an unrunnable documented command, the no-suite sentence) - no restatement.
4. Keep the existing quality/architecture/testing/production-readiness checks and the duplicated-derived-value greps (`??`, `||`, defaults, `UNDERSPECIFIED:` pairs), reword `## Calibration`: IDs per Task 1 `## Finding IDs`; Minor go to `## Debt` and are appended to `<workdir>/implementation/debt.md` (path = the `report` path's directory + `debt.md`) and never affect the verdict; a behaviour recorded under a task's `### Failure modes` or in the decisions file is a decision -> `NOTE: plan defect`, never Critical/Important; drop the "acknowledge what was done well" instruction. In `simplebuild-reviewer` keep the plan-alignment gate for `checkpoint` and `final`, skip it on `re-review`, and add BLOCKED for a header criterion unmet through a recorded decision.
5. Replace `## Report` with the skeleton reference (write the report in the exact `## Report skeleton` shape from the contract; always write it) and `## Output format` with the three-verdict return channel (`VERDICT: PASS|FAIL|BLOCKED`, `REVIEW: <path>` on FAIL and BLOCKED). Lint both with `lint_skill.sh`; keep each file under 110 lines.

### Edge cases
- `since` is `none` (no git): unbounded review, stated under `## Gates`; `prior` still verdicted by ID.
- A `prior` report in the pre-change format: handled per Task 1 `## Finding IDs` (fresh IDs, note in `## Notes`).
- A `decisions` file present: every line is plan text; a criterion listed there is neither Critical nor BLOCKED again.
- Both BLOCKED and FAIL conditions present: return `VERDICT: BLOCKED` (the report still lists the Critical/Important findings).

### Contracts
- Consumes Task 1 in full; the report on disk is consumed by Task 8's implementors (fix mode) and by the next round's reviewer as `prior`.

### DoD
Both reviewer skills implement the stage semantics, gates, IDs, debt file, decisions input, plan-defect rule and the three-verdict channel by referencing `review-contract.md`; greps hold; portability sweep green.


### Covered criteria
5. Recenzent zadania i recenzenci buildu mają regułę: zachowanie zapisane w `### Failure modes` zadania to decyzja, a niezgoda z nim to `NOTE: plan defect` w raporcie, nigdy Critical ani Important.
8. Recenzja końcowa kodu wchodzi z `stage: final`; jej mandat zapisany w `superbuild-reviewer-change` i `simplebuild-reviewer` to: weryfikacja po ID znalezisk z `prior`, pełne czytanie `git diff <since>..HEAD` (nowe Critical/Important dozwolone dla dowolnego defektu w tej delcie) oraz nad całym buildem szwy między zadaniami (kontrakty z `### Contracts` konsumowane przez inne zadania, wpisy `CARRY:` z notatek) i gałęzie awaryjne przecinające zadania (nowe Critical/Important dozwolone dla szwu, także w kodzie sprzed `since`); styl i polerka nie są znaleziskami.
10. Recenzja kodu (checkpoint, final i re-review) uruchamia pełny zestaw (build, wszystkie `Test Commands` planu, integracja i e2e, gdy host je ma) i zapisuje wynik w raporcie; po rundzie poprawek, która dotknęła plik spoza testów, re-recenzja ponawia e2e/integrację; gdy host ma zestaw e2e/integracyjny (komenda w planie lub w pamięci hosta), a nie da się go uruchomić w tym środowisku, recenzent zwraca `BLOCKED` z powodem, nigdy PASS; host bez takiego zestawu dostaje jedno zdanie w raporcie i nie jest blokowany.
12. Każde znalezisko w raporcie ma stałe ID `C<n>`, `I<n>`, `M<n>` nadane w rundzie, w której powstało, i zachowane w kolejnych; raport nie ma sekcji `Strengths`.
13. Minor każdej rundy recenzent dopisuje z ID do `<workdir>/implementation/debt.md` (dopisywanie, nie nadpisywanie) i nie wpływają one na werdykt; `cleanup-run.sh` usuwa ten plik razem z katalogiem runu bez osobnej obsługi.
14. Raport `stage: re-review` zaczyna się od tabeli werdyktów per ID z `prior` (`ADDRESSED` / `NOT ADDRESSED` z file:line), a recenzja obejmuje wyłącznie `git diff <since>..HEAD`.
15. W re-recenzji nowe Critical/Important pojawiają się tylko dla defektów wprowadzonych przez poprawkę, a znalezisko, które w `prior` było Minor, nie może wrócić jako Important.
16. Werdykt re-recenzji to FAIL wyłącznie przy `NOT ADDRESSED` dla Critical/Important albo przy nowym Critical/Important wprowadzonym przez poprawkę; wszystko inne daje PASS.
21. Wszystkie trzy recenzenty buildu zwracają `VERDICT: BLOCKED` + `REVIEW: <ścieżka>`, gdy kryterium jest niespełnione przez decyzję zapisaną w planie lub notatkach (nie przez brak kodu) albo gdy istniejący zestaw e2e/integracyjny nie da się uruchomić; raport ma wtedy sekcję `### Needs decision` z ID i powodem.
33. Recenzenci i implementorzy mają zapisany zakaz plików roboczych poza `.temp/` (sonda, log, tymczasowy plik testowy), a raport recenzji trafia wyłącznie pod ścieżkę `report:`.
