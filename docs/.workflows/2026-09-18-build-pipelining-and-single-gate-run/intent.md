# Intent: Pipelining review per task i jedno uruchomienie bramy na rundę
Date: 2026-09-18

## Request
Skrócić czas fazy build w superdev bez utraty jakości wyników, na podstawie pomiarów i listy
zaleceń z `docs/competitive-analysis-2026-09-17.md`. Z siedmiu rozważanych dźwigni do realizacji
wchodzą trzy: zdjęcie reviewera per task ze ścieżki krytycznej, warunkowy dispatch agenta
checkpointu przy zachowaniu bramy mechanicznej, oraz jedno uruchomienie zestawu bramy na rundę
zamiast jednego uruchomienia na recenzenta.

## Decisions
### 1. Co jest celem tej zmiany - liczba dispatchy czy czas bram?
Liczba dispatchy. W zakresie zostają pipelining reviewera per task, warunkowy agent checkpointu
i pojedyncze uruchomienie bramy na finale.

### 2. Jak zdjąć reviewera per task ze ścieżki krytycznej?
Orkiestrator commituje task N zaraz po `VERDICT: PASS` implementora, po czym wysyła dwa `Agent`
w jednej wiadomości: reviewera taska N z nową etykietą `commit: <sha>` (czyta `git diff
<sha>^..<sha>` zamiast drzewa roboczego) i implementora taska N+1. Wall pary to
`max(review, implementacja)`.

### 3. Czym bramkować nałożenie review na następny task?
Dwoma warunkami naraz, oba czytane mechanicznie z planu: `### Files` tasków N i N+1 są rozłączne
oraz `### Dependencies` taska N+1 nie wymienia taska N. Gdy którykolwiek warunek nie zachodzi,
pętla działa jak dziś: review taska N przed startem taska N+1.

### 4. Czy rozdzielić rodzaj zależności w `### Dependencies`?
Nie. Pole zostaje jedno i jest czytane zachowawczo: każdy wpis wskazujący task N blokuje
nałożenie, bez rozróżniania zależności kolejnościowej od zależności danych.

### 5. Kiedy domykać FAIL z nałożonego review?
Natychmiast po commicie taska N+1: fix do taska N jako osobny dispatch i osobny commit, potem
jego re-review. Budżet trzech rund review per task bez zmian.

### 6. Co dokładnie ma być warunkowe w checkpoincie?
Brama biegnie zawsze, agent warunkowo. Orkiestrator sam uruchamia `#### Build` i `#### Tests`
przez `run.sh`, a `superbuild-reviewer-change` jest dispatchowany tylko gdy zachodzi którykolwiek
warunek: któraś komenda zwróciła `RESULT: DEVIATION`, któryś task w oknie miał review FAIL lub
BLOCKED (w tym zaakceptowany po wyczerpaniu rund), albo któryś task w oknie miał `Review: none`.

### 7. Czy sufit wielkości taska zostaje w zakresie?
Nie. Wypada z tego zakresu i nie wchodzi do tego buildu.

### 8. Czy zmiana dotyka toru Simple?
Tak, w jednym punkcie: reguła `gates:` wchodzi do `review-contract.md` jako bezwarunkowa i do
`simplebuild-reviewer`. Pipelining i warunkowy dispatch checkpointu dotyczą wyłącznie toru Super.

## Constraints
- `docs/notes.md`: zmiana nie może wydłużyć fazy build; praca, której wynik nie jest potrzebny
  w następnym kroku, idzie w tle.
- Jednolita reguła bramy dla wszystkich trzech etapów (checkpoint, final, re-review): orkiestrator
  uruchamia zestaw `## Gate commands` danego etapu raz na rundę i podaje wynik etykietą `gates:`,
  żaden recenzent nie uruchamia zestawu sam.
