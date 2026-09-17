# SuperPlan
To build this plan use the `superbuild` skill.

Title: "Cięcie kosztu budowy superdev - Review: none, oś Kind, jedna postać wywołań skryptów, uprawnienia w setup"
Spec: C:/Projects/p2p2.claude/docs/.workflows/2026-09-17-build-cost-cuts/spec.md
Intent: docs/.workflows/2026-09-17-build-cost-cuts/intent.md
Plan: C:\Users\dariu\.claude-p2p2\plans\spicy-baking-metcalfe.md

## Gate commands

#### Build
- none - repo to markdown, JSON i bash; nie ma kroku budowy (root CLAUDE.md: "Editing markdown / JSON IS shipping")

#### Tests
- node --test tests/portability.test.ts tests/superdev/commit-task.test.ts tests/superdev/decompose.test.ts tests/superdev/stats-report.test.ts tests/superdev/bootstrap.test.ts

#### Integration
- node --test "tests/**/*.test.ts"

---

<!-- TASK -->

## Task 1 - Give the three runtime-invoked scripts the exec bit
- TDD: none
- Model: sonnet
- Effort: low
- Covers: `Wzorzec na skrypt` (#13)

### Dependencies
- none

### Files
- modify - superdev/scripts/commit-task.sh (tryb w indeksie git: 100644 -> 100755, treść bez zmian)
- modify - superdev/scripts/decompose.sh (tryb w indeksie git: 100644 -> 100755, treść bez zmian)
- modify - superdev/scripts/cleanup-run.sh (tryb w indeksie git: 100644 -> 100755, treść bez zmian)
- modify - tests/superdev/commit-task.test.ts (komentarz nad `function run` o trybie `100644`)
- modify - tests/superdev/decompose.test.ts (komentarz o trybie `100644` przy `runScript` z `shell: "bash"`, linia 107)

### Task Checks
- git ls-files -s superdev/scripts/commit-task.sh superdev/scripts/decompose.sh superdev/scripts/cleanup-run.sh superdev/scripts/stats-record.sh superdev/scripts/stats-report.sh superdev/scripts/checkpoint-update.sh superdev/scripts/record-decision.sh superdev/scripts/vibe-guard.sh | grep -c '^100755'
- node --test tests/portability.test.ts
- node --test tests/superdev/commit-task.test.ts
- node --test tests/superdev/decompose.test.ts

### Approach
1. Dla każdego z ośmiu skryptów runtime z pierwszej linii `### Task Checks`, którego tryb w `git ls-files -s` nie jest `100755` (dziś: `commit-task.sh`, `decompose.sh`, `cleanup-run.sh`; pozostałe pięć sprawdź, nie zakładaj), wykonaj `chmod +x <ścieżka>` oraz `git update-index --chmod=+x <ścieżka>` (drugie ustawia tryb w indeksie także na Windows, gdzie `core.fileMode` jest `false`); pierwsza komenda z `### Task Checks` ma wypisać `8`.
2. W `tests/superdev/commit-task.test.ts` zastąp komentarz nad `function run(dir, env, args)` (dziś: skrypt ma tryb `100644`, każdy SKILL.md woła go jawnie przez `bash`, sweep przenośności nie wymaga bitu) zdaniem, że skrypt ma `100755`, bo orkiestratory wołają go bezpośrednio (`"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh"`), a harness dalej uruchamia go przez `shell: "bash"`, bo tak testuje treść skryptu, nie jego bit. Ten sam komentarz w `tests/superdev/decompose.test.ts` (linia 107) o `decompose.sh` popraw tak samo.
3. Nic w treści skryptów się nie zmienia; `tests/portability.test.ts` (reguła `execBitViolations`) po tym zadaniu przechodzi zarówno z dzisiejszą postacią `bash "..."`, jak i z postacią bezpośrednią, którą wprowadzą zadania 8-10, 13 i 15.

### Failure modes
- when `git update-index --chmod=+x` fails (plik nieśledzony lub poza indeksem) -> response zatrzymaj zadanie z `VERDICT: FAIL` i komunikatem gita, log linia w `## Runs`, test pierwsza komenda `### Task Checks` wypisuje mniej niż `8`

### Contracts
- Osiem skryptów runtime (`commit-task.sh`, `decompose.sh`, `cleanup-run.sh`, `stats-record.sh`, `stats-report.sh`, `checkpoint-update.sh`, `record-decision.sh`, `vibe-guard.sh`) ma tryb `100755` w indeksie git; postać bezpośrednia wywołania (bez `bash`) jest od tego zadania dozwolona przez `tests/portability.test.ts` - consumed by `Rewrite superbuild for Review: none, no effort passing and direct script calls` (Task 8), `Rewrite simplebuild for no effort passing and direct script calls` (Task 9), `Move the build reviewers and e2e to direct script calls with patterns` (Task 10), `Move vibe to direct script calls with patterns` (Task 15)

### DoD
`git ls-files -s` pokazuje `100755` dla ośmiu skryptów (pierwsza linia `### Task Checks` wypisuje `8`), `tests/portability.test.ts`, `tests/superdev/commit-task.test.ts` i `tests/superdev/decompose.test.ts` zielone, oba komentarze w testach opisują nowy stan.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - Extend the pre-approval invariant to runtime script calls
- TDD: none
- Model: sonnet
- Effort: low
- Covers: `Niezmiennik obejmuje runtime` (#14)

### Dependencies
- `Give the three runtime-invoked scripts the exec bit` (Task 1) - blocks: niezmiennik wymaga `100755`, które to zadanie ustawia

### Files
- modify - CLAUDE.md (bullet `**Pre-approved `!` preload commands.**` linie 83-86)
- modify - superdev/skills/CLAUDE.md (bullet o preloadzie i `allowed-tools` w `## Contracts & invariants`)

### Task Checks
- grep -c 'preload and runtime' CLAUDE.md
- grep -c 'preload and runtime' superdev/skills/CLAUDE.md

### Approach
1. Root `CLAUDE.md`: przemianuj bullet na "Pre-approved bundled-script calls (preload and runtime)" (fraza literalnie, w obu plikach) i dopisz regułę runtime: każde wywołanie bundlowanego skryptu, które skill każe modelowi wykonać narzędziem Bash, jest jedną literalną linią `"${CLAUDE_PLUGIN_ROOT}/…/x.sh" <args>` (dla `run.sh` z heredokiem na stdin), bez prefiksu `bash`, bez przypisania zmiennej, bez `cd`, bez `;`; skill deklaruje po jednym wzorcu `Bash(${CLAUDE_PLUGIN_ROOT}/…/x.sh:*)` na każdy taki skrypt; skrypt ma `100755` i shebang bash. Powód w jednym zdaniu: klasyfikator uprawnień auto mode dopasowuje prefiks, a każda inna postać tej samej komendy to nowa klasyfikacja.
2. `superdev/skills/CLAUDE.md`: ten sam bullet w wersji skillowej (te same dwa wymagania, preload i runtime razem).

### Failure modes
- none - text

### Contracts
- Reguła postaci wywołania runtime (jedna literalna linia, wzorzec na skrypt, `100755`) jest zapisana raz w root `CLAUDE.md` i cytowana - consumed by `Rewrite superbuild for Review: none, no effort passing and direct script calls` (Task 8), `Rewrite simplebuild for no effort passing and direct script calls` (Task 9), `Move the build reviewers and e2e to direct script calls with patterns` (Task 10), `Add the setup permissions step` (Task 13), `Move vibe to direct script calls with patterns` (Task 15)

### DoD
Oba pliki opisują regułę runtime obok reguły preloadu; grepy z `### Task Checks` zwracają co najmniej `1`.

<!-- /TASK -->

---

<!-- TASK -->

## Task 8 - Rewrite superbuild for Review: none, no effort passing and direct script calls
- TDD: none
- Model: opus
- Effort: high
- Covers: `Review none pomija recenzenta` (#1), `Effort nie jest przekazywany` (#9), `Jedna postać wywołania` (#12), `Wzorzec na skrypt` (#13)

### Dependencies
- `Rewrite the dispatch strength rules in the review contract` (Task 2) - blocks: brzmienie trzech stanów `Review:`
- `Extend the pre-approval invariant to runtime script calls` (Task 7) - blocks: reguła postaci wywołania
- `Give the three runtime-invoked scripts the exec bit` (Task 1) - blocks: postać bezpośrednia wymaga `100755`

### Files
- modify - superdev/skills/superbuild/SKILL.md (frontmatter `allowed-tools`, `## Mandatory rules` linia 39, `### Stats` linie 53 i 57, `## Step 1` linie 70, 73, 75, `### Loop` linie 103, 107, 109, 111, `### Implementor stop` linie 124, 125, `### Fix loop` linie 135, 136, 138, 141, `## Step 3` linia 157, `## Step 4` linia 171, `## Step 5` linie 176, 177)

### Task Checks
- grep -c 'bash "\${CLAUDE_PLUGIN_ROOT}' superdev/skills/superbuild/SKILL.md
- grep -o 'Bash(\${CLAUDE_PLUGIN_ROOT}/scripts/[a-z-]*\.sh:\*)' superdev/skills/superbuild/SKILL.md | wc -l
- grep -c -e 'Review: none' -e 'column is' superdev/skills/superbuild/SKILL.md

### Approach
1. `allowed-tools`: obok istniejącego `read-config.sh` dodaj po jednym wzorcu `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh:*)` dla `decompose.sh`, `commit-task.sh`, `stats-record.sh`, `stats-report.sh`, `checkpoint-update.sh`, `record-decision.sh`, `cleanup-run.sh`.
2. Każde wywołanie `bash "${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" …` w treści zamień na `"${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" …` (pierwszy grep z `### Task Checks` ma zwrócić `0`); w `## Mandatory rules` dodaj bullet: każde wywołanie skryptu to jedna literalna linia w tej postaci, bez przypisań zmiennych, bez `cd`, bez `;`, z każdym argumentem w cudzysłowie - według reguły z root `CLAUDE.md` (`Extend the pre-approval invariant to runtime script calls` (Task 7)).
3. Effort: linia 39 mówi tylko o `model:`; linie 103, 109, 125, 138 tracą `effort:` (dispatch niesie wyłącznie `model:` z kolumny `<model>`, lub nic, gdy kolumna to `-`); linia 75 opisuje kolumnę `<effort>` jako sygnał planisty nieużywany przy dispatchu; linia 57 i 53: w `stats-record.sh` pole effort zawsze `-`.
4. `### Loop` krok 3: kolumna `<review>` równa `none` -> recenzent nie jest dispatchowany, żadnego zdarzenia `task-reviewer`, przejście prosto do kroku 4 (commit); kolumna `-` -> dispatch bez `model`; inna -> `model:` = pierwszy token, drugi token ignorowany. Krok 6 (checkpoint) bez zmian.
5. Linia 75 opisuje trzy stany kolumny `<review>` zgodnie z kontraktem (`Rewrite the dispatch strength rules in the review contract` (Task 2)).

### Failure modes
- when the `<review>` column carries a token outside `-`, `none` and `<model> <effort>` -> response eskalacja `AskUserQuestion` nazywająca zadanie `` `<title>` (Task NN) `` (skip reviewer / abort), log zdarzenie `escalation` w stats, test none - prose

### Contracts
- Stan kolumny `<review>` = `none` oznacza brak dispatchu recenzenta i brak zdarzenia `task-reviewer` w stats; `stats-report.sh` renderuje wtedy `-` w kolumnie Review (istniejący fallback, linia 208) - consumed by `Render model-only strength in the stats report` (Task 11)

### DoD
Superbuild nie zawiera `bash "${CLAUDE_PLUGIN_ROOT}`, deklaruje osiem wzorców (`read-config.sh` plus siedem), nie przekazuje `effort:` w żadnym dispatchu, pomija recenzenta przy `none`; linie `### Task Checks` wypisują `0`, `8` i co najmniej `1`.

<!-- /TASK -->

---

<!-- TASK -->

## Task 9 - Rewrite simplebuild for no effort passing and direct script calls
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Effort nie jest przekazywany` (#9), `Jedna postać wywołania` (#12), `Wzorzec na skrypt` (#13)

### Dependencies
- `Rewrite superbuild for Review: none, no effort passing and direct script calls` (Task 8) - blocks: identyczne brzmienie bulletu w `## Mandatory rules` i zdań o effort
- `Extend the pre-approval invariant to runtime script calls` (Task 7) - blocks: reguła postaci wywołania

### Files
- modify - superdev/skills/simplebuild/SKILL.md (frontmatter `allowed-tools`, `## Mandatory rules` linia 39, `### Stats` linie 53 i 57, `## Step 1` linie 70, 73, 75, `### Loop` linie 103, 107, `### Implementor stop` linie 120, 121, `### Fix loop` linie 131, 132, 134, 137, `## Step 3` linia 147, `## Step 4` linia 161, `## Step 5` linie 166, 167)

### Task Checks
- grep -c 'bash "\${CLAUDE_PLUGIN_ROOT}' superdev/skills/simplebuild/SKILL.md
- grep -o 'Bash(\${CLAUDE_PLUGIN_ROOT}/scripts/[a-z-]*\.sh:\*)' superdev/skills/simplebuild/SKILL.md | wc -l

### Approach
1. `allowed-tools`: te same siedem wzorców co w superbuild.
2. Każde `bash "${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" …` -> `"${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" …`; bullet w `## Mandatory rules` skopiowany słowo w słowo z superbuild (`Rewrite superbuild for Review: none, no effort passing and direct script calls` (Task 8)).
3. Effort: linie 39, 103, 121, 134 tracą `effort:`; linia 75 opisuje `<effort>` jako sygnał planisty, a `<review>` jako kolumnę ignorowaną na tym torze (bez zmian znaczenia); linie 53 i 57: pole effort w `stats-record.sh` zawsze `-`.

### Failure modes
- none - text

### Contracts
- none

### DoD
Simplebuild nie zawiera `bash "${CLAUDE_PLUGIN_ROOT}`, deklaruje osiem wzorców i nie przekazuje `effort:`; linie `### Task Checks` wypisują `0` i `8`.

<!-- /TASK -->

---

<!-- TASK -->

## Task 10 - Move the build reviewers and e2e to direct script calls with patterns
- TDD: none
- Model: sonnet
- Effort: low
- Covers: `Jedna postać wywołania` (#12), `Wzorzec na skrypt` (#13)

### Dependencies
- `Extend the pre-approval invariant to runtime script calls` (Task 7) - blocks: reguła postaci wywołania
- `Give the three runtime-invoked scripts the exec bit` (Task 1) - blocks: `commit-task.sh` w `e2e` wołany bezpośrednio

### Files
- modify - superdev/skills/superbuild-reviewer-spec/SKILL.md (frontmatter `allowed-tools` linia 8)
- modify - superdev/skills/superbuild-reviewer-change/SKILL.md (frontmatter `allowed-tools` linia 8)
- modify - superdev/skills/simplebuild-reviewer/SKILL.md (frontmatter `allowed-tools` linia 8)
- modify - superdev/skills/e2e/SKILL.md (frontmatter `allowed-tools` linia 7, blok komendy linie 149-151)

### Task Checks
- grep -c 'Bash(\${CLAUDE_PLUGIN_ROOT}/skills/executor/scripts/run.sh:\*)' superdev/skills/superbuild-reviewer-spec/SKILL.md superdev/skills/superbuild-reviewer-change/SKILL.md superdev/skills/simplebuild-reviewer/SKILL.md
- grep -c 'bash "\${CLAUDE_PLUGIN_ROOT}' superdev/skills/e2e/SKILL.md
- grep -c 'Bash(\${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:\*)' superdev/skills/e2e/SKILL.md

### Approach
1. Trzy recenzenty: do `allowed-tools` dodaj `Bash(${CLAUDE_PLUGIN_ROOT}/skills/executor/scripts/run.sh:*)`; treść (linie 38-40, wywołanie `run.sh` z heredokiem według `review-contract.md` `## Gates`) już ma postać bezpośrednią i zostaje.
2. `e2e`: blok komendy linii 150 -> `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "test(e2e): <run id>" --path …`; do `allowed-tools` dodaj `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:*)`.

### Failure modes
- none - text

### Contracts
- none

### DoD
Trzy recenzenty deklarują wzorzec `run.sh`, `e2e` woła `commit-task.sh` bezpośrednio i deklaruje jego wzorzec; pierwszy grep z `### Task Checks` wypisuje `:1` dla każdego z trzech plików, drugi `0`, trzeci `1`.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 12 - Add the settings template and the deterministic merge script
- TDD: none
- Model: opus
- Effort: high
- Covers: `Scalenie po zgodzie` (#15), `Scalenie idempotentne i bezpieczne` (#16), `Brak node zgłoszony` (#17)

### Dependencies
- none

### Files
- add - superdev/skills/setup/assets/settings.json (szablon uprawnień)
- add - superdev/skills/setup/scripts/merge-settings.sh (skrypt scalający, `100755`, `#!/usr/bin/env bash`)
- add - tests/superdev/merge-settings.test.ts (suita)

### Task Checks
- tests/superdev/merge-settings.test.ts - node --test tests/superdev/merge-settings.test.ts
- git ls-files -s superdev/skills/setup/scripts/merge-settings.sh | grep -c '^100755'

### Approach
1. `assets/settings.json`: obiekt z `$schema` (`https://json.schemastore.org/claude-code-settings.json`) i `permissions` = { `defaultMode`: `acceptEdits`, `allow`: lista `allow` skopiowana z `.claude/settings.json` tego repo w jego bieżącej postaci (34 wbudowane narzędzia: `Read`, `Glob`, `Grep`, `Edit`, `Write`, `NotebookEdit`, `Skill`, `Agent`, `Task`, `TaskCreate`, `TaskUpdate`, `TaskGet`, `TaskList`, `TaskStop`, `TaskOutput`, `TodoWrite`, `AskUserQuestion`, `ExitPlanMode`, `EnterPlanMode`, `Bash`, `BashOutput`, `KillShell`, `ToolSearch`, `WebSearch`, `WebFetch`, `LSP`, `Monitor`, `SendMessage`, `ListAgents`, `EnterWorktree`, `ExitWorktree`, `ListMcpResourcesTool`, `ReadMcpResourceTool`, `ReadMcpResourceDirTool`) bez wpisu `mcp__plugin_microsoft-docs_microsoft-learn`, bo to serwer MCP tego hosta, nie narzędzie wbudowane; `ask`: [], `deny`: lista `deny` skopiowana z tego samego pliku w całości (`rm -rf`, `sudo`, `dd`, `mkfs`, destrukcyjne `git`, `gh`, publish, chmury, odczyt sekretów, edycja `.git/`) }. Żadnych kluczy hosta (`modelOverrides`, `additionalDirectories`, `disableWorkflows`, `disableRemoteControl`) i żadnego wpisu `mcp__*`.
2. `merge-settings.sh <template> [<target>]` (target domyślnie `.claude/settings.json` względem cwd): nagłówek w kształcie repo (Usage / Parameters / Output / Exit codes); `command -v node` -> brak: wypisz `settings.json: node not found - merge skipped, recommended block:` i treść szablonu, exit 0; target nie istnieje: `mkdir -p` katalogu, kopia szablonu, `settings.json: created from template`; target istnieje: `node - "$template" "$target" <<'NODE' … NODE` z programem: `JSON.parse` obu plików; `permissions` tworzone gdy brak; `allow` i `deny` = kolejność hosta plus brakujące wpisy szablonu dopisane na końcu, bez duplikatów; `defaultMode` ustawiony gdy brak, inny istniejący -> zgłoszony; inne klucze nietknięte; wynik `JSON.stringify(obj, null, 2) + "\n"` zapisany do `<target>.tmp` i `fs.renameSync` na target; brak zmian -> `settings.json: already up to date` bez zapisu.
3. Linie wyjścia: `settings.json: merged - added <n> allow, <m> deny, defaultMode set` / `... defaultMode already <x> (left untouched)` / `settings.json: already up to date` / `settings.json: created from template` / `settings.json: not valid JSON - left untouched (<message>)`.
4. Test w kształcie `tests/superdev/bootstrap.test.ts` (`runScript` z `../harness/run.ts`, `withTempDir`, `coreUtilsPath` dla przypadku bez `node`, `SUT` przez `path.resolve(import.meta.dirname, …)`): brak pliku -> utworzony i równy szablonowi; częściowe pokrycie -> tylko brakujące dopisane na końcu, kolejność hosta zachowana, inne klucze bez zmian; `defaultMode` brak -> ustawiony; `defaultMode: plan` -> zostaje, linia raportu; drugi bieg -> bajtowo identyczny plik i `already up to date`; niepoprawny JSON -> plik bajtowo nietknięty, linia błędu, exit 2; PATH bez `node` -> linia skip z blokiem, plik nietknięty, exit 0; brak szablonu -> linia i exit 1; `permissions.allow` nie jest tablicą -> zastąpione tablicą scaloną, linia jak przy merge.
5. `chmod +x` i `git update-index --add --chmod=+x superdev/skills/setup/scripts/merge-settings.sh` na nowym skrypcie: `--add`, bo plik jest jeszcze nieśledzony i samo `--chmod=+x` (postać z `Give the three runtime-invoked scripts the exec bit` (Task 1)) odmawia dla ścieżki spoza indeksu; `commit-task.sh` stage'uje potem ten sam wpis z zachowanym trybem.

### Failure modes
- when the target is not valid JSON (also JSON with comments) -> response plik nietknięty, linia `settings.json: not valid JSON - left untouched (<message>)`, exit 2, log ta linia na stdout, test przypadek "niepoprawny JSON" w `merge-settings.test.ts`
- when `node` is absent from PATH -> response linia `settings.json: node not found - merge skipped, recommended block:` plus treść szablonu, exit 0, log ta linia, test przypadek "PATH bez node"
- when the template file is missing or unreadable -> response linia `settings.json: template missing at <path> - skipped`, exit 1, log ta linia, test przypadek "brak szablonu"
- when `permissions.allow` or `permissions.deny` in the target is not an array -> response traktuj jako pustą tablicę i nadpisz tablicą scaloną, linia raportu jak przy merge, test przypadek "allow nie jest tablicą"
- when the rename of `<target>.tmp` fails -> response plik docelowy nietknięty (tmp zostaje), linia `settings.json: write failed (<message>)`, exit 2, log ta linia, test none - filesystem

### Contracts
- `merge-settings.sh <template> [<target>]`: exit 0 = scalone / aktualne / utworzone / pominięte bez node; 1 = brak szablonu lub błędny argument; 2 = target niepoprawny lub zapis nieudany; stdout dokładnie jedna linia `settings.json: …` (plus blok szablonu w przypadku skip) - consumed by `Add the setup permissions step` (Task 13)
- Szablon `assets/settings.json` jest jedynym źródłem rekomendowanych list `allow` / `deny` i `defaultMode` - consumed by `Add the setup permissions step` (Task 13)

### DoD
Suita `merge-settings.test.ts` zielona we wszystkich przypadkach z kroku 4, skrypt ma `100755`, szablon zawiera listy z kroku 1.

<!-- /TASK -->

---

<!-- TASK -->

## Task 13 - Add the setup permissions step
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Scalenie po zgodzie` (#15), `Brak node zgłoszony` (#17)

### Dependencies
- `Add the settings template and the deterministic merge script` (Task 12) - blocks: skrypt i jego linie wyjścia
- `Extend the pre-approval invariant to runtime script calls` (Task 7) - blocks: reguła postaci wywołania

### Files
- modify - superdev/skills/setup/SKILL.md (frontmatter `allowed-tools` linia 4, nowa sekcja `## Permissions` między `## Bootstrap` a `## Output`, blok `## Output`)

### Task Checks
- grep -c 'merge-settings.sh' superdev/skills/setup/SKILL.md
- grep -c 'Bash(\${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/merge-settings.sh:\*)' superdev/skills/setup/SKILL.md

### Approach
1. `allowed-tools`: dodaj `Bash(${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/merge-settings.sh:*)` - `${CLAUDE_PLUGIN_ROOT}` a nie `${CLAUDE_SKILL_DIR}` jak przy preloadzie `bootstrap.sh`, bo to wywołanie runtime i tak spelluje je precedens `run.sh` executora; istniejący wpis preloadu zostaje bez zmian.
2. Nowa sekcja `## Permissions`: po bootstrapie jedno `AskUserQuestion` (pytanie i dwie opcje w `### Contracts`); odpowiedź "Merge" -> jedno wywołanie `"${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/merge-settings.sh" "${CLAUDE_PLUGIN_ROOT}/skills/setup/assets/settings.json"` i przekazanie jego linii dosłownie (nie weryfikować, nie ponawiać); odpowiedź "Skip" -> linia `settings.json: merge declined (left untouched)`, bez wywołania.
3. `## Output`: dodaj jedną linię `<settings line - the merge script's own line, or "settings.json: merge declined (left untouched)">` po linii `@playwright/test`.

### Failure modes
- when the merge script exits non-zero -> response przekaż jego linię dosłownie w `## Output` i zakończ setup normalnie (fail-soft jak bootstrap), log ta linia, test none - prose

### Contracts
- Tekst pytania `AskUserQuestion`: "Merge superdev's recommended permissions into .claude/settings.json? It adds the tool allow-list with Bash, a deny-list of destructive commands and defaultMode acceptEdits, keeping every entry you already have." Opcje: "Merge (Recommended)" - "Deterministic merge, your own entries and other keys stay untouched; needs node on PATH, otherwise the block is printed for manual merge."; "Skip" - "Leave .claude/settings.json untouched."

### DoD
Setup pyta raz, po zgodzie woła skrypt bezpośrednio i przekazuje jego linię, po odmowie zgłasza pominięcie; grepy z `### Task Checks` zwracają co najmniej `2` i `1`.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 15 - Move vibe to direct script calls with patterns
- TDD: none
- Model: sonnet
- Effort: low
- Covers: `Jedna postać wywołania` (#12), `Wzorzec na skrypt` (#13)

### Dependencies
- `Extend the pre-approval invariant to runtime script calls` (Task 7) - blocks: reguła postaci wywołania
- `Give the three runtime-invoked scripts the exec bit` (Task 1) - blocks: `commit-task.sh` wołany bezpośrednio

### Files
- modify - superdev/skills/vibe/SKILL.md (frontmatter `allowed-tools` linia 6, `## Guard` linia 158, `## Commit` linia 210)

### Task Checks
- grep -c 'bash "\${CLAUDE_PLUGIN_ROOT}' superdev/skills/vibe/SKILL.md
- grep -o -e 'Bash(\${CLAUDE_PLUGIN_ROOT}/scripts/vibe-guard.sh:\*)' -e 'Bash(\${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:\*)' superdev/skills/vibe/SKILL.md | wc -l

### Approach
1. `allowed-tools`: dodaj `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/vibe-guard.sh:*)` i `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:*)`.
2. Linia 158: `"${CLAUDE_PLUGIN_ROOT}/scripts/vibe-guard.sh" <run dir>/notes.md …`; linia 210: `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "<goal sentence>" --notes …`; reszta zdań bez zmian.

### Failure modes
- none - text

### Contracts
- none

### DoD
Vibe nie zawiera `bash "${CLAUDE_PLUGIN_ROOT}` i deklaruje oba wzorce; linie `### Task Checks` wypisują `0` i `2`.

<!-- /TASK -->

---
