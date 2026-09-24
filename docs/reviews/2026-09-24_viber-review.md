# Przegląd kodu i spójności plugina viber (2026-09-24)

Zakres: wszystkie skille, agenty, referencje, skrypty i hooki `viber/`, plus `viber/CLAUDE.md`, `.claude/rules/` i `.claude/viber.yml`. Stan repo: commit `28b2347`. Przegląd tylko do odczytu, żadnych zmian w kodzie.

Lint (`skill-designer`): 0 FAIL dla 9 skilli i 12 agentów. WARN głównie fałszywe (kursywa), brak "when to use" w opisach `planner`, `implementor`, `setup` jest zamierzony (skille z łańcucha lub tylko dla użytkownika).

Wynik: 7 high, ok. 20 medium, reszta low. Punkty High 1-3 i 5 zweryfikowane ręcznie w kodzie; 5, 6, 8 (setup) i kilka medium odtworzone w repo testowym.

## High

1. WYKONANE - `viber/scripts/plan-path.sh:322-326` - wyszukanie `*_<slug>/plan.md` zwraca dowolny przebieg o tym slugu, także zakończony (nagłówek obiecuje "a run already open"). Przy domyślnym `cleanup: false` nowy plan z tym samym H1 dostaje `state: existing`, nie zostaje zapisany jako nowy przebieg, a implementor "wznawia" zakończony przebieg i nic nie buduje. Przy szkicu planner przepisuje `source:` w starym `plan.md`. Poprawka: `existing` tylko gdy `progress_of` pokazuje nierozliczone zadania, inaczej nowy katalog ze stemplem.
2. WYKONANE - `viber/skills/implementor/SKILL.md:35` - `skip` wywołuje `commit-task.sh --skip` tylko dla wskazanego zadania, zadania zależne są tylko zamykane w `TaskUpdate`. Nie trafiają do `skipped:` w `status.md`, więc `archive-run.sh` odmawia archiwizacji (exit 4), a `plan-path.sh` wiecznie pokazuje przebieg jako `open:`. Poprawka: osobne `--skip` dla każdego zależnego zadania, sekwencyjnie.
3. WYKONANE - `viber/skills/implementor/SKILL.md:144` vs `viber/agents/task-coder.md:53` - "Repair coder PASS or FAIL -> repair commit" z plikami z `FILES:`, ale coder emituje `FILES:` tylko przy PASS bez pliku zadania. Przy FAIL brak listy plików: exit 2 lub niezacommitowany ślad rundy. Poprawka: `FILES:` także przy FAIL w trybie naprawy albo gałąź FAIL bez commitu.
4. WYKONANE - `viber/skills/setup/assets/gitignore.txt` (375 linii) - to szablon Visual Studio/.NET z innego projektu (`backend/TimeHarmony/build/` l. 321, `backend/frontend/` l. 326, polski komentarz l. 364). W projekcie bez `.gitignore` setup po cichu ignoruje `bin/`, `logs/`, `publish/`, `artifacts/`. Łamie zasadę stack-agnostic i "Always in English". Poprawka: zawęzić do reguły `.temp/`.
5. WYKONANE - `viber/skills/rules/scripts/rules-map.sh:210-211` (także `:253`, `:311`) - `git status --porcelain` bez `-z` cytuje ścieżki ze spacją, więc `contains_line` ich nie dopasowuje. Zmieniona reguła ze spacją w ścieżce nie dostaje linii `dirty:`, a `--reset` usuwa niezacommitowaną edycję (odtworzone). Poprawka: `--porcelain -z` jak w `memory-map.sh:144-155`.
6. WYKONANE - `viber/skills/rules/scripts/rules-map.sh:148-170` (`glob2re`) - `{` i `}` escapowane dosłownie, brak rozwijania `{ts,tsx}`. Reguła z `src/**/*.{ts,tsx}` dostaje `matches 0` i `dead:` (odtworzone), skill proponuje jej reset. Poprawka: rozwijanie grup klamrowych przed dopasowaniem.
7. WYKONANE - `viber/agents/rules-writer.md:26`, `viber/skills/rules/SKILL.md:33,85`, `rules-map.sh:329` - `paths: global` prawdopodobnie nie jest słowem kluczowym Claude Code: reguła ładuje się bezwarunkowo tylko bez pola `paths`, a `global` zostanie potraktowany jak glob. Do potwierdzenia w dokumentacji przed poprawką. Poprawka: dla reguły całego repo pomijać `paths:`, usunąć przypadek `global` ze skryptu i skilla.

