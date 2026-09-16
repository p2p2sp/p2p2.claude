# Intent: gate na poziomie planu, osąd planisty, odchudzone raporty i przełącznik stats
Date: 2026-09-16

## Request
Faza implementacji w superdev trwa nieproporcjonalnie długo do rozmiaru zmian. Trzy przyczyny i trzy zmiany: (1) skille planistów (`superplan`, `simpleplan`) na sztywno wymuszają build i testy w każdym zadaniu, a w hoście takim jak to repo build to cały suite (`node --test`, ok. 90 s), który biegł 11 razy w jednym buildzie siedmiu zadań markdownowych; planista ma dostać kryteria i swobodę osądu na podstawie pamięci hosta (`CLAUDE.md`, `.claude/rules/`), nie regułę. (2) Raporty reviewerów w `implementation/` w 55-90% przepisują plan, poprzednią rundę lub DoD (`## Gates` z 28 komendami, re-review kopiujący blok gate'ów, `debt.md` bez ani jednego czytelnika); zapiski to uwagi LLM dla LLM i mają nieść samą esencję. (3) Nowy przełącznik `stats` (default `false`) w `.claude/superdev.yml`: po pełnym CloseOut orkiestrator zapisuje w `.temp/` statystyki wykonania workflow (czasy i tokeny per zadanie / recenzja, sumy, anomalie), z jednym szablonem gwarantującym stałą strukturę, tanio dla orkiestratora.

## Decisions
### 1. Jak planista decyduje o weryfikacji zadania (build, testy, Task Tests)?
Gate raz na poziomie planu: nagłówek planu (przed pierwszym `<!-- TASK -->`) dostaje blok `## Gate commands`, a zadanie niesie tylko to, co uruchamia implementator. Forki reviewerów zbierają gate z nagłówka; koniec ze zbieraniem i deduplikacją komend z zadań.

### 2. Co implementator uruchamia na koniec zadania, gdy gate siedzi w nagłówku planu?
Tylko sekcję zadania, przemianowaną z `### Task Tests` na `### Task Checks`: jedna linia per komenda, którą implementator uruchamia jako dowód tego zadania (plik testowy, który napędza też cykl TDD; kompilacja / type-check; lint; grep; cokolwiek planista uzna za dowód dla tych `### Files` w tym hoście) albo `none - <powód>`. Bez obowiązkowego buildu: pojedynczy test, który dowodzi zadania, wystarcza. Skill daje kryteria (najwęższy zakres, szybko, w pamięci, dowód a nie rytuał).

### 3. Kształt bloku `## Gate commands` w nagłówku planu i kto przypisuje etap?
Trzy stałe podsekcje `#### Build`, `#### Tests`, `#### Integration`, każda może brzmieć `none - <powód>`; planista wypełnia zakres każdej na podstawie pamięci hosta i tego, co plan rusza. `review-contract.md ## Gates` przypisuje etap: checkpoint uruchamia Build + Tests, final i re-review wszystkie trzy. Sprawdzenia per zadanie żyją tylko w `### Task Checks`; reviewerzy ich nie powtarzają, czytają `## Runs` w notes.

### 4. Co reviewer planu blokuje w nowym kształcie (klasy w `plan-review-checklist.md`)?
Klasy przecięte na "brak osądu", nie "brak komendy". B6 wraca do samych markerów (obecność i dozwolony zbiór, z nowym `Review:`). Nowa klasa blokująca: `none` bez powodu albo z powodem sprzecznym z `### Files` zadania lub z pamięcią hosta, w `## Gate commands` i w `### Task Checks` jednakowo. B16 liczy tylko linie z plikiem testowym w `### Task Checks`. B2 obejmuje nagłówek i sekcje zadań. Doradcze: model / effort "za nisko" oraz brak jakiegokolwiek gate'u w planie, który rusza kod. Reviewer nadal weryfikuje tylko `Read` / `Grep` / `Glob`.

### 5. Jak planista dobiera siłę buildu (`Model:` / `Effort:`) i jaką siłę dostaje per-task reviewer?
Rubryka staje się wskazówką o obciążeniu: znika "wszystko poza mechanicznym to `opus`" i "w razie wątpliwości wyżej"; skill mówi planiście, że pracuje na najsilniejszym modelu i sam ocenia, ile rozumowania zadanie wymaga, z przykładami w obie strony. Per-task reviewer dostaje własny opcjonalny marker `Review: <model> <effort>`; brak markera oznacza frontmatter agenta reviewera, obniżony do `sonnet` / `high`. Tryb fix dostaje markery zadania zamiast wracać do `xhigh` z frontmatter.

### 6. Jak odchudzić raporty i notes w `implementation/`?
Raport niesie tylko nowe informacje, zwięźle, bez tłumaczeń: `## Gates` to jedna linia na podsekcję gate'u (przy FAIL podsumowanie narzędzia plus ścieżka logu), bez linii tytułowej z nazwą pliku, sekcja bez treści pominięta, `VERDICT:` na końcu jedyną stałą; `## Prior findings` zostaje; re-review nie kopiuje bloku gate'ów, podaje wynik ponownego biegu w tej samej jednej linii na podsekcję; `## Assessment` to zdanie o werdykcie bez recytowania DoD. Minor zostaje w `## Debt` raportu, plik `debt.md` przestaje istnieć. Recenzja zadania z samymi uwagami nie pisze własnego pliku: dopisuje `NOTE:` linie pod `## Review notes` w `task-NN-notes.md`. Notes implementatora nigdy nie przepisują zadania ani raportu (odwołanie do kroku numerem); notes fix-mode to jedna linia statusu per ID.

### 7. Jak orkiestrator zbiera i zapisuje statystyki, skoro sam nie może pisać plików?
Nowy `superdev/scripts/stats-record.sh <workdir> <kind> <label> [model] [effort] [tokens] [tool_uses] [duration_ms] [verdict] [note]` dopisuje jedną linię TSV ze znacznikiem czasu nadanym przez skrypt do `.temp/superdev/stats/<run>.events`, wołany raz po każdym zdarzeniu (dispatch implementatora, reviewera, forka, writera; `commit-task.sh`; eskalacja). Dla `Agent` orkiestrator przepisuje `subagent_tokens` / `tool_uses` / `duration_ms` z powiadomienia o zakończeniu; dla forka `Skill` tokeny to `-`, czas wyliczany z różnicy znaczników poprzedniego i bieżącego zdarzenia. Na końcu Kroku 5, po commicie CloseOut i przed `cleanup-run.sh`, `superdev/scripts/stats-report.sh <workdir>` renderuje `.temp/superdev/stats/<run>.md` z `superdev/references/stats-template.md` (współdzielony przez oba orkiestratory): czasy i tokeny per zadanie / recenzja / rodzaj, sumy całego workflow.

### 8. Co wchodzi do sekcji anomalii w stats i skąd się bierze?
Dwa źródła mechaniczne, zero prozy orkiestratora. Zdarzenia orkiestratora z krótką notką w tym samym wywołaniu `stats-record.sh`: werdykt `FAIL` z `REASON:`, `BLOCKED`, eskalacja do użytkownika i jej wynik, ponowny dispatch, niezadeklarowana zmiana w working tree, agent bez raportu, limit sesji. Liczniki z `implementation/` zliczane przez `stats-report.sh` przed renderem: linie `UNDERSPECIFIED:`, `CARRY:`, `touched:`, `NOTE: plan defect` oraz rundy recenzji per zadanie ponad pierwszą. Sekcja `## Anomalies` to jedna linia na zdarzenie (`<czas> <rodzaj> <etykieta> - <notka>`) plus tabela liczników per zadanie; brak anomalii to jedna linia `none`.

## Constraints
- Raport stats czyta człowiek: markdown. Zapis wyłącznie po pełnym CloseOut (nie przy przerwaniu buildu); plik zdarzeń `.events` narasta w trakcie.
- Orkiestratory (`superbuild`, `simplebuild`) mają `Edit` / `Write` w `disallowed-tools` i zakaz przekierowań: każdy zapis stats idzie przez skrypt jednym wywołaniem Bash; argumenty przepisane z powiadomienia, bez własnych obliczeń orkiestratora.
- Fakty o harnessie (zweryfikowane w tej sesji): powiadomienie o zakończeniu `Agent` niesie `subagent_tokens` (łącznie, bez podziału input / output), `tool_uses`, `duration_ms`; wynik forka `Skill` nie niesie żadnych danych o zużyciu. Podział input / output tokenów nie jest osiągalny i raport go nie obiecuje.
- `.temp/superdev/stats/` to nowe machine state pod `.temp/<plugin>/`; nic z tego nie trafia do commitów (`commit-task.sh` wyklucza `.temp/`).
- Nowy przełącznik `stats` dołącza do listy w `superdev/scripts/read-config.sh` (nagłówek i pętla, stała kolejność: po `cleanup`), `superdev/skills/setup/assets/config.yml`, `superdev/skills/setup/scripts/bootstrap.sh` (trzy miejsca), `tests/superdev/read-config.test.ts`, `tests/superdev/bootstrap.test.ts`, bloku `## Config` obu orkiestratorów, `superdev/README.md` (tabela przełączników), root `CLAUDE.md`, i jako nowy obszar gated w `superdev/hooks/content/manifest.md`.
- Nowe skrypty `stats-record.sh` i `stats-report.sh` dostają testy `tests/superdev/*.test.ts` w konwencji repo (harness, `slash()`, Git-Bash), nagłówek z kontraktem I/O, jedną linię maszynową na stdout, `set -euo pipefail`.
- `## Gate commands` siedzi w nagłówku planu, który `decompose.sh` już kopiuje do `plan-header.md`; szablony `superdev/skills/superplan/templates/plan.md` i `superdev/skills/simpleplan/templates/plan.md` dostają ten blok i `### Task Checks`, tracą `### Test Commands` i `### Task Tests`. `superdev/references/adr-task.md` dostosowany (`### Task Checks` z linią, która dowodzi pliku ADR).
- `superdev/references/review-contract.md` pozostaje jedynym właścicielem: etapów gate'u, kształtu raportu, formatów linii notes, nazewnictwa. Trzej reviewerzy-forki, per-task reviewer i oba implementatory wskazują tam, nie niosą własnych streszczeń.
- Marker `Review:` istnieje tylko w szablonie `superplan` (tor Simple nie ma per-task reviewera); `decompose.sh` nie musi go indeksować, jeśli orkiestrator czyta go z pliku zadania (do rozstrzygnięcia w planie; zmiana `decompose.sh` dopuszczalna, jeśli indeks jest czystszy).
- Plugin jest stack-agnostic: żadna komenda ani format outputu konkretnego runnera nie trafia do treści skilli; przykłady w rubrykach są opisowe, klasyfikację konkretnego suite hosta rozstrzyga pamięć hosta.
- Wszystkie pliki źródłowe pluginu po angielsku, bez myślników em / en.
- Bez ADR (repo wyłącza capture ADR).

## Out of scope
- Treść skilla `tdd`.
- `run.sh` i skill `executor` (nadal używane przez trzech reviewerów-forków).
- Kadencja checkpointu (co 5 zadań) i budżet rund (jeden fix plus jedno re-review).
- Hooki (żaden nowy hook; stats nie idzie przez `SubagentStop` / `PostToolUse`).
- Zapis stats przy przerwanym buildzie.
- Zbieranie stats w fazie planowania (`intent`, `superspec`, `superplan`, `simpleplan`).

## History
- none
