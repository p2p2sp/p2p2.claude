# viber: analiza spójności skills i agents (od pomysłu do implementacji)

Zakres przeglądu: 6 skilli, 6 agentów, 4 skrypty pluginowe, 2 hooki, template planu, manifest,
README i węzeł pamięci. Runda 2, po zamknięciu pozycji 1-12 z poprzedniego przeglądu.

Ocena całości: 7.5/10. Przepływ danych jest domknięty, kontrakty etykiet się zgadzają, izolacja
kontekstu jest realnie wyegzekwowana. Zostaje jedna twarda sprzeczność w torze TDD i kilka miejsc,
gdzie kontrakt żyje wyłącznie w prozie, mimo że dałoby się go zwinąć do skryptu.

## Co trzyma się dobrze

- Etykiety `spec:` / `task:` / `report:` / `notes:` / `reason:` zgadzają się co do joty z sekcjami
  `## Input` wszystkich agentów, w obie strony.
- `VERDICT:` jest wszędzie jedynym kanałem wyjściowym, a druga linia (`REVIEW:` / `REPORT:` /
  `FILES:`) jest konsumowana dokładnie tam, gdzie jest produkowana.
- Ścieżka naprawcza (coder bez `task:`, z samym `report:`) obsłużona po obu stronach, a
  `commit-task.sh` ma osobną formę na plik spoza mapy zadań (`--repair`).
- `plan-path.sh --land` plus markery `done` czynią przekazanie planu odpornym na reset kontekstu.
- Walidacja kolizji plików w `plan-index.sh` domyka regułę równoległości deterministycznie, żaden
  agent nie musi jej sprawdzać ręcznie.
- Orkiestrator faktycznie nic nie czyta i nic nie pisze: `disallowed-tools` jest zgodne z ciałem
  skilla, a każdy bajt trafiający do drzewa pochodzi ze skryptu albo z agenta.

## Poważne

### 1. `tdd` obiecuje cały suite na koniec zadania, a `implementor` puszcza kodery równolegle

NAPRAWIONE

### 2. `task-reviewer` nigdy nie uruchamia weryfikacji zadania

NAPRAWIONE

### 3. Brak baseline'u testów przed buildem

Nic nie uruchamia suite'a przed krokiem 4. `implementor/SKILL.md:98` rozróżnia w kroku 5 "a
regression in code the plan never touched" i każe commitować to przez `--repair`, ale nie ma żadnej
podstawy, żeby stwierdzić, że to regresja, a nie awaria zastana przed startem. Przy wejściu z
`fixer` suite jest czerwony z definicji, więc rozróżnienie jest potrzebne od pierwszej minuty.

Naprawa: jeden dispatch `test-runner` z rundą 0 przed krokiem 4 i zapamiętanie werdyktu. Agent już
istnieje, już umie zwrócić `SKIP`, koszt zerowy.

### 4. Nikt nie sprawdza, czy każde kryterium akceptacji zostało pokryte

`viber/scripts/plan-index.sh:170-176` weryfikuje jeden kierunek: że każde `Covers:` wskazuje
istniejące kryterium. Odwrotności (każde kryterium pokryte przez jakieś zadanie) nie sprawdza nikt
deterministycznie: obiecują ją `planner/SKILL.md:42` i `agents/planner-review.md:22`, czyli LLM.
Nie łapie tego też nic później, bo nie ma końcowej bramki na spec jako całość. `task-reviewer`
patrzy tylko na kryteria spod `Covers` swojego zadania, `test-runner` uruchamia suite. Kryterium,
którego nikt nie pokrył, przechodzi przez cały pipeline niezauważone i build kończy się sukcesem.

To sprzeczne z zasadą repo, że krok deterministyczny nad znanym formatem zwija się do skryptu.

Naprawa: pętla po `crit[]` w bloku END `plan-index.sh`, kilkanaście linii, plus decyzja czy sierote
kryterium to exit 4 czy ostrzeżenie dla plannera.

## Średnie

### 5. `warn_dirty` nie jest przeskalowane do pracy równoległej

NAPRAWIONE (wchłonęło też niezawężone `git status --short` w `task-reviewer`)

### 6. `tdd` każe pytać użytkownika wewnątrz agenta, który użytkownika nie ma

NAPRAWIONE (cała sekcja `Bypass authorization` była martwa: bypassu nie miał kto udzielić)

### 7. Opisy CSO `planner` i `implementor` nie pokrywają tego, co obiecuje README

NAPRAWIONE

### 8. Pierwsze ogniwo łańcucha jest nieutwardzone

Przejście `planner` -> `implementor` jest zabezpieczone trzykrotnie: ścieżka powtórzona w handoffie
(`planner/SKILL.md:66`), `--land` odporne na utratę kontekstu, markery `done` w pliku planu.
Przejście `idea` -> `planner` nie jest zabezpieczone wcale, bo `idea` z definicji nic nie zapisuje
(`idea/SKILL.md:11,61`). Utrata kontekstu między potwierdzeniem podsumowania a wejściem plannera
kasuje cały wywiad. To samo dotyczy `fixer`, którego payload (`fixer/SKILL.md:44`: "No file, no
report") żyje tylko w kontekście, mimo że dowód w postaci czerwonego testu leży już na dysku.

Asymetria jest świadoma, ale najsłabsze ogniwo jest teraz na początku, nie na końcu.

Naprawa do rozważenia, nie oczywista: wywiad i diagnoza są tanie do powtórzenia, więc plik może być
przesadą. Minimum to zapisanie payloadu `fixer` obok testu reprodukcyjnego, skoro ten i tak zostaje
w drzewie.

### 9. Brak fallbacku, gdy plan mode nie nazwie pliku planu

`planner/SKILL.md:29` zakłada, że plan mode poda ścieżkę w system message. Jeśli nie poda, planner
nie ma gdzie pisać, hook przepuści wyjście (sygnał 2 nieobecny to allow), a `implementor` dojdzie do
`plan-path.sh` z exit 3 i zapyta użytkownika o ścieżkę pliku, który nigdy nie powstał. Degraduje się
akceptowalnie, ale mylącym komunikatem.

Naprawa: jedno zdanie w `planner`, co zrobić, gdy plan mode nie nazwie pliku.

### 10. `Verification` i `DoD` nie pasują do zadań, które viber sam generuje

NAPRAWIONE (weryfikacją zadania bez zachowania runtime'owego jest check na artefakcie, nie
rozluźniona reguła; wyrównało też `planner-review`, który wymagał runnable command tam, gdzie
`task-reviewer` już dopuszczał proof do przeczytania)

## Drobne

### 11. Martwa gałąź `/planner` w bramie planu

NAPRAWIONE (detektor pokrywał też cudze `/xyz:planner`, więc usunięcie zamknęło fałszywe uzbrojenie)

### 12. `Plan: <path-to-plan>` w templatce staje się nieprawdą po wylądowaniu

`viber/skills/planner/templates/plan.md:4`. Planner wpisuje ścieżkę z katalogu plan mode,
`plan-path.sh --land` kopiuje plik gdzie indziej, nikt tej linii nie aktualizuje. Ląduje w `spec.md`,
czyli w kontekście każdego agenta w runie. Albo usunąć pole, albo niech `--land` je przepisze.

### 13. `argument-hint` przy `user-invocable: false`

NAPRAWIONE

### 14. Gałąź `accept` po dwóch nieudanych rundach review jest niezdefiniowana

`implementor/SKILL.md:87`. Domyślnie "przejdź do kroku 3 i commituj", ale to jedyne miejsce, gdzie
człowiek nadpisuje bramkę, więc powinno być napisane wprost.
