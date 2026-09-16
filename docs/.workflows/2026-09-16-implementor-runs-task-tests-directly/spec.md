# Spec: implementator uruchamia testy zadania bezpośrednio, executor tylko u reviewerów
Intent: docs/.workflows/2026-09-16-implementor-runs-task-tests-directly/intent.md

## Problem / context (Why)
Oba implementatory zadań superdev (`superbuild-task-implementor`, `simplebuild-task-implementor`) wysyłają każde uruchomienie build i testów przez `run.sh`, widzą z niego tylko blok statusu z jedną linią `TAIL:`, a na `RESULT: DEVIATION` dispatchują fork `executor` (haiku) w trybie analizy logu i czekają na jego werdykt. Zadania są małe, a przy `TDD: required` cykl RED/GREEN biegnie na jednym pliku testowym, którego output jest krótki i mówi implementatorowi wprost, co jest nie tak. Implementatorzy często kończą bieg na czerwono, więc fork odpala się wiele razy na zadanie i każdy taki bieg to pełna runda dispatchu w zamian za streszczenie tego, co implementator mógłby przeczytać sam. Etykieta `runner:` (ścieżka `run.sh`) jest dziś wymaganym wejściem obu implementatorów, wyliczanym przez oba orkiestratory.

Zadanie `TDD: none` nie ma w planie żadnej zawężonej komendy testowej: sekcja `### TDD Commands` istnieje tylko na `TDD: required`. Reguła rozmiaru zadania w obu planistach ("najmniejsza jednostka z własnym cyklem testowym") nie ma mierzalnej granicy i checklista recenzenta planu jej nie sprawdza. Per-task reviewer toru Super ocenia zadanie wyłącznie czytając diff i nie ma żadnego dowodu, że implementator faktycznie uruchomił testy zadania na zielono.

Trzej reviewerzy-forki (`superbuild-reviewer-spec`, `superbuild-reviewer-change`, `simplebuild-reviewer`) uruchamiają pełny gate (build, `### Test Commands`, komenda e2e hosta) przez `run.sh` z executorem na `DEVIATION` na każdym etapie: checkpoint co 5 zadań, final i re-review. Komenda e2e biegnie więc także na każdym checkpoincie, choć jest najwolniejsza i najmniej precyzyjna.

## Goal (What)
- Implementator uruchamia build zadania i testy zadania bezpośrednio, czyta ich output sam i naprawia; nie używa `run.sh`, nie dispatchuje executora, nie uruchamia pełnego suite.
- Każde zadanie planu deklaruje swoje testy (jedna komenda na plik testowy), a zadanie `TDD: required` obejmuje dokładnie jeden plik testowy; recenzent planu to egzekwuje.
- Implementator zostawia w notatkach zadania ślad każdego końcowego uruchomienia, a per-task reviewer sprawdza, że ślad pokrywa wszystkie testy zadania.
- Executor wywołują wyłącznie trzej reviewerzy-forki; komenda integracyjna / e2e hosta biegnie tylko w final review i na re-review.
- Testy zadania i cykl TDD obejmują wyłącznie testy biegnące szybko w pamięci; test z zewnętrzną zależnością aplikacji jest integracyjny lub e2e i biegnie tylko w final.
- Dokumentacja pluginu (README, root `CLAUDE.md`) opisuje nowy podział; `run.sh`, `executor`, `tdd` i `decompose.sh` pozostają nietknięte.

## Out of scope
- Zmiana treści skilla `tdd` (pozostaje inline, nie nazywa transportu uruchomień).
- Zmiana `decompose.sh` i jego testów; marker `TDD:` nadal nie trafia do indeksu zadań.
- Blok komend gate'u na poziomie planu (`## Gate commands`) zamiast per-task `### Test Commands`.
- Ograniczanie outputu bezpośrednich wywołań Bash (`tail`, limity linii, owijanie komend).
- Zmiany w reviewerach-forkach poza tym, co wynika z `review-contract.md`.
- Zmiana zawartości `run.sh` i `executor/SKILL.md`.
- Nowe uruchomienia u per-task reviewera (nadal nic nie uruchamia).

