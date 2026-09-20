# viber: przegląd przepływów implementora pod kątem równoległości

Zakres przeglądu: `skills/implementor/SKILL.md` plus cały łańcuch, który na niego wpływa:
`skills/planner/SKILL.md`, `agents/planner-review.md`, `scripts/plan-index.sh`,
`scripts/commit-task.sh` oraz agenci `task-coder`, `task-reviewer`, `test-runner`,
`memory-writer`, `rules-writer`, `qa-writer`.

Werdykt: warstwa danych jest zaprojektowana pod równoległość poprawnie, warstwa harmonogramu ma
cztery realne dziury, z czego dwie przy szerokim dispatchu potrafią równoległość skasować albo
obrócić przeciwko sobie.

## Co działa i nie wymaga ruchu

- Kolizja plików między taskami bez ścieżki zależności wykluczana deterministycznie przez skrypt
  (`plan-index.sh:206-212`), więc `deps` jest jedynym, co trzyma taski osobno.
- Rozłączne ścieżki artefaktów per task: `<id>-coder.md`, `review-<id>-<round>.md`,
  `tests-<round>.md`. Żaden równoległy agent nie nadpisuje cudzego pliku.
- `commit-task.sh` stageuje wyłącznie własny pathspec, a ostrzeżenie o niezaewidencjonowanych
  zmianach odejmuje mapę CAŁEGO planu, nie jednego taska, właśnie dlatego że kodery pracują
  równolegle.
- Trójka zamykająca leci jednym message z jawnie rozłącznymi zakresami
  (`memory-writer.md:18`, `rules-writer.md:18`, `qa-writer` do katalogu runu).
- Plan jako jedyny stan wznowienia, bez pliku stanu obok.

## Znaleziska

### 1. `Verification` może być pełnym suitem, co zabija szeroki dispatch (8/10)

`planner/SKILL.md:39` wymaga tylko "runnable command plus the result". Nic nie zabrania wpisania
`npm test` albo `dotnet test` na cały projekt. Przy N koderach w jednym drzewie roboczym wystarczy
jeden na wpół zapisany plik innego taska, żeby w języku kompilowanym build był czerwony dla
wszystkich. Wtedy `task-coder.md:31` każe "fix, then re-run", a `task-coder.md:23` zabrania dotykać
plików spoza własnego `Files`, więc koder nie może naprawić tego czerwonego: przepala 5 rund
i zwraca FAIL. Im szerszy dispatch, tym pewniejsze. Ten sam czerwony trafia potem w bramkę, bo
`task-reviewer.md:20` uruchamia tę samą komendę jeszcze raz.

