# viber: analiza spójności skills i agents (od pomysłu do implementacji)

Zakres przeglądu: 6 skilli, 6 agentów, 4 skrypty pluginowe, 2 skrypty setupu, 2 hooki,
template planu, manifest, README i węzeł pamięci.

## Co trzyma się dobrze

- Kontrakty `implementor` <-> agenci są ścisłe. Etykiety `spec:` / `task:` / `report:` / `notes:`
  zgadzają się co do joty z sekcjami `## Input` u wszystkich czterech agentów.
- `VERDICT:` jest wszędzie jedynym kanałem wyjściowym, a druga linia (`REVIEW:` / `REPORT:` /
  `FILES:`) jest konsumowana dokładnie tam, gdzie jest produkowana.
- Ścieżka naprawcza (coder bez `task:`, z samym `report:`) jest obsłużona po obu stronach.
- Glob `*-coder.md` u memory-writera i rules-writera łapie także `repair-<round>-coder.md`.
- Izolacja przez dekompozycję jest spójna od template'u przez `plan-index.sh --split` po
  `task-coder`.
- Walidacja kolizji plików w `plan-index.sh` domyka regułę równoległości, którą `planner`
  deklaruje tylko słownie, i której żaden agent nie musi sprawdzać ręcznie.

## Poważne

### 1. Skilla `tdd` jest sierotą, nikt w torze viber nie może jej wczytać

NAPRAWIONE

### 2. Luka w przekazaniu planu z `planner` do `implementor`

- `planner` pisze plan tam, gdzie każe plan mode (`.claude/plans/*.md`), i kończy zdaniem
  "the approval may clear this context" (`planner/SKILL.md:62`).
- `implementor` ma `disallowed-tools: Read`, a jego ścieżka 2 wymaga, żeby plan był w kontekście,
  bo musi go `Write` verbatim do `docs/_specs/`.
- Kontekst pada po zatwierdzeniu, a przed wylądowaniem planu: plan leży w `.claude/plans/`,
  implementor nie może go przeczytać, a ścieżka 3 (`plan-path.sh` bez argumentu) przeszukuje
  wyłącznie `docs/_specs/` i kończy exit 3. Ślepa uliczka w scenariuszu, który `planner` sam
  przewiduje.
- Ścieżka 1 jest gorsza: użytkownik poda argument, ale jedyna ścieżka, jaką widział, to ta z
  `.claude/plans/`. Wtedy krok 2 odpala `plan-index.sh <plan> --split`, który dla
  nie-`<dir>/plan.md` zwraca exit 2 (`plan-index.sh:74`), a `implementor/SKILL.md:41` każe to
  zinterpretować jako "the plan itself is broken ... repairing it belongs to the planner".
  Komunikat całkowicie mylący: plan jest poprawny, zła jest tylko lokalizacja.
- Łamie regułę repo "Script vs. fork": przeniesienie pliku z A do B na znanym formacie to robota
  dla skryptu (`plan-path.sh --land <src>`), nie dla modelu przepisującego treść z kontekstu.

### 3. `fixer` -> `planner` -> `implementor`: test reprodukcyjny nie ma właściciela

NAPRAWIONE

### 4. `commit-task.sh` stage'uje po pathspec, ale commituje cały index

- Linie 257 i 200: `git commit -m "$subject" -m "Refs: ..."` bez pathspec. Stage'owanie jest
  ograniczone do `Files:`, ale commit zabiera wszystko, co w indeksie.
- Forma `--chore` (linia 96) robi to poprawnie, z pathspec. Trzy formy jednego skryptu nie są ze
  sobą spójne.
- Scenariusz a: użytkownik miał coś zastage'owane przed startem builda. Implementor nigdy nie
  sprawdza `git status`, bo nie ma na to Bash, więc to wpada do commita T1 po cichu.
