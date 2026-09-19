# Review pluginu viber

Data: 2026-09-19. Zakres: `viber/` w całości (3 skille, 4 agenty, 2 skrypty pluginu, 1 hook,
manifest, README, węzeł CLAUDE.md). Wersja pluginu: 0.48.1, commit bazowy `84ce7c6`.

Metoda: lektura wszystkich plików plus weryfikacja wykonawcza. Oba skrypty pluginu uruchomione na
piaskownicowych repozytoriach git (zadanie normalne, zadanie z plikiem spoza mapy, ścieżka
naprawcza `-`, plan spoza repo). Hook przepuszczony przez 13 syntetycznych transkryptów zbudowanych
na wzór `tests/superdev/review-plan.test.ts`. Kształt realnego transkryptu sprawdzony na
`~/.claude-dario/projects/`.

## Ocena: 7/10

Architektura jest spójna i dobrze przemyślana: pusty orkiestrator, plan jako jedyny nośnik stanu,
bramka egzekwowana przez harness a nie przez dobre intencje modelu. Bramka planu działa w 12 na 13
przetestowanych scenariuszy. Natomiast ścieżka "od zatwierdzonego planu do commita" ma trzy realne
dziury, z których dwie potwierdziłem odtwarzalnie.

## Blokery

### 1. `commit-task.sh:114-128` zapisuje `done` PRZED commitem

Skrypt aktualizuje `<!-- done: ... -->` i nagłówek `## Tasks (x/N)`, dopiero potem robi
`git commit`. Gdy commit padnie (pre-commit hook, podpis GPG, plan spoza repo), zadanie jest
zapisane jako zrobione, a kod niezacommitowany.

Potwierdzone: `exit 128`, plan pokazuje `## Tasks (1/1)` i `<!-- done: 01 -->`, `git log` zawiera
tylko `init`, zmiany zostają w indeksie.

