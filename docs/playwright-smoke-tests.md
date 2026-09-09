# Intent: Nocne testy e2e Playwright z generowanych scenariuszy
Date: 2026-09-09

## Request
Chcemy dodać generowanie scenariuszy testowych dla playwright-cli, tak aby w CI Playwright klikał po aplikacji. Nie ma to być bramka na merge, lecz forma testów e2e uruchamianych automatycznie wcześnie rano (około 2:00), żeby po przyjściu do pracy zespół zastał gotowy raport. Proces ma być uporządkowany w kolejno wykonywane kroki: najpierw testy opisane dla działu QA, a na tej podstawie agent generuje testy Playwright i dopisuje te, które mają sens w automacie, a przy ręcznym klikaniu są trudne do wykonania.

## Decisions

### 1. Sposób generowania scenariuszy
- Chosen: Generowanie offline, odgrywanie deterministyczne w CI. Agent wytwarza pliki `*.spec.ts` commitowane do repo; CI odpala zwykłe `playwright test`.
- Alternatives: Eksploracja przez agenta w CI - niedeterministyczna, ten sam commit raz przechodzi, raz nie, koszt tokenów przy każdym uruchomieniu; Hybryda (agent eksploruje nocnie i z tego generuje) - dwa pipeline'y i proces akceptacji nagrań, najwięcej pracy na start.
- Why: CI jest przewidywalne i tanie, awaria testu wskazuje regresję, a nie humor modelu, a scenariusze przechodzą przez code review.

### 2. Środowisko, po którym Playwright klika
- Chosen: Własne środowisko na self-hosted runnerze, resetowane przed każdym przebiegiem.
- Alternatives: Wdrożona Alfa (`P2P2_Develop`) - odpadła po wyborze decyzji 3, bo pełne scenariusze z zapisem nie mogą chodzić po współdzielonym środowisku, na które patrzą ludzie; Pełny efemeryczny stack w jobie PR-owym - bez roli bramki nieuzasadniony koszt, a Gateway i tak musi stać trwale.
- Why: Gateway stoi przed aplikacją i odpowiada za Auth, a pochodzi z osobnego repo, więc musi być trwałym elementem środowiska. Zapisujące scenariusze wymagają danych, które można skasować i odtworzyć.

### 3. Głębokość scenariuszy
- Chosen: Pełne scenariusze biznesowe z mutacjami, wielorolowe, od początku do końca.
- Alternatives: Wyłącznie odczyt (wejście na trasę i sprawdzenie, że się wyrenderowała) - odrzucone jako pozbawione sensu przy tak rozumianym smoke; Odczyt plus kilka przepływów zapisu - półśrodek, który nie pokrywa rdzenia systemu.
- Why: Rdzeniem tego systemu są przepływy dwustronne (wniosek, akceptacja, rozliczenie). Test, który ich nie przechodzi, nie mówi nic o tym, czy aplikacja działa.

### 4. Granica między tym, co trwałe, a tym, co odtwarzane
- Chosen: Trwała infrastruktura (SQL Server, Redis, RabbitMQ, Gateway), aplikacja odświeżana przy każdym przebiegu. CI przebudowuje Host i frontendy z bieżącego kodu, kasuje bazę, puszcza migracje modułowe, a po nich migracje testowe.
- Alternatives: Całe środowisko trwałe, aktualizowane osobno - cichy dryf, raport dotyczy wersji, o której nikt nie pamięta, kiedy trafiła na środowisko; Wszystko efemeryczne per przebieg - sprzeczne z założeniem "postawione raz", najdłuższy przebieg, a Gateway i tak trzeba by odtwarzać z innego repo.
- Why: Testujemy dzisiejszy kod, nie płacąc co noc za stawianie SQL Servera i Gatewaya od zera. Migracje testowe zamiast `/setup/debug` obchodzą przy okazji problem `#if DEBUG`, bo działają też w buildzie `Release`.

