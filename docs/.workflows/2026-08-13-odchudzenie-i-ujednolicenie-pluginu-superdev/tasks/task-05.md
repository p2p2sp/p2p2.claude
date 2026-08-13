
## Task 5 - fix(superdev): canonicalize the VERDICT marker to the unbolded form
- Covers: criteria #4, #10
- TDD: required

### Dependencies
- none

### Files
- modify - superdev/skills/simpleplan-reviewer/SKILL.md (## Output Format)
- modify - superdev/skills/superplan-reviewer/SKILL.md (## Output Format)
- modify - superdev/skills/simpleplan/SKILL.md (### Final Review)
- modify - superdev/skills/superplan/SKILL.md (## Final Review)
- modify - superdev/hooks/scripts/review-plan.sh (verdict_line, verdict_value)
- modify - tests/superdev/review-plan.test.ts (fixtury LPASS, LFAIL, LPASTE, LLEGEND, LNEG, LNEG_UPPER, LPASS_CANON, LPASS_LIST, LFAIL_LIST, LPASS_START, LFAIL_START)

### Test Commands
*Build*
- `bash -n superdev/hooks/scripts/review-plan.sh` - oczekiwane: brak wyjścia, kod 0

*Tests*
- `node --test tests/superdev/review-plan.test.ts` - oczekiwane: kod 0
- `node --test "tests/**/*.test.ts"` - oczekiwane: kod 0

### Approach
1. Zastosuj dyscyplinę skilla `tdd` (ścisły red-green-refactor) dla tego taska.
2. RED: w `tests/superdev/review-plan.test.ts` przestaw na kanoniczne `VERDICT: PASS` / `VERDICT: FAIL` każdą fixturę niosącą dziś formę pogrubioną lub inną wielkość liter niż `VERDICT` - `LPASS`, `LFAIL`, `LPASTE`, `LLEGEND`, `LNEG`, `LPASS_CANON`, `LNEG_UPPER` (jej drugi, rozstrzygający werdykt), `LPASS_START`, `LFAIL_START`. Fixtury `LPASS_LIST` i `LFAIL_LIST` zostają bez zmian: niosą `- VERDICT: \`PASS\`` / `- VERDICT: \`FAIL\``, a tolerancja markera listy `([-*] )?` i back-ticków pozostaje w regexie. Przepisz komentarz nad blokiem fixtur format-tolerance, który opisuje dziś tolerancję wielkości liter i pogrubienia. Przetytułuj przypadek `FC`, którego dzisiejsza nazwa mówi o formie pogrubionej ("canonical bold+UPPER"). Dopisz przypadek, w którym recenzent zwraca `**VERDICT:** PASS`, a oczekiwaną decyzją jest `deny`. Uruchom suite i potwierdź czerwień na nowym przypadku.
3. GREEN: w `review-plan.sh` zawęź wzorce w `verdict_line` i `verdict_value` - usuń obie opcjonalne grupy `(\*\*)?` oraz klasę znakową `[Vv][Ee][Rr][Dd][Ii][Cc][Tt]`, zostawiając literalne `VERDICT:`; zachowaj kotwice `\\n` i `"(text|content)":"`, tolerancję markera listy `([-*] )?`, back-ticki wokół wartości i kotwicę końca tokenu.
4. Zamień KAŻDE wystąpienie `**VERDICT:**` na `VERDICT:` w obu reviewerach - nie tylko w sekcji wyjściowej, ale też w sekcji `## Input`, gdzie brak wymaganej etykiety nakazuje zwrócić `**VERDICT:** FAIL` - oraz w `simpleplan` i `superplan`. Usuń zdania wymagające pogrubienia ("Bold markers required").
5. Zaktualizuj OBA komentarze w `review-plan.sh` opisujące format werdyktu - ten nad `verdict_line` i ten nad `verdict_value` - tak by opisywały format kanoniczny zamiast nieaktualnej tolerancji.

### Edge cases
Zawężenie wzorca jest fail-closed - brak dopasowania prowadzi do `emit_deny` z komunikatem o braku linii `VERDICT:`, nigdy do `emit_allow`. Przypadki G, H i NEG w suite chronią przed fałszywym PASS z wklejki, legendy i zdania zanegowanego; muszą przejść po zmianie fixtur.

### Contracts
Kanoniczny format zwracany przez każdy skill superdev: pierwsza linia dosłownie `VERDICT: PASS` albo `VERDICT: FAIL`, bez pogrubienia, bez back-ticków, bez markera listy.

### DoD
Żaden plik w `superdev/` nie zawiera `**VERDICT:**`, regex hooka nie zawiera `(\*\*)?` ani klasy `[Vv]…`, stary format pogrubiony jest odrzucany przez nowy test, cały suite zielony.


### Covered criteria
4. Żaden plik w `superdev/` nie zawiera ciągu `**VERDICT:**`, a `review-plan.sh` nie zawiera ani `(\*\*)?`, ani klasy `[Vv][Ee][Rr][Dd][Ii][Cc][Tt]`.
10. `node --test "tests/**/*.test.ts"` uruchomione z katalogu głównego repo kończy się kodem 0.
