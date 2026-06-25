<!--
STATUS WZNOWIENIA (zapisane 2026-06-25)
- Plan ZATWIERDZONY (extraplan + dev-plan-reviewer STATUS: PASS).
- Implementacja NIE wykonana: pipeline dev-orchestrator zablokowany bugiem harnessa
  anthropics/claude-code#34164 — w skillach `context: fork` wywoływanych skill-to-skill
  substytucja `$ARGUMENTS`/`$1` zawodzi, więc `dev-agent-recipe` (i `dev-agent-decomposer`,
  agenci workflow) nie dostają args; nieobejściowe w tej sesji (zainstalowany plugin 0.3.4 zamrożony).
- Drzewo było czyszczone commitem `ea16a8b` (docs(rules,guides): _skills.md + plan-mode-harnes.md).
- Wznowienie w innej sesji: albo poczekać na fix #34164 i puścić orchestrator, albo
  zaimplementować ten plan bezpośrednio (Edit/Write per klaster, weryfikacja wg §8/§9:
  review-plan.test.sh + recipe.template.test.sh ALL PASS, bash -n, stubbed dry-run workflow JS).
- Źródłowy plik planu: ~/.claude/plans/zaplanuj-extraplan-na-wszystkie-effervescent-neumann.md
-->

> First thing you MUST do is USE the `superdev:dev-orchestrator` skill to implement this plan.

## ExtraPlan: naprawa 14 findingów z code-review pipeline'u superdev

### 1. Scope
Naprawa defektów wykrytych w code-review pipeline'u superdev (planowanie → implementacja) — 13 realnych poprawek w hookach, workflow JS, recipe-template i markdownach skilli, plus regresja tam, gdzie istnieje test harness.

### 2. Context
Code-review całego pipeline'u (`dev-orchestrator` + planowanie) wykrył 14 findingów; najpoważniejsze to obejścia bramki review planu (`review-plan.sh`) i błąd w maszynie stanów retry (`task-pipeline.workflow.js`). Te pliki to ŹRÓDŁA pluginu — defekty nie wpływają na bieżącą sesję, ale po publikacji + `/plugin update` psują gwarancję „każdy plan zrecenzowany" i „zadanie nie jest przedwcześnie ubijane". Naprawiamy je u źródła, z testami regresyjnymi dla skryptów deterministycznych, żeby te same regresje nie wróciły.

### 3. Mental model
Pipeline składa się z trzech warstw, których dotyczą findingi:
- **Bramka planu (hooki PreToolUse).** `require-plan-mode.sh` blokuje zapis `.claude/plans/*.md` poza plan mode (glob `*.claude/plans/*.md`). `review-plan.sh` (matcher `ExitPlanMode`) skanuje JSONL-transkrypt: znajduje ostatni zapis pliku planu (W), potem wywołanie `dev-plan-reviewer` (R), potem linię z `STATUS: PASS` (S), wymaga kolejności W→R→S, inaczej `emit_deny`. Oba są fail-open (każdy parse-miss → allow). Transkrypt to JSONL — treść raportu reviewera jest osadzona jako string w jednej linii JSON, więc `STATUS: PASS` reviewera pojawia się jako `STATUS: PASS\n` (escaped) wewnątrz tej linii.
- **Pętla retry (workflow JS).** `task-pipeline.workflow.js` jedną pętlą `while (attempt < cap)` prowadzi coder → runner → task-reviewer → improver → commit. Guard nieskończonej pętli `lastBlocked.{runner,taskReviewer}` ma łapać „BLOCKED dwa razy z rzędu" (retry-policy.md §Infinite-loop guard) i jest resetowany do `'PASS'` tylko po pełnym sukcesie pasa (przypisania `lastBlocked.* = 'PASS'`), zadeklarowany NAD pętlą (`const lastBlocked = {}`). Numery linii w tym planie są orientacyjne — coder lokalizuje kotwice po nazwach symboli, nie po absolutnych liniach.
- **Recipe-harness (`recipe.template.sh`).** Generator wypełnia markery `###TOKEN###` / `__unfilled …`. `run_body` honoruje sentinel `N/A` (ciało = brak suite → exit 0). `verify` jest fail-closed (missing-tool exit 4, STALE exit 3). Test harness `recipe.template.test.sh` buduje stub-host pod `mktemp -d` i asercjonuje stdout + exit code (wzorzec dzielony z `bootstrap.test.sh`).

### 4. Files to change

