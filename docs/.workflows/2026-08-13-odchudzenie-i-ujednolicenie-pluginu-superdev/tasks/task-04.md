
## Task 4 - fix(superdev): unify the TDD criterion across simpleplan and superplan
- Covers: criteria #3
- TDD: none

### Dependencies
- none

### Files
- modify - superdev/skills/superplan/SKILL.md (sekcja **TDD Discipline**)
- modify - superdev/skills/simpleplan/SKILL.md (sekcja **TDD Discipline**, sekcja ### Self-Review)

### Test Commands
*Build*
- brak - repozytorium nie ma kroku budowania ani lintera

*Tests*
- `grep -n "hot path" superdev/skills/superplan/SKILL.md superdev/skills/simpleplan/SKILL.md` - oczekiwane: trafienie w obu plikach
- `grep -rn "first step is to apply the .tdd. skill" superdev/skills/` - oczekiwane: brak trafień

### Approach
1. W `superplan/SKILL.md` zastąp regułę "Every task gets `TDD: required` … unless it changes no runtime behavior" treścią z `simpleplan/SKILL.md`: domyślnie `TDD: none`, `required` wyłącznie gdy kod taska podejmuje własną decyzję (logika biznesowa lub reguła domenowa, nietrywialny warunek lub maszyna stanów, algorytm, hot path), nigdy gdy task dotyka bezpośrednio świata zewnętrznego.
2. Usuń z `simpleplan/SKILL.md` akapit wymagający, by `TDD: required` pojawiło się jako pierwszy krok `### Approach`.
3. Usuń z sekcji `### Self-Review` w `simpleplan/SKILL.md` fragment weryfikujący, że `### Approach` otwiera się krokiem skilla `tdd`; zostaw weryfikację obecności samego markera.

### Edge cases
`simplebuild-implementor` i `superbuild-task-coder` już wołają skill `tdd` na widok markera `TDD: required` - egzekucja przenosi się tam w całości i nie wolno jej przy okazji usunąć.

### Contracts
Marker `TDD:` pozostaje polem obowiązkowym w obu szablonach planu (klasa B6 w `references/plan-review-checklist.md` nie zmienia się).

### DoD
Oba pliki niosą identyczne kryterium, żaden skill nie wymaga kroku `tdd` w `### Approach`, oba implementory nadal wołają skill `tdd` na marker.


### Covered criteria
3. Kryterium `TDD: required` w `superplan/SKILL.md` jest identyczne co do treści z `simpleplan/SKILL.md`, a żaden z tych plików nie wymaga już, by marker pojawił się jako krok w `### Approach`.
