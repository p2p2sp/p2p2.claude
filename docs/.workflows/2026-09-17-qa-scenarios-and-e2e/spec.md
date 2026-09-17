# Spec: Scenariusze QA dla ludzi i testy E2E Playwright dla CI
Intent: docs/.workflows/2026-09-17-qa-scenarios-and-e2e/intent.md

## Problem / context (Why)
superdev kończy build trzema warstwami wiedzy dla ludzi (pamięć projektu, reguły, changelog), ale nic nie zostawia działowi testów: tester dostaje zmianę bez listy, co i jak sprawdzić, a testy E2E dla CI albo nie powstają, albo pisze je ktoś ręcznie po fakcie. Repo hosta TimeHarmony wypracowało już model dwuetapowy: QA opisuje scenariusz prozą, osobny krok zamienia opis w test Playwright zweryfikowany na żywo, a CI odtwarza go deterministycznie. Ten model ma stać się standardową, opcjonalną funkcją superdev. Stan wyjściowy: sześć przełączników w `.claude/superdev.yml` czytanych przez `scripts/read-config.sh`, trzy writery close-out dispatchowane w dwóch falach przez `superbuild` i `simplebuild`, brak warstwy `docs/qa/`, brak jakiegokolwiek skilla uruchamiającego aplikację hosta.

## Goal (What)
Po zakończonym buildzie, przy włączonych przełącznikach, tester QA otrzymuje czytelny dokument odbioru z krokami do ręcznego wykonania, a operator superdev otrzymuje plik przekazania dla automatyzacji i dedykowany, ręcznie uruchamiany przebieg, który stawia aplikację lokalnie, generuje testy Playwright (UI i black-box API) dla tych samych scenariuszy, uruchamia je do zieleni i commituje do CI. Build nigdy nie uruchamia testów E2E; obie warstwy dzielą te same identyfikatory scenariuszy.

- Trzy nowe przełączniki opt-in: `qa`, `e2e-ui`, `e2e-api`; domyślnie wyłączone, bez wpływu na dotychczasowe buildy.
- Dokument dla ludzi w `docs/qa/`, jeden per build, nigdy nie nadpisywany, z indeksem jako widokiem regresji.
- Plik przekazania dla maszyny obok, z tymi samymi ID, o sekcjach zależnych od przełączników.
- Osobny przebieg E2E, uruchamiany przez operatora, z twardymi warunkami wstępnymi i lokalnym uruchomieniem testów przed commitem.

## Out of scope
- Integracja z GitHub Issues (eksport scenariuszy jako issue).
- Uruchamianie testów E2E w trakcie builda, w checkpoincie lub jako brama final review.
- Scenariusze manualne dla API (dział QA nie testuje API ręcznie).
- Zmiany w specu, planie, checkliście planu i reviewerach build; reguła "seconds, in memory" dla `### Task Checks` zostaje.
- Instalowanie czegokolwiek przez `setup`.
- Wsparcie innych narzędzi niż Playwright dla tej funkcji.

## User scenarios
- Jako tester QA chcę po każdym buildzie dostać w repo jeden dokument z tytułem zmiany, krótkim opisem po ludzku, przygotowaniem środowiska i scenariuszami krok po kroku, żebym mógł wykonać odbiór bez pytania programisty i oznaczyć zadania w GitHub Projects.
- Jako tester QA chcę wiedzieć, które starsze scenariusze nowy build zastępuje, żeby nie testować dwa razy tego samego ekranu według nieaktualnych kroków.
- Jako operator superdev chcę włączyć funkcję jedną linią w konfiguracji i zobaczyć w podsumowaniu builda, co powstało albo dlaczego zostało pominięte, żeby build bez UI nie produkował pustych dokumentów.
- Jako operator superdev chcę uruchomić osobny przebieg, który sam sprawdzi narzędzia i przepis startu aplikacji, postawi ją lokalnie i wygeneruje testy dla scenariuszy z ostatniego builda, żeby do CI trafiały wyłącznie testy, które raz już były zielone.
- Jako operator superdev chcę, żeby scenariusz, którego test nie przechodzi z winy aplikacji, został oznaczony jako zablokowany z powodem, a nie "naprawiony" zmianą w aplikacji, żeby przebieg E2E nie stał się ukrytym buildem.
- Jako pipeline CI chcę dostać zwykłe pliki `@playwright/test` w katalogu i konwencji hosta, żeby uruchomić je bez żadnej wiedzy o superdev.

