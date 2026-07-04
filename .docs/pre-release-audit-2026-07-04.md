# Audyt przedwydaniowy — pełny przegląd repozytorium

**Data:** 2026-07-04 · **Stan:** HEAD `18d4bfb` (branch `main`, 2 commity przed tagiem `0.13.7`)
**Metoda:** 6 równoległych, niezależnych audytów (superbuild pipeline · superdev pozostałe · superui · supergh · superfix · warstwa root/katalog/CI). Wszystkie skrypty deterministyczne uruchomiono na macOS (`/bin/bash` 3.2), najcięższe podejrzenia zweryfikowano **empirycznie** w piaskownicach (repo nietknięte); fakty o API GitHuba sprawdzono na żywym schemacie (`gh` 2.92.0, introspekcja GraphQL + `/versions`). Zero zmian w kodzie — raport tylko-do-odczytu.

**Bilans:** 4 × Critical · 11 × High · 31 × Medium · ~55 × Low · 12 tematów do przeglądu architektonicznego.

Legenda ID: `C` Critical, `H` High, `M` Medium, `L` Low. W nawiasie plugin. „Repro" = minimalny scenariusz odtworzenia.

---

## CRITICAL — blokery wydania

### C1 (superdev/superbuild) — Pliki nieśledzone są niewidzialne dla całego łańcucha weryfikacji diffowej
- **Pliki:** `superdev/skills/superbuild/agents/task-reviewer.md:43` (`task_files = git diff --name-only <task_base_sha>`), `agents/coder.md:77` (verify-before-revert), `agents/improver.md:58` (`git diff --name-only HEAD`).
- **Defekt:** `git diff <sha>` nigdy nie obejmuje plików nieśledzonych, a nic w pipeline nie robi `git add` przed etapem commitu (`commit-task.sh` z `git add -A` jest pierwszy). Każdy **nowy plik** (nowy moduł, nowy plik testów — normalny przypadek) jest nieobecny w `task_diff`.
- **Repro:** Task 1 = „utwórz moduł X + testy" na czystym drzewie → coder pisze wyłącznie nowe pliki → reviewer widzi pusty `task_diff` → kontrakt wymusza `Deliverable missing → CRITICAL → FAIL` → pętla retry, której coder nie może przerwać (verify-before-revert też nie widzi plików → ping-pong PASS/FAIL aż do wyczerpania limitu). Efekt wtórny: zbłąkany plik nieśledziony jest niewidoczny dla recenzji, ale **zostaje scommitowany** przez `git add -A`.
- **Dlaczego Critical:** łamie flagowy pipeline w najczęstszym typie zadania i dziurawi integralność bramki recenzji (kod trafia do commita bez przeglądu). Pisany kontrakt wprost zakazuje kompensacji („never a bare `git diff`", każda linia `## Issues` musi cytować linię z `task_diff`).
- **Fix:** przed liczeniem `task_diff` wykonać `git add -N -- . ':(exclude).superdev/.workflows'` (intent-to-add) w workflow, ALBO w task-reviewer Step 0 policzyć `task_files` = diff ∪ pliki `??` z `git status --porcelain` (nowe pliki jako hunki all-added). Tę samą regułę zdublować w coder verify-before-revert i improver Step 3.1. → patrz ARCH-1.

### C2 (superfix) — SKILL.md woła bundlowane skrypty gołą ścieżką względną — komendy nie istnieją z poziomu repo hosta
- **Pliki:** `superfix/skills/code-auditor/SKILL.md:58-61` (`bash scripts/collect_signals.sh …`), `:77-83` (`python3 scripts/rank.py …`).
- **Defekt:** skill działa w sesji głównej z cwd = projekt hosta; `scripts/…` rozwiązuje się względem repo hosta, nie katalogu instalacji pluginu. W całym superfix nie ma ani jednego `${CLAUDE_PLUGIN_ROOT}`/`${CLAUDE_SKILL_DIR}` (zweryfikowane grepem).
- **Repro:** `/superfix:code-auditor` w dowolnym repo konsumenta → Faza 1: `bash: scripts/collect_signals.sh: No such file or directory`. Model musi improwizować ścieżkę przy każdym uruchomieniu.
- **Dryf synchronizacji:** `superui/skills/design-audit/SKILL.md:66,73,82` już to naprawiło (`"${CLAUDE_SKILL_DIR}/scripts/…"`); brak backportu.
- **Fix:** poprzedzić oba wywołania `${CLAUDE_SKILL_DIR}` (lub `${CLAUDE_PLUGIN_ROOT}/skills/code-auditor`), w cudzysłowach — jak w design-audit.

### C3 (repo) — Brudne drzewo robocze przy wydaniu: 14 śledzonych plików `.claude/` skasowanych, lustrzane kopie w nieśledzonych katalogach `___`
- **Stan:** nieostage'owane kasacje wszystkich 5 `.claude/rules/*.md` i 9 `.claude/skills/**`; nieśledzone `.claude/rules___/` i `.claude/skills___/` — zawartość **bajtowo identyczna** z wersjami śledzonymi (zweryfikowane diffem). To lokalny „disable-rename" (wyłączenie dev-reguł na tę sesję).
- **Ryzyko:** dowolny `git commit -a` — albo własny skill `supergh:commit` w trybie `all` — ostage'uje 14 kasacji i trwale usunie śledzone konwencje deweloperskie, podczas gdy jedyna kopia zostanie w katalogach `___` niewidocznych dla `git ls-files`.
- **Fix:** przed następnym commitem: `git checkout -- .claude/` + usunąć lustrzane `___`, ALBO świadomie scommitować jawną, przejrzaną zmianę. **Nie wydawać z tego drzewa bulk-commitem.** → patrz ARCH-11.

### C4 (repo/CI) — Automatyczne wydania nie istnieją, a dokumentacja twierdzi, że działają; naprawa buga już „leży na podłodze"
- **Pliki:** `CLAUDE.md` (sekcja Versioning: „auto-version.yml patch-bumps on every push to main…"), `.github/scripts/release.sh:12-14` (komentarz o guardzie pętli). Workflow `.github/workflows/auto-version.yml` **nie istnieje** — celowo usunięty commitem `113c8ee` (2026-06-24).
- **Repro/konsekwencja:** push na `main` → brak bumpa, brak taga, brak release'u. Już obserwowalne: HEAD jest 2 commity przed `0.13.7`, w tym `18d4bfb` — fix wysłanego buga (`route.sh` plugin-root placeholder), którego **żaden konsument nie dostanie przez `/plugin update`**, dopóki ktoś ręcznie nie odpali `release-version.yml`. Agent kierujący się CLAUDE.md założy, że merge = wydanie.
- **Dlaczego Critical:** przy wydaniu „za chwilę" oznacza to, że deklarowany kanał dostarczania poprawek jest fikcją dokumentacyjną.
- **Fix:** (a) zaktualizować CLAUDE.md + nagłówek release.sh na „wydania wyłącznie ręczne przez workflow_dispatch", ALBO (b) przywrócić auto-workflow z guardem `chore(bump)`. Jedno z dwojga — dziś tekst nie opisuje żadnej rzeczywistości. Przed wydaniem: odpalić release, żeby `18d4bfb` wyszedł. → patrz ARCH-10.

---

## HIGH

### H1 (superdev/superbuild) — `${CLAUDE_PLUGIN_ROOT}` w ciałach agentów pluginowych bez zweryfikowanej ścieżki rozwiązywania
- **Pliki:** `superdev/skills/superbuild/agents/commiter.md:24`, `runner.md:16,39`, `coder.md:57-60`.
- **Defekt:** w skillach harness podstawia token; w ciałach **agentów** rozwiązanie zależy od exportu env do Basha agenta lub od tego, że LLM zna katalog instalacji. `Read` w ogóle nie rozwija zmiennych środowiskowych. Historia repo (`18d4bfb`) pokazuje, że to żywa klasa błędów.
- **Repro (warunkowe):** jeśli `CLAUDE_PLUGIN_ROOT` nie jest w env agenta → `commiter` nie znajduje `commit-task.sh` → każde zadanie kończy się hard-stopem `commit MALFORMED`; `runner` nie wczyta rdzenia executora ani persistera → improwizowane raporty.
- **Fix:** zweryfikować raz w żywej sesji konsumenta; jeśli rozwiązywanie po stronie agenta nie jest gwarantowane — przekazywać **rozwiązane ścieżki absolutne** w promptach budowanych przez `task-pipeline.workflow.js` (workflow dostaje je już rozwiązane z dyspozytora). → ARCH-2.

### H2 (supergh) — `verify-landed.sh` fałszywie raportuje „nothing to commit" w trybie `all`, gdy drzewo ma wyłącznie pliki nieśledzone
- **Plik:** `supergh/skills/commit/scripts/verify-landed.sh:88`.
- **Defekt:** dowód no-op w trybie all to `git diff --quiet && git diff --cached --quiet` — a `git diff --quiet` ignoruje pliki nieśledzone, czyli dokładnie te, dla których istnieje `git add -A`.
- **Repro (potwierdzone w piaskownicy):** drzewo zawiera tylko `?? newfile.txt`; fork fabrykuje linię ✓ (lub pada) bez uruchomienia `commit.sh`; HEAD niezmieniony → skrypt drukuje `nothing to commit` zamiast `not-landed`. Backstop retry nigdy nie odpala; użytkownik słyszy „nie było nic do commitu", a jego nowe pliki leżą niescommitowane — dokładnie ten przypadek fabrykacji, przed którym skrypt miał chronić.
- **Fix:** w trybie all sprawdzać `[ -z "$(git status --porcelain 2>/dev/null)" ]` (albo dodać test pustości `git ls-files --others --exclude-standard`).

### H3 (supergh) — `projects-v2.md` dokumentuje nieistniejącą mutację GraphQL
- **Plik:** `supergh/skills/cli/references/projects-v2.md:21`.
- **Defekt:** „Manage single-select options … `updateProjectV2SingleSelectField`" — **żywa introspekcja schematu: taka mutacja nie istnieje.** Opcje zarządza się przez `updateProjectV2Field` (z `singleSelectOptions` w input).
- **Repro:** cli-executor kopiuje nazwę dla „rename option" → `undefinedField`; w najgorszym razie potem improwizuje. To plik, którego deklarowanym celem jest zapobieganie nazwom mutacji „z pamięci".
- **Fix:** zmienić na `updateProjectV2Field`. (Pozostałe sprawdzone nazwy istnieją: `addSubIssue`, `removeSubIssue`, `reprioritizeSubIssue`, `updateIssueIssueType`, `updateProjectV2ItemPosition`, `createIssueType`.)

### H4 (supergh) — `issues.md`: fałszywe twierdzenie, że `-F labels='["bug","triage"]'` parsuje JSON
- **Plik:** `supergh/skills/cli/references/issues.md:43-44,49`.
- **Defekt:** magiczna konwersja `-F` obejmuje tylko true/false/null/int/placeholdery/`@file` — tablice wymagają składni `key[]=value`. Jak napisano, poleci literalny string `["bug","triage"]` → 422.
- **Fix:** `-f 'labels[]=bug' -f 'labels[]=triage' -f 'assignees[]=octocat'`.

### H5 (superfix) — Niezakotwiczony regex wykluczeń w `collect_signals.sh`: realne katalogi źródłowe po cichu wypadają ze sweepa, a pliki `.min.` wchodzą
- **Plik:** `superfix/skills/code-auditor/scripts/collect_signals.sh:41`.
- **Defekt:** `(^|/)(node_modules|dist|build|out|vendor|third_party|\.min\.|…)` bez domykającej kotwicy `(/|$)` — nazwy katalogów łapią jako prefiksy segmentów; odwrotnie `\.min\.` dziedziczy prefiks `(^|/)` i nigdy nie łapie w środku nazwy.
- **Repro (wykonane):** `src/outbox/mail.py`, `builder/core.ts`, `src/distutils_helper.py`, `building/plan.ts` — **błędnie wykluczone** (dziura pokrycia: żaden scout ich nie oceni); `app.min.js` — **zachowany** (zmarnowane tokeny, przekłamane `loc`).
- **Dryf:** kopia superui (linia 84) jest poprawna i ma test (case 8). Superfix zdryfował na stronę z bugiem.
- **Fix:** przyjąć kształt superui: alternatywa katalogów zakotwiczona `(/|$)`, wzorce `\.min\.` / `\.map$` poza zakotwiczoną grupą.

### H6 (superfix) — `collect_signals.sh` kończy się kodem 1 na repo bez plików-kandydatów (pusty wynik ≠ sukces)
- **Plik:** `collect_signals.sh:17,40-43`.
- **Defekt:** `set -euo pipefail` + potok `git ls-files | grep | grep | while` — grep bez trafień zwraca 1, `pipefail` propaguje.
- **Repro (wykonane):** repo z samym `README.md` → pusty output, `exit=1`; orkiestrator widzi „nieudany" Bash i błędnie diagnozuje sweep.
- **Dryf:** superui osłania identyczny filtr `|| true` (linie 83-85) i pinuje testem (case 6). Brak backportu.
- **Fix:** wzorzec superui (`|| true` na etapie filtrów).

### H7 (superdev) — `scan_extensions.test.sh` pada na macOS (padding BSD `uniq -c`) — 3/6 testów czerwone na platformie autora
- **Plik:** `superdev/skills/memory-rules/scripts/scan_extensions.test.sh:58,138,164`.
- **Defekt:** przypadki 1/5/6 asertują dokładny padding kolumn GNU `uniq -c` (7 znaków); BSD uniq daje 4 → suite `FAILED (3/6)` (zweryfikowane uruchomieniem). Sam skrypt (SUT) działa poprawnie — nieprzenośne są asercje. Model repo brzmi „testy to jedyne enforcement"; suite czerwona z natury maskuje realne regresje.
- **Fix:** znormalizować whitespace przed porównaniem (np. `awk '{print $1, $2}'`) i poluzować nagłówek kontraktu SUT (`scan_extensions.sh:13-15` nadspecyfikowuje padding).

### H8 (superdev) — Tryb C `memory-rules` przepuszcza swobodny tekst LLM przez `!`-injektowany router (shell-injection, który sam plugin dokumentuje dla trybu D)
- **Pliki:** `superdev/skills/memory-rules/SKILL.md:40` (`` !`".../route.sh" "$ARGUMENTS"` ``), `references/mode-c.md:7`; wywołujący potwierdzony: `superdev/skills/superbuild/agents/improver.md` Step 3 (przekazuje learningi + listę plików verbatim jako argument Skill).
- **Defekt:** `$ARGUMENTS` jest tekstowo wklejany do injektowanej komendy shellowej. `references/mode-d.md:9` wprost nazywa zagrożenie („Free-form user text (`"`, `` ` ``, `$`) can break the `!`-injected router") i mityguje je golym markerem — tryb C prowadzi wieloliniowy, pochodzący z recenzji tekst (cytaty kodu z `"`, backtickami, `$( )`) przez ten sam router **bez żadnej mitygacji**.
- **Repro:** learning z recenzji zawiera `"` (np. `use "problem+json" shape`) → improver przekazuje → injektowana linia `route.sh "..."` się łamie; w najgorszym razie fragmenty wykonują się przez backtick/`$()`.
- **Fix:** wyrównać tryb C do inwariantu file-based-dispatch: improver przekazuje tylko `Mode: improver` + ścieżkę pliku z learningami; tryb C robi `Read`. Alternatywnie: `route.sh` routuje wyłącznie po pierwszej linii argów i nigdy nie re-emituje reszty. → ARCH-3.

### H9 (superui) — `preview_component.py` emituje niepoprawny CSS — cały chrome podglądu bez stylów przy każdym uruchomieniu
- **Plik:** `superui/skills/create-component/scripts/preview_component.py:37-52` vs `:109-112`.
- **Defekt:** `PAGE_TEMPLATE` używa podwojonych klamer w stylu `.format()` (`.cc-body{{margin:0;…}}`), ale renderowany jest przez `.replace()` — podwojone klamry trafiają do outputu verbatim; każda reguła `cc-*` to niepoprawny CSS odrzucany przez przeglądarkę.
- **Repro (zweryfikowane):** uruchomienie na stubowym `tokens.css` + fragmencie → linia 11 outputu: `.cc-body{{margin:0;…` — pasek nagłówka, etykiety, scena, dark-mode chrome bez stylów. 100% uruchomień.
- **Fix:** odwrócić podwojenie klamer w bloku CSS (potok `.replace()` wymaga pojedynczych), albo przejść na `string.Template`.

### H10 (superui) — `allowed-tools: Bash(sh:*)` we wszystkich pięciu skillach z narzędziami nie pokrywa ŻADNEJ realnie uruchamianej komendy
- **Pliki:** `design-audit/SKILL.md:7`, `web-preview/SKILL.md:4`, `adapt-target/SKILL.md:4`, `create-component/SKILL.md:4`, `extract-design-system/SKILL.md:4`.
- **Defekt:** jedyny wzorzec Bash to `sh …`, a każda udokumentowana komenda to `bash "${CLAUDE_SKILL_DIR}/…"`, `python …`, `mkdir -p …`, `date …`. Zależnie od semantyki `allowed-tools`: stałe tarcie promptów uprawnień, albo — przy restrykcyjnej — zablokowane Read/Write/Task (design-audit nie wyśle scoutów, web-preview nie zapisze fragmentów). Model zmuszony do `sh` wyłoży `collect_signals.sh` na Linuksie (`set -euo pipefail` nie jest dash-kompatybilne).
- **Fix:** per skill wyliczyć realny zestaw (wzorem superdev/supergh), np. design-audit: `Read, Glob, Grep, Write, Task, AskUserQuestion, Bash(bash:*), Bash(python:*), Bash(python3:*), Bash(mkdir:*), Bash(date:*)`. → ARCH-4.

### H11 (superfix+superui, wspólny) — `rank.py` gubi hotspoty powyżej `--top`: nie trafiają ani do hotlisty, ani do pominiętych, a liczniki się nie sumują
- **Pliki:** `superfix/skills/code-auditor/scripts/rank.py:109-110,120-131`; identycznie `superui/skills/design-audit/scripts/rank.py:108-109`.
- **Defekt:** `hotspots = [rows][:top]`, `skipped = [non-HOTSPOT]` — wiersze HOTSPOT za `--top` znikają z obu list; `counts.hotspots` raportuje liczbę po obcięciu.
- **Repro (wykonane):** 5 plików 5×5 z `--top 2` → JSON: `scored 5, hotspots 2, skipped 0`; 3 pliki nad bramką nigdzie nie występują. Łamie kontrakt `scoring.md` („keep the rest in the hotlist…", „open new fronts later" — Faza 6 nie ma do czego wracać).
- **Fix:** nadmiarowe wiersze HOTSPOT do `skipped` z kwadrantem `HOTSPOT-deferred` (lub trzecia lista `deferred`); raportować `cleared_gate` i `dispatched` osobno. Testy `rank.test.sh` (tylko superui!) nie pokrywają tego przypadku. → ARCH-9.

---

## MEDIUM

### superdev — pipeline superbuild

**M1 — `base.sha` nie zapisuje się, gdy commit Taska 1 to `no-changes`; final review dostaje złą bazę.**
`superdev/skills/superbuild/SKILL.md:320-329` (zapis tylko w gałęzi `commit.kind == "sha"` i tylko `N == 1`), `references/final-review.md:14-24`. Repro: idempotentny Task 1 → fallback `git merge-base HEAD main`; na feature-branchu od starego `main` `plan.diff` zawiera cudze commity; na samym `main` → **pusty diff** i cztery lensy jakości PASS-ują „na pusto"; repo bez brancha `main` (np. `master`) → komenda pada. Fix: utrwalać `base.sha` przed pętlą (po `Recipe: ready`, gdy drzewo jest dowodnie czyste), albo zapisywać także w gałęzi `no-changes`.

**M2 — Dyspozytor i task-reviewer niezgodni co do „runnable gate", a walidator nie odrzuca niespójnego kształtu → niewygrywalna pętla FAIL.**
`SKILL.md:276-277` (runnable ⇔ `- Tests:` ≠ none) vs `agents/task-reviewer.md:60` (guard po `## Mode`) vs `superbuild-decomposer/scripts/validate_tasks.py:113-119` (przepuszcza `- Tests: none` na runnable mode). Repro: task `Mode: code-first-then-tests` + gate `- Tests: none` → `VALIDATE_OK` → runner pominięty → reviewer: CRITICAL `[Gate did not run]` → coder nie może tego naprawić (nie edytuje pliku taska) → wyczerpanie limitu. Fix: w `validate_tasks.py` dla runnable modes odrzucać `- Tests: none` (nowy check `gate-tests-none-on-runnable`); ujednolicić źródło prawdy dla `taskGateRunnable`.

**M3 — LLM-owy `Commit-subject:` interpolowany w linię shellową dyspozytora (wektor injection).**
`SKILL.md:138,395` (`bash(f'bash ".../commit-adr.sh" "{subject}"')`). Temat z forka, którego kontekst zawiera dowolną treść planu/diffa; `"`/`$( )`/backtick łamie cytowanie — w najlepszym razie nieudany commit, w najgorszym injection do shella sesji głównej. Ścieżka per-task już to zamknęła (`commit-task.sh` sam wyprowadza temat z pliku). Fix: temat out-of-band — plik `adr-subject.txt` albo stdin. → ARCH-5.

**M4 — Niezgodności `allowed-tools` vs komendy w preambułach `!` w fork-skillach.**
`superbuild-decomposer/SKILL.md:8` vs `:44` (`find` nieobjęty `Bash(bash:*, python3:*, cat:*)`); cztery lensy (`superbuild-reviewer-*/SKILL.md:8,17`) deklarują `Bash(sh:*), Bash(cat:*)`, a linia `!` woła skrypt **bezpośrednio**; `superbuild-adr`/`-docs` zaczynają bloki `!` przypisaniami zmiennych + heredocami niepasującymi do wzorców. Repo zawiera dwie sprzeczne hipotezy, czy preambuły `!` są sprawdzane wobec `allowed-tools` — jeśli tak, ciała czterech lensów **nie wstrzykują się w ogóle** (lens = 17-liniowy stub bez kontraktu). Fix: wybrać jeden model i znormalizować (`sh "${CLAUDE_PLUGIN_ROOT}/…"`, dodać `Bash(find:*)`), albo usunąć mylące uzasadnienia grantów. → ARCH-4.

**M5 — Re-inwokacja eskalacyjna resetuje `attempt` do 1 i nadpisuje raporty audytowe pierwszego przebiegu.**
`scripts/task-pipeline.workflow.js:169-213` (nazwy raportów kluczowane tylko `attempt`), `SKILL.md:256` (`orch_dir` stały per task). Retry po eskalacji nadpisuje `coder-1.md`/`runner-1.md`/`task-reviewer-1.md`; dodatkowo dwa miejsca piszą `unblock-coder-<attempt>.md` (drugi nadpisuje pierwszy). Stan funkcjonalny OK, ślad audytowy dla diagnostyki eskalacji — cicho niszczony. Fix: licznik inwokacji w ścieżce (`task-<N>/run-2/`) + rozróżnić `unblock-runner-K.md`/`unblock-review-K.md`.

**M6 — Unblock w fazie recenzji unieważnia dowód runnera, ale runner nie jest ponownie uruchamiany.**
`task-pipeline.workflow.js:317-342`, `references/retry-policy.md:59-61`. Runner PASS → reviewer BLOCKED → unblock coder edytuje kod → restart tylko reviewera → commit ląduje z raportem runnera sprzed edycji — „fizyczna weryfikacja" nieaktualna dokładnie dla ostatnio zmienionego kodu. Fix: po udanym unblocku w fazie recenzji wracać do przebiegu runnera (gdy `taskGateRunnable`), albo jawnie udokumentować akceptowane ryzyko. → ARCH-6.

### superdev — pozostałe

**M7 — Fork-only reviewery bez `user-invocable: false`.**
`superdev/skills/superplan-reviewer/SKILL.md:1-8`, `superspec-reviewer/SKILL.md:1-8`. Oba są „invoked only by …", a użytkownik dostaje `/superdev:superplan-reviewer` i `/superdev:superspec-reviewer` jako komendy (w odróżnieniu od `self-reviewer` i wszystkich forków `superbuild-*`). Fix: dodać `user-invocable: false`.

**M8 — Bundlowany szablon gitignore jest specyficzny dla P2P2/.NET — łamie inwariant stack-agnostic.**
`superdev/skills/setup/assets/gitignore.txt` (381 linii; `# P2P2`:318, `appsettings.DevMachine.json`:319, `backend/TimeHarmony/build/`:326, ~300 linii szumu VS/Rider/.NET). `bootstrap.sh` sieje to verbatim jako `.gitignore` świeżego hosta, a `lib_find_excludes.sh:99` używa jako globalnego fallbacku. Repro: `/setup` w świeżym repo Pythona → `.gitignore` pełen `[Bb]in/`, `*.suo`, resztek cudzego projektu. Fix: minimalny generyczny szablon (`.temp/`, `.DS_Store`, `node_modules/`, logi, szum OS/edytorów). → ARCH-7.

**M9 — `bootstrap.sh`, gałąź settings.json: brak guarda szablonu i raportu przy niepowodzeniu.**
`superdev/skills/setup/scripts/bootstrap.sh:72-76`. W odróżnieniu od pozostałych gałęzi brak `[ -f "$src_settings" ]` i `else`-raportu — brak assetu = zero linii `settings.json:` w outputcie, exit 0 (kontrakt nagłówka `:42` obiecuje „reported, not fatal"). Fix: odbić wzorzec pozostałych gałęzi (`elif [ -f … ] … else echo "settings.json: template missing — skipped"`).

**M10 — Dryf CLAUDE.md vs manifest/handoff: udokumentowane grupy/łańcuchy nie istnieją w artefaktach.**
`superdev/hooks/content/manifest.md` (całość) — CLAUDE.md twierdzi, że manifest dokumentuje „groups/roles + chains (np. improver → memory-rules)", a realny manifest zawiera tylko mandatory-rules/priority/decision-flow/temp-files. `superdev/skills/superspec/SKILL.md:78-81` — łańcuch `superspec → supergh:create-issue` z CLAUDE.md nie istnieje: handoff to **zamknięta** lista AskUserQuestion (superplan / Done), `supergh` nie występuje nigdzie w superdev (grep). Fix: przywrócić sekcję grup/łańcuchów + opcjonalną gałąź handoffu, ALBO poprawić CLAUDE.md. → ARCH-8.

**M11 — Szablony superspec nie są w stanie spełnić własnych hard rules / checklisty reviewera.**
`superdev/skills/superspec/templates/specification.en.md:65-75` (identycznie `.pl.md`) vs `superspec/SKILL.md:34-37` i `superspec-reviewer/SKILL.md:51-60`. Hard rules żądają user stories INVEST i „max 3 AC na story"; szablony **nie mają sekcji user stories** i mają płaską 6-punktową checklistę AC — spec wiernie wyrenderowany z szablonu pada w rundzie 1 recenzji z powodu struktury, którą sam szablon narzucił. Przykładowe AC („`npm test` passes") łamie regułę E (deklaratywny wynik biznesowy). Fix: dodać `## User stories` (story ≤3 AC) do obu szablonów, albo uwarunkować reguły story/AC.

**M12 — Twardo zakodowany polski komunikat w trybie D.**
`superdev/skills/memory-rules/references/mode-d.md:11` — `"Plan mode blokuje zapis reguł — wyjdź (Shift+Tab) i wywołaj ponownie"` emitowany bezwarunkowo w każdym języku sesji. Fix: komunikat po angielsku lub instrukcja „powiedz w języku użytkownika, że…".

**M13 — Bramka ExitPlanMode bez granicy świeżości: porzucony plan klinuje późniejsze wyjścia z plan mode.**
`superdev/hooks/scripts/review-plan.sh:77-108` (Step 1 kotwiczy na *ostatnim* zapisie `.claude/plans/*.md` gdziekolwiek wcześniej w transkrypcie). Repro: plan napisany → recenzja pominięta, użytkownik robi pivot („napisz mi spec") → superspec każe `ExitPlanMode` → pętla deny wobec martwego planu; plan z FAIL nie da się wyjść narzędziem w ogóle (ucieczka tylko ręcznym Shift+Tab). Fix (wymaga decyzji): ograniczyć Step 1 do zapisów po ostatnim wejściu w plan mode / wygaszać po N denyach na niezmienionym planie / kluczować po treści planu z wywołania. → ARCH-12.

### supergh

**M14 — `printf '\xe2\x9c\x93 …'` drukuje literalne `\xe2\x9c\x93` pod dash — linia kontraktu ✓ zepsuta na Debianie/Ubuntu.**
`supergh/shared/scripts/commit.sh:143`, `supergh/skills/commit/scripts/verify-landed.sh:69`. `\x` nie jest POSIX; oba skrypty odpalane `sh script` → dash. Potwierdzone pod `/bin/dash`: `\xe2\x9c\x93 a4ae7f4 …`. Linia jest user-facing kontraktem, `mode-fork.md` przekazuje ją verbatim. Fix: escapy ósemkowe `printf '\342\234\223 %s %s (%s files)\n'` (zweryfikowane pod dash) lub literalny ✓ w format stringu; oba pliki w synchronizacji.

**M15 — Przesłanka „silent-200 / exits 0" o `gh api graphql` jest fałszywa dla współczesnego gh.**
`supergh/skills/cli/references/graphql-patterns.md:62-69`, `cli/SKILL.md:41`, `cli-executor/SKILL.md:35-41`. Zweryfikowane na żywo (gh 2.92.0): błąd GraphQL = **exit 1** + `gh: <message>` na stderr. Guard `--jq '.errors // empty'` jest dobrą obroną w głąb, ale uzasadnienie fałszywe, a zalecenie „testuj output, nie exit status" wyrzuca prawdziwy sygnał błędu. Fix: przeredagować („traktuj niepuste `.errors` jako porażkę niezależnie od exit code; nowe gh dodatkowo zwraca 1"), guard zostawić.

**M16 — `mode-fork.md` odwołuje się do bloku `<head-before>`, którego ciało skilla nigdy nie tworzy.**
`supergh/skills/commit/references/mode-fork.md:9` vs `commit/SKILL.md:24-28` — Step 2 wstrzykuje zamrożony HEAD **bez tagów** (inaczej niż `<modified-files>` w Step 1). Cały backstop wisi na tym, że model wyłuska właściwy sha z nieotagowanego kontekstu. Fix: opakować injekcję Step 2 w `<head-before>…</head-before>`.

**M17 — Obietnica `mode-session.md` „stages ONLY those paths" jest fałszywa podczas trwającego merge'a.**
`mode-session.md:7,13` vs `shared/scripts/commit.sh:16-21,86`. Potwierdzone w piaskownicy: przy MERGE_HEAD `commit.sh paths …` produkuje commit scalenia zamiatający **cały staged merge** (a linia ✓ raportuje zawyżoną liczbę plików przez `diff-tree -m`). Playbook czytany przez model o tym milczy → resolver zapewni użytkownika, że scommitowano tylko pliki sesji. Fix: zdanie w mode-session.md (STOP/ostrzeżenie przy MERGE_HEAD) i nota o semantyce `-m` w nagłówku commit.sh. → ARCH-13.

**M18 — `create-pr` używa lokalnego `<base>..<current>` po zwalidowaniu wyłącznie `origin/<base>`.**
`create-pr/SKILL.md:79`, `references/auto-fill.md:10,42,71`. Na typowym setupie, gdzie `develop`/`main` nigdy nie było lokalnie wycheckoutowane, każda komenda zakresu pada („unknown revision") → tytuł spada do ręcznego prompta, auto-fill Summary/Test po cichu traci całe źródło. Fix: `origin/<base>..<current>` we wszystkich czterech miejscach.

**M19 — Fallbackowy szkielet szablonu PR twardo po polsku w stack-agnostic pluginie.**
`create-pr/SKILL.md:88-95` — przy braku `.github/pull_request_template.md` szkielet to `### Podsumowanie zmian` / `### Plan testów`, a reguły Body-format każą zachować nagłówki **verbatim** → anglojęzyczny host dostaje polskie sekcje PR. Fix: neutralny angielski szkielet albo jawne „przetłumacz nagłówki szkieletu na język rozmowy".

### superfix (+ wspólne z superui)

**M20 (wspólny, obie kopie) — Jeden nieczytelny plik przerywa cały sweep w połowie strumienia.**
`superfix/.../collect_signals.sh:58` i `superui/.../collect_signals.sh:92` (identyczna wada). Repro (wykonane): 3 pliki, środkowy `chmod 000` → JSONL urywa się przed nim, rc=1, każdy późniejszy plik nigdy nie zeskanowany — a obcięty output wygląda jak kompletny sweep. Testy superui **nie pokrywają** tego przypadku. Fix: `[ -r "$f" ] || continue` + `loc=$(wc -l < "$f" 2>/dev/null || echo 0)`; w superui dodatkowo domyślne wartości liczników (pusty `count()` → zniekształcony JSON `"raw_value_hits":,`).

**M21 (wspólny, obie kopie) — `rank.py` spłaszcza dwa progi `--min-*` do `min()` — kontrakt CLI jest fikcją.**
`superfix/.../rank.py:72` i `superui/.../rank.py:71` (`t = min(args.min_impact, args.min_opportunity)` na obie osie). Repro (wykonane, obie kopie): `--min-impact 4/5 --min-opportunity 2` → plik z impact 2 zostaje HOTSPOTEM wbrew progowi. Fix: oba progi do `quadrant()` (`impact >= t_i and opportunity >= t_o`), albo jeden `--threshold` zgodny z prozą `scoring.md`. → ARCH-9.

**M22 (superfix) — Scout ma nadane `Write` (i `Bash`), choć jego hard rule brzmi „Never edit files. You are read-only triage."**
`superfix/agents/scout.md:6` vs `:32`. Superui już usunęło Write z `design-scout.md:6`; brak backportu. Fix: usunąć `Write`.

**M23 (superfix) — Brak preflightu Pythona: Faza 3 twardo zakłada `python3` w PATH.**
`code-auditor/SKILL.md:78`. Na hostach z samym `python`/`py` (Windows) bramka pada w połowie biegu, **po** wydaniu tokenów na scouty. Superui ma preflight `check_python.sh` zatrzymujący przed wydatkiem. Fix: własna kopia preflightu (plugin self-contained) albo instrukcja „najpierw rozstrzygnij komendę Pythona; stop przed Fazą 2, jeśli brak".

**M24 (superfix) — `<run-id>` nigdzie niezdefiniowany; reużycie id po cichu zatruwa bramkę stęchłymi wynikami.**
`code-auditor/SKILL.md:52,69`. `mkdir -p` reużywa workspace; dopisywanie do istniejącego `scores.jsonl` miesza fale, a dedup rank.py **zachowuje wyższy wynik per ścieżka** (linia 101) — stare maksima z przerwanego biegu są niewymywalne. Superui naprawiło połowę timestampem (`RUN_ID="$(date +%Y%m%d-%H%M%S)"`). Fix: wyspecyfikować timestampowy run-id + zasada „run-id jednorazowy".

**M25 (superfix) — Dyspozycja „critic" w Fazie 5 nieokreślona.**
`SKILL.md:97` — agent `critic` nie istnieje (`agents[]`: scout/detective), a `detective.md` nie definiuje „verify-only mode" — orkiestrator improwizuje najbardziej krytyczny bezpieczeństwowo krok (anty-samozatrucie). Fix: konkretna instrukcja dysponowania `superfix:detective` z szablonem promptu verify-only, albo zdefiniować tryb w detective.md.

### superui

**M26 — `check_python.sh` certyfikuje „działający interpreter", nie Pythona 3.**
`superui/shared/scripts/check_python.sh:18-24`. Na hoście, gdzie `python` = Python 2, emituje `PYTHON_OK python`; każdy bundlowany skrypt umiera potem na `SyntaxError` (f-stringi) zamiast obiecanego czystego „install Python 3". Fix: walidacja wersji (`case "$ver" in Python\ 3*) …`), z zachowaniem fail-open exit-0.

**M27 — Fallback find w `collect_signals.sh` emituje ścieżki z prefiksem `./`, tryb git — gołe: pęka klucz merge'a signals↔scores.**
`superui/.../collect_signals.sh:78`; zweryfikowane: `{"path":"./ok.css",…}`. `rank.py` łączy po dokładnym stringu (`:74-78,92`) — mismatch po cichu gubi priory/`drift_hits` (tie-breaking). Dodatkowo `find ${SCOPE:-.}` bez cudzysłowów — scope ze spacjami się rozpada. Fix: `| sed 's|^\./||'` po find + cytowanie fallbacku.

**M28 — Sweep design-audit audytuje sam design system i wygenerowane podglądy.**
`collect_signals.sh:84`. `.superui/layout/design-system/tokens.css`, `targets/*/…css`, wygenerowane `.superui/layout/preview/**/*.html` (z konstrukcji gęste od surowych wartości) wchodzą do sweepa jako „pliki UI" — szum na szczycie hotlisty, spalone tokeny scout/detective; `.temp/` też niewykluczone. Fix: dodać `(^|/)\.superui(/|$)|(^|/)\.temp(/|$)` do wykluczeń.

**M29 — Agenci scout/detective odwołują się do plików pluginu, których nie mogą rozwiązać, a orkiestrator nie wstrzykuje tej treści.**
`design-audit/agents/design-scout.md:24` („anchors in `references/scoring.md`"), `design-detective.md:29` („schema in `references/synthesis.md`"); listy wejść orkiestratora (`SKILL.md:78,92`) nie zawierają ani kotwic 1-5, ani schematu raportu. Agenci działają z cwd = repo hosta, bez `${CLAUDE_PLUGIN_ROOT}` — `references/…` to martwa ścieżka; detektywi zaimprowizują format raportu, od którego zależy synteza Fazy 6. Fix: inline'ować kotwice/schemat do .md agentów, ALBO wkleić do każdego prompta w Fazie 3/5 (jak już robi to `route.sh` z rubryką). → ARCH-14.

**M30 — `tokens_to_tailwind.py`: seria potwierdzonych crashy/degradacji.**
(a) `:423,468` — brak katalogu wyjściowego = goły traceback `FileNotFoundError`, a udokumentowana pierwsza ścieżka (`-o targets/tailwind/theme.css`, `adapt-target/SKILL.md:117-118`) nie ma kroku mkdir; fix: `os.makedirs(dirname, exist_ok=True)` (build_site.py już to robi). (b) `:174-180` — stringowa warstwa cienia nie-alias → `AttributeError` (zweryfikowane); fix: przepuszczać surowe stringi verbatim. (c) `:356` + `:381-387` — aliasowany token radius w trybie shadcn emituje **cykliczną** zmienną CSS (`--radius: var(--radius-md)` przy `--radius-md: calc(var(--radius) * .8)`) — cała skala radius nieważna w computed-value time (zweryfikowane); fix: rozwiązywać alias do literału (lustro `resolve_color`). (d) `:415,423,468` + `validate_tokens.py:104` — `open()` bez `encoding="utf-8"` → `UnicodeDecodeError`/mojibake na Windows (platformie jawnie wspieranej); fix: dodać encoding.

**M31 — Dryfy dokumentacyjne i martwe narzędzia w skillach superui.**
(a) `adapt-target/references/tailwind.md:63-71` dokumentuje obsługę `org.tailwindcss.dark`, scaffolding `@custom-variant dark` i „warns on collisions" — nic z tego nie istnieje w skrypcie (dark działa tylko w `--shadcn`; kolizje bez detekcji; kompozyty pomijane hurtowo wbrew `:49-51`); fix: poprawić referencję (tańsze niż implementacja). (b) `build_site.py:440-443` — regex zewnętrznych referencji w trybie `standalone` false-positive'uje na komentarzach `//` w JS i payloadach base64 (`url(data:…base64,…//…)`) — poprawne strony **odmawiają publikacji** wbrew obietnicy `cc-artifact/SKILL.md:60-61,112-114` (zweryfikowane); fix: traktować `//` jako protocol-relative tylko w pozycjach referencji (`src=|href=|url(|@import`). (c) Nieistniejące narzędzia w instrukcjach: `present_files` (`design-audit/SKILL.md:95,102`; `web-preview/SKILL.md:258`; `create-component/SKILL.md:190`; `extract-design-system/SKILL.md:239`), `view` (`extract-design-system/SKILL.md:57`, `create-component/SKILL.md:108`), `web_fetch` (`extract-design-system/SKILL.md:63`) — zapraszają do improwizacji dokładnie w punktach hand-offu; fix: prawdziwe nazwy (Read/WebFetch) lub neutralna proza.

### repo / dokumentacja

**M32 — README.md mocno nieaktualne w sekcji superdev.**
`README.md:35` (lista skilli pipeline'u pomija 7 wydanych: `self-reviewer`, `superbuild-recipe`, `superbuild-docs`, cztery lensy; lista agentów pomija `runner`/`commiter`), `:78-81` („two switches: adr, rules_improver" — są **trzy** booleany + dwa klucze retry), `:79-82` (przedrenamowe nazwy `orchestrator`, `agent-adr-recorder`). Fix: zsynchronizować z `superdev/.claude-plugin/plugin.json` i obecnym `assets/config.yml`.

**M33 — Zacommitowany `.superdev/config.yml` nieaktualny wobec własnego assetu seed.**
`.superdev/config.yml:4-5,8` — komentarze z martwymi nazwami (`dev-agent-adr-recorder`, `dev-improver`, `mem-rules`), brak klucza `docs:`. Funkcjonalnie nieszkodliwe (fail-closed), ale to plik-przykład w repo źródłowym sprzeczny z wydawanym seedem. Fix: przekopiować z `superdev/skills/setup/assets/config.yml`.

---

## LOW

### repo / CI
- **L1** `release.sh` — trzy przypadki brzegowe: (a) `:63-73` recovery po padzie przed tagiem taguje bieżący HEAD (mogący zawierać cudze commity) zamiast commita bumpa — fix: tagować `git log --grep="chore(bump): … $new"`; (b) `:72-106` pad między pushem taga a `gh release create` = osierocony tag bez Release, rerun liczy już następną wersję — fix: backfill brakującego Release dla `current` przed liczeniem `new`; (c) `:68` dispatch z niedomyślnego brancha minta globalny tag z jego drzewa — fix: guard `[ "$GITHUB_REF_NAME" = main ]`.
- **L2** `.claude-plugin/marketplace.json:3` — `"version": "3.3.0"` poza wspólną przestrzenią wersji (0.13.7), nic go nie aktualizuje. Fix: synchronizować w release.sh albo opisać jako metadane ręczne.
- **L3** `.github/ISSUE_TEMPLATE/02-feature-request.yml` — `02-` bez siblinga `01-*`; top-level `type: "Feature"` wymaga skonfigurowanego typu issue na poziomie org (inaczej GitHub ukrywa szablon); szablon po polsku (issue tworzone przez `supergh:create-issue` w tym repo będą podążać za polską formą). `CODEOWNERS`: potwierdzić, że `@dario-l` ma write do `p2p2sp/p2p2.claude` (inaczej reguła po cichu ignorowana).
- **L4** `.docs/plan-mode-harnes.md` — literówka w nazwie pliku (`harnes`); zawiera sesyjną ścieżkę pliku planu (linia 4).
- **L5** `.docs/subagent-audit/` (nieśledzone, utworzone dziś) — propozycje przepisania 7 z 9 agentów pluginowych; praca w toku obok wydania → ARCH-15.

### superdev — pipeline
- **L6** `superbuild-decomposer/SKILL.md:17` + `copy_plan.sh:19` — stęchłe „Writes nothing outside `.temp/`", gdy Steps 7-8 piszą pod `.superdev/.workflows/`. Poprawić dwa stringi.
- **L7** `agents/improver.md:15,58` — proza twierdzi „just-committed task", a improver biegnie **przed** commitem; komenda działa tylko dlatego, że zmiany są jeszcze niescommitowane. Przeredagować, zanim ktoś „naprawi" kolejność pod prozę.
- **L8** `task-pipeline.workflow.js:259,268` — handshake contested-feedback pęka na granicy eskalacji: coder attempt 1 dostaje `Feedback:`, ale PASS zeruje `lastCoderReportPath`, więc reviewer nie dostaje `Previous coder report:` wbrew retry-policy. Fix: `lastCoderReportPath = (lastFailureReportPath !== '' || (attempt === 1 && feedbackPath)) ? … : ''`.
- **L9** `persist-report.sh:59` — podąża za podłożonym symlinkiem (guard tylko „exists && not regular"); `copy_plan.sh:42` ma właściwy wzorzec (`[ -L ]`) — odbić go.
- **L10** `task-pipeline.workflow.js:90` — nienumeryczny `retryMaxAttempts` → `Math.max(1, NaN)` = NaN → pętla 0 przebiegów → `FAIL, attempts:0` wbrew komentarzowi o podłodze. Fix: `Number.isFinite(+x) ? Math.max(1, x) : 3`.
- **L11** `run-and-report.md:11` („One run, one verdict — never re-run") vs `superbuild-runner/SKILL.md:53` (pełny scope = build + test-all + lint) — posłuszny haiku-fork może odpalić tylko pierwszy verb. Dopisać w rdzeniu: pełny scope to jedna *bramka* z maks. trzema verbami.
- **L12** `superbuild-reviewer/SKILL.md:75` — jedyna względna ścieżka `Recipe:` w łańcuchu (kontrakt runnera żąda absolutnej, `superbuild-runner/SKILL.md:20`).
- **L13** `SKILL.md:324` — `git rev-parse "HEAD^"` pada, gdy commit Taska 1 jest pierwszym commitem repo (składa się z M1; fix M1 to konsumuje).
- **L14** `superbuild-recipe/SKILL.md:47` — wejście forka jako pozycyjne tokeny rozdzielane spacją; ścieżka planu ze spacjami = dwuznaczność. Przejść na pola `Plan:` / `PlanSlug:` (symetria z resztą forków).
- **L15** `references/status-parsing.md:30` — token `BLOCKED` w regexie dispatcher-direct, choć żaden fork bezpośredni nie może go wyemitować; martwy token sugeruje obsłużony przypadek. Usunąć.
- **L16** `shared/coder-modes/mode-*.md` (pierwsze akapity) — samoodwołania do `references/mode-*.md`, choć pliki leżą w `shared/coder-modes/`.
- **L17** `agents/*.md:3` (wszystkie 5) — `description:` mówi „invoked only by `superdev:superbuild`", a wywołuje je `task-pipeline.workflow.js` (superbuild ma wprost zakaz). Kosmetyczny dryf.
- **L18** `SKILL.md:318` — literówka `commit.kind ∈ {sha,sha,files,subject}` (duplikat `sha`).
- **L19** `agents/coder.md:6` — grant narzędzia `Workflow` bez żadnego użycia w ciele; zbędna zdolność forka, który nie ma orkiestrować. Usunąć.
- **L20** Zero-task edge: decomposer PASS z pustym `## Task files` (osiągalne tylko w ręcznej gałęzi bez `python3`) → „Implementing … from Task 1 of 0" i final review nad pustym `base.sha`. Guard: `max == 0` = porażka decomposera.

### superdev — pozostałe
- **L21** Literówki wstrzykiwane w każdą sesję: `manifest.md:59` „Alway suse precision" („Always use"); `superdev/SKILL.md:60` + `superspec/SKILL.md:79` „Hanoff is not interview"; `superdev/SKILL.md:48` „you must have to ask"; `memory-layers/SKILL.md:9` „so CLAUDE navigate codebases".
- **L22** `memory-layers/scripts/analyze_structure.sh:24` — skan CLAUDE.md bez `"${FIND_EXCLUDES[@]}"` (jedyny taki; chodzi po node_modules, listuje vendorowane CLAUDE.md jako „Existing Memory Nodes"); `:18-20` — `-maxdepth` po `-type d` bez `2>/dev/null` = warning GNU find w przechwyconym outputcie.
- **L23** `shared/scripts/lib_find_excludes.sh:59-60` — wzorce zakotwiczone rootem (`/build`) stają się wykluczeniem na dowolnej głębokości, wbrew własnemu kontraktowi z `:22-25` („only ever risks excluding too LITTLE, never too much") — śledzony `src/build/` znika ze skanów. Fix: poprawić komentarz albo kotwiczyć do roota.
- **L24** `setup/assets/_superdev.md:2-4` — `paths: ["**/*.*"]` omija pliki bez rozszerzenia (`Makefile`, `Dockerfile`). Fix: `paths: ["**"]`.
- **L25** `help-writer/SKILL.md:21` — odwołanie do nieistniejącej warstwy `.superdev/layout/` (grep: nigdzie w czterech pluginach). Powinno być `.superdev/docs/`.
- **L26** `hooks/scripts/session-start.sh:70-77` — „wersja" w banerze to basename katalogu pluginu; przy layoutach, gdzie leaf = nazwa pluginu, baner brzmi „superdev loaded superdev". Zweryfikować raz na realnym cache (to samo: superui L37).
- **L27** `memory-rules/scripts/route.sh:21,28` — komentarz „keyed only on the **leading** marker", a `grep -q '^Mode: improver'` łapie wzorzec w dowolnej linii argów (payload trybu D z taką linią w środku misroutuje do C). Fix: `head -n1 |` przed grepem albo poprawić komentarz.
- **L28** `hooks/scripts/review-plan.sh:159-168` — `$plan_base` konkatenowany do regexów awk bez escapowania metaznaków (slugi czynią to mało prawdopodobnym; odnotowane dla kompletności).

### supergh
- **L29** `shared/scripts/preflight.sh:44-47` — REPO przecieka pełny URL dla remote'ów spoza github.com (zweryfikowane: GitLab/GHE), wbrew kontraktowi `<owner/name>`-lub-""; `:35-38` — unborn HEAD raportuje `BRANCH=""` → mylący STOP create-pr „Branch `` is not pushed".
- **L30** `verify-landed.sh` — HEAD-move jako jedyny dowód: równoległy commit użytkownika w oknie forka / fork commitujący dwa razy / przemycony `--amend` — każdy daje ✓ rekonstruujące cokolwiek jest teraz HEAD. Rzadkie w single-user CLI → ARCH-2 (wspólna decyzja z superdev).
- **L31** `commit/scripts/route.sh:33` — `sed "s|\${CLAUDE_PLUGIN_ROOT}|$root|g"`: ścieżka pluginu z `&` lub `|` psuje wstrzykiwane ścieżki (realne przy instalacji ze źródeł, np. `~/dev/A&B/`). Fix: escapować `$root` albo awk/podstawienie shellowe.
- **L32** `route.sh` first-keyword-wins: „commit but don't include staged" → `staged`. Udokumentowane i akceptowalne; opcjonalnie exact-match całego argumentu.
- **L33** `mode-fork.md:18` — zniekształcona instrukcja („NEVER explain, question, analyze or user intent to commit … If user want it then do it in silence") — tekst, którego model ma słuchać; poprawić gramatykę.
- **L34** Nadmiarowe/nieużywane granty: `cli-executor/SKILL.md:7` (`Bash(gh --version)`/`Bash(gh auth status)` zbędne przy `Bash(gh:*)`; `Skill` nieużywany), `create-issue/SKILL.md:4` (`Bash(gh issue view:*)` bez kroku).
- **L35** `shared/scripts/body-path.sh` — kolizja ta-sama-sekunda+ten-sam-tytuł cicho nadpisuje (praktycznie nieosiągalne interaktywnie; slugify zweryfikowane jako solidne: diakrytyki, empty→`untitled`, backoff 40 znaków).
- **L36** Mieszany język autorstwa `create-pr` — polskie literały jako główny tekst promptów (Steps 3/7) i całe zdanie instrukcji po polsku w `auto-fill.md:63`.

### superfix
- **L37** `collect_signals.sh:47-49` — grep `fix` bez word-boundary: „prefix", „fixture", „suffixes" zawyżają prior `fix_commits` (zweryfikowane). Fix: `-E --grep='\b(fix|hotfix|revert)'`.
- **L38** `collect_signals.sh:46-51` — fan-out 3 subprocesy gita per plik (repo 10k plików ≈ 30k inwokacji z pełnym history-walkiem). Fix: jeden `git log --since --name-only --format` zagregowany w awk.
- **L39** `collect_signals.sh:19-24` — luźne parsowanie argów: `--with-dependents` na pozycji 1/2 koruptuje `WINDOW_DAYS`/`ROOT` i umiera kryptycznym błędem `date`.
- **L40** `rank.py:24` — brak pliku `--signals`/`--scores` = goły traceback (obie kopie); przyjaźniejszy `sys.exit(...)`.
- **L41** Skamielina nazewnicza: workspace `.temp/code-reviewer/` dla pluginu superfix/skilla code-auditor (`SKILL.md:52,60,111`, `jobs.md:7`, `synthesis.md:7,63`); plus brak gwarancji, że `.temp/` jest gitignorowane w hoście bez superdev → ARCH-7.
- **L42** `scoring.md:64-72` — przykład renderu hotlisty niezgodny z realnym outputem rank.py (`:146-150`).
- **L43** `SKILL.md:3-6` — proza auto-trigger („Trigger even if…") w opisie skilla z `disable-model-invocation: true`; martwa i myląca. Przyciąć jak w design-audit.
- **L44** Drobne: `detective.md:24` `/tmp/verify-<slug>` vs `synthesis.md:39` `/tmp/verify-<rank>`; osierocone worktree po padzie detektywa bez wskazówki `git worktree prune`; `synthesis.md:63` `sort -t:` psuje się przy dwukropku w ścieżce; `esc()` nie obsługuje znaków kontrolnych (ścieżki C-quoted odpadają na `[ -f ]` po cichu — obie kopie).

### superui
- **L45** `tokens_to_tailwind.py:185` — cień z brakującym kolorem emituje literalne `None` do CSS (zweryfikowane: `--shadow-card: … None;`); ten sam wzorzec w `fmt_dim`. Emitować `/* unresolved */` i liczyć jako skipped.
- **L46** `tokens_to_tailwind.py:130` — diagnostyka niepoprawnego koloru jako *wartość* CSS (`--color-x: /* invalid … */;`) — deklaracja po cichu odrzucona, „błąd" niewidoczny. Kierować do bloku pominiętych.
- **L47** `tokens_to_tailwind.py:411-421` — `--color-format` cicho no-op bez `--shadcn`, a `adapt-target/SKILL.md:196-197` listuje flagę bezwarunkowo.
- **L48** `rank.py:144-145,153-154` — `reason` scouta z `|`/newline łamie tabelę markdown hotlisty. Escapować.
- **L49** `rank.py:54` — martwy sentinel `drift_hits == -1` (żaden producent go nie emituje). Usunąć albo udokumentować.
- **L50** `build_site.py:325,373-381,563-569` — tytuły/grupy bez `html.escape()`; `path` z manifestu nieograniczony do `--out` (`..`/absolutne uciekają z katalogu site). Wejścia autorstwa agenta → niski impact; dodać escape + normpath-containment.
- **L51** `build_site.py:374,518` — martwy placeholder `{HTML_ATTR}` (zawsze `""`).
- **L52** `web-preview/SKILL.md:243-247,149-155` — dwuznaczna lokalizacja `--manifest manifest.json` (względem CWD), pola stron względem `--out`; przykłady powinny używać `.superui/layout/preview/manifest.json`.
- **L53** `web-preview/references/page-anatomy.md:48-61` — „builder czyta `target.md`" — build_site.py nigdy nie otwiera `target.md` (branch z `--target` + hardcoded `TARGETS`). Poprawić sformułowanie.
- **L54** `hooks/scripts/session-start.sh:46-54` — `escape_for_json` nie escapuje znaków kontrolnych poza `\n\r\t`; zabłąkany `\f`/`\b` w manifest.md = niepoprawny JSON hooka (plik kontrolowany przez repo — pamiętać przy edycji). Baner „wersji" jak L26.
- **L55** `design-audit/SKILL.md:57-61` — workspace'y `.temp/superui-audit/<run-id>/` nigdy nieczyszczone, brak wskazówki retencji.
- **L56** `superui/hooks/content/manifest.md` — brak udokumentowanych grup/łańcuchów (`extract-design-system → adapt-target → web-preview → cc-artifact`), wbrew inwariantowi CLAUDE.md o manifestach (dryf dokumentacyjny; routing działa przez CSO).
- **L57** `validate_tokens.py` — `is_group()` nieużywane (`:31`); hexy bez walidacji formatu; `yaml.YAMLError` jako goły traceback zamiast czystej linii `ERROR` (`:104-105`).

---

## Do przeglądu architektonicznego (decyzje człowieka, nie lokalne fixy)

1. **Protokół plików nieśledzonych w pipeline (C1).** Naprawa spójna (intent-to-add vs unia ze statusem) dotyka czterech kontraktów: task-reviewer, coder verify-before-revert, improver, oraz „zbłąkany plik commitowany bez recenzji". Decyzja protokołowa, nie łatka.
2. **Model rozwiązywania `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_SKILL_DIR}` (H1, M29, C2).** Jedna empiryczna weryfikacja w żywej sesji konsumenta rozstrzyga: (a) czy 5 agentów superdev w ogóle działa, (b) czy komendy `python ${CLAUDE_SKILL_DIR}/…` w Bashu sesji głównej się rozwiązują. Od wyniku zależy wzorzec dla całego repo (ścieżki rozwiązane w promptach vs zaufanie do env).
3. **Transport trybu C memory-rules (H8).** Przejście improver→memory-rules na file-based dispatch zmienia kontrakt pipeline'u superbuild — zgodne z inwariantem repo, ale to zmiana krzyżowa.
4. **Semantyka `allowed-tools` (H10, M4, supergh L34).** Rozstrzygnąć raz: sandbox (restrykcyjna) czy lista pre-aprobat — i znormalizować wszystkie cztery pluginy. Powiązane: `Bash(sh:*)` unieważnia każdą wąską allowlistę (`sh -c '…'` uruchomi wszystko) — wzorce `git`/`gh` w supergh są przy nim kosmetyczne; albo jawna nota accepted-risk, albo wzorce ograniczone do konkretnych ścieżek skryptów.
5. **Inwariant „żaden string LLM nie trafia do linii shellowej" (M3, H8).** Ścieżka per-task go honoruje, ścieżki ADR/docs i tryb C łamią. Po naprawie wart zapisania w CLAUDE.md jako inwariant.
6. **Pochodzenie prawdy o baseline (M1) i dowód runnera po unblocku (M6).** Gdzie żyje `base.sha` i czy kod po-unblockowy może być commitowany na dowodzie sprzed unblocku.
7. **Polityka siania plików do hosta przez `/setup`.** (a) `assets/settings.json`: cicha instalacja `allow: ["Bash","Write","Edit",…]` + `defaultMode: acceptEdits` = istotne rozluźnienie postawy bezpieczeństwa hosta jako efekt uboczny bootstrapa (deny-lista przy blanket `Bash` nie jest granicą); (b) `.gitignore` .NET-owy (M8); (c) czy superfix — instalowalny standalone — powinien sam dopisywać `.temp/` do gitignore hosta (L41).
8. **Źródło prawdy grup/łańcuchów (M10, L56).** CLAUDE.md vs manifesty vs ciała skilli; czy łańcuch `superspec → supergh:create-issue` ma istnieć w ciele skilla.
9. **Kształt bramki rank.py (H11, M21).** Jeden próg (jak w prozie scoring.md) czy dwa niezależne minima (jak w CLI) + semantyka overflow `--top` — to zmiana schematu hotlisty, wspólna dla superfix i superui. Powiązane: decyzja backport-vs-share dla bliźniaczych skryptów (dyscyplina ręcznej synchronizacji już raz zawiodła: C2, H5, H6, M22-M24 naprawione tylko w jednej kopii; superfix ma zero testów przy wyższej liczbie bugów — dokładna odwrotność tego, gdzie testy są).
10. **Polityka kadencji wydań (C4).** Ręczne-only (wtedy przepisać kontrakt wersjonowania w CLAUDE.md + nagłówek release.sh) czy przywrócić automat. Stan 2-commity-niewydane pokazuje, że model ręczny już upuścił fix na podłogę.
11. **Intencja wobec `.claude/` w tym repo (C3).** Czy dev-reguły/skille mają pozostać śledzone; jeśli wycofywane — to zmiana CLAUDE.md/layoutu, nie stan drzewa roboczego.
12. **Pozostałe punktowe:** (a) luka zaufania LLM-relay `commiter` — haiku może sfabrykować tag `<commit sha=…>`; CLAUDE.md sam to flaguje („not yet hardened"); decyzja o portowaniu backstopu w stylu `verify-landed.sh` (musiałby żyć po stronie dyspozytora — sprzeczność z anty-wzorcem „never re-verify") — zdecydować raz dla superdev i supergh (L30); (b) semantyka merge-sweep w trybie context supergh commit (M17): czy „commituj to, co dotknęliśmy w sesji" ma kiedykolwiek dopinać trwający merge; (c) tożsamościowo-ślepy backstop `verify-landed.sh` (L30): dowodzi, że *jakiś* commit wylądował, nie że *forka*; (d) żywotność bramki ExitPlanMode między planami/pivotami (M13); (e) model wstrzykiwania wiedzy design-audit: kotwice/schemat w definicjach agentów vs injekcja orkiestratora (M29) — kształtuje każdego przyszłego agenta pluginu; (f) głębokość preflightu superui: `check_python.sh` nie sprawdza pyyaml/Pillow/numpy, a późna porażka sugeruje `pip install --break-system-packages` — obie rzeczy to wybory polityki; (g) `.docs/subagent-audit/proposed/` — propozycje przepisania 7 z 9 agentów utworzone dziś: wydanie przed czy po tym remoncie, i czy pominięcie `runner`/`commiter` jest celowe.

---

## Obszary zweryfikowane jako zdrowe (bez zastrzeżeń)

- **Warstwa katalogowa:** wszystkie cztery `plugin.json` poprawne, wersje `0.13.7` = najwyższy tag, `skills[]`/`agents[]` = stan dysku (zero rozjazdów), brak pola `"hooks"` w żadnym manifeście, marketplace.json spójny z manifestami; ~45 strukturalnych twierdzeń CLAUDE.md sprawdzonych — pliki istnieją.
- **Samo-weryfikacja `commit.sh` (supergh) trzyma** (modulo M14): padający pre-commit hook, puste staging, unborn HEAD, tryb paths zostawiający resztę staged — wszystko poprawne w piaskownicy; nie da się sfabrykować ✓; retry nie podwaja commitów.
- **Skrypty deterministyczne superbuild:** wszystkie harnessy zielone pod `/bin/bash` 3.2; `toposort.py`, `precheck.sh`, `copy_plan.sh`, `slug-guard.sh`, `persist-report.sh` (parser werdyktów), trzy skrypty commit — logika verify-before-claim poprawna; logika retry/BLOCKED workflow zgodna z retry-policy.md co do joty.
- **supergh referencje:** endpointy sub-issues (w tym osobliwy singular `DELETE …/sub_issue`), pułapka DB-id vs node-id, wersja API `2026-03-10` — potwierdzone na żywym API; hooki SessionStart obu pluginów fail-open, matcher poprawnie wyklucza `resume`; `.gitattributes` wymusza LF (skrypty bezpieczne na checkout).
- **Higiena danych:** nie znaleziono ścieżki wycieku sekretów; `cc-artifact` potwierdza przed publikacją; artefakty audytów niosą ścieżki+wyniki, nie treść.

## Nota o pokryciu

Czyste referencje prozatorskie przejrzane wyrywkowo (nie linia po linii): `supergh/skills/cli/references/{discussions,pr-review-threads,auth-and-scopes}.md` (spot-checki przeszły), `superui/skills/adapt-target/references/{mui,flutter}.md`, część referencji `extract-design-system`, `superdev/skills/help-writer/references/*`, ogon `memory-layers/references/node-examples.md`. Cztery harnessy testowe decomposera wykonane (zielone), nie audytowane linia po linii. Repo w trakcie audytu nie zostało zmodyfikowane.