### 5. Konta testowe i autoryzacja
- Chosen: Stały zestaw kont per rola zakładany migracją testową; `globalSetup` loguje każdą rolę raz przez formularz i zrzuca sesję do `storageState`, scenariusze wybierają rolę deklaratywnie przez fixture.
- Alternatives: Logowanie przez API `POST /app/auth/login` - najczęściej używany ekran w systemie przestaje być testowany, a zysk czasowy przy pełnych scenariuszach jest marginalny; Jedno konto administratora ze wszystkimi uprawnieniami - nie odegra przepływu dwustronnego i nie wykryje błędów uprawnień.
- Why: Scenariusze z decyzji 3 z natury wymagają wielu ról. `storageState` zapisuje też `localStorage`, czyli `app.settings` z uprawnieniami, co omija problem pustego sidebara przy nieukończonym pobraniu profilu.

### 6. Organizacja warstwy stabilnej
- Chosen: Page Objects per ekran plus fixture'y ról. Generator składa scenariusze z wywołań tych klas, prawie bez surowych lokatorów.
- Alternatives: Płaskie spec'y z lokatorami w miejscu użycia - zmiana jednego komponentu współdzielonego rozjeżdża wiele plików naraz; Warstwa akcji biznesowych zamiast warstwy ekranów - ukrywa, gdzie test się wywrócił, i buduje drugi model domenowy obok aplikacji.
- Why: Najlepiej udokumentowany wzorzec Playwrighta, a przy generowaniu daje agentowi stabilne, zamknięte API zamiast wymyślania selektorów za każdym razem.

### 7. Strategia lokatorów
- Chosen: Hybryda. Role ARIA i etykiety dla kontrolek formularza oraz przycisków z widocznym tekstem; `data-testid` dla struktur, gdzie rola jest niejednoznaczna (wiersze tabel, karty, kafle, przyciski ikonowe, kontenery sekcji). Jeden wymuszony język interfejsu. Reguła podziału musi być spisana.
- Alternatives: Wyłącznie `data-testid` - najwięcej zmian w produkcyjnych plikach frontendu i ryzyko, że atrybut zniknie przy refaktorze, bo nic w aplikacji go nie potrzebuje; Wyłącznie role i dostępne nazwy - w tabelach dziesiątki wierszy mają tę samą rolę, więc lokatory robią się kruche i pełne obejść przez `nth()`.
- Why: `data-testid` dosypujemy tylko tam, gdzie realnie brakuje zaczepienia, zamiast oznaczać cały interfejs. Lokator oparty na roli wywala się, gdy przycisk straci etykietę, więc testy przy okazji pilnują dostępności.

### 8. Wsad dla generatora
- Chosen: Dwuetapowo. QA opisuje scenariusz prozą w `docs/testing/`; w osobnym kroku skill zamienia opis na kod (dobiera lub dopisuje Page Objecty, wybiera rolę, dokłada asercje, weryfikuje na żywo przez playwright-cli). Agent ma mandat dopisać przypadki sensowne wyłącznie w automacie, trudne przy ręcznym klikaniu.
- Alternatives: Generowanie z samego kodu - wyprodukuje głównie asercje "wyrenderowało się i nic nie krzyknęło", czyli odrzucony wariant z decyzji 3; Nagrywanie sesji i przepisywanie - utrwala przypadkowe dane i nie niesie informacji, co w ścieżce jest istotne.
- Why: Scenariusze biznesowe opierają się na wiedzy domenowej, której z kodu nie da się wyczytać. Intencja testu podlega recenzji, zanim powstanie linijka kodu.

### 9. Kanał raportu
- Chosen: Wpis w GitHub Discussions w nowej, dedykowanej kategorii w formacie ogłoszeniowym (wątki zakłada tylko bot).
- Alternatives: Discord przez istniejący webhook - wiadomość się przewija, nie powstaje historia; Automatyczne issue przy porażce - przy niestabilnym scenariuszu codziennie nowe issue, zamykane hurtem; Tylko Job Summary - nikt sam z siebie tam nie zajrzy.
- Why: Daje historię i wyszukiwalność, mieści się w GitHubie bez nowej infrastruktury i nie zaśmieca backlogu issue.