## Acceptance criteria
1. Przełączniki domyślnie wyłączone - Świeżo zainicjowana konfiguracja zawiera `qa`, `e2e-ui` i `e2e-api` ustawione na `false`, a build z wszystkimi trzema wyłączonymi nie tworzy niczego pod `docs/qa/` ani nie zmienia podsumowania.
2. Przełączniki rozwiązywane jak dotychczasowe - Każdy z trzech kluczy jest `true` wyłącznie wtedy, gdy plik konfiguracji ma dokładnie jego linię z wartością `true`, a rozwiązany blok konfiguracji wypisuje sześć dotychczasowych kluczy i trzy nowe w stałej kolejności.
3. Narzędzia raportowane przez setup - Wynik `setup` zawiera jedną linię o dostępności `playwright-cli` i jedną o `@playwright/test` w repo hosta, a setup niczego nie instaluje.
4. Dokument odbioru istnieje - Po zakończonym buildzie z `qa: true`, który zmienił kod widoków lub routing, na torze Simple i Super, pod `docs/qa/` istnieje jeden nowy dokument odbioru tego builda w języku intentu, a ponowny zapis pod tą samą nazwą jest odrzucany jako błąd, który build zgłasza w podsumowaniu.
5. Scenariusz na każde kryterium - Każde kryterium akceptacji builda ma w dokumencie odbioru co najmniej jeden scenariusz wskazujący je po tytule, a każdy tryb awarii wywoływalny z UI ma scenariusz negatywny.
6. Kroki czytelne dla człowieka - Każdy scenariusz ma warunki wstępne i tabelę, w której każdy wiersz to jedna akcja i jeden obserwowalny wynik, a dokument nie zawiera kolumny statusu wykonania (zaliczony / niezaliczony) ani żadnej wzmianki o automatyzacji, lokatorach czy plikach testów.
7. Indeks jako widok regresji - Po każdym buildzie, który utworzył dokument odbioru, `docs/qa/README.md` zawiera jedną linię tego builda z datą, tytułem, obszarami i zakresem ID scenariuszy, umieszczoną w grupie jego obszaru, a istniejące linie pozostają nietknięte; build, który utworzył tylko plik przekazania, nie zmienia indeksu.
8. Zastąpienia oznaczone - Gdy starszy plik przekazania zawiera scenariusz o identycznej trasie (UI) albo identycznej metodzie i endpoincie (API) i o identycznym tytule kryterium, nowy dokument odbioru wymienia go w sekcji zastąpień, a indeks wskazuje nowszy scenariusz; różnica w którymkolwiek z tych elementów, albo brak starszych plików przekazania, oznacza brak zastąpienia.
9. Plik przekazania istnieje - Po zakończonym buildzie z `e2e-ui: true` lub `e2e-api: true` pod `docs/qa/` istnieje plik przekazania tego builda z sekcją scenariuszy UI tylko przy `e2e-ui` i sekcją scenariuszy API tylko przy `e2e-api`; plik przekazania istnieje niezależnie od `qa`, a gdy dokument odbioru też powstał, oba używają tych samych ID scenariuszy.
10. Wpisy przekazania kompletne - Każdy wpis UI niesie kryterium, rolę, trasę, dane startowe, kroki, asercję i pliki, każdy wpis API niesie kryterium, endpoint, uwierzytelnienie, żądanie i oczekiwaną odpowiedź, a wartość nieustalona z kodu jest zapisana jako nieznana, nigdy wymyślona.
11. Pominięcia nazwane - Build, który nie zmienił kodu widoków ani routingu, nie tworzy dokumentu odbioru ani sekcji UI, build, który nie zmienił żadnego endpointu, nie tworzy sekcji API, a podsumowanie builda podaje każde takie pominięcie z powodem.
12. Warunki wstępne przebiegu E2E - Uruchomienie przebiegu E2E bez przepisu startu aplikacji, kont testowych lub konwencji testów w pamięci hosta kończy się pytaniem do operatora, a brak `playwright-cli` lub `@playwright/test` kończy się ofertą instalacji, którą wykonuje sam przebieg E2E po zgodzie operatora, albo przerwaniem; w żadnym z tych stanów nie powstaje żaden test.
13. Testy zielone przed commitem - Każdy wygenerowany plik testów przeszedł lokalnie przeciw uruchomionej aplikacji przed commitem, a scenariusz, którego test nie może przejść z winy aplikacji, jest w pliku przekazania oznaczony jako zablokowany z powodem, bez żadnej zmiany w kodzie aplikacji.
14. Testy commitowane i trasowalne - Commit przebiegu E2E zawiera dokładnie wygenerowane pliki testów i zaktualizowany plik przekazania, nic więcej; każdy test nosi ID scenariusza i tytuł kryterium, a plik przekazania zapisuje per scenariusz ścieżkę wygenerowanego pliku albo powód zablokowania; ponowne uruchomienie nad tym samym plikiem pomija scenariusze z zapisaną ścieżką i ponawia zablokowane.
15. Katalog i dokumentacja aktualne - Katalog pluginu, README superdev, root `CLAUDE.md` i manifest opisują nowe przełączniki, warstwę `docs/qa/`, przebieg E2E oraz model dwuetapowy.
16. Testy skryptów zielone - Zestaw testów skryptów z repo root przechodzi z trzema nowymi kluczami i nowymi liniami raportu setup.

## Constraints / assumptions
- Scenariusze dla QA żyją jako markdown w repo; testerzy tylko czytają, wyniki statusują w GitHub Projects. Kształt scenariusza ma być gotowy na przyszłą regułę "jeden scenariusz = jedno GitHub issue".
- Katalog warstwy to `docs/qa/`; przy runie podzielonym na fazy jeden dokument per faza, z identyfikatorem runu jak w changelogu. Przebieg E2E dostaje ścieżkę pliku przekazania jawnie od operatora; pliki z wcześniejszych buildów nigdy nie są dobierane automatycznie.
- `playwright-cli` (nie MCP) jest narzędziem agenta na sztywno; artefaktem dla CI są pliki `@playwright/test`. Root `CLAUDE.md` zapisuje już, że zasada stack-agnostic dotyczy projektów hosta, nie toolingu pluginu za przełącznikiem opt-in.
- Testy UI mogą używać Playwright `request` do przygotowania danych, asercji skutków i sprzątania; scenariusze UI to klikanie po UI, scenariusze API to black-box przez `request`.
- Przepis startu aplikacji, konta testowe, katalog i konwencje testów E2E (Page Objects, fixtures ról) pochodzą wyłącznie z pamięci hosta (`CLAUDE.md`, `.claude/rules/`); superdev niczego o stacku hosta nie zakłada.
- Lista scenariuszy powstaje po buildzie z kryteriów akceptacji, scenariuszy użytkownika specu, trybów awarii planu, tabeli pokrycia reviewera i kodu widoków oraz routingu; spec i plan nie zmieniają się.
- Nie tworzyć nowych gałęzi git; writer i przebieg E2E commitują przez istniejący mechanizm zadeklarowanego zbioru.
