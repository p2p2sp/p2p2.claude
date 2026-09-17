# Spec: Cięcie kosztu budowy superdev - Review: none, oś Kind, jedna postać wywołań skryptów, uprawnienia w setup
Intent: docs/.workflows/2026-09-17-build-cost-cuts/intent.md

## Problem / context (Why)
Pomiar z logu debug przebiegu `2026-09-17-vibe-track` (38 min na 3 zadania) pokazał, że ~97% czasu ściany budowy to generowanie modelu i że sterownikiem jest liczba tur, nie siła modelu (koszt na turę opus vs sonnet różni się o 9%). Cztery źródła zbędnych tur, wszystkie w konstrukcji superdev:

- recenzent per zadanie (`superbuild-task-reviewer`) kosztuje stałe ~3,5 min i 12-15 tur na każde zadanie toru Super, także wtedy, gdy zadanie jest edycją tekstu, a jego `### Task Checks` już je dowodzi; plan nie ma dziś sposobu, by go pominąć - marker `Review:` zna tylko brak (frontmatter) i `<model> <effort>`;
- planista ma jedną skalę siły dla każdego zadania, więc zadanie nie-kodowe (prompt skilla, README, manifest, boilerplate z generatora) dostaje tę samą dyscyplinę co logika z testami: implementor pisze sondy, szuka precedensów po repo i uruchamia testy wielokrotnie (zadanie 1 tego przebiegu: 50 tur, cztery uruchomienia jednorazowej sondy);
- marker `Effort:` jest fikcją: narzędzie `Agent` nie ma parametru `effort`, więc każdy implementor biegnie na `xhigh` z frontmatteru, a `stats` zapisuje wartość, która nigdy nie działała; reguły planisty kierują przez `Effort:` decyzje, które nic nie zmieniają;
- każde wywołanie bundlowanego skryptu przez orkiestrator przechodzi przez klasyfikator uprawnień auto mode (42 wywołania, 86 s, plus 115 s decyzji uprawnień w tym przebiegu), bo orkiestrator emituje tę samą komendę w różnych postaciach (`bash "…"` i `W="…"; bash "$S/…"`), a `allowed-tools` orkiestratorów deklaruje wzorzec tylko dla preloadu `read-config.sh`.

Stan wyjściowy: `decompose.sh` przepuszcza `Review:` dosłownie i nie waliduje; klasa B6 w `references/plan-review-checklist.md` jest jedynym miejscem walidacji markerów; simplebuild ignoruje kolumnę `Review:`; wzorce pre-approval w repo mają jedną działającą składnię (`Bash(${CLAUDE_PLUGIN_ROOT}/…/x.sh:*)`) dopasowującą wywołanie bezpośrednie; `commit-task.sh`, `decompose.sh` i `cleanup-run.sh` mają w indeksie git tryb `100644`; `skills/setup/scripts/bootstrap.sh` seeduje z szablonów w `assets/` tylko to, czego brak, i nie dotyka `.claude/settings.json`.

## Goal (What)
- Zadanie planu toru Super może zrezygnować z recenzenta per zadanie jednym markerem, a build honoruje to bez żadnej kontroli zastępczej.
- Każde zadanie planu deklaruje rodzaj według dowodu wykonania (`code`, `scaffold`, `text`), planista dobiera z niego domyślną siłę i obecność recenzenta, recenzent planu waliduje zgodność rodzaju z dowodem, a implementor pracuje w dyscyplinie właściwej dla rodzaju.
- Build i dokumentacja mówią prawdę o efforcie: nic go nie przekazuje, frontmatter agenta decyduje, reguły planisty nie kierują przez niego żadnej decyzji.
- Każde runtime wywołanie bundlowanego skryptu w skillach budowy i toru vibe (superbuild, simplebuild, `e2e`, `vibe`, trzy recenzenty budowy) ma jedną postać i jest pre-approved przez wzorzec zadeklarowany w tym skillu.
- Setup, za zgodą użytkownika, scala rekomendowane uprawnienia w `.claude/settings.json` hosta deterministycznie i idempotentnie.

## Out of scope
- Reguły `.claude/rules/` dla tego repo i przełącznik `rules: true` (użytkownik zasiewa i włącza sam).
- Koszt łańcucha planowania (intent, spec, plan, recenzje planu).
- Zachowanie przełącznika `stats` poza kolumną effort.
- Tor `vibe` poza zmianą postaci jego wywołań skryptów.
- Warianty implementora per siła dispatchowane przez `subagent_type`.
- Lista weryfikacji manualnej dla człowieka w finalnej recenzji.
- Kontrola `## Runs` lub failure pass dla zadań z `Review: none`.
- Usunięcie markera `Effort:` z szablonów, `decompose.sh` i B6.
- Czwarty rodzaj `Kind:` (manual, refactor lub inny); zadanie weryfikowane obserwacją działającej aplikacji jest `code` z `### Task Checks` = `none - manual verification: <co obejrzeć>`.
- Zmiana kolumn indeksu `decompose.sh`.
- Wywołania skryptów w `superdev-memory`, `superdev-rules`, `phases` i `setup` (`phases` i preload `setup` już mają postać bezpośrednią i wzorzec; skrypty memory i rules są lokalne dla skilla i uruchamiane interaktywnie przez użytkownika).

