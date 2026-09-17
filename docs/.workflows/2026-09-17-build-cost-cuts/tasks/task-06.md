
## Task 6 - Add the per-kind discipline to both task implementors
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Zadanie text w jednym przejściu` (#7), `Zadanie scaffold przez narzędzie` (#8)

### Dependencies
- `Extend the plan review checklist with Review: none, Kind and B22` (Task 3) - blocks: słownik wartości `Kind:`

### Files
- modify - superdev/agents/superbuild-task-implementor.md (`## Input` linia 19, `## 1. Implement` - nowa podsekcja dyscypliny po bullecie "Plan task -> follow its `Approach` steps")
- modify - superdev/agents/simplebuild-task-implementor.md (`## Input` linia 19, `## 1. Implement` - ta sama podsekcja)

### Task Checks
- grep -c 'Kind: text' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md
- grep -c 'Kind: scaffold' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md

### Approach
1. Linia 19 obu agentów: do listy sekcji zadania planu dodaj marker `Kind`.
2. W `## 1. Implement` obu agentów, zaraz po bullecie o zadaniu planu, dodaj bullet "Kind discipline (plan task only)" z trzema podpunktami: `Kind: code` -> dzisiejsze zachowanie bez zmian; `Kind: scaffold` -> wyjście generowane powstaje przez uruchomienie generatora lub narzędzia nazwanego w `### Approach`, nigdy przez ręczne pisanie tego, co ono produkuje, a wygenerowane pliki edytuje się tylko tam, gdzie `### Approach` to nazywa; `Kind: text` -> czytasz wyłącznie pliki z `### Files` i pliki, które `### Approach` nazywa, nie piszesz sondy ani testu, nie szukasz precedensów w innych plikach repo (żadnego `Grep` ani `Read` poza tym zbiorem), jedno przejście: napisz, uruchom `### Task Checks`, zapisz notatki.
3. Zadanie bez markera `Kind:` (plan sprzed tej zmiany) -> zachowanie jak dla `code`; jedno zdanie w tym bullecie.
4. Sekcja `## 3. Record notes` (superbuild) / `## 4. Record notes` (simplebuild) bez zmian: `## Runs` i linie odchyleń obowiązują każdy rodzaj. Frontmatter obu agentów bez zmian (kształt pól według `.claude/rules/agent-frontmatter.md`).

### Failure modes
- when `Kind:` carries a value outside `code | scaffold | text` -> response traktuj jak `code` i zapisz jedną linię odchylenia w notatkach ("Kind: <value> unknown - treated as code"), log ta linia, test none - prose
- when a `Kind: scaffold` task names no generator or tool in `### Approach` -> response `DECISION:` w notatkach i `VERDICT: BLOCKED` według istniejącej reguły split (brak odpowiedzi do obrony), log linia `DECISION:`, test none - prose

### Contracts
- none

### DoD
Oba agenty mają bullet "Kind discipline" z trzema rodzajami i regułą dla braku markera; oba grepy z `### Task Checks` wypisują co najmniej `:1` dla każdego z dwóch plików.


### Covered criteria
7. Zadanie text w jednym przejściu - Implementor zadania `text` czyta wyłącznie pliki z `### Files` i pliki nazwane w `### Approach`, nie pisze żadnej sondy ani testu, nie szuka precedensów w innych plikach repo i zapisuje plik notatek z sekcją `## Runs` i liniami odchyleń, tak jak zadanie każdego innego rodzaju.
8. Zadanie scaffold przez narzędzie - Implementor zadania `scaffold` wytwarza generowane wyjście uruchomieniem nazwanego generatora lub narzędzia i edytuje to wyjście tylko tam, gdzie nazywa to `### Approach`.
