# Intent: Uniwersalny fork skill executor w superdev
Date: 2026-09-14

## Request
Nowy fork skill w pluginie `superdev`, uniwersalny "executor": dostaje polecenie wykonania jednej komendy (build pełny, testy pełne lub filtrowane, lint, dowolna inna komenda) i zwraca tylko zwięzły wynik tego, co się stało, tak aby pełny log narzędzia nigdy nie trafiał do kontekstu wywołującego. Wywołują go oba agenty implementujące taski w kroku Build + Test; dziś uruchamiają komendy same przez surowy `Bash` i każdy log ląduje w ich kontekście, co przy cyklach TDD (VERIFY RED / VERIFY GREEN, do 5 rund poprawek) zjada kontekst agenta. Precedens: usunięty w commicie `70ddabe` fork `superbuild-runner` na haiku.

## Decisions
### 1. Jak executor jest wywoływany?
Opis `description:` napisany pod routing CSO (skill pozostaje model-invocable, więc główna sesja i każdy agent ze `Skill` w `tools:` mogą go złapać sami) plus twarda reguła w treści obu implementorów: build, testy, lint, type-check nigdy przez surowy `Bash`, zawsze przez `superdev:executor` (Skill tool); surowy `Bash` zostaje dla `git` i podglądu plików.

### 2. Co dokładnie dostaje executor na wejściu?
Blok etykietowanych linii w argumencie: `command:` (wymagane, dosłowna linia shellowa, jedna komenda na wywołanie; build i testy to dwa wywołania), opcjonalne `expect:` (jedno zdanie, czego wywołujący oczekuje, np. "zielono", "test X pada z braku zachowania"), `cwd:`, `timeout:`. Brak `command:` daje `VERDICT: ERROR`, nigdy pytanie.

### 3. Format wyjścia i los pełnego logu?
Krótki raport inline z twardym limitem linii: `VERDICT: PASS | FAIL | ERROR | TIMEOUT` z kodem wyjścia i czasem, `EXPECT: met | not met - <dlaczego>` gdy podano `expect:`, linia zbiorcza narzędzia dosłownie (np. `42 passed, 3 failed`, `build succeeded`), per porażka nazwa testu lub celu, jednolinijkowy komunikat dosłownie i pierwsza ramka stosu, na końcu `LOG: <ścieżka>`. Pełne wyjście komendy jest przekierowane do `.temp/superdev/logs/<timestamp>-<slug>.log`; executor czyta ten plik sam, a wywołujący sięga do niego przez `Read` z offsetem tylko, gdy raport nie wystarcza.

### 4. Model executora?
`model: haiku`, bez klucza `effort:` (haiku go nie przyjmuje).

### 5. Czy zachować dawny werdykt `BLOCKED` i klasyfikację zakresu?
Nie. Cztery werdykty: `PASS / FAIL / ERROR / TIMEOUT`, bez `Scope hints:`. `ERROR` to komenda, która nie mogła się wykonać (brak narzędzia, brak katalogu, brak `command:`), `TIMEOUT` to przekroczenie `timeout:`; oba są nieretryowalne dla wywołującego. Ocena, czy padnięty test należy do taska, zostaje po stronie implementora (cudza porażka trafia do notatek jako `CARRY:`, jak dziś).

## Constraints
- Skill w `superdev/skills/executor/`: `context: fork`, `background: false`, `allowed-tools: Read, Bash`, `disallowed-tools: Edit, Write, NotebookEdit, Agent, AskUserQuestion, WebFetch, WebSearch`; w treści żelazna zasada z dawnego runnera: uruchom i zaraportuj, nigdy nie naprawiaj, jedna komenda na wywołanie, żadnego ponownego uruchamiania "dla pewności", żadnych mutacji drzewa przez `Bash` (`sed -i`, przekierowania do śledzonych plików, `git checkout/reset/stash`, flagi `--fix`/`--write`).
- Komendy pochodzą z `Test Commands` taska lub bezpośrednio od wywołującego; executor nigdy nie wymyśla komendy sam ani nie szuka jej w `CLAUDE.md`.
- Frontmatter i wpisy zgodne z konwencją istniejących forków `superdev` (wzorce: reviewery planowania dla `disallowed-tools`, `supergh:cli-executor` dla stylu "jedna operacja, krótki wynik").
- Pętla poprawek implementorów (build najpierw, potem testy, do 5 rund, `VERDICT: FAIL` po piątej) pozostaje bez zmian; zmienia się tylko sposób uruchamiania komend.
- Zapis pod `.temp/` jest jedynym dozwolonym efektem ubocznym executora; `.temp/` jest nieśledzone.
- Samodokumentacja: `superdev/.claude-plugin/plugin.json` `skills[]`, wiersz w tabeli skilli `superdev/README.md` (format "Fork - ..."), wzmianka o `.temp/superdev/logs/` w root `CLAUDE.md` przy opisie `.temp/<plugin>/`.
- Bez myślników em i en w treści plików.

## Out of scope
- Skill `tdd`: pozostaje nietknięty (uczy cyklu, nie uruchamia komend).
- Mechanizm `recipe.sh` i jego `verify`: nie wraca.
- Reviewery build i planowania oraz orchestratory `superbuild` / `simplebuild`: bez zmian.
- Wariant executora jako agent dispatchowany przez `Agent`: subagent nie może uruchomić kolejnego subagenta.
- Sprawdzanie, czy fork wywołany z wnętrza subagenta faktycznie forkuje kontekst: użytkownik potwierdził, że ten przypadek działał wcześniej.

## History
- none (repo nie ma `docs/changelog/` ani `docs/adr/`; commit `70ddabe` usunął dawny runner jako część uproszczenia pipeline'u, bez zapisanego uzasadnienia)
