# Code review — wtyczka `superdev`

Data: 2026-06-27
Zakres: całe źródło wtyczki `superdev/` (drzewo robocze czyste, brak diffa — recenzja statyczna).
Tryb: recall / xhigh effort.

## Podsumowanie

Synchronizacja `plugin.json` ↔ dysk (23 skille, 4 agenty) — czysto, bez rozbieżności rejestracji.
Najważniejsze ustalenie: **plan-review gate `superdev` otwiera się fail-open** — przepuszcza plany
z werdyktem BLOCK/FIX, bo hook szuka nieukotwiczonego podciągu `Overall Verdict: PASS`, a ten literał
jest stałą częścią szablonu werdyktu recenzenta.

Klasyfikacja:

- Krytyczne: 1 (gate planu nie działa)
- Średnie/wysokie: 3 (guard retry, sentinel N/A w recipe, brak lowercase w histogramie)
- Niskie: 10 (kontrakt outputTokens, brak FIND_EXCLUDES, files=0 na root-commit, dotfile-y jako
  rozszerzenia, sprzeczność File count, footguny workflow, kosmetyka)

---

## 1. KRYTYCZNE — gate ExitPlanMode przepuszcza zablokowane plany

- Pliki: `superdev/hooks/scripts/review-plan.sh:112` + `superdev/skills/superplan-reviewer/SKILL.md:77`
- Mechanizm: hook szuka nieukotwiczonego podciągu `Overall Verdict: PASS`, a szablon werdyktu
  `superplan-reviewer` (linia 77, wewnątrz bloku „return EXACTLY this structure") zawiera ten literał
  w prozie poradnikowej: „...the ExitPlanMode hook only checks for `Overall Verdict: PASS`...". Warunek S
  jest więc spełniony dla KAŻDEGO werdyktu.
- Scenariusz: recenzent zwraca `Overall Verdict: BLOCK`. Jego raport (jeden wiersz JSONL tool_result)
  zawiera też linię 77 z literałem. `awk '/Overall Verdict: PASS/'` trafia w prozę → `emit_allow`.
  Plan, który recenzent ZABLOKOWAŁ, zostaje zatwierdzony. Gate sprawdza tylko, czy recenzent się
  uruchomił, nigdy czy PASS — jest no-opem dla przypadku FIX/BLOCK, dla którego istnieje.
- Naprawa: zakotwiczyć dopasowanie do początku linii werdyktu (wymagać linii zaczynającej się od
  `Overall Verdict: PASS`) ALBO usunąć literał z prozy szablonu.

## 2. ŚREDNIE/WYSOKIE — guard pętli retry nie jest resetowany między próbami

- Plik: `superdev/skills/orchestrator/scripts/task-pipeline.workflow.js:274` (symetrycznie :314)
- Mechanizm: `lastBlocked` (deklarowany raz w linii 238) nigdy nie jest resetowany na początku
  zewnętrznej pętli — ustawiany tylko na `'BLOCKED'` (280/319) lub `'PASS'` (295/333). Próba kończąca
  pętlę runnera/review w stanie `'BLOCKED'` trwale wyłącza gałąź unblock dla wszystkich kolejnych prób.
- Scenariusz: próba 1: coder PASS → runner BLOCKED (ustawia `lastBlocked.runner='BLOCKED'`) →
  unblock coder FAIL → break/continue, flaga zostaje `'BLOCKED'`. Próba 2: świeży coder PASS → runner
  BLOCKED → `lastBlocked.runner==='BLOCKED'` prawda → natychmiastowy force-FAIL BEZ próby unblock.
  Próba 3 tak samo. Każda próba ≥2 dostała świeży coder-pass (mógł zmienić kod), ale jest spalana jako
  instant-fail. `retry-policy.md:38-40` opisuje guard jako „twice in a row"/„last iteration" (per-pass),
  kod stosuje go globalnie.
- Naprawa: reset `lastBlocked` na początku każdej iteracji `while`.

## 3. ŚREDNIE — sentinel `N/A` w recipe pomija realne verby

- Plik: `superdev/skills/agent-recipe/scripts/recipe.template.sh:149`
- Mechanizm: detektor sentinela grepuje całe ciało funkcji verba
  (`declare -f "$fn" | grep -qE '(^|[^[:alnum:]_])N/A([^[:alnum:]_]|$)'`), więc legalna komenda hosta
  zawierająca token `N/A` jest błędnie uznana za sentinel braku suite i pomijana z `exit 0`
  (PASS-eligible).
- Scenariusz: `LAUNCH_BODY = curl -fsS http://svc/N/A/health` albo
  `TEST_FILTERED_BODY = dotnet test --filter Category!=N/A` — token `N/A` otoczony znakami
  niealfanumerycznymi (`/`, `=`), więc grep dopasowuje, `run_body` robi `exit 0` bez wykonania ciała
  i raportuje przejście. Forki konsumenckie ufają werdyktowi recipe bez re-checku → build/test/launch
  który nigdy się nie uruchomił jest traktowany jako PASS (łamie verify-before-claim).
- Naprawa: wykrywać sentinel po dokładnej równości ciała z literałem `N/A`, nie przez grep podciągu.

## 4. ŚREDNIE — brak lowercase w histogramie rozszerzeń

- Plik: `superdev/skills/memory-rules/scripts/scan_extensions.sh:52`
- Mechanizm: rozszerzenie emitowane dosłownie bez lowercase, mimo że kontrakt (komentarz linii 43)
  obiecuje „emit the lowercase extension". Linie 52/54 nigdy nie wołają `tr`.
- Scenariusz: repo z `README.MD`, `LICENSE.md`, `Notes.Md` daje trzy wiersze (`MD`, `md`, `Md`) zamiast
  jednego `md` o liczności 3. Persistowane globy `rule_extensions` są fragmentaryczne, dominujące
  rozszerzenie spada w rankingu, downstream `paths:` omijają pliki.
- Naprawa: `printf '%s\n' "$ext" | tr 'A-Z' 'a-z'`.

## 5. NISKIE — `outputTokens` nie jest null w trybie stub

- Plik: `superdev/skills/orchestrator/scripts/task-pipeline.workflow.js:100`
- Mechanizm: `tokensBefore` liczony bez sprawdzenia trybu stub, mimo że nagłówek (linie 45-46) i
  komentarz inline (linia 98) deklarują „outputTokens null w stub mode". Warunek sprawdza tylko obecność
  `budget`, bez `&& !stub`.
- Scenariusz: obowiązkowy stubbed-agent dry-run (plan §8) uruchamia workflow z ustawionym `stub`, gdy
  runtime dostarcza `budget`. `tokensDelta()` zwraca liczbę (~0) zamiast null — sprzeczne z kontraktem
  i z asercją dry-run `outputTokens === null`.
- Naprawa: dodać `&& !stub` do warunku `tokensBefore`.

## 6. NISKIE — `analyze_structure.sh` listuje vendored CLAUDE.md

- Plik: `superdev/skills/memory-layers/scripts/analyze_structure.sh:24`
- Mechanizm: skan „Existing Memory Nodes" pomija `FIND_EXCLUDES`, w przeciwieństwie do wszystkich
  pozostałych `find` w tym samym skrypcie (linie 18-20, 29-31, 36-38).
- Scenariusz: zależność pod `node_modules/` lub `vendor/` z własnym CLAUDE.md trafia na listę
  „istniejących węzłów", myląc skill co do tego, które węzły już istnieją (niespójne z dwoma
  `detect_state.sh`, które wykluczają).