**Klaster A — hooki bramki planu (zachowanie, #1/#4/#6/#9)**
- `superdev/hooks/scripts/review-plan.sh`:
  - #1: zakotwiczyć dopasowanie werdyktu — zamiast niezakotwiczonego `/STATUS: PASS/` (l. 108) wymagać tokenu w pozycji werdyktu reviewera (token bezpośrednio przed escaped-newline `STATUS: PASS\n`, czyli początek raportu), tak by tekst deny tego hooka („...wait for STATUS: PASS, then...") i narracja modelu NIE matchowały.
  - #4: escape literalnych cudzysłowów w argumentach `emit_deny` (l. 103 i 113) — `"Running dev-plan-reviewer..."` rozbija dziś string na `$1`+`$2`; użyć `\"` lub pojedynczych cudzysłowów, by cały komunikat trafił do `$1`.
  - #6: powiązać werdykt z plikiem planu po basename — wyciągnąć basename `*.md` z linii ostatniego zapisu planu i z linii wywołania reviewera (`Plan file: <path>`), wymagać zgodności; przy nieparsowalnym basename → allow (fail-open, decyzja 2.1).
  - #9: ujednolicić detekcję zapisu planu — zamiast dwóch niezależnych grepów (`\.claude/plans/` i osobno `\.md`, l. 73-74) jeden wzorzec wymagający `.md` w ścieżce planu, np. `\.claude/plans/[^"]*\.md`, spójny z globem `*.claude/plans/*.md` w `require-plan-mode.sh` (l. 90).
- `superdev/hooks/scripts/review-plan.test.sh` — NOWY plik. Wzorzec z `recipe.template.test.sh`/`bootstrap.test.sh`: fałszywy transkrypt JSONL + JSON na stdin, asercje na `permissionDecision`. Pokrywa #1 (FAIL reviewera + późniejsza wzmianka „STATUS: PASS" → deny), #4 (reason kompletny), #6 (PASS dla planu A + wyjście z planem B → deny), #9 (linia ze ścieżką planu bez `.md` + `.md` gdzie indziej → brak fałszywego bramkowania).

**Klaster B — pętla retry (zachowanie, #3)**
- `superdev/skills/dev-orchestrator/scripts/task-pipeline.workflow.js`: resetować `lastBlocked.runner` i `lastBlocked.taskReviewer` na początku każdej iteracji `while (attempt < cap)` (zaraz po `attempt += 1`), tak by guard działał „dwa razy z rzędu w obrębie próby", a nie „kiedykolwiek w trakcie zadania". Bez zmian w pętlach wewnętrznych. Fix DOPASOWUJE kod do istniejącego opisu w `references/retry-policy.md` (§Infinite-loop guard: „previous iteration of the loop" / „twice in a row") — dokument już opisuje docelowe zachowanie, więc edycja retry-policy.md NIE jest wymagana (ewentualnie jednolinijkowe doprecyzowanie „w obrębie jednej próby", opcjonalnie).

**Klaster C — recipe-harness (zachowanie + test, #5/#10/#11)**
- `superdev/skills/dev-agent-recipe/scripts/recipe.template.sh`:
  - #5: wykrywać sentinel `N/A` przez DOKŁADNE dopasowanie ciała funkcji, nie substring-grep (l. 149). Dziś realny verb zawierający token `N/A` (np. filtr testów) daje fałszywy `exit 0` bez uruchomienia.
  - #10: propagować `exit 5` z niewypełnionego markera FINGERPRINT — `recorded="$(recorded_fingerprint)"` (l. 177) połyka exit subshella; dodać jawny check (`recorded="$(...)" || exit 5`) tak by niewypełniony marker dawał udokumentowany exit 5, nie mylące STALE/exit 3.
  - #11: wzmocnić fallback `_hash` (l. 130-139) — dodać `openssl dgst -sha256` przed `cksum`, a przy zejściu do `cksum` wypisać ostrzeżenie na stderr (CRC32+bytecount jest kolizyjny). Minimalne hardening; na Git Bash i tak rozwiązuje się `sha256sum`.
- `superdev/skills/dev-agent-recipe/scripts/recipe.template.test.sh`: dodać przypadki — (6) ciało verba ZAWIERAJĄCE token `N/A` jako fragment realnej komendy uruchamia się (output dowodzi, że body ran), (7) niewypełniony marker FINGERPRINT → `verify` kończy exit 5. #11 bez testu automatycznego (zależny od środowiska — odnotowane w §8).

**Klaster D — markdown skilli/agentów (dokumentacja, #2/#7/#8/#12/#13/#14)**
- `superdev/skills/dev-extraplan/SKILL.md`:
  - #8: przepisać §0 (l. 53-54) — usunąć odwołanie do nieistniejącej sekcji `<orchestrator>`; opisać realny preambuł z `templates/plan.md` (blockquote „First thing you MUST do is USE the superdev:dev-orchestrator skill…"), z instrukcją wstawienia go verbatim i niezmieniania słowa „orchestrator".
  - #2: w §7 „Output skeleton" (l. 152-154) dodać jawne polecenie zapisu wypełnionego planu do `.claude/plans/<slug>.md` w plan mode — tak by trigger bramki review nie zależał wyłącznie od tego, że harness sam poda ścieżkę.
- `superdev/skills/dev-extraplan/templates/plan.md`: #7 — poprawić literówkę w l. 1 („MUST od" → „MUST do"); zachować słowa „orchestrator"/„dev-orchestrator".
- `superdev/agents/dev-improver.md`: #12 — w Step 3.1 zastąpić `git diff --name-only HEAD` poleceniem obejmującym też pliki untracked (np. unia `git diff --name-only HEAD` + `git ls-files --others --exclude-standard`), bo improver biegnie PRZED commitem (`await improver(...)` przed `await committer()` w workflow) i samo `diff HEAD` gubi nowe pliki; poprawić mylące „just-committed" → „just-completed (pre-commit)" wszędzie, gdzie występuje (Step 3.1, opis intro, komentarz przy read-only `git diff`).
- `superdev/skills/dev-orchestrator/SKILL.md`: #13 — ujednoznacznić adnotację grafu (l. 26). Etykieta jest technicznie poprawna (konwencja: adnotacja opisuje węzeł PONIŻEJ strzałki), ale dwóch recenzentów ją odwróciło — przenieść notkę o gate'owaniu `adr`/`adr.done` bliżej węzła `adr-recorder` lub przeredagować, by nie dało się jej odczytać jako opisu `recipe`.
- `superdev/skills/dev-plan-reviewer/SKILL.md`: #14 — poprawić numer sekcji w l. 101: „a plain plan has no §7 to evaluate" → §8 (kryterium dotyczy sekcji testowej extraplan §8; §7 to Risk & rollback).

### 5. Assumptions
- Bramka `review-plan.sh` wyzwala się na podstawie zapisu `.claude/plans/*.md` obecnego w JSONL-transkrypcie, a `dev-plan-reviewer` jest wołany z linią `Plan file: <path>` (zweryfikowane z `review-plan.sh` l. 72-99 i `dev-plan-reviewer/SKILL.md` l. 34). **[load-bearing]** — fix #1/#6 zależy od tego, że basename planu i token werdyktu pojawiają się w tych liniach.
- W JSONL token `STATUS: PASS` reviewera występuje jako `STATUS: PASS` + escaped newline (raport reviewera ma `STATUS: PASS` jako pierwszą linię, potem pustą, potem `## Verdict`). **[load-bearing]** — kotwica #1 opiera się na tym wzorcu; jeśli transport JSONL kiedyś zmieni escaping, kotwicę trzeba poluzować (zachowując fail-open).
- Inwariant czystego drzewa (recipe Step 0) gwarantuje, że w czasie kroku improvera jedyne niezacommitowane zmiany to bieżące zadanie — więc `git diff HEAD` ∪ untracked = pliki tego zadania (fix #12).
- Reset `lastBlocked` per-próba zachowuje wewnątrz-próbny guard „dwa razy z rzędu" (pętle wewnętrzne `while (!runnerDone/reviewDone)` ustawiają i sprawdzają flagę w obrębie jednej próby).
- Pliki skill/agent podlegają `.claude/rules/_skills.md` (scope `**/skills/**`, `**/agents/**`): bez italics/tabel, czysty tekst + bullety — edycje w klastrze D trzymają ten styl.
- #11 jest realny, ale na docelowym hoście (Git Bash) rzadko aktywny (`sha256sum` dostępny); hardening jest defensywny.

### 6. Options
- **#1 — jak dopasować werdykt PASS** (wybrane: tighter-anchor):
  - **Tighter-anchor** [rekomendacja] — wymagać tokenu w pozycji werdyktu (przed escaped-newline). Plików: 1. Ryzyko: low. Odwracalność: trivial. Powód: minimalna zmiana, zachowuje fail-open, eliminuje self-trigger z tekstu deny i narracji.
  - Strukturalny parse JSONL (wydobyć pole `content` tool-resultu reviewera) — szczelniejszy, ale duży przyrost złożoności w POSIX grep/sed bez `jq` (CLAUDE.md zakazuje `jq`); odrzucony jako nieproporcjonalny.
- **#6 — wiązanie PASS z plikiem planu** (wybrane przez użytkownika: 2.1):
  - **Basename match, fail-open** [rekomendacja] — dopasowanie basename `*.md`; nieparsowalna ścieżka → allow. Plików: 1. Ryzyko: low. Odwracalność: trivial.
  - Twarde wiązanie pełnej ścieżki + fail-closed — odrzucone (łamie inwariant fail-open, ryzyko false-deny).

### 7. Risk & rollback
- **Worst-case failure mode**: zbyt ciasna kotwica #1 lub wiązanie #6 zaczyna fałszywie blokować legalny `ExitPlanMode` (false-deny), utrudniając planowanie.
- **Blast radius**: użytkownicy pluginu superdev po `/plugin update`; tylko ścieżka planowania (nie implementacja). Hooki są fail-open, więc błąd w parsowaniu degraduje do „allow", nie do twardej blokady.
- **Rollback trigger**: po publikacji `ExitPlanMode` jest odrzucany mimo realnego `STATUS: PASS` reviewera, albo przeciwnie — przechodzi mimo FAIL.
- **Rollback strategy**: revert commita ze zmianą hooków (zmiany per-plik, niezależne klastry — można cofnąć sam klaster A). Brak migracji/stanu trwałego.
- **Pre-merge checks**: uruchomić `review-plan.test.sh` i `recipe.template.test.sh` (ALL PASS); `bash -n` na zmienionych skryptach; stubbed dry-run `task-pipeline.workflow.js`; ręczny trace scenariusza #3.

### 8. Recommended testing approach & edge cases
- **Areas needing TDD & why**: hooki bramki (#1/#4/#6/#9) i recipe-sentinel (#5/#10) niosą logikę decyzyjną o bezpośrednim wpływie na bramki — test-first dla nich (decyzja 1.1). Maszyna stanów retry (#3) — walidacja przez istniejący seam `args.stub` (canned verdicts) + ręczny trace, bo brak frameworka JS.
- **Key edge cases / failure modes**:
  - #1: FAIL reviewera, a w transkrypcie po linii R występuje „STATUS: PASS" w tekście deny tego hooka oraz w narracji modelu → musi być DENY.
  - #4: po naprawie reason `emit_deny` zawiera pełny tekst sterujący (w tym „do NOT tell the user…").
  - #6: PASS dla `plan-A.md`, potem zapis i wyjście z `plan-B.md` → DENY; nieparsowalny basename → ALLOW (fail-open).
  - #9: linia transkryptu ze ścieżką `.claude/plans/foo` (bez `.md`) + `.md` w innym miejscu linii → brak fałszywego bramkowania.
  - #3: próba 1 runner BLOCKED → unblock PASS → restart runner → zwykły FAIL; próba 2 runner BLOCKED przy pierwszym wywołaniu → po fixie musi dostać własny unblock (nie natychmiastowy force-FAIL).
  - #5: ciało verba `... N/A ...` (token jako fragment) → komenda RUNS; ciało dokładnie `N/A` → exit 0 bez uruchomienia (case 4 nadal zielony).
  - #10: niewypełniony marker FINGERPRINT → `verify` exit 5.
- **Port seams / harness**: testy hooków i recipe budują izolowany host pod `mktemp -d` z fałszywym transkryptem/PATH (wzorzec z `recipe.template.test.sh`/`bootstrap.test.sh`) — bez dotykania realnego drzewa. #11 bez testu automatycznego (zależny od dostępnych hasherów w PATH — świadomie pominięty, hardening + ostrzeżenie na stderr).

### 9. Definition of done
- `superdev/hooks/scripts/review-plan.test.sh` istnieje i kończy się „ALL PASS"; pokrywa #1/#4/#6/#9.
- `recipe.template.test.sh` rozszerzony o przypadki #5 (substring N/A) i #10 (exit 5), „ALL PASS".
- `bash -n` czyste dla `review-plan.sh`, `require-plan-mode.sh`, `recipe.template.sh`.
- `task-pipeline.workflow.js`: stubbed dry-run przechodzi gałąź #3 (próba 2 BLOCKED dostaje unblock), bez błędu wykonania.
- Markdowny klastra D zaktualizowane (#2/#7/#8/#12/#13/#14), spójne z `.claude/rules/_skills.md` (bez italics/tabel).
- Słowo „orchestrator"/„dev-orchestrator" nadal obecne w `templates/plan.md` (gate routingu nienaruszony).

### 10. Out-of-scope
- Bump wersji / `plugin.json` (robi CI; tag-driven).
- Strukturalny redesign hooków na parse JSONL (odrzucony w §6).
- Twarde fail-closed wiązanie planu (#6 opcja 2.2 — odrzucona).
- Test automatyczny dla #11 (środowiskowy — tylko hardening + warn).
- Jakiekolwiek zmiany w superui oraz refaktory niezwiązane z 14 findingami.
- #13 NIE jest traktowany jako naprawa błędnej etykiety (etykieta jest poprawna w konwencji „adnotacja opisuje węzeł poniżej") — tylko jako ujednoznacznienie redakcyjne.
