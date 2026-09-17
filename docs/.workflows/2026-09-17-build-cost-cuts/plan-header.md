Title: "Cięcie kosztu budowy superdev - Review: none, oś Kind, jedna postać wywołań skryptów, uprawnienia w setup"
Spec: C:/Projects/p2p2.claude/docs/.workflows/2026-09-17-build-cost-cuts/spec.md
Intent: docs/.workflows/2026-09-17-build-cost-cuts/intent.md

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