### 10. Treść wpisu i sposób publikacji raportu HTML
- Chosen: Tytuł niesie status. Treść od ogółu do szczegółu: status, potem punktowana lista nazw testów, które padły, niżej punktowana lista z nazwą testu i przyczyną niepowodzenia. Pozostałe szczegóły generowane przez Playwright idą do artefaktu GitHub Actions (`upload-artifact`), linkowanego z treści.
- Alternatives: Serwer statyczny obok środowiska na runnerze - działa tylko w sieci firmowej, dochodzi kontener i polityka retencji; GitHub Pages - odrzucone, bo trace zawiera pełne żądania z ciasteczkami sesyjnymi kont testowych, a zrzuty pokazują dane z bazy.
- Why: Zero dodatkowej infrastruktury, wbudowana retencja, dostęp pokrywa się z dostępem do repo. Załącznika nie da się dodać przez API: `CreateDiscussionInput` przyjmuje wyłącznie `repositoryId`, `title`, `body`, `categoryId`, a w schemacie GraphQL nie ma mutacji uploadu.

## Constraints
- Cron w GitHub Actions chodzi w UTC i nie zna czasu letniego. 2:00 czasu polskiego to `0 0` latem i `0 1` zimą: albo dwa crony, albo akceptacja godziny przesunięcia zimą.
- Ruch idzie przez Gateway, więc frontendy muszą być budowane produkcyjnie (bez `VITE_USE_LOCAL_SERVICES`), pod `window.location.origin` i relatywne `/app/...`. Sesja to prawdziwy httpOnly cookie; deweloperski skrót z ciasteczkiem `userId` nie działa.
- Gateway pochodzi z osobnego repo (`TimeHarmony.Gateway`) i nie jest budowany przez to CI.
- Baza to SQL Server. Lokalnie `Integrated Security=True`, więc w kontenerze trzeba przejść na uwierzytelnianie SQL. `th-backend-db-recreate.cmd` jest gotowym wzorcem kroku resetu.
- Jestowy `testMatch` w trzech aplikacjach łapie `**/?(*.)+(spec|test).ts?(x)` pod `src/`, więc katalog e2e musi leżeć poza `src/`.
- `.gitignore` ma już `.playwright-cli/` i `.playwright-mcp/` oraz `.test-results`, ale nie `test-results/` ani `playwright-report/`.
- Job będzie pierwszym w repo z runnerem innym niż `ubuntu-latest`; wszystkie istniejące workflow używają wyłącznie `ubuntu-latest`.
- Kategorię Discussions trzeba założyć ręcznie przez interfejs GitHuba; API jej nie utworzy. Istniejące kategorie to Chat, Dev, Recenzja ADR, Recenzja PRD, Recenzja RFC.
- W produkcyjnym DOM `data-testid` emituje dziś tylko około 22 plików, przy konwencji kebab-case z prefiksami komponentowymi (`bpe-`, `spe-`, `tpe-`, `pd-`, `owp-`). Nowe atrybuty muszą trzymać tę konwencję.
- Nawigacja w TH jest sterowana uprawnieniami z API; brak wczytanego `app.settings` daje pusty sidebar zamiast błędu, więc asercje muszą to odróżniać.
- Endpoint `POST /app/th/setup/debug` jest pod `#if DEBUG` i nie istnieje w buildzie `Release`, dlatego dane testowe idą przez migracje, a nie przez ten endpoint.

## Out of scope
- Uruchamianie w PR i jakakolwiek rola bramki merge.
- Testowanie środowisk Alfa, Staging i produkcji.
- Agent klikający po aplikacji w CI (eksploracja w czasie przebiegu).
- Zmiany w istniejących workflow poza dodaniem nowego.
- Wpinanie istniejących testów Jest do CI, mimo że dziś nie są tam uruchamiane.
- Pokrywanie testami wszystkich około 120 tras aplikacji TH; zakres wynika z prozy przygotowanej przez QA.

## History
- `docs/changelog/` nie istnieje w tym repo, brak korpusu wpisów do sprawdzenia.
- `docs/adr/` zawiera 30 rekordów; żaden nie dotyczy strategii testów, e2e, automatyzacji przeglądarki ani CI. Nie ma decyzji, którą ten kierunek by łamał, ani odrzuconej alternatywy przypominającej generowanie scenariuszy Playwright.
- `docs/testing/` zawiera ręcznie pisane scenariusze QA wiązane z issue (`2026-07-30-issue-6430-scenariusze-testowe.md`, `2026-08-05-issue-5764-archiwizacja-widocznosc.md`). Decyzja 8 świadomie buduje na tej istniejącej praktyce zamiast wprowadzać nowy format.
