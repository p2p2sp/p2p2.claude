# Intent: Scenariusze QA dla ludzi i testy E2E Playwright dla CI
Date: 2026-09-17

## Request
Trzy nowe, opcjonalne funkcje superdev włączane w `.claude/superdev.yml`: `qa` (scenariusze testów manualnych dla działu QA, wykonywalne krok po kroku przez człowieka), `e2e-ui` i `e2e-api` (testy Playwright, odpowiednio klikające po UI i black-box API, uruchamiane w CI hosta). Build kończy się na Close Out artefaktami w `docs/qa/`; generowanie testów Playwright to osobny przebieg, uruchamiany ręcznie dedykowanym skillem, który stawia aplikację lokalnie i dopiero wtedy pisze i uruchamia testy.

## Decisions
### 1. Czym jest artefakt handoffu, który build zostawia po Close Out dla późniejszego skilla E2E?
Dwa pliki write-once w `docs/qa/`: `<run>.md` wyłącznie dla ludzi (prosty, czytelny, bez niczego o automatyzacji) i `<run>.e2e.md` dla skilla E2E, oba spięte tymi samymi ID `QA-nn`.

### 2. Gdzie rodzi się lista scenariuszy `QA-nn`?
W writerze close-out, po buildzie. Writer wyprowadza scenariusze z kryteriów akceptacji (spec lub nagłówek SimplePlan), z `## User scenarios` specu, z `### Failure modes` planu (przypadki negatywne) i z tabeli `## Coverage` reviewera spec, a kroki nawigacji i komunikaty bierze z kodu widoków i routingu. Spec i plan nie zmieniają się. Writer ma listę samokontroli: co najmniej jeden scenariusz na kryterium plus jeden negatywny na każdy `### Failure modes` wywoływalny z UI; krok = jedna akcja i jeden obserwowalny wynik; zakaz "sprawdź, że działa".

### 3. Kształt pliku dla ludzi `docs/qa/<run>.md`?
Nagłówek to sam tytuł builda (bez prefiksu), pod nim data i run id, sekcje: `## Co się zmieniło` (2-3 zdania po ludzku, bez nazw plików), `## Przygotowanie` (środowisko, konta, dane; z pamięci hosta, brak -> "ustal z zespołem"), jeden blok `## QA-nn <tytuł>` per scenariusz z linią `Pokrywa: \`<tytuł kryterium>\` (#n)`, warunkami wstępnymi i tabelą `| # | Krok | Oczekiwany wynik |`, na końcu `## Poza zakresem tego odbioru` i opcjonalnie `## Zastępuje`. Bez kolumny wyniku (statusy idą do GitHub Projects), bez wzmianki o automatyzacji. Język intentu, jak w changelogu.

### 4. Kształt pliku dla maszyny `docs/qa/<run>.e2e.md` i rola przełączników `e2e-ui` / `e2e-api`?
Markdown o stałych nagłówkach. Writer pisze plik, gdy choć jeden z `e2e-ui` / `e2e-api` jest `true`; `e2e-ui` włącza sekcję `## UI scenarios`, `e2e-api` sekcję `## API scenarios`. Nagłówek: tytuł builda, `Run:`, `Base:`, `Launch:` i `Accounts:` (z pamięci hosta lub `not declared`). Wpis UI: `### QA-nn <tytuł>` z liniami `Covers`, `Role`, `Route`, `Seed`, `Steps`, `Assert`, `Files`. Wpis API: `Covers`, `Endpoint`, `Auth`, `Request`, `Expect`. Sekcja `## Not automatable` z powodem per ID. Lokatory i trasy pochodzą z kodu (data-testid, ARIA, routing); brak pewności -> `unknown`, do doprecyzowania snapshotem przez skill E2E.

### 5. Dedykowany skill E2E, uruchamiany ręcznie?
Jeden skill `superdev:e2e <ścieżka do .e2e.md>`, tylko dla użytkownika, z obowiązkowym lokalnym uruchomieniem testów. Przebieg: czyta pamięć hosta po przepis startu aplikacji, konta testowe, katalog i konwencje testów E2E (Page Objects, fixtures ról), brak przepisu -> stop z pytaniem; sprawdza `playwright-cli` i `@playwright/test`; stawia aplikację według przepisu albo potwierdza, że działa; generuje i uruchamia testy per scenariusz; test czerwony -> najpierw poprawka testu, a gdy winna jest aplikacja, scenariusz dostaje w `.e2e.md` linię `blocked: <powód>` i aplikacja nie jest ruszana; commit przez `commit-task.sh` z zadeklarowanymi ścieżkami.

### 6. Gdzie żyje sprawdzenie i instalacja Playwrighta?
`setup` tylko raportuje: `bootstrap.sh` drukuje deterministyczne linie `playwright-cli: found <wersja> | not found` i `@playwright/test: found | not found`, nic nie instaluje. Skill `e2e` na starcie robi to samo sprawdzenie i przy braku pyta jednym `AskUserQuestion`: zainstalować (`npm i -D @playwright/test`, `npx playwright install`, globalnie `playwright-cli`) czy przerwać.