- Scenariusz b: exit 5 celowo zostawia pliki w indeksie ("the named files stay staged, so the
  call can be retried as is"), implementor pyta retry/skip/abort, i na "skip" następne zadanie
  zgarnia tamte pliki do swojego commita.
- Łamie nagłówek samego skryptu ("Neither form ever stages a path the caller did not name") i
  invariant z `viber/CLAUDE.md:82` o commitach zadań równoległych.
- Testy tego nie łapią: `tests/viber/commit-task.test.ts:161` tworzy plik poza mapą, ale go nie
  stage'uje, a test z linii 203 retry'uje to samo zadanie.
- Status weryfikacji: wniosek z lektury kodu. Eksperyment odpalający git w scratchpadzie został
  odrzucony na uprawnieniach, więc nie potwierdzony uruchomieniem.
- Fix: `git commit ... -- "${paths[@]}" "$plan"` w formie zadaniowej i `-- "$@"` w naprawczej.

## Średnie

### 5. `hooks/content/manifest.md` jest pusty

- Hook jest fail-open, więc wstrzykuje sam baner i nic więcej.
- `README.md:15` obiecuje wstrzykiwanie manifestu, a `viber/CLAUDE.md:126` opisuje jego treść
  ("It carries standing rules only") w czasie teraźniejszym.
- Do decyzji: napisać manifest albo usunąć go z dokumentacji do czasu, aż powstanie.

### 6. `viber/CLAUDE.md:36` mówi, że `fixer` to "the only CSO-routed skill here"

- Nieprawda: `planner`, `implementor` i `tdd` też nie mają `disable-model-invocation`, więc też
  są model-invocable.
- `README.md:41` mówi wprost coś przeciwnego: "planner and implementor are model-invocable".
  Węzeł pamięci i README się rozjeżdżają.

### 7. Naprawa po `test-runner` nie ma ścieżki dla pliku spoza mapy zadań

- `implementor/SKILL.md:95` zakłada, że `<id>` wynika z kolumny `files` w indeksie.
- Gdy padnie test, którego pliku nie ma w żadnym `Files:` (regresja w kodzie nietkniętym przez
  plan), mapowanie nie ma rozwiązania, a `--chore` nie pasuje, bo wyprowadza subject tylko z
  `CLAUDE.md` i `.claude/rules/`.

### 8. `fixer` jest obcy względem reszty pluginu

- H1 brzmi `# SimpleDebug`, nie `# fixer`: leftover po nazwie z rodziny superdev
  (`superdev/skills/CLAUDE.md:13` wymienia `simpledebug`).
- Jedyna skilla w viberze bez `allowed-tools`, mimo że pisze plik i uruchamia testy przez Bash,
  więc zbiera prompty uprawnień tam, gdzie reszta pluginu ma pre-approved.
- Odwołuje się do "`planner` (Skill)" bez prefiksu, podczas gdy `idea/SKILL.md:73` używa
  `viber:planner`, a implementor konsekwentnie prefiksuje wszystko.

## Drobne

### 9. `planner-review` deklaruje read-only, ale ma Bash

- Ciało mówi "Read-only: you change no files", frontmatter daje `tools: Read, Grep, Glob, Bash`.
- Reguła repo mówi, że agent read-only wymienia same czytniki (porównaj
  `superfix/agents/scout.md`). `tools:` nie przyjmuje wzorców, więc to pełny Bash.

### 10. `test-runner` jako jedyny z szóstki nie ma `effort:`

- Uzasadnienie (haiku nie ma kontroli effortu) jest sensowne, ale `task-coder` ma `effort: high`
  i też jeździ na haiku. Dwie konwencje na ten sam przypadek.

### 11. Przy `adr: true` i wejściu z pominięciem `idea` przełącznik jest martwy

- Kandydatów waży wyłącznie `idea`, a `planner` tworzy zadania ADR tylko gdy handover je nazywa.
- Ścieżka "plan it, straight from an understood change" z README oraz `fixer` -> `planner` nigdy
  nie wyprodukują ADR-a mimo włączonego przełącznika.

### 12. `VERDICT: FAIL` od codera: nie wiadomo, z czym retry

- Implementor pyta "retry / skip / abort", ale nie mówi, czy to ten sam prompt, czy plus
  `REASON:`, czy mocniejszy model. Przy FAIL od reviewera jest to opisane precyzyjnie.