## Medium

### Planowanie

- WYKONANE - `viber/skills/planner/SKILL.md:57,61-65` - szkic jest lądowany (`plan-path.sh --land`, przepisanie `source:`) dopiero po `ExitPlanMode`; zatwierdzenie z czyszczeniem kontekstu gubi ten krok, a plan dalej mówi "Build: skill implementor", który odrzuca szkic.
- WYKONANE - `viber/skills/planner/SKILL.md:18,34` - runda kontynuująca szkic dostaje tylko klucz i podsumowanie; brak polecenia przeczytania `docs/<runs>/<key>/plan.md`, więc `--into` może nadpisać ustaloną specyfikację uboższą.
- WYKONANE - `viber/skills/planner/SKILL.md:53` - ponowne `plan-index.sh` tylko po zmianie pól zadań; pomija `## Contracts` i kryteria akceptacji (reguły Named, Homed, Seen, Covers są `(script)`). Błąd wychodzi dopiero przy `--split` na zamrożonym planie. Poprawka: re-run po każdej poprawce.
- WYKONANE - `viber/skills/planner/SKILL.md:3` vs `:14` - opis: "suggest the viber:idea interview and let the user decide", treść: "invoke the viber:idea skill instead". Łamie kontrakt wyzwalania `idea`.
- WYKONANE - `viber/scripts/plan-index.sh:389-395` (i `:695`) - `gsub(/[^0-9]+/, " ", cv)` liczy każdą cyfrę w `Covers:`; `Covers: #1 (see S3)` pokrywa kryterium 3 (odtworzone).
- WYKONANE - `viber/scripts/plan-index.sh:365-376` vs `commit-task.sh:587-589` - wpisy `Files:` w backtickach przechodzą walidację, a commit zadania pada na dosłownym pathspecu (odtworzone).
- WYKONANE - `viber/skills/planner/references/adr-tasks.md:26` vs `viber/references/plan-rules.md:24` - weryfikacja zadania ADR (`test -f ... && grep -q '^Status: accepted'`) to dokładnie przypadek, który Provable uznaje za błąd; przy `adr: true` review zapętla się na FAIL.
- WYKONANE - `viber/references/plan-rules.md:25` vs `:26` - TDD pozwala na `TDD: none` tylko bez zmiany zachowania, Reproduced wymaga `TDD: none` na zadaniu naprawiającym błąd. Poprawka: "or the task carries `Repro:`".

### Budowanie

- `viber/skills/implementor/SKILL.md:106` - `deferred` pochodzi z indeksu wczytanego raz w kroku 2; `DEFERRED:` z tej samej sesji nie dociera do codera i reviewera zadania-dłużnika (sprzeczne z `viber/CLAUDE.md:45-46`).
- `viber/skills/implementor/SKILL.md:113` - `-> none` bierze "the earliest unfinished task whose files column claims that path", czyli samo zadanie robiące commit; dług nigdy nie zostanie spłacony. Poprawka: "OTHER than this one".
- `viber/skills/implementor/SKILL.md:93,127` - "Never two commit-task.sh calls in one message" i obsługa niezerowego exit tylko w kroku 4; kroki 5 i 6 (`--repair`, `--chore`, `--qa`) bez nich. Poprawka: reguły na poziomie całego skilla.
- `viber/skills/implementor/SKILL.md:155,179` vs `viber/agents/rules-writer.md:54` - `OVER:` i `MOVE:` z rules-writer nie są czytane ani przenoszone do podsumowania końcowego.
- `viber/agents/task-reviewer.md:23` vs `task-coder.md:35` - brak instrukcji o długim timeoucie dla zadań `Exclusive: true`; reviewer zgłasza fałszywe FAIL.
- `viber/skills/implementor/SKILL.md:77,81` - profilowanie (docs -> haiku, zwolnienie z review) nie uwzględnia minimalnego profilu deklarowanego przez host (root `CLAUDE.md` tego repo go wymaga).
- `viber/skills/tdd/SKILL.md:16` - "breaking its own assertion ... then restore the code" jest sprzeczne; poprawka: tymczasowo cofnąć zachowanie, które test pokrywa, potem je przywrócić.