Naprawa: jedna klauzula w regułach tasków plannera (`Verification` zawężone do plików taska, pełny
suite należy do close'u) plus jedna linia w checku `Provable` w `planner-review.md:26`.

### 2. Reguła o zasobie wyłącznym nie ma pod sobą danych (7/10)

`implementor/SKILL.md:63` zabrania puszczać razem taski, których weryfikacja potrzebuje zasobu
wyłącznego. Orkiestrator ma jednak `disallowed-tools: Read` (`implementor/SKILL.md:5`), a indeks to
`id | state | tdd | deps | files | title` (`plan-index.sh:232`). Skrypt parsuje `Verification:`
(`plan-index.sh:131`), sprawdza tylko że nie jest puste (`plan-index.sh:151`) i wyrzuca do kosza.
Orkiestrator fizycznie nie widzi komend weryfikacyjnych, więc albo zignoruje własną regułę
(kolizje), albo zserializuje wszystko na wszelki wypadek (koniec równoległości). Reguła
nieegzekwowalna jest gorsza niż jej brak, bo wygląda na załatwioną.

Drugi konsument tego samego zasobu jest niewidoczny: reguła mówi o "taskach", a weryfikację
uruchamia też reviewer (`task-reviewer.md:20`), którego linijkę wyżej (`implementor/SKILL.md:80`)
ten sam plik wprost zachęca do pracy obok wciąż kodujących agentów. To jest sprzeczność w jednym
bloku "Never break".

Precedens rozwiązania istnieje w repo: `superdev/scripts/decompose.sh:135-150` wystawia wyliczaną
kolumnę `concurrent`, żeby orkiestrator nie musiał tego oceniać sam.

### 3. `AskUserQuestion` zatrzymuje całą budowę (7/10)

Cztery miejsca: `implementor/SKILL.md:84`, `:86`, `:87`, `:99`. Pytanie kończy turę, a kolejny
dispatch nie pójdzie, dopóki człowiek nie odpowie. Koder wywalający się w 2. minucie budowy zamraża
cały pozostały graf na czas nieobecności użytkownika.

Naprawa: jedna linia mówiąca, że pytanie nigdy nie jedzie samo, w tym samym message lecą wszystkie
dispatche, które reguły i tak dopuszczają.

Do potwierdzenia: czy tool calls z tego samego message odpalają się przed zablokowaniem tury, nie
jest udokumentowane. Wymaga jednego testu na żywo, ale ryzyko jest zerowe: jeśli nie zadziała, nic
nie tracimy.

### 4. Procedura per task czyta się jak sekwencja, a "close out" nie jest zdefiniowane (6/10)

Blok "Aim for" (`implementor/SKILL.md:75-80`) deklaruje równoległość, ale operatywna lista 1-4
(`:82-88`) to pipeline jednego taska. Do tego `:62` mówi "Close out one task at a time" i nigdzie
nie definiuje, czym jest close-out. Model czytający to jako "review + commit" zserializuje także
recenzje, choć reviewery są read-only poza własnym raportem i mogłyby lecieć hurtem. Uzasadnienie
w tej samej linii wskazuje na commit, ale podmiotem zdania jest close-out.

Naprawa: nazwać commit jedynym punktem serializacji (nigdy dwa `commit-task.sh` w jednym message)
i zastąpić aspirację mechaniką: zbiory done / in flight / ready, a na każde przebudzenie jeden
message zawierający wszystkie dispatche, które są już legalne.

### 5. Taski w locie są niewidoczne przy wznowieniu (5/10)

ZAIMPLEMENTOWANE

Wedle dokumentacji harnessu limit to 20 subagentów na sesję, a 21. dispatch kończy się błędem,
nie kolejkowaniem. `implementor/SKILL.md:77` mówi "the widest dispatch the rules allow", a w locie
są jednocześnie kodery i reviewery, więc przy dużym planie to jest osiągalne.

Liczba pochodzi z dokumentacji harnessu, nie z testu w tym repo. Do potwierdzenia przed wpisaniem
jej do skilla.

## Rozważone i odrzucone

- Trójka zamykająca równolegle z `test-runner` zamiast po nim (4/10). Oszczędza jedną rundę opusa,
  ale pisaliby pliki w trakcie biegu suite'u (w tym repo testy skanują pliki śledzone przez git),
  a ich commity ścigałyby się z commitami repair.
- Start zależnego taska, gdy jego zależność zwróci PASS, bez czekania na review i commit (3/10).
  Skraca łańcuchy, ale zależny buduje na kontrakcie, który bramka może jeszcze odrzucić.
- `isolation: worktree` per koder (3/10). Rozwiązałoby izolację buildu naprawdę, ale
  `commit-task.sh` commituje z głównego drzewa, więc padłby cały model commitu i progresu.

## Otwarta decyzja

Punkt 2 rozwidla się i obie gałęzie są uczciwe:

- **A. Deklaracja na poziomie planu.** Planner czyta stack z `CLAUDE.md` hosta, więc może wpisać
  w spec jedną linię o tym, czy weryfikacja tego projektu jest bezpieczna współbieżnie;
  `plan-index.sh` wystawia to jako pole, `implementor` przełącza się między trybem szerokim
  a szeregowym. Uczciwe, ale dla .NET oznacza faktycznie budowę szeregową, bo dwa `dotnet test`
  dzielą `obj/`.
- **B. Tylko zawężenie `Verification` z punktu 1, a regułę o zasobie wyłącznym usunąć.** Mniej
  kodu i mniej bloatu, ale zostawia stacki kompilowane z realnym ryzykiem kolizji na katalogu
  wyjściowym.

ZAIMPLEMENTOWANE

## Co jest solidne

Bramka planu, po wyłączeniu punktu 4, robi dokładnie to, co obiecuje. Potwierdzone na syntetycznych
transkryptach:

| Scenariusz | Wynik |
| --- | --- |
| Zwykły plan mode bez skilla planner | allow (fail-open, zgodnie z kontraktem) |
| Planner plus zapis planu, brak recenzji | deny |
| Planner plus zapis plus `VERDICT: PASS` w `tool_result` | allow |
| Planner plus zapis plus `VERDICT: FAIL` | deny |
| FAIL, poprawka, ponowna recenzja PASS | allow |
| PASS dostarczony jako `<result>` agenta w tle | allow |
| Plan zmodyfikowany po własnym PASS | deny (kontrola mtime) |
| Wpisane ręcznie `/viber:planner` zamiast wywołania Skill | deny (bramka uzbrojona) |
| Plan zatwierdzony wcześniej w tej samej sesji | allow (okno epizodu działa) |
| Nieprefiksowane `subagent_type: planner-review` | allow (obie pisownie rozpoznane) |
| `VERDICT: PASS` zacytowane przez model w prozie, bez agenta | deny (nie daje się nabrać) |

Poza tym:

- Izolacja orkiestratora przez `disallowed-tools: Read, Edit, NotebookEdit` jest prawdziwym
  ograniczeniem, nie deklaracją. To jest najmocniejszy element projektu.
- `plan-index.sh` waliduje solidnie: duplikaty ID, brakujące pola, kierunek zależności,
  `Covers` wskazujące nieistniejące kryterium. Jego wyjście jest wystarczająco kompaktowe, żeby
  jeden kontekst przeżył cały build.
- Zwykła ścieżka `commit-task.sh` (z ID zadania) stageuje wyłącznie pliki z mapy zadania i raportuje
  na stderr wszystko, co zostało poza commitem. Potwierdzone.
- Wznowienie po resecie kontekstu działa, o ile plan jest już w `docs/plans/`: stan `done` jest
  poprawnie odczytywany z markera, a licznik postępu przeliczany.
- Wszystkie pliki przechodzą `orphan-tags.test.ts` i `portability.test.ts` (30 testów, 0 porażek).
  Oba skrypty pluginu i hook mają bit `100755` i shebang `#!/usr/bin/env bash`.