- Orkiestrator nie pisze żadnego pliku (`superbuild/SKILL.md` ma `disallowed-tools: Edit, Write,
  NotebookEdit`), więc wynik bramy uruchomionej przez orkiestratora musi trafić na dysk przez
  skrypt bundlowany albo przez agenta.
- Każde wywołanie skryptu bundlowanego to jedna literalna linia z odpowiadającym jej wzorcem
  w `allowed-tools`; skrypt zachowuje bit `100755` i shebang `#!/usr/bin/env bash`.
- Trasa hybrydowa bramy zostaje: `run.sh` bezpośrednio na ścieżce zielonej, `superdev:executor`
  (haiku) dispatchowany tylko na `RESULT: DEVIATION` i czytający już zapisany log. Pomiar z
  `docs/.workflows/2026-09-16-hybrid-executor-a-deterministic-success-path-without-a-fork/`:
  mediana forka 14,7 s, z czego 10,2 s to czysty narzut.
- `run.sh` zwraca `RESULT` / `STATUS` / `EXIT` / `DURATION` / `LOG` / `LINES` / `TAIL`; całe
  wyjście komendy ląduje w `.temp/superdev/logs/`, nie w kontekście wywołującego.
- `commit-task.sh` stage'uje wyłącznie zadeklarowany zbiór plus katalog biegu i kończy się kodem 2
  przy niezadeklarowanych zmianach w drzewie; przy kolejności commit-przed-review ten stan wypada
  przed bramą, nie po niej.
- Dzisiejszy reviewer per task ma `Bash` wyłącznie na `git status --short` i nie uruchamia żadnej
  komendy bramy; `since:` jest w `review-contract.md` jawnie wyłączone z jego podzbioru etykiet.
- Tor Simple nie ma reviewera per task w ogóle, więc na nim checkpoint jest bramą i warunkowy
  być nie może.
- Pomiar wykonalności strażnika na 23 istniejących planach w `docs/.workflows/`: 74 ze 114 par
  kolejnych tasków spełnia oba warunki, w planach od 2026-09-16 jest to 29 z 66.
- Pomiar kosztu z `docs/stats/`: reviewer per task to 21:41 przy 16 dispatchach na 15 tasków
  w przebiegu `build-cost-cuts` (109:27 wall); jeden FAIL reviewera na cały przebieg.
- W tym repo wszystkie podsekcje `## Gate commands` to `none - <reason>`, więc zysk z deduplikacji
  bramy jest tu zerowy i mierzalny dopiero na hoście z realnym suitem.
- W tym repo tekst jest produktem, więc domyślne `Review: none` dla `Kind: text` nie obowiązuje.

## Out of scope
- Stampy dowodowe, plik `task-NN-runs.jsonl` i fingerprint drzewa przez `git write-tree`.
- Zawężanie zestawu bramy w re-review na podstawie wyniku poprzedniej rundy.
- Sufit wielkości taska i nowa blokująca klasa checklisty dla taska ponadwymiarowego.
- Fale równoległe, `isolation: worktree`, `memory: project` na recenzentach.
- Eskalacja siły w pętli napraw, detektor młócenia, etap debuggera.
- Znacznik rodzaju zależności (`artifact:` kontra `order:`) w `### Dependencies`.
- Kadencja checkpointu: zostaje co pięć zacommitowanych tasków.
- Walidator per znalezisko i filtr fałszywych pozytywów w raportach recenzentów.
- Zmiany w torze `vibe` i w skillu `e2e`.

## History
- `docs/changelog/2026-09-17-build-cost-cuts.md` - upheld: `Review: none` jako trzeci stan markera,
  `Kind:` wyprowadzany z `### Task Checks` i wycofanie przekazywania `effort` zostają nietknięte;
  jego pomiar (około 97% wall builda to generacja modelu, a napędza ją liczba tur, nie siła modelu;
  reviewer per task o płaskim koszcie niezależnym od wielkości taska) jest podstawą decyzji 1 i 7.
- `docs/adr/` - none: to repo nie prowadzi zapisu ADR.
