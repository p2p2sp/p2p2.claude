
## Task 6 - fix(superdev): detect the plan file by format header when it sits outside .claude/plans
- Covers: criteria #5, #7, #10
- TDD: required

### Dependencies
- Task 5 - blocks: oba taski edytują `review-plan.sh` i `review-plan.test.ts`; Task 5 ustala kanoniczny format werdyktu, na którym opierają się fixtury tego taska

### Files
- modify - superdev/hooks/scripts/review-plan.sh (last_plan_write_line, plan_path)
- modify - tests/superdev/review-plan.test.ts
- modify - superdev/skills/simpleplan/SKILL.md (### Rules)
- modify - superdev/skills/superplan/SKILL.md (### Rules)

### Test Commands
*Build*
- `bash -n superdev/hooks/scripts/review-plan.sh` - oczekiwane: brak wyjścia, kod 0

*Tests*
- `node --test tests/superdev/review-plan.test.ts` - oczekiwane: kod 0
- `node --test "tests/**/*.test.ts"` - oczekiwane: kod 0

### Approach
1. Zastosuj dyscyplinę skilla `tdd` (ścisły red-green-refactor) dla tego taska.
2. RED: dopisz w `review-plan.test.ts` przypadek, w którym transkrypt zawiera `Write` do pliku `.md` spoza `.claude/plans/` (np. `plans-custom/foo.md`), plik na dysku otwiera się nagłówkiem `# SimplePlan`, a recenzent nie przebiegł - oczekiwaną decyzją jest `deny`; dopisz przypadek bliźniaczy, gdzie plik `.md` nie ma nagłówka formatu i decyzją jest `allow`. Uruchom suite i potwierdź, że pierwszy przypadek jest czerwony.
3. GREEN: w `review-plan.sh` zachowaj obecne wyszukanie `last_plan_write_line` po ścieżce jako szybką ścieżkę; gdy zwróci pustą wartość, wykonaj drugie przejście po transkrypcie szukające ostatniego `Write`/`Edit` do pliku `.md` (z tym samym wykluczeniem `.review-<N>.md` i tym samym filtrem `"(tool_name|name)":"(Write|Edit)"`), rozwiąż z niego `plan_path`, przeczytaj plik i zaakceptuj go jako plan tylko wtedy, gdy pierwsza linia pasuje do `^# (SimplePlan|SuperPlan)`. Brak takiego pliku lub brak nagłówka to nadal `emit_allow`.
4. Upewnij się, że `plan_base` jest ustawiane w obu ścieżkach - strażnik manipulacji po werdykcie z niego korzysta.
5. W `simpleplan/SKILL.md` i `superplan/SKILL.md` dopisz w sekcji `### Rules` regułę: plan zapisz do pliku wskazanego w komunikacie plan mode i tę samą ścieżkę przekaż reviewerowi jako `plan:`; nie wymieniaj żadnego katalogu z nazwy.

### Edge cases
Fallback po treści nie może uznać za plan pliku `.md`, który jedynie wspomina `superbuild` w prozie - dopasowanie kotwiczy się na pierwszej linii pliku i na nagłówku `#`, nie na wystąpieniu słowa w dowolnym miejscu. Plik zapisany, ale nieczytelny z dysku, zachowuje się jak dziś: fail-open.

### Contracts
Wejście hooka pozostaje niezmienione (stdin z `transcript_path`); nie wprowadzamy zależności od pola `cwd` ani od zmiennej `CLAUDE_PROJECT_DIR`.

### DoD
Plan poza `.claude/plans/` z nagłówkiem formatu jest bramkowany, plik `.md` bez nagłówka nie jest, wszystkie dotychczasowe przypadki nadal przechodzą, oba skille planujące instruują zapis pod ścieżkę z plan mode.


### Covered criteria
5. `review-plan.sh` wykrywa plik planu również poza `.claude/plans/`, po nagłówku `^# SimplePlan` lub `^# SuperPlan` w treści ostatnio zapisanego pliku `.md`, i bramkuje taki przypadek tak samo jak dziś bramkuje plan w `.claude/plans/`.
7. `simpleplan/SKILL.md` i `superplan/SKILL.md` instruują zapis planu do pliku wskazanego w komunikacie plan mode i przekazanie tej samej ścieżki reviewerowi jako `plan:`, bez wymieniania jakiegokolwiek katalogu z nazwy.
10. `node --test "tests/**/*.test.ts"` uruchomione z katalogu głównego repo kończy się kodem 0.
