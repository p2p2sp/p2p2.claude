# Intent: Cięcie kosztu budowy superdev - Review: none, oś Kind, jedna postać wywołań skryptów, uprawnienia w setup
Date: 2026-09-17

## Request
Skrócić czas ściany budowy superdev na podstawie pomiaru z logu debug przebiegu `2026-09-17-vibe-track` (38 min na 3 zadania, ~97% czasu to generowanie modelu, koszt na turę opus vs sonnet różni się o 9%, sterownikiem jest liczba tur, recenzent per zadanie kosztuje stałe ~3,5 min niezależnie od rozmiaru zadania, klasyfikator uprawnień auto mode odpala się na każdym wywołaniu skryptu, bo orkiestrator emituje tę samą komendę w różnych postaciach, a marker `Effort:` nie jest stosowany przy dispatchu, bo narzędzie `Agent` nie ma parametru `effort`). Cztery zmiany w jednym intent: możliwość pominięcia recenzenta per zadanie markerem `Review: none`; oś osądu `Kind:` dla zadań, które nie są kodowaniem, z dyscypliną wykonania per rodzaj i domyślnymi wartościami siły; jedna kanoniczna postać wywołań bundlowanych skryptów z wzorcami w `allowed-tools` i koniec fikcji przekazywania `effort:`; setup scalający rekomendowane uprawnienia hosta deterministycznym skryptem.

## Decisions
### 1. Jak zadanie wyłącza recenzenta per-zadanie?
Jawny marker `Review: none` w planie: `decompose.sh` przepuszcza go bez zmian, superbuild w kroku 3 pętli przy kolumnie `none` nie dispatchuje `superbuild-task-reviewer` i idzie prosto do commitu, B6 dopuszcza `none` jako trzecią postać markera, `## Dispatch strength` w `references/review-contract.md` dostaje jedno zdanie. Planista decyduje per zadanie, build czyta tylko marker.

### 2. Co dzieje się z tym, co bramka per-zadanie sprawdzała, gdy zadanie ma `Review: none`?
Nic dodatkowego: zadanie jest committowane po `VERDICT: PASS` implementora, jego notatki trafiają do `notes:` następnej rundy (checkpoint / final) jak dziś, żadnej kontroli zastępczej `## Runs` ani failure pass.

### 3. W jakiej postaci orkiestrator wywołuje skrypty, żeby wzorzec w `allowed-tools` je łapał?
Postać bezpośrednia wszędzie: `"${CLAUDE_PLUGIN_ROOT}/scripts/x.sh" ...` bez `bash`, bez przypisań zmiennych, bez `cd`, bez łączenia `;`; po jednym wzorcu `Bash(${CLAUDE_PLUGIN_ROOT}/.../x.sh:*)` na skrypt w `allowed-tools`, w składni, która w repo już działa dla preloadów i `run.sh`; `commit-task.sh`, `decompose.sh` i `cleanup-run.sh` dostają bit `100755` (komentarz w `tests/superdev/commit-task.test.ts` zakładający `100644` do poprawy); niezmiennik w root `CLAUDE.md` rozszerzony z preloadów na wywołania runtime.

### 4. Które skille dostają postać bezpośrednią i wzorce?
Wszyscy wywołujący runtime: superbuild, simplebuild, `e2e`, `vibe` (jako ostatnie zadanie planu, bo do czasu budowy tamta sesja go scommituje) oraz trzy recenzenty budowy (jeden wzorzec na `skills/executor/scripts/run.sh`).

### 5. Jak setup wprowadza rekomendowane uprawnienia?
Scalanie przez nowy deterministyczny skrypt w `skills/setup/scripts/`, na podstawie bundlowanego szablonu `skills/setup/assets/settings.json`: gdy `.claude/settings.json` hosta istnieje, skrypt dokłada brakujące wpisy `allow` i `deny` i ustawia `defaultMode`, gdy nie istnieje, tworzy go z szablonu; setup pyta `AskUserQuestion` przed scaleniem.

### 6. Czym skrypt scala JSON?
Node z osadzonym skryptem (`JSON.parse` / `JSON.stringify`, stdlib, bez pakietów); bez `node` na PATH wypisuje linię skip-with-note z rekomendowanym blokiem do ręcznego scalenia. Zależność nazwana w `superdev/CLAUDE.md`, test na fixtures w `tests/superdev/`.

