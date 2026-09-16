# Spec: gate na poziomie planu, osąd planisty, odchudzone raporty i przełącznik stats
Intent: docs/.workflows/2026-09-16-plan-level-gates-slim-reports-and-stats/intent.md

## Problem / context (Why)
Build superdev trwa nieproporcjonalnie długo do rozmiaru zmian. Ostatni run (`docs/.workflows/2026-09-16-implementor-runs-task-tests-directly/`, 7 zadań markdownowych) potrzebował ok. 21 dispatchów agentów i forków, a suite hosta (`node --test`, ok. 90 s) bieżył 11 razy, choć żadne zadanie nie dotykało pliku objętego tym suitem.

Stan wyjściowy ma trzy źródła kosztu. Po pierwsze, oba szablony planu (`superdev/skills/superplan/templates/plan.md`, `superdev/skills/simpleplan/templates/plan.md`) wymuszają na każdym zadaniu `### Test Commands` z blokami `#### Build` i `#### Tests` oraz `### Task Tests`, a reguły planistów mówią "wszystko poza mechanicznym to `opus`, w razie wątpliwości wyżej"; planista, który pracuje na najsilniejszym modelu i czyta pamięć hosta (`CLAUDE.md`, `.claude/rules/`), nie ma gdzie zapisać osądu, że build w tym zadaniu nic nie dowodzi. Reviewerzy-forki zbierają komendy gate'u z każdego zadania i deduplikują je po stringu; per-task reviewer biegnie z tym samym modelem i effortem co implementator, a tryb fix wraca do `effort: xhigh` z frontmatter agentów. Po drugie, raporty w `implementation/` w 55-90% przepisują plan lub poprzednią rundę: sekcja `## Gates` niesie 28 komend verbatim z `RESULT: SUCCESS / EXIT: 0` przy każdej, re-review kopiuje ten blok bajt w bajt, `debt.md` jest kopią sekcji `## Debt` raportu i nie ma żadnego czytelnika, tytuł raportu powtarza nazwę pliku, pusty checkpoint kosztuje kilkanaście linii nagłówków z `none.`, a `## Assessment` recytuje DoD. Każdy kolejny reviewer czyta te pliki jako `prior:`. Po trzecie, nie istnieje żaden zapis, ile czasu i tokenów kosztował build per zadanie i per recenzja, więc dryf i koszt widać dopiero po fakcie, na oko.

Harness daje orkiestratorowi w powiadomieniu o zakończeniu `Agent` łączną liczbę tokenów, liczbę użyć narzędzi i czas w milisekundach; wynik forka `Skill` nie niesie nic poza tekstem. Orkiestratory mają `Edit` i `Write` w `disallowed-tools` i zakaz przekierowań, więc każdy zapis idzie przez bundled script.

## Goal (What)
- Planista decyduje sam, na podstawie pamięci hosta i tego, co plan rusza, co i w jakim zakresie biegnie jako gate całego buildu (raz, w nagłówku planu) oraz co implementator uruchamia jako dowód pojedynczego zadania; skill daje kryteria, nie regułę "build w każdym zadaniu".
- Reviewer planu blokuje brak osądu (`none` bez powodu lub z powodem sprzecznym z faktami), nie brak komendy.
- Siła buildu jest wskazówką o obciążeniu zadania, a siła recenzji zadania jest osobnym, opcjonalnym wyborem planisty.
- Raporty reviewerów i notes implementatorów niosą wyłącznie nowe informacje, zwięźle, LLM dla LLM; plik bez czytelnika nie istnieje.
- Przełącznik `stats` (default `false`) sprawia, że po pełnym CloseOut w `.temp/` leży raport o stałej strukturze: czasy i tokeny per zadanie, recenzja i rodzaj, sumy workflow oraz anomalie, zebrany bez zauważalnego narzutu dla orkiestratora.
- Dokumentacja pluginu i testy repo są spójne z nowym podziałem.

