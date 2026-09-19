# Intent: Odchudzenie kontraktu review i brama per task świadoma Kind
Date: 2026-09-19

## Request

superdev przeszedł dwie tury code audit i poprawki rozrosły instrukcje w skillach i referencjach tak, że `superdev/references/review-contract.md` ma 587 linii i jest czytany w całości przez siedmiu konsumentów przy każdym dispatchu. Taka objętość wiąże agentowi ręce. Plugin ma trzymać sztywne ramy pod kątem własnego działania (słownik, identyfikatory, kształt raportu, werdykty), a dawać więcej swobody w tym, czego ma szukać w zadaniu. Do tego nie każdy typ zadania wymaga tych samych celów review: dzisiejszy `## Failure pass` bramy per task to w całości checklista dla `Kind: code`, pusta dla `text` i nietrafiona dla `scaffold`.

## Decisions

### 1. Jeden plik czy trzy?
`superdev/references/review-contract.md` zostaje jedynym właścicielem pod tą samą nazwą i schodzi z 587 do około 220 linii przez kompresję. Cięte są trzy klasy treści: uzasadnienia mechanizmu, reguły martwe i legacy, powtórzenia wewnątrz pliku. Uzasadnienia, które warto zachować, przenoszą się do `CLAUDE.md` albo do nagłówków skryptów.

### 2. Gdzie żyją sprawdzenia per `Kind:`?
W ciele `superdev/agents/superbuild-task-reviewer.md`. `## Failure pass` staje się jedną wspólną regułą plus trzema wariantami (`code`, `scaffold`, `text`) wybieranymi deterministycznie z markera `Kind:`, który reviewer już widzi w pliku zadania wskazanym etykietą `task:`. Bez nowego pliku, bez nowej etykiety i bez zmiany w `superdev/scripts/decompose.sh`.

### 3. Jak daleko sięga wariant `text`?
Wariant jest zakotwiczony w plikach, które zadanie samo nazywa: jego `### Contracts`, plik wskazany w `### Approach` i plik-kontrakt cytowany w samym diffie. Sprawdza trzy rzeczy: czy twierdzenia tekstu zgadzają się z tym plikiem, czy nie wprowadzono słownictwa, którego kontrakt nie zna, czy reguła nie została zapisana w dwóch miejscach naraz. Nakaz `Grep` w kroku (b) sekcji `## Check` zostaje zawężony do `code` i `scaffold`.

### 4. Czy trzej recenzenci budowy też dostają oś `Kind:`?
Nie. `superbuild-reviewer-change.md`, `superbuild-reviewer-spec.md` i `simplebuild-reviewer.md` dostają jedną linię zakresu: każda oś review obowiązuje tam, gdzie zmieniony plik jest tej natury, a zmiana prozy jest sądzona po spójności z tym, co deklaruje, nie po obsłudze błędów. Okno rundy obejmuje zadania o mieszanym `Kind:`, więc wariantów nie da się wybrać markerem.

### 5. Jak szeroki jest zasięg cięcia poza kontraktem?
Pięć plików: `superdev/references/review-contract.md`, `superdev/agents/superbuild-task-reviewer.md` oraz trzej recenzenci budowy. U tych trzech identyczny akapit `## Gates` i identyczny akapit "One exclusion, at every stage" zastępuje jedna linia wskazująca na kontrakt, a cztery bloki osi review tracą to, co model ma wyuczone, zachowując to, co nieoczywiste.

### 6. Jak udowadniamy, że kompresja nie zgubiła reguły?
Pierwszy krok buduje inwentarz reguł dzisiejszego kontraktu i klasyfikuje każdą jako zostaje, przenosi się albo znika z jednozdaniowym powodem. Ten inwentarz jest źródłem kryteriów akceptacji, więc na etapie `final` każda pozycja dostaje własny werdykt.

## Constraints

- `.claude/rules/_common.md:6-8` jest regułą nadrzędną tej zmiany: proza jest dla użytkownika, nie dla agenta, i należy do `CLAUDE.md` albo nagłówka skryptu, nie do kontraktu czytanego wielokrotnie w trakcie wykonania.
- Żadna reguła nie może istnieć w dwóch plikach. `review-contract.md` zachowuje nazwę i wyłączną własność słownika pętli review; pięć wcześniej zapisanych decyzji przybija właściciela do tej ścieżki, a dziesiątki plików celowo na nią wskazują.
- W tym repo tekst jest produktem, więc zadania `Kind: text` zachowują bramę per task: domyślne `Review: none` dla tego rodzaju pozostaje wyłączone przez deklarację w root `CLAUDE.md`.
- Markdown i JSON są produktem tego repo. Nie ma builda ani lintu na żadnym poziomie, więc jedyną bramą jakości jest review.
- Reviewer bramy per task już czyta marker `Kind:`: `decompose.sh` kopiuje cały blok zadania z markerami do `tasks/task-NN.md`, na który wskazuje etykieta `task:`.
- Marker `Kind:` jest wyprowadzany wyłącznie z `### Task Checks` przez klasę B22 w `superdev/references/plan-review-checklist.md`, która pozostaje jedynym właścicielem tej derywacji.
- Pomiar z biegu `build-cost-cuts`: review to od 40 do 53 procent czasu ściany builda, a brama per task to 21:41 na 15 zadań. Zmiana nie może wydłużyć fazy build.

## Out of scope

- `superdev/skills/superbuild/SKILL.md` i `superdev/skills/simplebuild/SKILL.md` - orkiestratory pozostają nietknięte.
- `superdev/references/plan-review-checklist.md` - review planu to osobny problem i osobny intent.
- `superdev/references/qa-format.md` i pozostałe referencje poza kontraktem review.
- `superdev/scripts/decompose.sh`, jego indeks zadań i jego testy.
- Domyślne wartości `Model:` i `Review:` przypisywane przez `superplan` i `simpleplan` oraz mechanizm host-override czytający deklarację z pamięci hosta.
- Pozostałe pluginy repozytorium: superui, supergh, superfix, superbiz, supercc.

## History

- `docs/changelog/2026-09-17-build-cost-cuts.md` - wprowadził oś `Kind:` i trzeci stan markera `Review: none`; upheld. Dźwignia "pomiń recenzenta" zostaje bez zmian, a oś `Kind:` zyskuje drugą formę: różnicowanie celów tam, gdzie recenzent jednak biegnie.
- Zapisane decyzje o jedynym właścicielu z `docs/.workflows/2026-09-16-plan-level-gates-slim-reports-and-stats/intent.md`, `2026-09-16-reviewer-gates-through-executor/intent.md`, `2026-09-16-implementor-runs-task-tests-directly/intent.md` i `2026-09-18-build-pipelining-and-single-gate-run/intent.md` - upheld: nazwa pliku i wyłączna własność zachowane.
- `docs/.workflows/2026-09-17-task-gate-blocked-on-plan-defect/` - intent i spec istnieją, plan i build nigdy nie powstały; jego decyzja o zdjęciu z bramy per task lokalnej kopii szkieletu raportu została dostarczona inną drogą i dziś obowiązuje.