### 7. Czym jest oś `Kind:`?
Trzy rodzaje według dowodu wykonania: `Kind: code | scaffold | text`, rozstrzygalne z `### Task Checks` (linia z plikiem testowym to `code`; komenda narzędzia bez pliku testowego, czyli build, install, validate, generator, `ls`/`grep` struktury, to `scaffold`; `none - <reason>` lub sam `grep` treści to `text`). Czwarty wymagany marker zadania w obu planistach, walidowany przez B6; domyślne w planiście: `code` = dzisiejsze reguły, `scaffold` i `text` = `Model: sonnet` i `Review: none`, planista podnosi z powodem w `### Approach`; każdy rodzaj ma własną sekcję dyscypliny w obu implementorach (`scaffold`: uruchom generator lub narzędzie zamiast pisać jego wyjście, nie poprawiaj wygenerowanego poza tym, co nazywa `### Approach`; `text`: czytasz tylko `### Files` i pliki nazwane w `### Approach`, żadnych sond, testów ani szukania precedensów po repo, jedno przejście); nowa klasa B22 sprawdza zgodność `Kind:` z kształtem `### Task Checks`; `decompose.sh` bez zmian, marker dociera do implementora w pliku zadania. `### Approach` dalej opisuje wynik, nie treść.

### 8. Co z zadaniami weryfikowanymi przez obserwację działającej aplikacji?
Trzy rodzaje zostają; takie zadanie jest `code` z `### Task Checks` = `none - manual verification: <co obejrzeć>`, jak dziś. Lista weryfikacji manualnej w finalnej recenzji to osobny, przyszły intent.

### 9. Co z martwym `Effort:` w tym intent?
Uczciwe minimum plus usunięcie przekazywania: oba orkiestratory przestają przekazywać `effort:` w każdym dispatchu (implementor, recenzent per zadanie, fix, writery), `stats` zapisuje `-` w kolumnie effort, reguły planisty nie kierują decyzji przez `Effort:` (bullet "drogie do cofnięcia" kieruje na `Model: opus` plus `Review: opus high`), `## Dispatch strength` w kontrakcie i root `CLAUDE.md` mówią, że narzędzie `Agent` nie przyjmuje `effort` i obowiązuje frontmatter agenta. Marker `Effort:` zostaje w szablonach, `decompose.sh` i B6 jako sygnał planisty na przyszłość.

## Constraints
- Budowa tej zmiany rusza dopiero po zamknięciu sesji, która teraz buduje przebieg `2026-09-17-vibe-track` w tym samym drzewie roboczym.
- Szablon `skills/setup/assets/settings.json` powstaje z obecnego `.claude/settings.json` tego repo bez kluczy specyficznych dla hosta (`modelOverrides`, `additionalDirectories`, `disableWorkflows`, `disableRemoteControl`): lista `allow` z narzędziami i `Bash`, lista `deny` z operacjami destrukcyjnymi, `defaultMode: acceptEdits`.
- Scalanie: unia list `allow` i `deny` bez duplikatów z zachowaniem kolejności hosta, `defaultMode` ustawiony tylko gdy go brak (inny istniejący to linia raportu, nie nadpisanie), każdy inny klucz nietknięty, zapis atomowy, ponowne uruchomienie bez zmian.
- Wzorce w `allowed-tools` używają `${CLAUDE_PLUGIN_ROOT}` (rozwijany przy ładowaniu), nigdy ścieżki cache wtyczki z numerem wersji.
- `Kind:` nie jest kolumną indeksu `decompose.sh`; indeks zostaje pięciopolowy.
- `Kind:` obowiązuje w superplan i simpleplan; szablon simpleplan nie ma `Review:`, więc tam `Kind:` steruje tylko `Model:`.
- Samodokumentacja repo: każda zmiana kontraktu, markera i wywołań jest odzwierciedlona w `superdev/README.md`, root `CLAUDE.md` i `superdev/CLAUDE.md` w tej samej zmianie.
- Plugin pozostaje stack-agnostic: zależność od `node` dotyczy wyłącznie własnego skryptu setup i stoi za fallbackiem skip-with-note.

## Out of scope
- Reguły `.claude/rules/` dla tego repo i przełącznik `rules: true` (użytkownik zasiewa i włącza sam).
- Koszt łańcucha planowania (intent, spec, plan, recenzje planu).
- Zachowanie przełącznika `stats` poza kolumną effort.
- Tor `vibe` poza zmianą postaci jego wywołań skryptów.
- Warianty implementora per siła dispatchowane przez `subagent_type` (P0.1a z analizy konkurencji).
- Lista weryfikacji manualnej dla człowieka w finalnej recenzji (P3.19).
- Kontrola `## Runs` lub failure pass dla zadań z `Review: none`.
- Usunięcie markera `Effort:` z szablonów, `decompose.sh` i B6.
- Czwarty rodzaj `Kind:` (manual, refactor lub inny).

## History
- none
