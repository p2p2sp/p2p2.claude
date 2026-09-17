
## Task 5 - Add the Kind axis and honest strength rules to simpleplan
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Kind daje domyślną siłę` (#6), `Zmiana droga do cofnięcia kieruje na recenzenta` (#11)

### Dependencies
- `Extend the plan review checklist with Review: none, Kind and B22` (Task 3) - blocks: tabela B22, do której planista odsyła

### Files
- modify - superdev/skills/simpleplan/SKILL.md (blok `**Build strength**` linie 104-110, `### Self-Review` linie 113 i 116)
- modify - superdev/skills/simpleplan/templates/plan.md (markery zadania linie 46-49)

### Task Checks
- grep -c 'Kind:' superdev/skills/simpleplan/SKILL.md superdev/skills/simpleplan/templates/plan.md
- grep -c 'B1-B22' superdev/skills/simpleplan/SKILL.md

### Approach
1. Szablon: po `- TDD: <marker>` dodaj `- Kind: <code | scaffold | text>`; brak `Review:` na tym torze pozostaje.
2. `**Build strength**` przepisz tak samo jak w superplan (`Add the Kind axis and honest strength rules to superplan` (Task 4)), z tą różnicą, że tor Simple nie ma recenzenta per zadanie: `scaffold` i `text` = `Model: sonnet`; zmiana droga do cofnięcia -> `Model: opus`; zdanie o `Effort:` jako sygnale bez wpływu na dispatch identyczne.
3. Linia 113: `B1-B21` -> `B1-B22`. Linia 116 self-review: dodaj `Kind:` z dozwolonego zbioru i zgodność z tabelą B22.

### Failure modes
- none - text

### Contracts
- none

### DoD
Szablon niesie `- Kind:`, `**Build strength**` opisuje oś i domyślne dla `scaffold`/`text`, self-review sprawdza `Kind:`; pierwszy grep z `### Task Checks` wypisuje co najmniej `:1` dla każdego z dwóch plików, drugi co najmniej `1`.


### Covered criteria
6. Kind daje domyślną siłę - Zadanie `scaffold` lub `text` niesie `Model: sonnet` oraz, na torze Super, `Review: none`, chyba że jego `### Approach` podaje powód wyższej siły.
11. Zmiana droga do cofnięcia kieruje na recenzenta - Reguła planisty dla zmiany drogiej do cofnięcia przypisuje `Model: opus` i `Review: opus high`, nie poziom effortu.
