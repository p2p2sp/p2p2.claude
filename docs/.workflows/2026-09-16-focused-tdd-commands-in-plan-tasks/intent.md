# Intent: Zawężone komendy TDD w zadaniach planu
Date: 2026-09-16

## Request
superdev nie różnicuje uruchomienia jednego testu od uruchomienia pełnego zestawu. Komenda uruchamiająca wybiórczo test, który właśnie jest pisany w zadaniu, powinna być zawarta w treści zadania w planie. Uruchamianie pełnego zestawu testów w cyklu TDD to niepotrzebnie zużyty czas i zasoby.

## Decisions
### 1. Jaką postać ma mieć zawężona komenda w zadaniu planu?
Jedna konkretna komenda per plik testowy, uruchamialna dosłownie, np. `npx vitest run tests/cart.test.ts`. Planista zna ścieżkę pliku z `### Files` i weryfikuje komendę wobec realnego toolingu repo tak samo, jak weryfikuje `### Test Commands`.

### 2. Jak zapisać komendę, gdy zadanie pisze testy w więcej niż jednym pliku?
Jedna linia na plik testowy, z jawnym odwzorowaniem `<ścieżka> - <komenda>`, gdzie ścieżka jest jednym z plików zadeklarowanych w `### Files` tego zadania. Implementor wybiera linię po pliku, do którego właśnie dopisuje test.

### 3. Które kroki cyklu używają zawężonej komendy, a gdzie wraca pełny zestaw?
RED i GREEN idą na zawężonej komendzie, przez ten sam `<runner>` co komenda bramkowa: RED z `expect-exit: nonzero`, GREEN z `expect-exit: 0`. Pełny zestaw nie wraca do cyklu, bo istniejący krok "Build + Test" implementora puszcza wszystkie `### Test Commands` na końcu zadania.

### 4. Co zrobić z brzmieniem VERIFY GREEN w `superdev/skills/tdd/SKILL.md`?
Poprawić samo brzmienie sekcji `### VERIFY GREEN`: celem cyklu jest zielony plik testowy objęty tym cyklem, a pełny przebieg bez regresji jest obiecany na koniec zadania. Bez dokładania wiring, czyli bez `run.sh`, bez `executor` i bez `expect-exit`.

### 5. Na których zadaniach sekcja jest obowiązkowa?
Wyłącznie na zadaniach `TDD: required`. Obecność sekcji na zadaniu `TDD: none` jest naruszeniem.

### 6. Gdzie umieścić sekcję i jak ją nazwać?
Osobna sekcja `### TDD Commands` w zadaniu planu, tuż za `### Test Commands`, przed `### Approach`.

### 7. Jak ocenić powód upadku RED bez forka w każdym cyklu?
Implementor czyta linię `TAIL:` z bloku wypisanego przez `run.sh` i dispatchuje `superdev:executor` tylko wtedy, gdy ta linia nie pokazuje testu, który się wykonał i padł: brak linii zbiorczej, błąd kompilacji lub transformacji, "no tests found", albo brak linii `TAIL:`. W razie wątpliwości forkuje.

## Constraints
- Runnery testowe w projektach docelowych praktycznie zawsze potrafią zawęzić uruchomienie do pojedynczego pliku; gdy nie potrafią, planista wpisuje najwęższy zakres, jaki faktycznie istnieje.
- Zadanie `TDD: required` dotyka zwykle jednego pliku testowego.
- `tdd` jest wyłącznie wiedzą używaną przez implementorów. Kontrakt wykonania cyklu zostaje tam, gdzie jest dziś: `superdev/agents/superbuild-task-implementor.md:34` i `superdev/agents/simplebuild-task-implementor.md:32`.
- `superdev:executor` forkuje się tylko wtedy, gdy wynik odbiega od oczekiwanego; częste forkowanie znacząco wydłuża czas implementacji.
- Zmiana jest wyłącznie tekstowa. Żaden skrypt nie parsuje sekcji zadania: `superdev/scripts/decompose.sh:355` kopiuje ciało zadania bajt w bajt.
- Nazwa nowej sekcji nie może zaczynać się od `### Files`, bo `superdev/scripts/commit-task.sh:201` dopasowuje ten nagłówek prefiksowo.
- Zmiana obejmuje oba tory: `superplan` i `simpleplan`, oba szablony planu i oba implementory.
- Kanoniczne wyliczenia sekcji zadania wymagają uzupełnienia o nową sekcję: `superdev/references/plan-review-checklist.md:8-9` oraz `superdev/references/review-contract.md:14-17`. W sekcji `## Gates` kontraktu dochodzi jedno zdanie, że `### TDD Commands` nie jest bramą.
- Reguła obecności sekcji trafia do walidacji markerów zadania w `superdev/references/plan-review-checklist.md`, a weryfikacja samych komend wobec toolingu do reguły o niezgodności komend build/test.
- Linie self-review planistów, `superdev/skills/superplan/SKILL.md:82` i `superdev/skills/simpleplan/SKILL.md:85`, obejmują także nową sekcję.

## Out of scope
- `superdev/references/adr-task.md` - to gotowe zadanie jest `TDD: none`.
- `superdev/agents/superbuild-task-reviewer.md` - nie uruchamia komend bramkowych.
- `superdev/skills/executor/scripts/run.sh` oraz skill `superdev:executor` - bez zmian.
- Doradcza reguła mówiąca, że trzy pliki testowe w jednym zadaniu to sygnał zbyt dużego zadania.

## History
- none