### Zamknięcie, QA, e2e

- `viber/agents/qa-writer.md:26` + `implementor/SKILL.md:177` - po wznowieniu istniejący `qa.md` daje `VERDICT: NONE`, a NONE nie dostaje commitu; dokumenty QA zapisane przed przerwanym commitem nigdy nie trafią do repo.
- `viber/skills/implementor/SKILL.md:191` vs `archive-run.sh:61-63` - "BLOCKED -> the run directory stays where it is" jest fałszywe dla exit 5 po przeniesieniu; znaczniki `[D<n>]` w `spec.md` zostają niezacommitowane przy exit 2-4 i nie są wspominane.
- `viber/skills/implementor/SKILL.md:185` - warunek "and step 6 ran" niejednoznaczny, gdy wszystkie przełączniki zamknięcia są wyłączone lub `closed:` już wszystko wymienia; archiwizacja może zostać pominięta. Poprawka: "unless the build ended on abort".
- `viber/agents/e2e-writer.md:45` - `npx playwright test <file>` pisze `test-results/` do drzewa hosta (wbrew `.temp/viber/e2e/`), a reporter html blokuje przebieg do timeoutu. Poprawka: `--reporter=line --output=.temp/viber/e2e/test-results`.
- `viber/skills/e2e/SKILL.md:58` - `curl -sf` uznaje odpowiedź 404/401 na `/` za "down"; aplikacja tylko z API uruchamia drugą instancję na zajętym porcie.

### Memory i rules

- `viber/skills/memory/scripts/memory-map.sh:12-13,94` - brak `cd` do katalogu głównego; uruchomiony z podkatalogu raportuje błędną mapę (odtworzone). Poprawka jak w `rules-map.sh:94-98`.
- `viber/skills/implementor/SKILL.md:171,175` vs `memory-node-writer.md:60` - root ponownie wywołany z `planned: none` nie dodaje do indeksu węzła, dla którego go wywołano.
- `viber/agents/memory-node-writer.md:59` - "keeps it equal to planned:" dla każdego węzła z listą; pośredni węzeł dostałby indeks całego repo. Poprawka: tylko root lub węzły pod własnym katalogiem.
- `viber/skills/rules/SKILL.md:62,102` - brak ponownego mapowania po resecie (w przeciwieństwie do `memory/SKILL.md:58`); writer dostaje mapę z usuniętymi plikami.
- `viber/skills/rules/SKILL.md:97` - wczesne zakończenie ignoruje `OVER-FILE`/`OVER-DIR`; reguła ponad budżet zostaje nieskompaktowana.
- `viber/skills/rules/SKILL.md:70,102` vs `rules-writer.md:28` - writer dostaje całą mapę i przenosi reguły, które użytkownik pominął.
- `viber/agents/rules-auditor.md:50` (i `memory-auditor.md:38`) - slug `/` -> `-` koliduje (`frontend-pagination.md` i `frontend/pagination.md`); równoległe audyty nadpisują się.

### Setup

- `viber/skills/setup/SKILL.md:29` + `merge-settings.sh:59` - domyślny cel `.claude/settings.json` względny wobec cwd; z podkatalogu powstaje `sub/.claude/settings.json` (odtworzone). Poprawka: `git rev-parse --show-toplevel`.

## Low