- Naprawa: dodać `"${FIND_EXCLUDES[@]}"` do `find` w linii 24.

## 7. NISKIE — `files="0"` na root-commit

- Pliki: `superdev/skills/orchestrator/scripts/commit-task.sh:111` + `commit-adr.sh:95`
- Mechanizm: `git diff-tree --no-commit-id --name-only -r HEAD` bez `--root` nic nie wypisuje dla
  commita bez rodzica (pierwszy commit repo), bo porównuje z nieistniejącym rodzicem.
- Scenariusz: na pierwszym commicie repo tag to `<commit sha="abc1234" files="0">...` — prawdziwy sha,
  fałszywy count 0. Workflow/orchestrator relacjonuje files=0 jako zaufaną liczbę. Niska częstość
  (pipeline zwykle działa na repo z historią), realny defekt liczby.
- Naprawa: `git diff-tree --root` lub `git show --name-only --pretty=format:`.

## 8. NISKIE — dotfile-y zapisywane jako bogus-rozszerzenia

- Plik: `superdev/skills/memory-rules/scripts/scan_extensions.sh:48`
- Mechanizm: glob `case "$base" in *.*)` dopasowuje `.gitignore`, bo `*` może dopasować pusty łańcuch
  przed wiodącą kropką — łamie kontrakt „Files WITHOUT an extension are skipped" (nagłówek linie 13-14).
- Scenariusz: `.gitignore` → ext `gitignore`, `.env` → `env`, `.npmrc` → `npmrc`. Te fantomy zaśmiecają
  histogram i mogą zostać sperszystowane jako śmieciowe globy `rule_extensions`.
- Naprawa: pominąć basename zaczynające się od kropki bez kolejnej kropki.

## 9. NISKIE — `File count` przeczy estymacie tokenów

- Plik: `superdev/skills/memory-layers/scripts/estimate_tokens.sh:46`
- Mechanizm: FILE_COUNT (linie 46-52) liczy ścisły PODZBIÓR rozszerzeń, które BYTES/TOKENS mierzy
  (linie 33-43, m.in. json,yaml,toml,sql,graphql,prisma,rb,php,c,cpp,h,cs pominięte w FILE_COUNT).
