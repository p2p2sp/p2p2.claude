
## Task 12 - Add the settings template and the deterministic merge script
- TDD: none
- Model: opus
- Effort: high
- Covers: `Scalenie po zgodzie` (#15), `Scalenie idempotentne i bezpieczne` (#16), `Brak node zgłoszony` (#17)

### Dependencies
- none

### Files
- add - superdev/skills/setup/assets/settings.json (szablon uprawnień)
- add - superdev/skills/setup/scripts/merge-settings.sh (skrypt scalający, `100755`, `#!/usr/bin/env bash`)
- add - tests/superdev/merge-settings.test.ts (suita)

### Task Checks
- tests/superdev/merge-settings.test.ts - node --test tests/superdev/merge-settings.test.ts
- git ls-files -s superdev/skills/setup/scripts/merge-settings.sh | grep -c '^100755'

### Approach
1. `assets/settings.json`: obiekt z `$schema` (`https://json.schemastore.org/claude-code-settings.json`) i `permissions` = { `defaultMode`: `acceptEdits`, `allow`: lista `allow` skopiowana z `.claude/settings.json` tego repo w jego bieżącej postaci (34 wbudowane narzędzia: `Read`, `Glob`, `Grep`, `Edit`, `Write`, `NotebookEdit`, `Skill`, `Agent`, `Task`, `TaskCreate`, `TaskUpdate`, `TaskGet`, `TaskList`, `TaskStop`, `TaskOutput`, `TodoWrite`, `AskUserQuestion`, `ExitPlanMode`, `EnterPlanMode`, `Bash`, `BashOutput`, `KillShell`, `ToolSearch`, `WebSearch`, `WebFetch`, `LSP`, `Monitor`, `SendMessage`, `ListAgents`, `EnterWorktree`, `ExitWorktree`, `ListMcpResourcesTool`, `ReadMcpResourceTool`, `ReadMcpResourceDirTool`) bez wpisu `mcp__plugin_microsoft-docs_microsoft-learn`, bo to serwer MCP tego hosta, nie narzędzie wbudowane; `ask`: [], `deny`: lista `deny` skopiowana z tego samego pliku w całości (`rm -rf`, `sudo`, `dd`, `mkfs`, destrukcyjne `git`, `gh`, publish, chmury, odczyt sekretów, edycja `.git/`) }. Żadnych kluczy hosta (`modelOverrides`, `additionalDirectories`, `disableWorkflows`, `disableRemoteControl`) i żadnego wpisu `mcp__*`.
2. `merge-settings.sh <template> [<target>]` (target domyślnie `.claude/settings.json` względem cwd): nagłówek w kształcie repo (Usage / Parameters / Output / Exit codes); `command -v node` -> brak: wypisz `settings.json: node not found - merge skipped, recommended block:` i treść szablonu, exit 0; target nie istnieje: `mkdir -p` katalogu, kopia szablonu, `settings.json: created from template`; target istnieje: `node - "$template" "$target" <<'NODE' … NODE` z programem: `JSON.parse` obu plików; `permissions` tworzone gdy brak; `allow` i `deny` = kolejność hosta plus brakujące wpisy szablonu dopisane na końcu, bez duplikatów; `defaultMode` ustawiony gdy brak, inny istniejący -> zgłoszony; inne klucze nietknięte; wynik `JSON.stringify(obj, null, 2) + "\n"` zapisany do `<target>.tmp` i `fs.renameSync` na target; brak zmian -> `settings.json: already up to date` bez zapisu.
3. Linie wyjścia: `settings.json: merged - added <n> allow, <m> deny, defaultMode set` / `... defaultMode already <x> (left untouched)` / `settings.json: already up to date` / `settings.json: created from template` / `settings.json: not valid JSON - left untouched (<message>)`.
4. Test w kształcie `tests/superdev/bootstrap.test.ts` (`runScript` z `../harness/run.ts`, `withTempDir`, `coreUtilsPath` dla przypadku bez `node`, `SUT` przez `path.resolve(import.meta.dirname, …)`): brak pliku -> utworzony i równy szablonowi; częściowe pokrycie -> tylko brakujące dopisane na końcu, kolejność hosta zachowana, inne klucze bez zmian; `defaultMode` brak -> ustawiony; `defaultMode: plan` -> zostaje, linia raportu; drugi bieg -> bajtowo identyczny plik i `already up to date`; niepoprawny JSON -> plik bajtowo nietknięty, linia błędu, exit 2; PATH bez `node` -> linia skip z blokiem, plik nietknięty, exit 0; brak szablonu -> linia i exit 1; `permissions.allow` nie jest tablicą -> zastąpione tablicą scaloną, linia jak przy merge.
5. `chmod +x` i `git update-index --add --chmod=+x superdev/skills/setup/scripts/merge-settings.sh` na nowym skrypcie: `--add`, bo plik jest jeszcze nieśledzony i samo `--chmod=+x` (postać z `Give the three runtime-invoked scripts the exec bit` (Task 1)) odmawia dla ścieżki spoza indeksu; `commit-task.sh` stage'uje potem ten sam wpis z zachowanym trybem.

### Failure modes
- when the target is not valid JSON (also JSON with comments) -> response plik nietknięty, linia `settings.json: not valid JSON - left untouched (<message>)`, exit 2, log ta linia na stdout, test przypadek "niepoprawny JSON" w `merge-settings.test.ts`
- when `node` is absent from PATH -> response linia `settings.json: node not found - merge skipped, recommended block:` plus treść szablonu, exit 0, log ta linia, test przypadek "PATH bez node"
- when the template file is missing or unreadable -> response linia `settings.json: template missing at <path> - skipped`, exit 1, log ta linia, test przypadek "brak szablonu"
- when `permissions.allow` or `permissions.deny` in the target is not an array -> response traktuj jako pustą tablicę i nadpisz tablicą scaloną, linia raportu jak przy merge, test przypadek "allow nie jest tablicą"
- when the rename of `<target>.tmp` fails -> response plik docelowy nietknięty (tmp zostaje), linia `settings.json: write failed (<message>)`, exit 2, log ta linia, test none - filesystem

### Contracts
- `merge-settings.sh <template> [<target>]`: exit 0 = scalone / aktualne / utworzone / pominięte bez node; 1 = brak szablonu lub błędny argument; 2 = target niepoprawny lub zapis nieudany; stdout dokładnie jedna linia `settings.json: …` (plus blok szablonu w przypadku skip) - consumed by `Add the setup permissions step` (Task 13)
- Szablon `assets/settings.json` jest jedynym źródłem rekomendowanych list `allow` / `deny` i `defaultMode` - consumed by `Add the setup permissions step` (Task 13)

### DoD
Suita `merge-settings.test.ts` zielona we wszystkich przypadkach z kroku 4, skrypt ma `100755`, szablon zawiera listy z kroku 1.


### Covered criteria
15. Scalenie po zgodzie - Setup pyta raz przed dotknięciem `.claude/settings.json`; po zgodzie plik zawiera każdy wpis `allow` i `deny` z szablonu dokładnie raz, własne wpisy i pozostałe klucze hosta bez zmian, `defaultMode: acceptEdits` ustawiony tylko gdy go brakowało, a inny istniejący tryb jest zgłoszony zamiast nadpisany; po odmowie plik pozostaje nietknięty, setup zgłasza jedną linię o pominięciu i kończy pozostałe kroki jak dotąd.
16. Scalenie idempotentne i bezpieczne - Drugie uruchomienie scalenia daje plik identyczny z pierwszym, brak pliku kończy się utworzeniem go z szablonu, a plik niebędący poprawnym JSON zostaje nietknięty ze zgłoszonym błędem.
17. Brak node zgłoszony - Bez `node` na PATH setup pomija scalenie jedną zgłoszoną linią zawierającą rekomendowany blok do ręcznego scalenia, a pozostałe kroki setup kończą się jak dotąd.
