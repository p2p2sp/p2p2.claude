# Spec: Tor `vibe` - szybkie, bezpośrednie zmiany ze strażnikiem zakresu
Intent: docs/.workflows/2026-09-17-vibe-track/intent.md

## Problem / context (Why)
superdev ma dziś dwa tory wykonania, Simple i Super, i oba zaczynają się od wywiadu `intent`, planu i łańcucha recenzji. Zmiana, którą da się opisać jednym zdaniem (literówka, zmiana etykiety, jeden warunek), przechodzi przez tę samą ceremonię co funkcja przekrojowa. Prośba użytkownika "zrób to szybko / teraz" nie trafia dziś do żadnego skilla: `intent` odrzuca ją w swoim opisie, `simpleplan` nie startuje spontanicznie, `simplebuild` nie jest wywoływalny przez użytkownika, a manifest zabrania kodu bez zatwierdzonego planu. Użytkownik ma więc wybór między pełną ceremonią a ręczną edycją poza pluginem, bez żadnego dowodu (sprawdzenia, commit z zadeklarowanymi plikami) i bez kontroli, czy "drobna" zmiana nie rozrosła się w znaczącą.

Analiza konkurencji z 2026-09-17 (`docs/competitive-analysis-2026-09-17.md`) nazywa ten brak najsłabszym wymiarem pluginu: cztery porównywane ekosystemy dodały w 2026 lżejszy tor poniżej planu, z kryterium wejścia "diff opisywalny jednym zdaniem" i eskalacją do pełnej ceremonii, gdy zmiana okazuje się większa.

Stan początkowy, na którym zmiana się opiera: `commit-task.sh` już commituje zadeklarowany zbiór plików z linii `touched:` w notatkach bez pliku zadania; implementorzy Simple/Super już uruchamiają sprawdzenia bezpośrednio i zapisują `## Runs`; `intent` już wychodzi z plan mode na wejściu; hook `review-plan.sh` pilnuje tylko wyjścia z plan mode po zapisie pliku planu i nie widzi toru, który planu nie pisze.

## Goal (What)
Użytkownik superdev dostaje trzeci tor, `vibe`, na który wchodzi jedną prośbą i z którego wychodzi z gotowym commitem, bez wywiadu, specu, planu i recenzji. Zmianę wykonuje odizolowany agent, żeby główna rozmowa nie zapełniała się odczytami plików. Tor pilnuje zakresu w dwóch miejscach: przed wykonaniem ocenia, czy prośba jest naprawdę jednozdaniowa, a po wykonaniu mierzy rozmiar zmiany i przy przekroczeniu progu oddaje decyzję użytkownikowi zamiast commitować. Strażnik jest doradcą, nie bramą: każde jego zatrzymanie to rekomendacja z uzasadnieniem, a użytkownik może ją odrzucić i zatwierdzić zmianę, bo tor zakłada, że użytkownik wie, co robi. Wszystkie dokumenty routingu pluginu (manifest, opisy sąsiednich skilli, katalog skilli, README) wiedzą o nowym torze, więc jawna prośba o `vibe` nigdy nie ląduje w wywiadzie ani w diagnozie błędu.

## Out of scope
- Hook `PreToolUse` liczący edycje lub blokujący pliki poza zbiorem.
- Konfigurowalne progi strażnika w `.claude/superdev.yml`; progi są stałe.
- Wpis w changelogu, memory lub rules po zmianie vibe; żaden writer wiedzy nie jest uruchamiany.
- Recenzent (fork) po zmianie vibe.
- Zmiany w `simplebuild-task-implementor`, `superbuild-task-implementor` i `review-plan.sh`.
- Automatyczna diagnoza błędu w stylu `simpledebug` (śledzenie przepływu, test reprodukcyjny); `vibe` wykonuje to, o co użytkownik poprosił, a o wyborze toru dla poprawki błędu decyduje użytkownik.