Dlaczego to jest bloker, a nie usterka: orkiestrator z definicji ufa skryptowi i nigdy go nie
weryfikuje ("Two deterministic scripts, both self-verifying ... TRUSTED by the caller, never
re-verified, never retried"). Resume po resecie kontekstu pominie to zadanie na zawsze, bo plan
twierdzi, że jest zrobione.

Naprawa: najpierw commit, marker dopiero po udanym commicie. Alternatywnie zachowaj kopię planu
i przywróć ją, gdy `git commit` zwróci błąd.

### 2. Przekazanie planu z plan mode do implementora jest ślepym zaułkiem po resecie kontekstu

W realnym transkrypcie tego repozytorium plan mode nazywa plik
`~/.claude-dario/plans/staged-yawning-starfish.md`, czyli **poza repozytorium projektu** i pod losową
nazwą, która nie odpowiada slugowi z tytułu planu.

Konsekwencje:

- `implementor` ma `disallowed-tools: Read`, więc nie odczyta tego pliku, żeby przepisać go do
  `docs/plans/`.
- Podanie tej ścieżki jako argumentu też nie ratuje sytuacji: `plan-index.sh` przechodzi poprawnie,
  ale `commit-task.sh` pada na `git add -- <ścieżka poza repo>` (fatal, exit 128), po uprzednim
  oznaczeniu zadania jako done (patrz bloker 1).
- Jedyna działająca droga to "plan jeszcze w kontekście", a `planner/SKILL.md:51` sam ostrzega, że
  zatwierdzenie może ten kontekst wyczyścić. Krok 1.3 implementora szuka wtedy `docs/plans/*.md`,
  którego jeszcze nie ma, bo nikt go tam nie zapisał.

Naprawa do rozważenia: niech `planner` zapisuje plan od razu do `docs/plans/<slug>.md` (o ile plan
mode na to pozwala), albo niech `commit-task.sh` odmawiał pracy na planie spoza repo z czytelnym
błędem, zanim cokolwiek zmieni.

### 3. `commit-task.sh:45-54` (`task_id = "-"`) robi `git add -A` i wciąga `.temp/viber/**` do historii

Potwierdzone: commit naprawczy po nieudanych testach zawierał `.temp/viber/feat-x/review-01-1.md`
oraz niezwiązany `src/UNRELATED.ts`.

To wprost łamie deklarację z README ("anything written outside the file map stays uncommitted and
visible") i z węzła CLAUDE.md. Dla kontrastu `superdev/scripts/commit-task.sh:177` ma jawne
wykluczenie `.temp/` "whatever the host's .gitignore says", a superdev ma dodatkowo skill `setup`,
który zasiewa `.gitignore` w repozytorium hosta. Viber nie ma ani jednego, ani drugiego, więc w
świeżym projekcie `.temp/viber/` jest nieśledzony i nieignorowany.

## Ważne

### 4. `plan-gate.sh:91` wymaga katalogu dosłownie o nazwie `plans`

Host z własnym `plansDirectory` pod inną nazwą powoduje ciche fail-open. Potwierdzone testem: plan
zapisany do `specs/j.md` daje `ALLOW` bez żadnej recenzji.

`superdev/hooks/scripts/review-plan.sh:143-169` ma na to fallback: gdy stała ścieżka nie trafia,
bierze ostatni zapis `*.md` i wymaga, żeby plik deklarował swój format w pierwszej linii. Plan
vibera nie deklaruje żadnego markera formatu, więc takiego fallbacku dziś nie da się zbudować.

To ta sama luka, która powoduje konflikt z superdev opisany w README i w węźle CLAUDE.md: dodanie
markera formatu do szablonu planu rozwiązałoby oba problemy naraz (viber odzyskałby fallback,
a superdev mógłby rozpoznać cudzy plan i ustąpić).

### 5. Brak host-override dla decyzji "bez review"

`implementor/SKILL.md:41` wysyła docs, config, scaffolding i mechaniczne zmiany na haiku bez
recenzji. W repozytorium, w którym tekst jest produktem (jak to), wyłącza to bramkę dokładnie na
tym, co jest produktem.

Root `CLAUDE.md` ma dla superdev jawną deklarację hosta na ten wypadek ("Text is the product in THIS
repo ... This line is the host declaration `superplan` reads for that override"). Viber nie czyta
żadnej deklaracji hosta, więc tej decyzji nie da się nadpisać bez edycji skilla.

### 6. Zero testów regresyjnych

`tests/` ma suity dla superdev (24 pliki), superfix, supergh i superui. Viber wnosi 483 linie bash
i awk, w tym 197-liniowy hook parsujący transkrypt regexami, i nie ma ani jednego testu.
`portability.test.ts` oraz `orphan-tags.test.ts` przechodzą, ale nie dotykają logiki, sprawdzają
tylko shebangi, bity wykonywalne, cytowanie preloadów i osierocone tagi.

Suita dla `plan-gate.sh` jest tu obowiązkowa. Wzorzec jest gotowy w
`tests/superdev/review-plan.test.ts`, łącznie z budowaniem linii transkryptu przez
`JSON.stringify`, macierzą fail-open i harnessem `runScript`.

### 7. `plan-index.sh` nie sprawdza kolizji plików między niezależnymi zadaniami

Sprawdzenie "dwa zadania bez ścieżki zależności nie mogą wymieniać tego samego pliku" jest w 100%
deterministyczne: graf `Depends-on` plus listy `Files`. Dziś pilnują go dwa LLM-y, agent
`planner-review` (checklista "Disjoint") i orkiestrator czytający indeks. Zasada "Script vs. fork"
z root `CLAUDE.md` mówi dokładnie odwrotnie: krok na znanym, stałym formacie zapada się do skryptu.

To jednocześnie jedyny mechanizm chroniący przed dwoma agentami piszącymi równolegle do tego samego
pliku, więc koszt pomyłki jest wysoki.

### 8. Rozjazd tierów modeli

- `task-reviewer` działa zawsze na opus, bo `implementor` nie przekazuje mu `model` w dispatchu.
  Kontrastuje to ze starannie dobieranymi tierami dla codera i wygląda raczej na przeoczenie niż na
  decyzję. Jeśli to decyzja (bramka zawsze na najmocniejszym modelu), powinna być zapisana wprost
  w węźle CLAUDE.md.
- `task-coder` dispatchowany na haiku dziedziczy `effort: high` z własnego frontmattera, bo Agent
  nie przyjmuje parametru `effort`. Dla haiku to kombinacja bez sensu.

## Drobne

- `idea/SKILL.md:21` mówi "3 concrete options", `README.md:45` mówi "2-4 concrete options".
- `idea/SKILL.md:21` ("Every question carries 3 concrete options") jest sprzeczne z linią 26
  ("Prefer multiple choice questions when possible, but open-ended is fine too").
- `planner/SKILL.md` krok 3 nie każe ponownie uruchomić `plan-index.sh` po naprawach wynikających
  z recenzji. Strukturalna wywrotka wprowadzona przy fixie wyjdzie dopiero u implementora, który
  zatrzyma build i odeśle użytkownika do plannera.
- `.claude/rules/plugin-manifests.md` jest nieaktualny: mówi "all six manifests" oraz "Only
  `superdev` and `superfix` carry an `agents[]` key", podczas gdy pluginów jest siedem, a viber ma
  `agents[]`.

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

## Kolejność napraw

1. Bloker 1 (kolejność commit vs marker `done`), bo psuje jedyny nośnik stanu.
2. Bloker 2 (przekazanie planu), bo wywraca najczęstszy scenariusz użycia.
3. Bloker 3 (`git add -A` na ścieżce naprawczej).
4. Punkt 6 (testy), zanim pojawi się kolejna zmiana w tych skryptach.
5. Punkt 4 (marker formatu planu), który przy okazji odblokowuje współistnienie z superdev.