- `viber/scripts/config.sh:119` - komentarz "three tiers", a tierów jest cztery (z `fable`).
- `viber/scripts/config.sh:82` - `grep -qiE "^[[:space:]]*${key}..."` akceptuje klucze wcięte i dowolną wielkość liter, sprzecznie z nagłówkiem (l. 17-18, 34-35).
- Heredoc, zakazany w root `CLAUDE.md`: `merge-settings.sh:89`, `memory-map.sh:165,206,262,320`, `rules-map.sh:354`, `plan-gate.sh:122-146` (pusty wynik w `plan-gate.sh` daje deny zamiast obiecanego fail-open).
- `viber/hooks/scripts/plan-gate.sh:26-32` - blok `Contract:` bez cwd, argv, env.
- `permissionMode: acceptEdits` w `memory-auditor.md`, `memory-writer.md`, `rules-auditor.md`, `rules-writer.md` - pole ignorowane dla subagentów pluginów.
- `viber/agents/planner-review.md:1-9` - brak `effort:` i zdania "Input is fully resolved - never ask the user." (`.claude/rules/agent-frontmatter.md`).
- `<!-- TASK -->` niezakotwiczony w `plan-index.sh:304`, `plan-path.sh:197`, `commit-task.sh:210`, `archive-run.sh:170`; wzmianka w treści planu liczy się jako fantomowe zadanie.
- `viber/scripts/archive-run.sh:228` - `git rm` bez `|| exit 5` (pod `set -e` wychodzi z kodem 128).
- `archive-run.sh:169-180`, `plan-path.sh:143-158` - "niedokończone" porównuje liczby wpisów, nie zbiory identyfikatorów; `--skip` przyjmuje np. `C1` lub zadanie już zrobione.
- `viber/scripts/commit-task.sh:716` - `review-$task_id-*.md` łapie raporty `T1-b` przy commicie `T1`.
- `commit-task.sh:297-301,318-320,587-589` - brak normalizacji wiodącego `./` (robi to `plan-index.sh:368`).
- `commit-task.sh:120-121` - nagłówek nie opisuje stdout form `--chore`, `--qa`, `--e2e`, `--skip`.
- `viber/skills/implementor/SKILL.md:34` - `retry` po PASS z niepełnym `DOD:` ma pusty `reason:`.
- `implementor/SKILL.md:131,151-153` - dispatch test-runner, memory-writer, rules-writer, qa-writer bez jawnego "no `model:`".
- `implementor/SKILL.md:4` - `allowed-tools` zawiera `Read`, a treść mówi "Open no file".
- `implementor/SKILL.md:43,60` - `<plan>` niepowiązany jawnie z linią `path:`; skrypty wymagają cwd = root repo.
- `viber/CLAUDE.md:41-42` - repair coder działa na `sonnet` (clamp), nie na tierze zadania.
- `viber/CLAUDE.md:70` - "plan.md frozen, nothing writes it again", a planner przepisuje `source:` szkicu.
- `viber/agents/test-runner.md:37,40` - sprzeczne "one line"; linia `FAILED:` nieczytana przez implementora ani niewymieniona w `viber/CLAUDE.md:38`.
- `viber/references/test-strategy.md:7` - reguła testów jednostkowych absolutna, sprzeczna z l. 11 i 22 (zadania `TDD: none`).
- `viber/scripts/plan-index.sh:460,470` - wyjątek legacy dla kontraktów bez `File:` obejmuje też nowe plany.
- `viber/scripts/plan-index.sh:19-21`, `plan-rules.md:12` - przykładowe tytuły `chore:`/`feat:` i "committed verbatim", a commit ma `T<n> - <title>` bez `###`.
- `viber/references/plan-rules.md:19,26,36` - Exclusive, Reproduced, Block body oznaczone `(review)`, choć skrypt już je wymusza.
- `viber/skills/planner/SKILL.md:34` - "keep every section" sprzeczne z "otherwise drop this section" w szablonach.
- `viber/skills/idea/SKILL.md:46` vs `:15` - "never offer draft mode" vs pytanie o kolejną rundę szkicu.
- `viber/references/qa-format.md` + `qa-writer.md:31` - `## Out of scope` tylko w `qa.md`; build tylko z API nie ma gdzie wpisać powodu.
- `viber/references/qa-format.md:3` - zaszyte `docs/_specs/` mimo konfigurowalnego `directories.runs`.
- `viber/skills/e2e/SKILL.md:30` - fallback bez argumentu szuka tylko w `docs/<specs>/`, pomija niezarchiwizowane przebiegi.
- `viber/skills/e2e/SKILL.md:80` - brak skoku do kroku 7, gdy wszystkie ID skończyły FAIL; `--e2e` wychodzi z exit 4.
- `viber/skills/e2e/SKILL.md:24` - zdanie o klasyfikatorze nieprawdziwe przy gołym `Bash` w `allowed-tools`; narracja w kontrakcie.
- Root `CLAUDE.md` - katalog e2e "the host's instructions name", a skill bierze go także z odpowiedzi użytkownika.
- `viber/scripts/check-playwright.sh:54` - sprawdza tylko główny `package.json` (monorepo).
- `memory-map.sh:41-44,113`, `rules-map.sh:60-61,185-186` - `wc -c` liczy bajty, dokumentacja mówi o znakach; polski tekst szybciej przekracza budżet.
- `viber/agents/rules-writer.md:38` - `wc -c` na katalogu nie działa, a Bash ograniczony do `wc -c`, `rm`, `rmdir`.
- `viber/references/rule-admission.md:15` - "max two new rule files per run" koliduje z podziałem na plik per konwencja.
- `viber/skills/rules/SKILL.md:85` vs `rules-auditor.md:21` - scope reguły całego repo przekazywany jako katalog zamiast globu `**`.
- `viber/agents/memory-auditor.md:38` - slug dla roota niezdefiniowany (`.-audit.md` lub `-audit.md`).
- `viber/agents/memory-writer.md:17` - zbędna linia "Read the existing CLAUDE.md nodes" (lint WARN, w treści fałszywy alarm).
- `viber/README.md:15` - "No dependencies." nieprawda (`node` dla setup, Playwright dla e2e).
- `viber/skills/setup/SKILL.md:24-25` - opis scalania pomija usuwanie wpisów `ask` z `deny`.
- `viber/skills/setup/scripts/bootstrap.sh:165` - nie rozpoznaje `/.temp/`, `.temp/*`, `.temp/**`; dopisuje duplikat.
- `.claude/viber.yml` - nieaktualny względem szablonu (komentarz l. 1 i 3, brak `tiers:`).
- `.claude/rules/_common.md:10` - myślnik em (jedyny w repo poza `docs/`).
- `.claude/rules/shell-preload-contract.md:12`, `shell-script-header.md:14`, `plugin-manifests.md:10` - nieaktualne liczniki (skrypty z preloadem, 13 skryptów, 9 skilli); brak `archive-run.sh` na liście wywołań runtime.