## User scenarios
1. Jako użytkownik superdev chcę powiedzieć "vibe: popraw literówkę w komunikacie logowania" i dostać commit z tą poprawką bez wywiadu i planu, żeby drobna zmiana kosztowała jedną prośbę zamiast kilku etapów.
2. Jako użytkownik superdev chcę, żeby drobną zmianę wykonał odizolowany agent, a nie główna rozmowa, żeby moja sesja nie zapełniała się zrzutami plików i mogła dalej służyć do pracy koncepcyjnej.
3. Jako użytkownik superdev chcę, żeby tor odmówił, gdy proszę o coś, co tylko brzmi drobnie (nowy moduł, nowy kontrakt, kilka obszarów naraz), i zaproponował wywiad, ale chcę też móc powiedzieć "mimo to vibe" i pójść dalej, żeby o ceremonii decydował człowiek, a nie heurystyka.
4. Jako użytkownik superdev chcę, żeby zmiana, która urosła w trakcie (za dużo plików, nowe pliki, obszar wrażliwy zadeklarowany w pamięci mojego repo), nie została po cichu commitowana, tylko wróciła do mnie z wyborem: zatwierdź i commituj mimo to, cofnij, albo zostaw diff i przejdź do wywiadu, bo to ja wiem, co robię, a strażnik tylko doradza.
5. Jako użytkownik superdev chcę, żeby agent uruchomił sprawdzenia, które moje repo deklaruje w `CLAUDE.md` / `.claude/rules/` dla dotkniętego obszaru, i żeby nieudane sprawdzenie wstrzymało automatyczny commit i oddało mi decyzję, żebym nie dostawał commitów "na wiarę", ale też mógł świadomie zatwierdzić zmianę.
6. Jako użytkownik superdev chcę, żeby jawna prośba o `vibe` nie była przechwytywana przez `intent`, `simpledebug` ani `tdd`, nawet gdy dotyczy poprawki błędu, żeby tor był przewidywalny.
7. Jako opiekun pluginu chcę, żeby strażnik liczący rozmiar zmiany miał suitę regresyjną w `tests/`, uruchamianą też pod Git-Bash, żeby jego progi nie rozjechały się cicho przy kolejnym refaktorze.

## Acceptance criteria

### Story 1 - wejście na tor i zamknięcie commitem
1. Wejście komendą lub sygnałem - Prośba `/superdev:vibe <opis>` albo prośba o zmianę z jawnym sygnałem szybkości ("vibe", "szybko", "teraz", "od ręki", "quick", "just do it") uruchamia tor `vibe`, a nie `intent`, `simpledebug` ani `tdd`.
2. Bez ceremonii - Przebieg toru `vibe` nie zadaje pytań wywiadu, nie tworzy pliku specu ani planu i nie uruchamia żadnego recenzenta; jedyne pytanie do użytkownika pojawia się wyłącznie przy odmowie strażnika lub przy niezadeklarowanej zmianie w drzewie roboczym.
3. Plan mode opuszczony - Tor uruchomiony w aktywnym plan mode wychodzi z niego przed jakimkolwiek odczytem repo lub edycją, tak samo jak `intent`.

### Story 2 - wykonanie w izolacji
4. Jeden odizolowany wykonawca - Zmianę w repo wykonuje dokładnie jeden subagent uruchomiony na jedną prośbę `vibe`; główna rozmowa nie wykonuje żadnej edycji pliku źródłowego hosta i nie wczytuje pełnej treści plików, które agent edytuje.
5. Wejście plikowe - Subagent dostaje wyłącznie ścieżki do plików (brief, referencje, miejsce na notatki), nigdy wklejoną treść; brakująca etykieta kończy się `VERDICT: FAIL` z powodem i bez żadnej zmiany w repo.
6. Stan maszynowy w `.temp` - Brief i notatki jednego przebiegu lądują wyłącznie pod `.temp/superdev/vibe/<timestamp>-<slug>/`, nigdy pod `docs/.workflows/` ani w katalogu z nazwą pluginu przy korzeniu hosta.

### Story 3 - strażnik przed wykonaniem
7. Odmowa z propozycją wywiadu - Prośba, która po rekonesansie nie daje się opisać jednym zdaniem albo wymaga nowego modułu, nowego kontraktu między komponentami lub obszaru zadeklarowanego w pamięci hosta jako wrażliwy, kończy się jednozdaniowym uzasadnieniem i propozycją uruchomienia `intent` z tym samym opisem, bez uruchomienia subagenta i bez zmiany w repo.
8. Nadpisanie przez użytkownika - Po odmowie prośba "mimo to vibe" uruchamia tor dalej, a notatki przebiegu zawierają zapis, że strażnik wejściowy został nadpisany przez użytkownika.

### Story 4 - strażnik po wykonaniu
9. Stałe progi rozmiaru - Zmiana dotykająca więcej niż 5 plików, tworząca więcej niż 1 nowy plik lub zmieniająca więcej niż 200 linii jest zgłoszona jako przekroczenie z nazwanym powodem; zmiana w tych granicach przechodzi bez pytania.
10. Ścieżki wrażliwe hosta - Zmiana dotykająca ścieżki pasującej do listy, którą tor wyciągnął z `CLAUDE.md` lub `.claude/rules/` hosta, jest zgłoszona jako przekroczenie niezależnie od rozmiaru; host bez takiej deklaracji jest oceniany wyłącznie progami rozmiaru.
11. Trzy wyjścia z przekroczenia - Przy przekroczeniu nic nie jest commitowane automatycznie, a użytkownik wybiera z dokładnie trzech opcji: zatwierdź i commituj mimo to (kończy się commitem jak przy braku przekroczenia, a notatki przebiegu odnotowują nadpisanie), cofnięcie (dotknięte pliki wracają do stanu sprzed przebiegu, nowe pliki znikają, drzewo robocze jest czyste w tym zakresie), albo pozostawienie diffu i przejście do `intent` z briefem i listą dotkniętych plików jako kontekstem.

