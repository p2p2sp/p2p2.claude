# Intent: Gate'y build reviewerów przez executor
Date: 2026-09-16

## Request
Trzy build reviewery superdev (`superbuild-reviewer-spec`, `superbuild-reviewer-change`, `simplebuild-reviewer`) uruchamiają dziś komendy gate'ów przez surowy `Bash`, więc pełny output builda i suite'ów ląduje w ich kontekście, zanim w ogóle zaczną czytać kod. Trasa ma przejść przez `superdev:executor`, który zwraca krótki werdykt zamiast zrzutu logu, tak żeby główny agent wołający executor nie dostawał masy logów z przebiegów testów i builda.

## Decisions
### 1. Czym reviewerzy uruchamiają komendy gate'ów?
Przez `superdev:executor` narzędziem `Skill`. Twardy limit 40 linii na komendę, wymuszony kontraktem executora, zastępuje dzisiejszy zrzut pełnego outputu.

### 2. Czy gate'y deduplikują komendy przed uruchomieniem?
Tak, po dokładnym ciągu komendy: ten sam string uruchamiany jest raz. Dopasowanie jest mechaniczne, bez interpretacji, więc `npm test` i `npm test -- cart.test.ts` zostają obie. Sekcja `## Gates` raportu dostaje jedną linię na odrębną komendę wraz z listą tasków, które ją deklarowały.

### 3. Czy executor dostaje pole o pominiętych testach?
Nie. Reviewer czyta linię `SUMMARY:`, przenoszoną przez executor verbatim, i schodzi do `LOG:` wtedy, gdy pominięcia są niezerowe, a dowód dla kryterium zależy od przebiegu.

### 4. Jak werdykty executora mapują się na wynik gate'a?
`PASS` to gate zielony, `FAIL` to gate czerwony z findingami jak dotąd, a `ERROR` i `TIMEOUT` to brak dowodu: `VERDICT: BLOCKED` z bulletem w `### Needs decision`, nigdy PASS i nigdy finding przeciwko kodowi. Gate'y podają jawny hojny `timeout:`.

### 5. Gdzie mieszka reguła transportu?
Pełna reguła ląduje w `## Gates` pliku `superdev/references/review-contract.md` jako jedyne źródło, a ciało każdego z trzech reviewerów dostaje jedno zdanie zakazujące surowego `Bash` dla buildów, testów, lintów i type-checków, lustrzane wobec zdania, które mają dziś implementorzy.

## Constraints
- `superdev/skills/executor/SKILL.md` i jego `scripts/run.sh` zostają nietknięte, żeby obaj implementorzy nie mogli się popsuć.
- Skill z `context: fork` potrafi wywołać przez narzędzie `Skill` inny skill z `context: fork`; repo nie ma na to precedensu, potwierdzenie pochodzi z praktyki użytkownika.
- `Skill` musi trafić do `allowed-tools` wszystkich trzech reviewerów, bo `allowed-tools` jest pre-approvalem uprawnień, a nie restrykcją: bez wpisu wywołanie zapyta użytkownika i zatrzyma bieg.
- Reviewerzy zachowują bare `Bash`. Trzymają na nim siedem preloadów pipeline'owych (`printf | tr | sed | head`), których wzorzec `Bash()` nie pokrywa, oraz `git diff <since>..HEAD`, którego pełną treść czytają jako materiał do oceny.
- `superdev/references/review-contract.md` jest jedynym właścicielem słownika gate'ów, kształtu raportu i reguł werdyktu.
- Trzy reviewery są dziś w ok. 49 procentach byte-identyczne, a ich linia 37 (krok gate'ów) jest byte-identyczna w `superbuild-reviewer-change` i `simplebuild-reviewer`.
- Inwariant samodokumentacji repo: zmiana dotyka opisu w root `CLAUDE.md` oraz wiersza o executorze w `superdev/README.md`, który mówi dziś, że trasę mają wyłącznie obaj implementorzy.

## Out of scope
- `superdev/agents/superbuild-task-reviewer.md` - agent nie odpala gate'ów, jego jedyny `Bash` to `git status --short`.
- Przenoszenie `run.sh` z `superdev/skills/executor/scripts/` do `superdev/scripts/`.
- Jakakolwiek zmiana w `superdev/agents/superbuild-task-implementor.md` i `superdev/agents/simplebuild-task-implementor.md`.
- Konwersja trzech build reviewerów z forków w `skills[]` na agentów.
- Odczyt `git diff <since>..HEAD` przez reviewerów - zostaje na surowym `Bash`.

## History
- none