## User scenarios
- Jako operator budowy superdev chcę, by zadanie planu mogło zrezygnować z recenzenta per zadanie, tak aby zadanie, które własne `### Task Checks` już dowodzą, kosztowało jeden dispatch zamiast dwóch.
- Jako planista (superplan / simpleplan) chcę, by każde zadanie niosło rodzaj rozstrzygalny z jego dowodu, tak aby zadania nie-kodowe dostawały domyślną siłę i brak recenzenta bez wpisywania ich treści do planu.
- Jako implementor zadania chcę dyscyplinę właściwą dla rodzaju zadania, tak aby zadanie tekstowe lub scaffoldingowe zrobić w jednym przejściu, bez sond i szukania precedensów.
- Jako operator budowy chcę, by build i dokumentacja przestały udawać, że effort jest przekazywany, tak aby `stats` i kontrakt opisywały to, co faktycznie działa.
- Jako użytkownik hosta bez blanket `Bash` w uprawnieniach chcę, by własne wywołania skryptów wtyczki przechodziły kontrolę uprawnień bez pytania i bez klasyfikatora, tak aby budowa nie stawała na nich.
- Jako użytkownik hosta uruchamiający setup chcę, by rekomendowane uprawnienia zostały scalone z moimi ustawieniami po mojej zgodzie, tak aby superdev działał bez pytań, a komendy destrukcyjne pozostały zabronione.

## Acceptance criteria
1. Review none pomija recenzenta - Zadanie toru Super z markerem `Review: none` jest committowane bezpośrednio po `VERDICT: PASS` implementora, bez dispatchu recenzenta per zadanie i bez zdarzenia `task-reviewer` w `stats` dla tego zadania.
2. Review none przechodzi recenzję planu - Plan z `Review: none` na zadaniu przechodzi kontrolę markerów recenzenta planu, a każda inna nowa pisownia tej wartości nadal ją oblewa.
3. Trzy stany Review udokumentowane - Szablon planu superplan, reguły siły dispatchu w kontrakcie recenzji, `superdev/README.md` i root `CLAUDE.md` opisują te same trzy stany markera `Review:`: brak, `<model> <effort>`, `none`.
4. Kind wymagany - Zadanie planu bez markera `Kind:` albo z wartością spoza `code | scaffold | text` oblewa recenzję planu jako brakujący lub nieprawidłowy marker, na obu torach.
5. Kind zgodny z dowodem - Zadanie `text`, którego `### Task Checks` nazywa plik testowy, oraz zadanie `scaffold` z `TDD: required` oblewają recenzję planu ze znaleziskiem nazywającym niezgodność rodzaju z dowodem.
6. Kind daje domyślną siłę - Zadanie `scaffold` lub `text` niesie `Model: sonnet` oraz, na torze Super, `Review: none`, chyba że jego `### Approach` podaje powód wyższej siły.
7. Zadanie text w jednym przejściu - Implementor zadania `text` czyta wyłącznie pliki z `### Files` i pliki nazwane w `### Approach`, nie pisze żadnej sondy ani testu, nie szuka precedensów w innych plikach repo i zapisuje plik notatek z sekcją `## Runs` i liniami odchyleń, tak jak zadanie każdego innego rodzaju.
8. Zadanie scaffold przez narzędzie - Implementor zadania `scaffold` wytwarza generowane wyjście uruchomieniem nazwanego generatora lub narzędzia i edytuje to wyjście tylko tam, gdzie nazywa to `### Approach`.
9. Effort nie jest przekazywany - Żaden dispatch wykonywany przez superbuild ani simplebuild nie niesie parametru `effort`, a każde zdarzenie `stats` ma `-` w kolumnie effort.
10. Effort opisany jako frontmatter - Kontrakt recenzji, `superdev/README.md` i root `CLAUDE.md` stwierdzają, że narzędzie `Agent` nie przyjmuje `effort` i że decyduje frontmatter agenta, a reguły siły obu planistów nie kierują żadnej decyzji przez `Effort:`.
11. Zmiana droga do cofnięcia kieruje na recenzenta - Reguła planisty dla zmiany drogiej do cofnięcia przypisuje `Model: opus` i `Review: opus high`, nie poziom effortu.
12. Jedna postać wywołania - Każde runtime wywołanie bundlowanego skryptu zapisane w superbuild, simplebuild, `e2e`, `vibe` i trzech recenzentach budowy jest pojedynczym bezpośrednim wywołaniem ścieżki skryptu z argumentami (dla `run.sh` z heredokiem na stdin, jak dziś): bez prefiksu `bash`, bez przypisania zmiennej, bez `cd` i bez `;`.
13. Wzorzec na skrypt - Każdy z tych skilli deklaruje jeden wzorzec pre-approval na każdy skrypt, który uruchamia w runtime, a każdy tak uruchamiany skrypt jest wykonywalny w indeksie git i ma shebang bash.
14. Niezmiennik obejmuje runtime - Niezmiennik pre-approval w root `CLAUDE.md` obejmuje wywołania runtime tak samo jak preloady.
15. Scalenie po zgodzie - Setup pyta raz przed dotknięciem `.claude/settings.json`; po zgodzie plik zawiera każdy wpis `allow` i `deny` z szablonu dokładnie raz, własne wpisy i pozostałe klucze hosta bez zmian, `defaultMode: acceptEdits` ustawiony tylko gdy go brakowało, a inny istniejący tryb jest zgłoszony zamiast nadpisany; po odmowie plik pozostaje nietknięty, setup zgłasza jedną linię o pominięciu i kończy pozostałe kroki jak dotąd.
16. Scalenie idempotentne i bezpieczne - Drugie uruchomienie scalenia daje plik identyczny z pierwszym, brak pliku kończy się utworzeniem go z szablonu, a plik niebędący poprawnym JSON zostaje nietknięty ze zgłoszonym błędem.
17. Brak node zgłoszony - Bez `node` na PATH setup pomija scalenie jedną zgłoszoną linią zawierającą rekomendowany blok do ręcznego scalenia, a pozostałe kroki setup kończą się jak dotąd.