### Story 5 - sprawdzenia i commit
12. Sprawdzenia z pamięci hosta - Komendy sprawdzające pasujące do dotkniętego obszaru, zadeklarowane w `CLAUDE.md` / `.claude/rules/` hosta, są uruchomione przez subagenta, a ich wynik zapisany w notatkach przebiegu pod `## Runs`; host bez deklaracji daje w briefie `none - <powód>` i przebieg kończy się bez żadnego uruchomionego polecenia.
13. Nieudane sprawdzenie wstrzymuje commit - Sprawdzenie, które nie przechodzi po co najwyżej trzech rundach poprawek, kończy pracę subagenta werdyktem `FAIL` z powodem i bez automatycznego commitu; użytkownik dostaje te same trzy opcje co przy przekroczeniu zakresu (zatwierdź i commituj mimo to, cofnij, zostaw diff), a wybór "zatwierdź" kończy się commitem z odnotowanym nadpisaniem.
14. Commit tylko zadeklarowanych plików - Udany przebieg kończy się jednym commitem na bieżącej gałęzi, którego tytuł jest zdaniem briefu i który zawiera wyłącznie pliki wymienione w liniach `touched:` notatek; plik zmieniony, a niezadeklarowany, zatrzymuje commit i wraca do użytkownika pytaniem, jak w torach Simple/Super.

### Story 6 - routing i dokumentacja
15. Sąsiednie skille ustępują - Opisy `intent`, `simpledebug` i `tdd` nie przechwytują prośby z jawnym sygnałem `vibe`, także gdy prośba dotyczy poprawki błędu ("vibe: napraw NPE w X" trafia do `vibe`, nie do `simpledebug`).
16. Manifest zna trzeci tor - Manifest wstrzykiwany na starcie sesji nazywa tor `vibe` jako trzeci tor obok Simple i Super i stwierdza, że zasada "No code before an approved plan" go nie obejmuje.
17. Katalog i README spójne - `plugin.json` superdev wymienia nowy skill w `skills[]` i nowego agenta w `agents[]` (nigdy w obu), a `superdev/README.md` i root `CLAUDE.md` opisują tor `vibe`, jego strażnika i to, że nie pisze żadnej warstwy wiedzy.

### Story 7 - regresja strażnika
18. Suita strażnika - Skrypt strażnika ma suitę pod `tests/`, uruchamianą z korzenia repo przez `node --test`, która dowodzi każdego progu z kryterium 9 (po obu stronach granicy) i dopasowania ścieżek z kryterium 10, i przechodzi pod Git-Bash na Windows tak samo jak na Linux/macOS.

## Constraints / assumptions
- Plugin pozostaje stack-agnostic: komendy sprawdzające i ścieżki wrażliwe pochodzą wyłącznie z pamięci hosta; tor nie zakłada żadnego ekosystemu ani narzędzia hosta.
- Tor jest dostępny zawsze, bez przełącznika w `.claude/superdev.yml`, i nie wymaga żadnej nowej konfiguracji hosta; brak deklaracji w pamięci hosta zawsze oznacza "słabszy strażnik", nigdy błąd.
- Progi rozmiaru (5 plików, 1 nowy plik, 200 linii) są stałe i takie same dla każdego hosta.
- Tor nigdy nie tworzy gałęzi git i commituje na bieżącej gałęzi.
- Strażnik działa na poziomie promptu i deterministycznego skryptu, nie hooka; superdev nadal ma jeden hook.
- Strażnik jest doradcą, nie bramą: jawna decyzja użytkownika ma pierwszeństwo przed każdym jego zatrzymaniem (wejściowym, rozmiarowym, po nieudanym sprawdzeniu); każde nadpisanie jest odnotowane w notatkach przebiegu.
- Nowy skill i agent podlegają zasadzie samodokumentacji repo: każda dodana pozycja jest wpisana do `plugin.json`, README i CLAUDE.md w tej samej zmianie.
- Repo nie prowadzi ADR; żaden dokument decyzji nie powstaje.