### 7. Indeks `docs/qa/README.md` i wykrywanie `supersedes`?
Indeks grupowany po obszarach (wyprowadzanych jak w changelog-writer z pierwszego segmentu ścieżek `### Files`), jedna linia per build: `- <data> - [<tytuł>](<run>.md) - <obszary> - QA-01..QA-nn`. `supersedes` wykrywane wyłącznie ze starszych plików `.e2e.md`: ten sam `Route` lub `Endpoint` i to samo kryterium -> w nowym pliku dla ludzi sekcja `## Zastępuje` z linią `QA-03 zastępuje <run>#QA-02`, a indeks przenosi wskazanie. Brak starszych `.e2e.md` -> brak wykrywania, sekcja pominięta.

### 8. Na których torach i w której fali writer biegnie?
Oba tory, fala 1 Close Out, jeden agent `qa-writer`, dispatch obok memory-writer i rules-writer w jednej wiadomości, gdy dowolny z `qa` / `e2e-ui` / `e2e-api` jest `true`. Etykiety: `capture:`, `notes:`, `refs:`, `workdir:`, `reports:` (katalog raportów review, źródło tabeli `## Coverage`), plus `spec:` i `intent:` gdy są. Na torze Simple kryteria z nagłówka planu, scenariusze tylko z kryteriów i `### Failure modes`; szablon ten sam.

### 9. Jak skill `e2e` wykonuje pracę?
Skill jest orkiestratorem w głównym kontekście (sprawdzenia środowiska, start aplikacji, pytania, commit); generację robi nowy agent `e2e-writer` dispatchowany per scenariusz ze świeżym kontekstem i etykietami (`scenario:` ścieżka do wyciętego bloku, `conventions:` pamięć hosta, `spec-dir:`). Agent robi snapshot playwright-cli, pisze `*.spec.ts` w konwencji hosta, uruchamia go lokalnie, poprawia do zieleni w limicie rund i zwraca `VERDICT: PASS|BLOCKED` ze ścieżką pliku. Snapshoty i logi zostają w kontekście agenta.

## Constraints
- Scenariusze dla QA żyją jako markdown w repo; testerzy tylko czytają i statusują zadania w GitHub Projects, więc plik nie ma pól wyników. Kształt scenariusza ma być gotowy na przyszłą regułę "jeden scenariusz = jedno GitHub issue".
- Katalog warstwy: `docs/qa/` (nie `docs/testing/`).
- `playwright-cli` (nie MCP) na sztywno jako narzędzie agenta; artefaktem do CI są pliki `@playwright/test` (`*.spec.ts`). Root `CLAUDE.md` zapisuje już wyjątek: stack-agnostic dotyczy projektów hosta, nie toolingu pluginu za przełącznikiem opt-in.
- Testy Playwright nigdy nie biegną w buildzie; build tylko zostawia artefakty. Reguła "seconds, in memory" dla `### Task Checks` i własność `#### Integration` przez final review pozostają nietknięte.
- Testy UI mogą używać Playwright `request` do seedingu, asercji skutków i sprzątania; zakres scenariuszy UI to klikanie po UI, scenariusze API to black-box przez `request`.
- Nowe klucze konfiguracji dochodzą do `read-config.sh`, `setup/assets/config.yml`, `setup/scripts/bootstrap.sh` (nagłówek, grep, echo domyślnych), testów `tests/superdev/read-config.test.ts` i `bootstrap.test.ts`, tabeli w `superdev/README.md`; `superplan` / `simpleplan` nadal nie czytają konfiguracji.
- Nowe agenty (`qa-writer`, `e2e-writer`) i skill (`e2e`) trafiają do `superdev/.claude-plugin/plugin.json`; szablony obu plików `docs/qa/` do `superdev/references/`; root `CLAUDE.md`, `superdev/README.md` i manifest (nowy obszar gated konfiguracją) do synchronizacji.
- Przy phases jeden plik per faza, run id jak w changelog-writer. Build bez UI -> `qa` i `e2e-ui` skip-with-note; build bez endpointów -> `e2e-api` skip-with-note.
- Nie tworzyć nowych gałęzi git.

## Out of scope
- Integracja z GitHub Issues (eksport scenariuszy).
- Uruchamianie testów E2E w trakcie builda lub jako brama review.
- Scenariusze manualne dla API (QA nie testuje API ręcznie).
- Zmiany w specu, planie, checkliście planu i reviewerach build.
- Instalowanie czegokolwiek przez `setup`.

## History
- none - repo nie ma `docs/changelog/` ani `docs/adr/`; kontekstem był zapisany intent `docs/playwright-smoke-tests.md` (TimeHarmony, 2026-09-09: dwuetapowy model "QA opisuje, skill generuje z weryfikacją na żywo przez playwright-cli, CI odtwarza") - upheld, ten sam model.
