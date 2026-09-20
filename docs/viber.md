# viber: analiza spójności skills i agents (od pomysłu do implementacji)

Zakres przeglądu: 6 skilli, 6 agentów, 4 skrypty pluginowe, 2 skrypty setupu, 2 hooki,
template planu, manifest, README i węzeł pamięci.

## Co trzyma się dobrze

- Kontrakty `implementor` <-> agenci są ścisłe. Etykiety `spec:` / `task:` / `report:` / `notes:`
  zgadzają się co do joty z sekcjami `## Input` u wszystkich czterech agentów (plus `reason:` u
  codera, przy ponownym dispatchu po FAIL).
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

NAPRAWIONE

### 3. `fixer` -> `planner` -> `implementor`: test reprodukcyjny nie ma właściciela

NAPRAWIONE

### 4. `commit-task.sh` stage'uje po pathspec, ale commituje cały index

NAPRAWIONE

## Średnie

### 5. `hooks/content/manifest.md` jest pusty

NAPRAWIONE

### 6. `viber/CLAUDE.md:36` mówi, że `fixer` to "the only CSO-routed skill here"

NAPRAWIONE

### 7. Naprawa po `test-runner` nie ma ścieżki dla pliku spoza mapy zadań

NAPRAWIONE

### 8. `fixer` jest obcy względem reszty pluginu

NAPRAWIONE

## Drobne

### 9. `planner-review` deklaruje read-only, ale ma Bash

NAPRAWIONE

### 10. `test-runner` jako jedyny z szóstki nie ma `effort:`

NAPRAWIONE

### 11. Przy `adr: true` i wejściu z pominięciem `idea` przełącznik jest martwy

NAPRAWIONE

### 12. `VERDICT: FAIL` od codera: nie wiadomo, z czym retry

NAPRAWIONE