## User scenarios
1. Jako użytkownik superdev uruchamiający build chcę, aby implementator naprawiał czerwony test zadania na podstawie jego własnego outputu, żeby zadanie kończyło się bez rundy dispatchu executora.
2. Jako użytkownik superdev chcę, aby dispatch implementatora i kontrakt review mówiły jednoznacznie, kto uruchamia co i na jakim etapie, żeby executor i e2e biegły tylko tam, gdzie cały suite ma sens.
3. Jako autor planu (superplan / simpleplan) chcę, aby każde zadanie deklarowało swoje pliki testowe z komendą per plik, a zadanie TDD było jednoplikowe, żeby implementator miał dokładnie to, co ma uruchomić, a recenzent planu odrzucał za duże zadania.
4. Jako użytkownik superdev chcę, aby per-task reviewer widział dowód uruchomionych testów zadania, żeby "było zielono" nie było deklaracją bez śladu.
5. Jako opiekun repo pluginów chcę, aby dokumentacja i skrypty pozostały spójne z nowym podziałem, żeby `/plugin update` wydał działający komplet.
6. Jako autor planu chcę, aby test z zewnętrzną zależnością aplikacji nigdy nie trafiał do cyklu TDD ani do testów zadania, żeby implementator pracował tylko na szybkich testach w pamięci, a wolne testy biegły raz, w final.

## Acceptance criteria
Scenariusz 1:
1. Bezpośredni bieg - oba implementatory uruchamiają blok `#### Build` zadania i każdą linię `### Task Tests` jako zwykłe wywołanie Bash, czytają output i naprawiają w pętli max 5 rund, a żaden z dwóch plików agentów nie zawiera odwołania do `run.sh`, etykiety `runner:`, `superdev:executor`, `LOG:` ani `RESULT:`.
2. Cykl TDD bezpośrednio - przy `TDD: required` VERIFY RED i VERIFY GREEN biegną linią `### Task Tests` pisanego pliku tą samą drogą; RED jest uznany tylko gdy output pokazuje test, który został uruchomiony i nie przeszedł przez asercję (błąd kompilacji, brak testów lub test, który przeszedł, kończy się poprawą testu, nie kodem produkcyjnym), GREEN gdy ten plik przechodzi w całości; w hoście kompilowanym doprowadzenie testu do biegu (stub symbolu bez zachowania) jest krokiem cyklu, który implementator nazywa w swoim opisie RED/GREEN, i nie jest kodem produkcyjnym.
3. Bez pełnego suite - implementator nigdy nie uruchamia bloku `#### Tests` z `### Test Commands`; w trybie fix po raporcie reviewera uruchamia `#### Build` oraz linie `### Task Tests` każdego zadania, którego `### Files` pokrywa (przez prefiks) plik dotknięty poprawką, a gdy żadne zadanie nie pasuje, sam `#### Build`; pełny suite należy do re-review.

Scenariusz 2:
4. Brak runner - żaden dispatch implementatora w `superbuild` i `simplebuild` (zadanie i fix) nie niesie etykiety `runner:`, orkiestratory nie wyliczają ścieżki `run.sh`, a dispatch reviewerów-forków pozostaje bez zmian.
5. Executor tylko u reviewerów - w `superdev/` wywołanie `superdev:executor` jako kroku pracy występuje wyłącznie w trzech reviewerach-forkach i w `review-contract.md`; opisy w `executor/SKILL.md`, nagłówku `run.sh`, `README.md` i root `CLAUDE.md` nie liczą się jako wywołanie.
6. E2e tylko w final - `review-contract.md` `## Gates` zbiera komendę integracyjną / e2e hosta wyłącznie na `stage: final` i `stage: re-review`, checkpoint uruchamia build i `### Test Commands` bez niej, kształt raportu w `review-contract.md` każe sekcji gate'ów checkpointu powiedzieć to jednym zdaniem, a reguła ponownego biegu e2e na re-review zostaje.

Scenariusz 3:
7. Task Tests na każdym zadaniu - oba szablony planu i obie reguły planistów wymagają sekcji `### Task Tests` na każdym zadaniu niezależnie od markera `TDD:` (jedna linia per plik testowy, jaki zadanie pisze lub zmienia, z komendą uruchamiającą tylko ten plik lub najwęższy zakres, jaki runner hosta ma; zadanie, które nie pisze ani nie zmienia żadnego pliku testowego, niesie jedyną linię `none - <powód>`, tak jak `### Failure modes`), szablon zadania ADR `superdev/references/adr-task.md` niesie tę sekcję z linią `none`, a nazwa `TDD Commands` nie występuje w `superdev/`.
8. Jeden plik testowy przy TDD - `plan-review-checklist.md` ma klasę blokującą dla zadania `TDD: required` z więcej niż jedną linią w `### Task Tests`, klasa B6 obejmuje brak `### Task Tests` na dowolnym zadaniu i linię z plikiem spoza `### Files` tego zadania, a reguła rozmiaru w obu planistach mówi: zadanie `TDD: required` pisze dokładnie jeden plik testowy i tylko kod, który ten plik napędza.
9. Rozmiar doradczy - reguła rozmiaru w obu planistach każe zadaniu `TDD: none` celować w jedno zachowanie i kilka plików, a checklista niesie to jako punkt doradczy (nie blokujący).

