
## Task 4 - Add the Kind axis and honest strength rules to superplan
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Kind daje domyślną siłę` (#6), `Zmiana droga do cofnięcia kieruje na recenzenta` (#11), `Trzy stany Review udokumentowane` (#3)

### Dependencies
- `Extend the plan review checklist with Review: none, Kind and B22` (Task 3) - blocks: tabela B22, do której planista odsyła

### Files
- modify - superdev/skills/superplan/SKILL.md (blok `**Build strength**` linie 101-109, `### Self-Review` linie 112 i 115)
- modify - superdev/skills/superplan/templates/plan.md (markery zadania linie 27-32)

### Task Checks
- grep -c 'Kind:' superdev/skills/superplan/SKILL.md superdev/skills/superplan/templates/plan.md
- grep -c 'B1-B22' superdev/skills/superplan/SKILL.md

### Approach
1. Szablon: po `- TDD: <marker>` dodaj `- Kind: <code | scaffold | text>`; linia `- Review:` przyjmuje `<none | <model> <effort>>`; komentarz w linii 32 opisuje trzy stany `Review:` (brak = frontmatter recenzenta, `none` = recenzent per zadanie pominięty, `<model> <effort>` = model przekazany, effort tylko sygnał).
2. `**Build strength**` przepisz jako trzy akapity: (a) `Kind:` rozstrzygany z `### Task Checks` według tabeli B22 checklisty (trzy krótkie linie: test -> `code`, narzędzie -> `scaffold`, czytanie -> `text`, z odesłaniem do B22 po szczegóły); (b) domyślne: `code` = dzisiejsze reguły wyboru `Model:` (nic do przemyślenia -> `sonnet`; decyzja własna zadania -> `opus`; `TDD: required` nigdy na `sonnet`), `scaffold` i `text` = `Model: sonnet` i `Review: none`, a wyższa siła lub recenzent wymaga zdania z powodem w `### Approach`; zmiana droga do cofnięcia (współbieżność, bezpieczeństwo, migracja danych, publiczny interfejs) -> `Model: opus` plus `Review: opus high`; (c) `Effort:` pozostaje wymaganym markerem z dotychczasowego zbioru wartości jako sygnał planisty, z jednym zdaniem, że narzędzie `Agent` go nie przyjmuje, więc żadna decyzja nie jest przez niego kierowana i frontmatter agenta ustala effort.
3. Linia 112: `B1-B21` -> `B1-B22`. Linia 115 self-review: dodaj `Kind:` do markerów z dozwolonych zbiorów, `Review:` może brzmieć `none`, oraz sprawdzenie zgodności `Kind:` z tabelą B22.

### Failure modes
- none - text

### Contracts
- none

### DoD
Szablon niesie `- Kind:`, `**Build strength**` opisuje oś, domyślne dla `scaffold`/`text` i regułę "drogie do cofnięcia -> `Model: opus` plus `Review: opus high`", self-review sprawdza `Kind:`; pierwszy grep z `### Task Checks` wypisuje co najmniej `:1` dla każdego z dwóch plików, drugi co najmniej `1`.


### Covered criteria
6. Kind daje domyślną siłę - Zadanie `scaffold` lub `text` niesie `Model: sonnet` oraz, na torze Super, `Review: none`, chyba że jego `### Approach` podaje powód wyższej siły.
11. Zmiana droga do cofnięcia kieruje na recenzenta - Reguła planisty dla zmiany drogiej do cofnięcia przypisuje `Model: opus` i `Review: opus high`, nie poziom effortu.
3. Trzy stany Review udokumentowane - Szablon planu superplan, reguły siły dispatchu w kontrakcie recenzji, `superdev/README.md` i root `CLAUDE.md` opisują te same trzy stany markera `Review:`: brak, `<model> <effort>`, `none`.