- Scenariusz: katalog z samymi `.json`/`.yaml`/`.sql` daje „Total tokens: ~30k" i „File count: 0" —
  wewnętrzna sprzeczność myląca decyzje o rozmieszczeniu węzła.
- Naprawa: ujednolicić listę rozszerzeń w obu `find`.

## 10. NISKIE — `cap ?? 3` przepuszcza jawne `0`

- Plik: `superdev/skills/orchestrator/scripts/task-pipeline.workflow.js:89`
- Mechanizm: `cap = input.retryMaxAttempts ?? 3` (nullish) łapie tylko null/undefined; jawne
  `retry_max_attempts: 0` (parser akceptuje `\d+`) przechodzi jako cap 0.
- Scenariusz: `while (attempt < 0)` nie wykonuje się → `return fail()` z attempts:0 i pustym
  lastFailureReportPath. Prompt eskalacji renderuje „Task N failed after 0 attempts. Latest failure: "
  z pustą ścieżką, choć żaden agent nie ruszył. Wymaga błędnej konfiguracji, ale to cichy no-op-FAIL.
- Naprawa: `Math.max(1, cap)` lub walidacja >0.

## 11. NISKIE — nadpisanie raportu unblock w jednej próbie

- Plik: `superdev/skills/orchestrator/scripts/task-pipeline.workflow.js:171`
- Mechanizm: oba przebiegi unblock w jednej próbie (wyzwolony przez runner i przez task-reviewer) piszą
  do tej samej ścieżki `unblock-coder-<attempt>.md` (kluczowanie tylko po attempt).
- Scenariusz: runner-unblock pisze plik, później reviewer-unblock nadpisuje go; jeśli reviewer-unblock
  FAIL, lastFailureReportPath wskazuje jego treść, a ślad runner-unblock przepadł. Tylko audyt
  (sterowanie poprawne).
- Naprawa: dodać do nazwy znacznik pasa (runner/reviewer).

## 12. NISKIE — fantomowa ścieżka feedbacku przy śmierci agenta

- Plik: `superdev/skills/orchestrator/scripts/task-pipeline.workflow.js:146`
- Mechanizm: gdy `agent()` zwraca null (agent zginął), `dispatch()` ustawia reportPath na
  zamierzoną-ale-niezapisaną ścieżkę i status `'FAIL'`.
- Scenariusz: wrapper runnera OOM-uje → reportPath = `runner-1.md` (nigdy nie zapisany) → coder próby 2
  dostaje `Feedback: .../runner-1.md`, którego nie ma → traci dowód błędu. Rzadkie, niski wpływ.
- Naprawa: rozróżnić null-od-agenta i nie forwardować nieistniejącej ścieżki jako feedback.

## 13. NISKIE (kosmetyka) — baner wersji na ścieżce Windows

- Plik: `superdev/hooks/scripts/session-start.sh:74`
- Mechanizm: `version="${version##*/}"` ścina tylko do ostatniego `/`; backslash-owy
  CLAUDE_PLUGIN_ROOT nie zawiera `/`, więc nic nie jest ścinane.
- Scenariusz: `C:\...\superdev\0.9.2` → baner „superdev loaded C:\...\superdev\0.9.2" zamiast „0.9.2".
  Wyłącznie systemMessage (nie wstrzykiwany do modelu).
- Naprawa: `version="${version//\\//}"; version="${version##*/}"`.

## 14. NISKIE (latentne) — niespójna tolerancja whitespace w gate

- Plik: `superdev/hooks/scripts/review-plan.sh:78`
- Mechanizm: detektor zapisu planu wymaga `"file_path":"` bez spacji (linie 78,80), podczas gdy
  ekstraktor transcript_path celowo dopuszcza `[[:space:]]*` wokół dwukropka (linie 58-60).
- Scenariusz: jeśli jakiś build Claude Code zapisze linię ze spacją po dwukropku, Krok 1 nic nie
  dopasowuje → hook traktuje to jak „nie plan implementacyjny" i emit_allow → gate cicho otwiera się.
  Latentne (dziś JSONL kompaktowy).
- Naprawa: dopuścić `[[:space:]]*` także w liniach 78/80.

---

## Kandydaci odrzuceni

- `route.sh:35` (`awk '{print $1}'` na multi-line): wejście multi-line i tak rozbiłoby `!`-injection
  zanim dotrze do skryptu — bronione upstream.
- `bootstrap.sh:60` (brak guardu „missing template" dla settings.json): asset istnieje na dysku,
  szablon nigdy realnie nie znika.
- `task-pipeline.workflow.js:244` (`phase('Coder')` nie powtarzany na retry): czysta kosmetyka labelki
  postępu, poza top-15.
