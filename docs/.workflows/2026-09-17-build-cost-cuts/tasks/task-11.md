
## Task 11 - Render model-only strength in the stats report
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Effort nie jest przekazywany` (#9)

### Dependencies
- `Rewrite superbuild for Review: none, no effort passing and direct script calls` (Task 8) - blocks: pole effort w zdarzeniach zawsze `-`

### Files
- modify - superdev/scripts/stats-report.sh (funkcja `strength(model, effort)` linie 142-145, komentarz nagłówka linia 46)
- modify - tests/superdev/stats-report.test.ts (nowy przypadek: zdarzenie z `effort: "-"` renderuje samą nazwę modelu)

### Task Checks
- tests/superdev/stats-report.test.ts - node --test tests/superdev/stats-report.test.ts

### Approach
1. `strength(model, effort)`: oba `-` -> `-`; effort `-` -> sam `model`; inaczej `model "/" effort` (istniejące fixtures z `effort: "high"` renderują się jak dotąd).
2. Komentarz nagłówka (linia 46) mówi, że kolumny Implementor i Review niosą `model` lub `model/effort`, a effort jest `-` w każdym zdarzeniu zapisanym przez orkiestratory od tej zmiany.
3. Nowy test: zdarzenie `implementor` z `model: "opus"`, `effort: "-"` -> wiersz tabeli zawiera `| opus |`, nie `opus/-`.

### Failure modes
- none - pure

### Contracts
- none

### DoD
`stats-report.test.ts` zielony z nowym przypadkiem; wiersz z effort `-` pokazuje sam model.


### Covered criteria
9. Effort nie jest przekazywany - Żaden dispatch wykonywany przez superbuild ani simplebuild nie niesie parametru `effort`, a każde zdarzenie `stats` ma `-` w kolumnie effort.