## Out of scope
- Treść skilla `tdd`.
- `run.sh` i skill `executor` (nadal transport gate'u trzech reviewerów-forków).
- Kadencja checkpointu (co 5 zadań) i budżet rund (jeden fix plus jedno re-review na rundę).
- Nowe hooki; stats nie idzie przez `SubagentStop` ani `PostToolUse`.
- Zapis stats przy przerwanym buildzie (eskalacja bez powrotu, abort, limit sesji).
- Zbieranie stats w fazie planowania (`intent`, `superspec`, `superplan`, `simpleplan`).
- Podział tokenów na input / output (harness go nie udostępnia).
- Zmiana fixture'ów testowych, które nazywają stare sekcje planu, ale nie testują ich parsowania (np. `tests/superdev/commit-task.test.ts` z `### Test Commands` w fixture zadania).

## User scenarios
1. Jako autor planu (superplan / simpleplan) chcę zapisać raz w nagłówku planu, co biegnie jako gate buildu, i per zadanie tylko to, co dowodzi tego zadania, żeby zadanie markdownowe dostało grep i lint, zadanie kodowe test pliku i type-check, a suite hosta bieżył tam, gdzie coś sprawdza.
2. Jako recenzent planu chcę blokować plan, w którym `none` nie ma powodu albo powód kłóci się z plikami zadania lub pamięcią hosta, żeby swoboda planisty nie stała się pomijaniem weryfikacji.
3. Jako autor planu chcę dobierać model i effort implementatora według obciążenia zadania, bez domyślnego "wyżej", i osobno ustawiać siłę recenzji zadania, żeby recenzja prostego zadania nie kosztowała tyle co jego napisanie.
4. Jako użytkownik superdev uruchamiający build chcę, aby implementator uruchamiał tylko sprawdzenia swojego zadania, a reviewerzy-forki gate z nagłówka planu na właściwym etapie, żeby suite hosta biegł tylko tam, gdzie planista go umieścił.
5. Jako użytkownik superdev chcę, aby per-task reviewer i tryb fix dostawały siłę z planu zamiast najwyższej z frontmatter, żeby build siedmiu zadań nie kosztował dwudziestu dispatchów opus.
6. Jako użytkownik superdev chcę, aby raporty i notes w `implementation/` niosły samą esencję, żeby każda kolejna runda czytała kilkukrotnie mniej tekstu, a nic, co ktoś czyta, nie ginęło.
7. Jako użytkownik superdev chcę po włączeniu `stats: true`, aby każde zdarzenie buildu było odnotowane bez zauważalnego spowolnienia orkiestratora, żeby dane przetrwały reset kontekstu.
8. Jako użytkownik superdev chcę po buildzie dostać raport markdown o stałej strukturze z czasami, tokenami i anomaliami, żeby widzieć, gdzie build traci czas i gdzie implementatorzy dryfują.
9. Jako opiekun repo pluginów chcę, aby dokumentacja, manifest, konfiguracja i testy repo były spójne z nowym podziałem, żeby `/plugin update` wydał działający komplet.

## Acceptance criteria
Scenariusz 1:
1. Gate commands w nagłówku - oba szablony planu niosą w nagłówku (przed pierwszym `<!-- TASK -->`) blok `## Gate commands` z podsekcjami `#### Build`, `#### Tests`, `#### Integration`, każda wypełniona komendami hosta w zakresie, jaki planista uzna, albo jedyną linią `none - <powód>`; sekcja `### Test Commands` nie występuje w żadnym szablonie, planiście, checklistcie, agencie ani kontrakcie w `superdev/`.
2. Task Checks na zadaniu - oba szablony planu i szablon zadania ADR (`superdev/references/adr-task.md`) niosą na każdym zadaniu sekcję `### Task Checks` (jedna linia per komenda, którą implementator uruchamia jako dowód tego zadania: plik testowy, type-check, lint, grep lub inna; albo jedyna linia `none - <powód>`), nazwa `Task Tests` nie występuje w `superdev/` ani w root `CLAUDE.md`, a linia z plikiem testowym nadal nazywa plik zadeklarowany pod `### Files` tego zadania.
3. Kryteria zamiast reguły - reguły obu planistów dla `## Gate commands` i `### Task Checks` podają kryteria osądu (co zadanie rusza; który suite hosta wg jego pamięci pokrywa te pliki; dowód kontra koszt; najwęższy zakres; do `### Task Checks` trafia tylko test, który kończy się w sekundach i nie łączy się z procesem ani usługą poza aplikacją) z przykładem w obie strony, mówią wprost, że build biegnie tylko wtedy, gdy planista uzna go za dowód, a pojedynczy test dowodzący zadania wystarcza, i nie zawierają zdania nakazującego build lub suite na każdym zadaniu.

Scenariusz 2:
4. Klasa braku osądu - `superdev/references/plan-review-checklist.md` ma nową klasę blokującą: linia `none` bez powodu albo z powodem sprzecznym z `### Files` zadania lub z pamięcią hosta (`CLAUDE.md`, `.claude/rules/`), w `## Gate commands` i w `### Task Checks` jednakowo; B2 obejmuje komendy nagłówka i sekcji zadań; oba recenzenty planu wymieniają nowy zakres klas.
5. B6 i B16 przecięte - B6 sprawdza wyłącznie obecność i dozwolony zbiór markerów `TDD:`, `Model:`, `Effort:` oraz opcjonalnego `Review:` (dozwolony na zadaniu obu torów, nigdy wymagany; obecność `### Task Checks` przechodzi do klasy z kryterium 4); B16 liczy wyłącznie linie `### Task Checks` z plikiem testowym (linia buildu, lintu czy grepa nie wlicza się): zadanie `TDD: required` ma dokładnie jedną taką linię, a zero lub dwie i więcej to B16.
6. Doradcze pozostaje doradcze - checklista niesie jako punkty doradcze (nigdy blokujące): `Model:` / `Effort:` / `Review:` odczytane jako za niskie oraz plan ruszający kod bez ani jednej komendy w `## Gate commands`; reguła "recenzent weryfikuje tylko `Read` / `Grep` / `Glob`" zostaje.

Scenariusz 3:
7. Rubryka siły jako wskazówka - reguły obu planistów dla `Model:` / `Effort:` nie zawierają zdań "wszystko inne to `opus`" ani "niezdecydowany -> wyżej", mówią planiście, że pracuje na najsilniejszym modelu i ocenia obciążenie rozumowaniem, i podają przykłady w obie strony (edycja tekstu z precyzyjnym `Approach` jako `sonnet` / `low`, własna decyzja algorytmiczna jako `opus` / `high`, nieodwracalny wybór jako `xhigh`).
8. Marker Review - szablon `superplan` niesie na zadaniu opcjonalny marker `Review: <model> <effort>` (te same dozwolone zbiory co `Model:` / `Effort:`), reguła planisty `superplan` mówi, kiedy go ustawić (recenzja to czytanie diffu, inne obciążenie niż projektowanie); szablon `simpleplan` go nie niesie, a `simplebuild` go ignoruje.

Scenariusz 4:
9. Implementator tylko Task Checks - oba implementatory uruchamiają na koniec zadania każdą linię `### Task Checks` (przy `none` nic) jako bezpośrednie wywołania Bash, cykl TDD zadania `TDD: required` biegnie jego jedyną linią z plikiem testowym, tryb fix uruchamia `### Task Checks` zadań, których `### Files` pokrywa plik dotknięty poprawką, a gdy żadne zadanie nie pasuje, nic (gate rundy należy do re-review); żaden z dwóch agentów nie uruchamia bloku z `## Gate commands` ani nie odwołuje się do `#### Build`.
10. Gate z nagłówka na etapie - `review-contract.md ## Gates` mówi, że reviewer-fork czyta `## Gate commands` z nagłówka planu, na `stage: checkpoint` uruchamia `#### Build` i `#### Tests`, na `stage: final` wszystkie trzy podsekcje, a na `stage: re-review` ten sam zestaw co runda, którą zamyka (po checkpoincie dwie, po final trzy); `none - <powód>` oznacza brak biegu z tym powodem w raporcie, żadna komenda z sekcji zadań nie jest zbierana ani deduplikowana, a trzej reviewerzy-forki wskazują tam bez własnego streszczenia.

Scenariusz 5:
11. Siła recenzji z planu - `superbuild` dispatchuje per-task reviewera z `Review:` zadania, a bez markera bez parametrów `model` / `effort`; frontmatter agenta `superbuild-task-reviewer` brzmi `model: sonnet`, `effort: high`.
12. Siła fix z planu - oba orkiestratory dispatchują implementatora w trybie fix po recenzji zadania z `Model:` / `Effort:` tego zadania; w rundzie fix po checkpoincie lub final z najwyższymi `Model:` / `Effort:` spośród zadań, których `### Files` pokrywa plik nazwany w findingach, a gdy żaden finding nie nazywa pliku zadeklarowanego przez jakieś zadanie, bez parametrów (frontmatter agenta).
13. Kolumna Review w indeksie - `decompose.sh` wystawia `Review:` jako kolumnę indeksu obok `<model>` i `<effort>` (`-` gdy brak, dla obu torów), jego testy pokrywają obecność i brak markera, a oba orkiestratory opisują indeks z tą kolumną.

Scenariusz 6:
14. Gates jedną linią - kształt raportu w `review-contract.md` każe sekcji `## Gates` nieść jedną linię na podsekcję gate'u (`Build`, `Tests`, `Integration`) z wynikiem i czasem, przy FAIL linię podsumowania narzędzia i ścieżkę logu, bez przepisywania komend; raport nie ma linii tytułowej z nazwą pliku, sekcja bez treści jest pominięta, `VERDICT:` na końcu jest jedyną stałą, `## Prior findings` zostaje, a re-review podaje wynik ponownego biegu w tej samej jednej linii na podsekcję zamiast kopiować poprzedni blok.
15. Bez debt.md i bez recytacji - `debt.md` nie jest tworzony ani wymieniany w `superdev/` ani w root `CLAUDE.md` (Minor żyje wyłącznie w `## Debt` raportu), `## Assessment` to jedno zdanie o werdykcie bez powtarzania DoD, a recenzja zadania z samymi uwagami nie pisze własnego pliku, tylko dopisuje `NOTE:` linie pod `## Review notes` w `task-NN-notes.md`.
16. Notes bez duplikatów - oba implementatory niosą regułę: notes nigdy nie przepisują treści zadania ani raportu, odwołują się do kroku `Approach` lub findingu numerem / ID, są pisane LLM dla LLM (konkret bez tłumaczeń); notes fix-mode to `## Runs` plus jedna linia statusu per ID i `touched:` linie, nic więcej; `review-contract.md ## Notes line formats` odzwierciedla to samo.

Scenariusz 7:
17. Przełącznik stats - `read-config.sh` wypisuje `stats: <true|false>` jako szóstą linię po `cleanup`, `setup` seeduje `stats: false` w `config.yml` i raportuje go w `bootstrap.sh`, oba orkiestratory czytają go w `## Config`, a testy `read-config.test.ts` i `bootstrap.test.ts` przechodzą z nową linią.
18. Zdarzenie jednym wywołaniem - `superdev/scripts/stats-record.sh` dopisuje jedną linię TSV ze znacznikiem czasu nadanym przez skrypt do `.temp/superdev/stats/<run>.events` (tworząc katalog i plik), przyjmuje rodzaj i etykietę oraz opcjonalnie model, effort, tokeny, tool_uses, duration_ms, werdykt i notkę, wypisuje jedną linię `stats: <path> -> <kind> <label>` i ma test w `tests/superdev/`; oba orkiestratory przy `stats: true` wołają go raz ze zdarzeniem `start` po dekompozycji (lub `resume` przy wznowieniu), raz po każdym powiadomieniu o zakończeniu dispatchu `Agent` (implementator, per-task reviewer, writer) z wartościami przepisanymi z powiadomienia, raz po każdym forku `Skill` tylko z rodzajem, etykietą i werdyktem, raz po każdym `commit-task.sh` i raz po każdej eskalacji z notką; przy `stats: false` nie wołają go wcale.

Scenariusz 8:
19. Raport ze stałego szablonu - `superdev/scripts/stats-report.sh <workdir>` renderuje `.temp/superdev/stats/<run>.md` z `superdev/references/stats-template.md`: tabela per zadanie (implementator, recenzja, rundy, czas, tokeny), tabela per rodzaj dispatchu, sumy całego workflow (czas ściany od zdarzenia `start` do ostatniego zdarzenia, tokeny, liczba dispatchów); dla forków czas to różnica znaczników poprzedniego i bieżącego zdarzenia, a tokeny `-`; skrypt wypisuje jedną linię `stats: <path>` i ma test w `tests/superdev/`.
20. Anomalie z dwóch źródeł - sekcja `## Anomalies` raportu niesie jedną linię na zdarzenie z notką (FAIL z `REASON:`, BLOCKED, eskalacja z wynikiem, ponowny dispatch, niezadeklarowana zmiana, agent bez raportu, limit sesji) oraz tabelę liczników per zadanie zliczonych z `implementation/` (`UNDERSPECIFIED:`, `CARRY:`, `touched:`, `NOTE: plan defect`, rundy recenzji ponad pierwszą), a bez anomalii jedną linię `none`.
21. Raport po CloseOut - oba orkiestratory wołają `stats-report.sh` w Kroku 5 po commicie CloseOut i przed `cleanup-run.sh`, wyłącznie przy `stats: true`, i podają jego linię `stats:` w podsumowaniu Kroku 5.

Scenariusz 9:
22. Dokumentacja spójna - `superdev/README.md` (tabela przełączników, opis planistów, implementatorów, reviewerów i skryptów), root `CLAUDE.md` (akapit superdev, inwariant `.temp/`, inwariant run.sh / executor) i `superdev/hooks/content/manifest.md` (obszar gated przez `stats`) opisują nowy podział: gate w nagłówku planu, `### Task Checks`, `Review:`, raporty bez `debt.md`, stats w `.temp/superdev/stats/`.
23. Nietknięte i zielone - `superdev/skills/tdd/SKILL.md`, `superdev/skills/executor/` i `superdev/scripts/cleanup-run.sh` są identyczne z HEAD sprzed zmiany, `node --test "tests/**/*.test.ts"` przechodzi, a `lint_skill.sh` skill-designera zwraca zero FAIL dla każdego zmienionego pliku SKILL.md i agenta.

## Constraints / assumptions
- Plugin jest stack-agnostic: żadna konkretna komenda runnera ani format jego outputu nie trafia do treści agentów, skilli ani szablonów; przykłady w rubrykach są opisowe, a klasyfikację konkretnego suite hosta rozstrzyga pamięć hosta.
- `review-contract.md` jest jedynym właścicielem etapów gate'u, kształtu raportu, formatów linii notes i nazewnictwa; forki, per-task reviewer i implementatory wskazują tam.
- Orkiestratory nie piszą plików; stats idzie wyłącznie przez `stats-record.sh` i `stats-report.sh`, po jednym wywołaniu Bash, z argumentami przepisanymi z powiadomienia, bez obliczeń orkiestratora.
- Harness: powiadomienie `Agent` niesie `subagent_tokens` (łącznie), `tool_uses`, `duration_ms`; wynik forka `Skill` nie niesie danych o zużyciu.
- `.temp/superdev/stats/` to machine state pod `.temp/<plugin>/`; `commit-task.sh` wyklucza `.temp/`, więc nic z tego nie trafia do commitów; raport czyta człowiek.
- Nowe skrypty: `#!/usr/bin/env bash`, `set -euo pipefail`, nagłówek z kontraktem I/O, jedna linia maszynowa na stdout, testy w konwencji repo (harness, `slash()`, Git-Bash, bez `chmod`).
- `## Gate commands` siedzi w nagłówku planu, który `decompose.sh` już kopiuje do `plan-header.md`; zmiana `decompose.sh` ogranicza się do kolumny `Review:`.
- Wszystkie pliki źródłowe pluginu po angielsku; bez myślników em / en w treści.
- Bez ADR (repo wyłącza capture ADR).
