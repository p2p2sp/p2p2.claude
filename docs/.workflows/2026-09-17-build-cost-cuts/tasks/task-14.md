
## Task 14 - Sync README, plugin memory nodes and the manifest
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Trzy stany Review udokumentowane` (#3), `Effort opisany jako frontmatter` (#10), `Niezmiennik obejmuje runtime` (#14)

### Dependencies
- `Rewrite superbuild for Review: none, no effort passing and direct script calls` (Task 8) - blocks: stan orkiestratorów do opisania
- `Add the setup permissions step` (Task 13) - blocks: krok setup do opisania
- `Extend the plan review checklist with Review: none, Kind and B22` (Task 3) - blocks: słownik `Kind:`

### Files
- modify - superdev/README.md (punkt 5 sekcji "How it works" linie 63-77, wiersz `setup` linia 156, wiersze `superplan` linia 186, `superdev:superbuild-task-implementor` linia 189, `superdev:superbuild-task-reviewer` linia 190, `simpleplan` linia 166, `superdev:simplebuild-task-implementor` linia 169)
- modify - CLAUDE.md (root, sekcja `## Cross-plugin architecture invariants` - nowy bullet o sile dispatchu obok bulletu o pre-approval)
- modify - superdev/CLAUDE.md (`## Contracts & invariants` - zależność `node` skryptu setup za fallbackiem; `## Scripts inventory` - wiersz `decompose.sh`)
- modify - superdev/agents/CLAUDE.md (`## Entry points` dwa pierwsze bullety i bullet "Agents are dispatched with the `Agent` tool" w `## Contracts & invariants`)
- modify - superdev/hooks/content/manifest.md (`## Build chain` bullet "Super track only")

### Task Checks
- grep -c 'Review: none' superdev/README.md superdev/hooks/content/manifest.md CLAUDE.md
- grep -c 'Kind:' superdev/README.md
- grep -c 'frontmatter decides' superdev/agents/CLAUDE.md CLAUDE.md

### Approach
0. Root `CLAUDE.md`: jeden nowy bullet "Dispatch strength" w `## Cross-plugin architecture invariants` (obok bulletu o pre-approval z `Extend the pre-approval invariant to runtime script calls` (Task 7)): plan zadania niesie `Kind:`, `Model:`, `Effort:` i opcjonalny `Review:` w trzech stanach, zapisanych literalnie jako brak markera (frontmatter recenzenta), `Review: <model> <effort>` (model przekazany) i `Review: none` (recenzent per zadanie pominięty); zdanie o efforcie kończy się frazą "the agent's frontmatter decides" (ta sama fraza w `superdev/agents/CLAUDE.md`, krok 3); orkiestratory przekazują przy dispatchu wyłącznie `model`, bo narzędzie `Agent` nie przyjmuje `effort` i o efforcie decyduje frontmatter agenta; `Effort:` i drugi token `Review:` są sygnałem planisty; źródłem reguły jest `superdev/references/review-contract.md` `## Dispatch strength`.
1. README punkt 5 i wiersze tabel: implementor dispatchowany na `Model:` (effort z frontmatteru agenta, narzędzie `Agent` nie przyjmuje `effort`); recenzent per zadanie na `Review:` w trzech stanach (brak = `sonnet` frontmatter, `<model> <effort>` = model przekazany, literalnie `Review: none` = pominięty, zadanie idzie prosto do commitu); planiści przypisują `Kind: code | scaffold | text` według dowodu w `### Task Checks`, a `scaffold` i `text` domyślnie `sonnet` i bez recenzenta. Wiersz `setup`: dodaj scalanie rekomendowanych uprawnień za zgodą (node, fallback skip-with-note).
2. `superdev/CLAUDE.md`: bullet o zależności `node` skryptu `skills/setup/scripts/merge-settings.sh` za fallbackiem skip-with-note, jak checker kontrastu superui; w inwentarzu `decompose.sh` zostaw kolumny, dopisz że effort nie jest stosowany przy dispatchu.
3. `superdev/agents/CLAUDE.md`: implementory dispatchowane na `Model:` zadania, recenzent per zadanie na `Review:` (pominięty przy `Review: none`); bullet o dispatchu: per-call `model` jest honorowany, `effort` nie istnieje w narzędziu `Agent`, "the agent's frontmatter decides" (fraza literalnie, jak w root `CLAUDE.md`).
4. Manifest `## Build chain`: "Super track only: every task without `Review: none` passes the per-task gate …" (reszta bulletu bez zmian).

### Failure modes
- none - text

### Contracts
- none

### DoD
README, root `CLAUDE.md`, trzy węzły pamięci superdev i manifest opisują trzy stany `Review:`, oś `Kind:`, brak przekazywania effortu i krok uprawnień w setup; pierwszy grep z `### Task Checks` wypisuje co najmniej `:1` dla każdego z trzech plików, drugi co najmniej `1`, trzeci dokładnie `:1` dla każdego z dwóch plików.


### Covered criteria
3. Trzy stany Review udokumentowane - Szablon planu superplan, reguły siły dispatchu w kontrakcie recenzji, `superdev/README.md` i root `CLAUDE.md` opisują te same trzy stany markera `Review:`: brak, `<model> <effort>`, `none`.
10. Effort opisany jako frontmatter - Kontrakt recenzji, `superdev/README.md` i root `CLAUDE.md` stwierdzają, że narzędzie `Agent` nie przyjmuje `effort` i że decyduje frontmatter agenta, a reguły siły obu planistów nie kierują żadnej decyzji przez `Effort:`.
14. Niezmiennik obejmuje runtime - Niezmiennik pre-approval w root `CLAUDE.md` obejmuje wywołania runtime tak samo jak preloady.