## Bez zastrzeżeń

- Budżety 12000/32000 i 4000/40000 zgodne w doktrynie, skryptach i skillach.
- Zamrożony plik reguł `_` obsługiwany po basename, także w podkatalogach.
- Słownik linii wyjścia agentów (`VERDICT:`, `AUDIT:`, `OVER:`, `FILES:`, `MOVE:`, `DRIFT:`, `PATH:` i in.) zgodny z gałęziami czytającymi, poza wymienionymi wyżej.
- `plugin.json`: 9 skilli, 12 agentów, żaden w obu tablicach; opisy agentów wskazują właściwe skille; flagi `user-invocable` i `disable-model-invocation` zgodne z `viber/CLAUDE.md`.
- Przełączniki (`adr`, `memory`, `rules`, `qa`, `cleanup`, `directories.*`, `tiers.*`) zgodne w szablonie, `config.sh`, README, `usage.md` i skillach.
- Sekcja "Stop what you started" identyczna w task-coder, task-reviewer, test-runner, e2e-writer.
- Każdy preload i wywołanie skryptu to jedna dosłowna linia z pasującym wzorcem `allowed-tools`.
- Wszystkie 13 skryptów `.sh` ma 100755, brak CRLF, brak osieroconych tagów zamykających, brak myślników em/en w `viber/`.
- Hook SessionStart: pomija resume, fail-open, wstrzykuje manifest dosłownie; manifest nie nazywa skilli.
- Dosłowne dopasowania w plan-gate zgodne z prawdziwymi transkryptami.
