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

ZAIMPLEMENTOWANE

### 2. Reguła o zasobie wyłącznym nie ma pod sobą danych (7/10)

ZAIMPLEMENTOWANE

### 3. `AskUserQuestion` zatrzymuje całą budowę (7/10)

ZAIMPLEMENTOWANE

### 4. Procedura per task czyta się jak sekwencja, a "close out" nie jest zdefiniowane (6/10)

ZAIMPLEMENTOWANE

### 5. Taski w locie są niewidoczne przy wznowieniu (5/10)

ZAIMPLEMENTOWANE

### 6. Sufit 20 współbieżnych subagentów nie jest uwzględniony (4/10)

ODRZUCONE

Liczba potwierdzona w dokumentacji harnessu, ale inna niż zakładał przegląd: to 20 subagentów
RÓWNOLEGLE, nie kumulatywnie na sesję. 21. dispatch kończy się błędem narzędzia `Agent`
(`Concurrent subagent limit reached`), nie kolejkowaniem, a slot zwalnia się z powrotem, gdy
agent wróci. Limit jest konfigurowalny przez `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` w `env`
w `settings.json`, domyślnie 20.

Przy takim kształcie limitu sufit jest poza zasięgiem realnego planu: reviewer startuje dopiero
po powrocie swojego kodera, więc 20 równoległych agentów wymagałoby planu o ponad 20 taskach bez
zależności. Linia o sufcie w `implementor/SKILL.md:81` kosztowałaby więcej niż chroni.

## Rozważone i odrzucone

- Trójka zamykająca równolegle z `test-runner` zamiast po nim (4/10). Oszczędza jedną rundę opusa,
  ale pisaliby pliki w trakcie biegu suite'u (w tym repo testy skanują pliki śledzone przez git),
  a ich commity ścigałyby się z commitami repair.
- Start zależnego taska, gdy jego zależność zwróci PASS, bez czekania na review i commit (3/10).
  Skraca łańcuchy, ale zależny buduje na kontrakcie, który bramka może jeszcze odrzucić.
- `isolation: worktree` per koder (3/10). Rozwiązałoby izolację buildu naprawdę, ale
  `commit-task.sh` commituje z głównego drzewa, więc padłby cały model commitu i progresu.

## Decyzja zamknięta

Ani A (deklaracja współbieżności w planie), ani B (samo usunięcie reguły). Kolizja na katalogu
wyjściowym jest argumentem wywołania, nie problemem harmonogramu: każdy task dostaje
`out: .temp/viber/<id>/`, koder i reviewer tego samego taska dzielą ten katalog, a sposób
przekierowania należy do `CLAUDE.md` hosta. Reguła o zasobie wyłącznym zniknęła w całości, bo
stały port i wspólna baza to wady projektu testów, bramkowane teraz przez `planner-review`.

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
