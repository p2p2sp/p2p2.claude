
## Task 2 - Rewrite the dispatch strength rules in the review contract
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Trzy stany Review udokumentowane` (#3), `Effort opisany jako frontmatter` (#10)

### Dependencies
- none

### Files
- modify - superdev/references/review-contract.md (`## Dispatch strength`, wstęp pliku linie 3-5 o "the strength every dispatch runs at")

### Task Checks
- grep -c 'Review: none' superdev/references/review-contract.md
- grep -c 'frontmatter decides its effort' superdev/references/review-contract.md

### Approach
1. Przepisz `## Dispatch strength` tak, by mówiła o jednej skali (`opus` nad `sonnet`) i o tym, że narzędzie `Agent` nie przyjmuje parametru `effort`: żaden dispatch nie niesie `effort`, a poziom effortu każdego agenta ustala wyłącznie jego frontmatter; `Effort:` w planie i token `<effort>` w `Review:` są sygnałem planisty, nie parametrem dispatchu.
2. Zapisz trzy stany markera `Review:` na zadaniu toru Super: brak markera -> recenzent per zadanie dispatchowany bez `model` (frontmatter); `Review: <model> <effort>` -> dispatchowany z `model` = pierwszy token, drugi token nie jest przekazywany; `Review: none` -> recenzent per zadanie nie jest dispatchowany wcale, zadanie idzie po `VERDICT: PASS` implementora prosto do commitu, bez kontroli zastępczej, a jego notatki trafiają do `notes:` następnej rundy jak każde inne.
3. Reguły fixu: po recenzji zadania fix biegnie na `Model:` tego zadania; po checkpoint / final na najwyższym `Model:` wśród zadań, których `### Files` wskazuje znalezisko; brak dopasowania -> bez parametru `model`. Usuń każde zdanie o "highest `Effort:`".
4. W zdaniu wstępnym pliku (linia 5) zostaw "the strength every dispatch runs at" - to nadal ten plik.

### Failure modes
- none - text

### Contracts
- Trzy stany `Review:` (brak / `<model> <effort>` / `none`) i zdanie "no `effort` parameter is passed on any dispatch; the agent's frontmatter decides its effort" są jedynym źródłem tej reguły - consumed by `Extend the plan review checklist with Review: none, Kind and B22` (Task 3), `Rewrite superbuild for Review: none, no effort passing and direct script calls` (Task 8), `Rewrite simplebuild for no effort passing and direct script calls` (Task 9), `Sync README, plugin memory nodes and the manifest` (Task 14)

### DoD
`## Dispatch strength` opisuje trzy stany `Review:`, brak przekazywania `effort` i reguły fixu wyłącznie przez `Model:`; oba grepy z `### Task Checks` zwracają co najmniej `1`.


### Covered criteria
3. Trzy stany Review udokumentowane - Szablon planu superplan, reguły siły dispatchu w kontrakcie recenzji, `superdev/README.md` i root `CLAUDE.md` opisują te same trzy stany markera `Review:`: brak, `<model> <effort>`, `none`.
10. Effort opisany jako frontmatter - Kontrakt recenzji, `superdev/README.md` i root `CLAUDE.md` stwierdzają, że narzędzie `Agent` nie przyjmuje `effort` i że decyduje frontmatter agenta, a reguły siły obu planistów nie kierują żadnej decyzji przez `Effort:`.