## Constraints / assumptions
- Budowa rusza dopiero po zamknięciu sesji, która teraz buduje przebieg `2026-09-17-vibe-track` w tym samym drzewie roboczym.
- Szablon uprawnień setup powstaje z obecnego `.claude/settings.json` tego repo bez kluczy specyficznych dla hosta (`modelOverrides`, `additionalDirectories`, `disableWorkflows`, `disableRemoteControl`): lista `allow` z narzędziami i `Bash`, lista `deny` z operacjami destrukcyjnymi, `defaultMode: acceptEdits`.
- Scalanie zachowuje kolejność wpisów hosta i dopisuje brakujące na końcu list; zapis jest atomowy.
- Wzorce pre-approval używają `${CLAUDE_PLUGIN_ROOT}` rozwijanego przy ładowaniu, nigdy ścieżki cache wtyczki z numerem wersji.
- Rodzaj zadania jest rozstrzygany z `### Task Checks` według jednej tabeli: linia z plikiem testowym to `code`; `none - manual verification: <co obejrzeć>` oraz `none - covered by gate <Build|Tests|Integration>` to `code`; komenda narzędzia bez pliku testowego (build, install, validate, generator, `ls` katalogu lub `grep` po ścieżkach i nazwach plików, na przykład `ls src/generated` albo `grep -c '^superdev/' .gitattributes`) to `scaffold`; każde inne `none - <reason>` lub sam `grep`, którego wzorzec dotyczy treści plików (także z `-l`), to `text`.
- `Kind:` nie jest kolumną indeksu `decompose.sh`; marker dociera do implementora w pliku zadania. Obowiązuje w superplan i simpleplan; szablon simpleplan nie ma `Review:`, więc tam `Kind:` steruje tylko `Model:`.
- Domyślna siła z `Kind:` (kryterium 6) jest regułą planisty i jego self-review; recenzent planu blokuje tylko brak, nieprawidłową wartość i niezgodność z dowodem (kryteria 4 i 5), a zbyt niską lub zbyt wysoką siłę zgłasza doradczo, jak dziś.
- `### Approach` zadania każdego rodzaju dalej opisuje wynik, nie treść; swoboda implementora pozostaje.
- Marker `Effort:` oraz token `<effort>` w `Review: <model> <effort>` zostają w szablonach, `decompose.sh` i B6 jako sygnał planisty na przyszłość; dokumentacja z kryterium 10 obejmuje oba.
- Komentarz w `tests/superdev/commit-task.test.ts` zakładający tryb `100644` skryptu jest zaktualizowany razem ze zmianą bitu.
- Zależność od `node` dotyczy wyłącznie własnego skryptu setup, stoi za fallbackiem skip-with-note i jest nazwana w `superdev/CLAUDE.md`; plugin pozostaje stack-agnostic.
- Samodokumentacja repo: każda zmiana kontraktu, markera i wywołań jest odzwierciedlona w `superdev/README.md`, root `CLAUDE.md` i `superdev/CLAUDE.md` w tej samej zmianie.