Scenariusz 4:
10. Sekcja Runs - plik `notes:` zadania (gdy etykieta podana) ma sekcję `## Runs` z jedną linią na każde końcowe uruchomienie (`#### Build` i każda linia `### Task Tests`; przy `### Task Tests` równym `none` sam `#### Build`): komenda verbatim plus linia podsumowania narzędzia, a gdy narzędzie nic nie wypisuje, jego kod wyjścia.
11. Reviewer sprawdza Runs - per-task reviewer ma w `## Check` punkt: sekcja `## Runs` istnieje i pokrywa blok `#### Build` oraz każdą linię `### Task Tests` zadania; brak sekcji lub linii to finding klasy Important, sprawdzany tylko gdy etykieta `notes` jest podana (tak jak dzisiejszy punkt o uczciwości notatek), a reviewer nadal nic nie uruchamia.

Scenariusz 5:
12. Dokumentacja - wiersz `executor` i wiersze obu implementatorów w `superdev/README.md` oraz inwariant w root `CLAUDE.md` mówią, że `run.sh` i executor są transportem gate'u trzech reviewerów-forków, a implementatory uruchamiają testy zadania bezpośrednio; `plugin.json` pozostaje bez zmian.
13. Skrypty nietknięte - `run.sh`, `executor/SKILL.md`, `tdd/SKILL.md` i `decompose.sh` są identyczne z HEAD sprzed zmiany, a `node --test "tests/**/*.test.ts"` przechodzi bez zmian w testach.
14. Lint - `lint_skill.sh` skill-designera zwraca zero FAIL dla każdego zmienionego pliku SKILL.md i agenta.

Scenariusz 6:
15. Tylko testy w pamięci - obie reguły planistów mówią, że `### Task Tests` i cykl TDD obejmują wyłącznie testy biegnące szybko w pamięci, a test, w którym bierze udział zewnętrzna zależność aplikacji (proces lub usługa, z którą aplikacja się łączy: baza danych, sieć, przeglądarka i podobne, wymienione jako przykłady), jest integracyjny lub e2e i nie trafia do `### Task Tests` ani do `#### Tests` w `### Test Commands`; o tym, który suite hosta jest szybkim suite w pamięci, rozstrzyga pamięć hosta (`CLAUDE.md`, `.claude/rules/`), a lista przykładów w regule planisty nigdy jej nie nadpisuje.
16. Integracyjne tylko w final - test integracyjny lub e2e napisany przez zadanie biegnie wyłącznie przez komendę integracyjną / e2e hosta na `stage: final` i `stage: re-review`; implementator go nie uruchamia, a checklista planu flaguje doradczo linię `### Task Tests` lub `#### Tests` nazywającą udokumentowaną komendę albo katalog integracyjny / e2e hosta.

## Constraints / assumptions
- Plugin jest stack-agnostic: żadna konkretna komenda runnera ani format jego outputu nie trafia do treści agentów, skilli ani szablonów; komendy pochodzą z planu i biegną verbatim.
- `review-contract.md` `## Gates` jest jedynym właścicielem tego, które komendy biegną na którym etapie; trzej reviewerzy-forki wskazują tam i nie niosą własnego streszczenia.
- `### Task Tests` nigdy nie jest gate'em review; klasyfikacja konkretnego testu jako integracyjnego / e2e opiera się na pamięci hosta (`CLAUDE.md`, `.claude/rules/`) i treści planu, a reguła planisty niesie tylko definicję i przykłady; `### Test Commands` zostaje gate'em reviewerów bez zmian w zbieraniu i deduplikacji.
- Skill `tdd` pozostaje inline w kontekście implementatora; mechanikę RED/GREEN (bezpośredni Bash, oczekiwany wynik) opisuje implementator.
- Wszystkie pliki źródłowe pluginu po angielsku; bez myślników em/en w treści.
- Bez ADR (repo wyłącza capture ADR).
