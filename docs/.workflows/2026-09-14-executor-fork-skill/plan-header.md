Title: "Uniwersalny fork skill executor w superdev"
Intent: docs/.workflows/2026-09-14-executor-fork-skill/intent.md


## Goal
Plugin `superdev` ma nowy fork skill `executor` (`superdev/skills/executor/`, `context: fork`, `model: haiku`), który dostaje blok etykiet `command:` / `expect:` / `cwd:` / `timeout:`, uruchamia jedną komendę przez własny deterministyczny skrypt `scripts/run.sh` z pełnym wyjściem przekierowanym do `.temp/superdev/logs/<timestamp>-<slug>-<pid>.log`, i zwraca krótki raport (`VERDICT:`, `EXPECT:`, `SUMMARY:`, `FAILURES:`, `LOG:`) o maksymalnie 40 liniach. Oba agenty implementujące taski uruchamiają build, testy, lint i type-check wyłącznie przez ten skill; surowy `Bash` zostaje im dla `git` i podglądu plików. Skill jest wpisany w `plugin.json`, w tabeli skilli `superdev/README.md` i wspomniany w root `CLAUDE.md`.

## Context
Dziś oba implementory (`superdev/agents/superbuild-task-implementor.md`, `superdev/agents/simplebuild-task-implementor.md`) wołają `Bash` bezpośrednio w kroku Build + Test, więc każdy pełny log builda i testów ląduje w ich kontekście; przy cyklach TDD (VERIFY RED / VERIFY GREEN, do 5 rund poprawek) to kilkanaście logów na task. Dawny `superbuild-runner` (fork na haiku) rozwiązywał to, ale został usunięty w commicie `70ddabe` razem z mechanizmem `recipe.sh`. Subagent nie może dispatchować kolejnego subagenta, więc executor musi być forkiem wołanym przez `Skill`. Zgodnie z zasadą "script vs. fork" z root `CLAUDE.md` uruchomienie komendy, timeout i zapis logu to praca dla skryptu, a interpretacja heterogenicznego wyjścia zostaje w forku na haiku. Frontmatter i wpisy naśladują istniejące forki (`simplebuild-reviewer`, `supergh:cli-executor`); względem intentu doprecyzowano tylko narzędzia: `Grep` dołącza do `allowed-tools` (przeszukiwanie długiego logu), a `Skill` do `disallowed-tools` (fork nie dispatchuje niczego).

## Out of scope
- Skill `tdd` pozostaje nietknięty.
- Mechanizm `recipe.sh` i jego `verify` nie wraca.
- Reviewery build i planowania oraz orchestratory `superbuild` / `simplebuild` bez zmian.
- Werdykt `BLOCKED` i klasyfikacja zakresu (`Scope hints:`).
- Sprawdzanie, czy fork wołany z wnętrza subagenta forkuje kontekst.

## Acceptance criteria
1. `superdev/skills/executor/scripts/run.sh` czyta ze stdin blok `label: value` (`command:` wymagane, `cwd:` i `timeout:` opcjonalne), uruchamia `command` przez `bash -c` w `cwd`, zapisuje cały stdout i stderr do `<repo-root>/.temp/superdev/logs/<UTC timestamp>-<slug>-<pid>.log` (tworząc katalog), a na stdout wypisuje dokładnie linie `STATUS:`, `EXIT:`, `DURATION:`, `LOG:`, `LINES:` (plus `REASON:` tylko przy `STATUS: error`), z kodem wyjścia 0 dla `ok` / `timeout` i 2 dla `error`.
2. `run.sh` kończy komendę po `timeout` sekundach (domyślnie 600) z `STATUS: timeout`; brak `command:`, nieistniejący `cwd:`, `timeout:` niebędący dodatnią liczbą całkowitą oraz kod wyjścia 126 lub 127 dają `STATUS: error` z jednolinijkowym `REASON:`.
3. Testy `tests/superdev/executor-run.test.ts` pokrywają kryteria 1 i 2 i przechodzą razem z `tests/portability.test.ts` (shebang, brak CRLF, bit `100755` w indeksie gita).
4. `superdev/skills/executor/SKILL.md` istnieje z frontmatter `name: executor`, opisem pod CSO, `context: fork`, `background: false`, `model: haiku` (bez `effort:`), `allowed-tools: Read, Grep, Bash(${CLAUDE_PLUGIN_ROOT}/skills/executor/scripts/run.sh:*)`, `disallowed-tools: Edit, Write, NotebookEdit, Agent, AskUserQuestion, WebFetch, WebSearch, Skill`, i treścią definiującą kontrakt wejścia (`command:`, `expect:`, `cwd:`, `timeout:`), żelazną zasadę "uruchom i zaraportuj, nigdy nie naprawiaj", sposób pracy (heredoc do `run.sh`, odczyt logu) i format wyjścia (`VERDICT: PASS | FAIL | ERROR | TIMEOUT`, `EXPECT:`, `SUMMARY:`, `FAILURES:`, `LOG:`, maksymalnie 40 linii).
5. `superdev/.claude-plugin/plugin.json` `skills[]` zawiera `./skills/executor/`, `superdev/README.md` ma wiersz `executor` w tabeli "Entry and environment", a root `CLAUDE.md` wymienia `.temp/superdev/logs/` przy `.temp/<plugin>/` i executor w opisie `superdev`.
6. Oba implementory w kroku Build + Test uruchamiają każdą komendę przez `superdev:executor` (Skill tool, jedna komenda na wywołanie, `command:` dosłownie plus `expect:`), z zakazem builda, testów, lintu, type-checku i formatera przez surowy `Bash`, przy niezmienionej pętli poprawek (build najpierw, potem testy, do 5 rund); wpis o TDD kieruje VERIFY RED / VERIFY GREEN tą samą drogą.
7. Żaden nowy ani zmieniony plik nie zawiera myślnika em (U+2014) ani en (U+2013).

