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

`viber/scripts/commit-task.sh:67-73` woła `git status --short` bez zakresu i wypisuje wszystko jako
"left outside the commit". Przy najszerszym dispatchu (`implementor/SKILL.md:78`) w drzewie zawsze
leżą pliki innych trwających zadań, więc ostrzeżenie odpala przy każdym commicie.
`implementor/SKILL.md:88` każe je nieść do finalnego podsumowania, które przez to będzie złożone
głównie z fałszywych alarmów. Ostrzeżenie przestaje cokolwiek znaczyć dokładnie wtedy, gdy jest
potrzebne.

Przy okazji uzasadnienie serializacji w `implementor/SKILL.md:63` ("review and commit both read the
working tree") jest sprzeczne z `implementor/SKILL.md:81` ("Close-outs running alongside coders still
working on other files"). Jeśli powodem jest współdzielone drzewo, to kodery piszące w tle łamią go
tak samo. Sama zasada jest w porządku, ale uzasadnienie trzeba przepisać na to, co naprawdę chroni:
`git diff HEAD` i staging czytają cały index, a nie tylko mapę plików zadania.

Naprawa: zawęzić `warn_dirty` do sąsiedztwa mapy plików zadania, albo przestać nieść je do
podsumowania.

### 6. `tdd` każe pytać użytkownika wewnątrz agenta, który użytkownika nie ma

`viber/skills/tdd/SKILL.md:101` ("If the request is ambiguous, stop and ask") i
`viber/skills/tdd/SKILL.md:105` ("Working interactively, confirm the interface and priorities with
the user and get approval"). Jedynym wywołującym jest `task-coder` (`task-coder.md:25`), który
działa headless. Skill jest napisany dla sesji interaktywnej, a używany wyłącznie w forku.

Naprawa: w torze codera bypass ma być niedostępny, a niejednoznaczność ma kończyć się
`VERDICT: FAIL` z linią `REASON:`.

### 7. Opisy CSO `planner` i `implementor` nie pokrywają tego, co obiecuje README

`viber/README.md:42` twierdzi, że oba "fire on the intent ('break this down', 'build the plan', 'go
ahead')". `planner/SKILL.md:3` to jedno zdanie o dziewięciu słowach, `implementor/SKILL.md:3` dwa
zdania. Żadnej z tych fraz tam nie ma. Manifest celowo nie routuje, więc `description:` jest jedyną
powierzchnią routingu, a dwa skille w samym środku łańcucha mają ją najcieńszą z całego pluginu.
Dla porównania `fixer` i `tdd` niosą pełne listy triggerów.

Naprawa: dopisać do obu opisów frazy wyzwalające, tak jak w `fixer`, albo poprawić README, żeby nie
obiecywało routingu, którego nie ma.

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

`planner/SKILL.md:39` wymaga "a runnable command plus the result that counts as proof". Sekcja ADR
(`planner/SKILL.md:45-51`) definiuje zadanie, którego produktem jest plik markdown, i nie mówi, co
wpisać w `Verification` ani `DoD`. `plan-index.sh` sprawdza wyłącznie niepustość, więc przejdzie
dowolny wymysł. To samo dotyczy każdego zadania `TDD: none` typu dokumentacja. superdev ma na to
`Kind:`, viber nie ma odpowiednika.

Naprawa: albo dopisać w sekcji ADR wzorzec `Verification` i `DoD`, albo dopuścić w regule zadaniowej
weryfikację nieuruchamialną dla zadań bez zachowania runtime'owego.

## Drobne

### 11. Martwa gałąź `/planner` w bramie planu

`viber/hooks/scripts/plan-gate.sh:82` i opis w `viber/hooks/hooks.json:2` uzbrajają sygnał 1 także
na wpisane `<command-name>/planner</command-name>`. `planner/SKILL.md:5` ma `user-invocable: false`,
a `README.md:42-43` potwierdza, że to celowe. Tej komendy nie da się wpisać, więc połowa detektora
nigdy nie zadziała. Nieszkodliwe, bo hook jest fail-open, ale wprowadza w błąd przy następnym
czytaniu.

### 12. `Plan: <path-to-plan>` w templatce staje się nieprawdą po wylądowaniu

`viber/skills/planner/templates/plan.md:4`. Planner wpisuje ścieżkę z katalogu plan mode,
`plan-path.sh --land` kopiuje plik gdzie indziej, nikt tej linii nie aktualizuje. Ląduje w `spec.md`,
czyli w kontekście każdego agenta w runie. Albo usunąć pole, albo niech `--land` je przepisze.

### 13. `argument-hint` przy `user-invocable: false`

`implementor/SKILL.md:4` w parze z `implementor/SKILL.md:9`. To jedyny taki przypadek w repo,
pozostałe 8 wystąpień `argument-hint` siedzi na skillach user-invocable.

### 14. Gałąź `accept` po dwóch nieudanych rundach review jest niezdefiniowana

`implementor/SKILL.md:87`. Domyślnie "przejdź do kroku 3 i commituj", ale to jedyne miejsce, gdzie
człowiek nadpisuje bramkę, więc powinno być napisane wprost.

### 15. `.temp/viber/<plan-key>/` nigdy nie jest sprzątane

Nie boli, bo katalog jest w gitignore, ale nikt tego nie deklaruje ani w węźle pamięci, ani w README.
