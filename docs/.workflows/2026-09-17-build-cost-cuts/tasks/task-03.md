
## Task 3 - Extend the plan review checklist with Review: none, Kind and B22
- TDD: none
- Model: opus
- Effort: high
- Covers: `Review none przechodzi recenzję planu` (#2), `Kind wymagany` (#4), `Kind zgodny z dowodem` (#5)

### Dependencies
- `Rewrite the dispatch strength rules in the review contract` (Task 2) - blocks: brzmienie trzech stanów `Review:` w B6

### Files
- modify - superdev/references/plan-review-checklist.md (linie 7-10 zakres, linia 18 zakres klas, B6, nowa B22 po B21, `## Advisory (NOTES)`, `## Author self-check`)
- modify - superdev/skills/superplan-reviewer/SKILL.md (linia 44: `B1-B21` -> `B1-B22`)
- modify - superdev/skills/simpleplan-reviewer/SKILL.md (linia 39: `B1-B21` -> `B1-B22`)

### Task Checks
- grep -c 'B22' superdev/references/plan-review-checklist.md
- grep -c 'B1-B22' superdev/skills/superplan-reviewer/SKILL.md superdev/skills/simpleplan-reviewer/SKILL.md

### Approach
1. Linie 7-10: dodaj `Kind:` do listy tokenów szablonu. Linia 18 i linia 130: zakres `B1-B21` -> `B1-B22`.
2. B6: `Kind:` staje się czwartym wymaganym markerem o wartościach `code` | `scaffold` | `text`; `Review:` pozostaje opcjonalny i przyjmuje albo `none`, albo jedną wartość `Model:` i jedną `Effort:`; każda inna pisownia (`None`, `skip`, `-`) jest B6.
3. Nowa klasa B22 "Task kind contradicts its proof" z tabelą rozstrzygania rodzaju z `### Task Checks` (jedyny właściciel tej tabeli): linia otwierająca się ścieżką pliku testowego -> `code`; `none - manual verification: <what>` oraz `none - covered by gate <Build|Tests|Integration>` -> `code`; komenda narzędzia bez pliku testowego (build, install, validate, generator, `ls` katalogu, `grep` po ścieżkach lub nazwach plików, na przykład `ls src/generated` albo `grep -c '^superdev/' .gitattributes`) -> `scaffold`; każde inne `none - <reason>` albo sam `grep`, którego wzorzec dotyczy treści plików (także z `-l`) -> `text`. Znalezisko B22: `Kind:` zadania różni się od rodzaju wyprowadzonego z tej tabeli, albo `Kind: text` lub `Kind: scaffold` niesie `TDD: required`. Rozstrzygane czytaniem linii `Kind:` i `TDD:` zadania przeciw jego `### Task Checks`.
4. `## Advisory (NOTES)`: zdanie o "`Model:` / `Effort:` / `Review:` that reads too low" zastąp zdaniem o `Model:` / `Review:` zbyt niskim dla tego, co `### Approach` musi przemyśleć, oraz o zadaniu `scaffold` lub `text` z `Model: opus` lub recenzentem bez powodu w `### Approach` - doradcze, nigdy blokujące.
5. `## Author self-check`: bullet markerów obejmuje `Kind:` i trzy stany `Review:`; nowy bullet: rodzaj każdego zadania zgadza się z tabelą B22.
6. W obu recenzentach planu zamień `B1-B21` na `B1-B22` w zdaniu o FINDINGS.

### Failure modes
- none - text

### Contracts
- Wartości `Kind:` (`code` | `scaffold` | `text`) i tabela rozstrzygania rodzaju z `### Task Checks` należą do B22 i są cytowane, nigdy kopiowane - consumed by `Add the Kind axis and honest strength rules to superplan` (Task 4), `Add the Kind axis and honest strength rules to simpleplan` (Task 5), `Add the per-kind discipline to both task implementors` (Task 6), `Sync README, plugin memory nodes and the manifest` (Task 14)
- Zbiór zamknięty wartości `Review:` rozszerzony o `none`; konsumenci: `superdev/scripts/decompose.sh` (przepuszcza dosłownie, bez zmian), `superdev/skills/superbuild/SKILL.md` (Task 8), `superdev/skills/simplebuild/SKILL.md` (ignoruje kolumnę, bez zmian poza Task 9), `superdev/skills/superplan/SKILL.md` i `templates/plan.md` (Task 4), `superdev/references/review-contract.md` (Task 2)

### DoD
Checklista ma B22 z tabelą, B6 wymaga `Kind:` i dopuszcza `Review: none`, oba recenzenty cytują `B1-B22`; pierwszy grep z `### Task Checks` zwraca co najmniej `1`, drugi wypisuje `:1` dla każdego z dwóch plików.


### Covered criteria
2. Review none przechodzi recenzję planu - Plan z `Review: none` na zadaniu przechodzi kontrolę markerów recenzenta planu, a każda inna nowa pisownia tej wartości nadal ją oblewa.
4. Kind wymagany - Zadanie planu bez markera `Kind:` albo z wartością spoza `code | scaffold | text` oblewa recenzję planu jako brakujący lub nieprawidłowy marker, na obu torach.
5. Kind zgodny z dowodem - Zadanie `text`, którego `### Task Checks` nazywa plik testowy, oraz zadanie `scaffold` z `TDD: required` oblewają recenzję planu ze znaleziskiem nazywającym niezgodność rodzaju z dowodem.
