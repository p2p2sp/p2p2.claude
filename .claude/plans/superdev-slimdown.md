# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Odchudzenie i ujednolicenie pluginu superdev"

---
<!-- HEADER -->

## Goal
Plugin `superdev/` przestaje wozić treść, którą model ma wyuczoną, a jego wewnętrzne kontrakty (marker `TDD:`, format `VERDICT:`, pozycja ADR, ścieżka pliku planu) są jednakowe we wszystkich skillach i w hooku. Bramka `ExitPlanMode` działa również w projektach z własnym `plansDirectory`.

## Context
Plugin powstawał na starszych modelach i niesie trzy warstwy balastu: pliki referencyjne będące czystym podręcznikiem (mockowanie, deep modules, kompresja opisu modułu), bloki presji antylenistwowej w manifeście oraz checklisty code review powtarzające domyślne zachowanie recenzenta. Do tego siedem wewnętrznych niespójności, z których najgroźniejsza jest cicha: `review-plan.sh` wykrywa plan po zaszytym `\.claude[\\/]+plans[\\/]+`, więc w projekcie z własnym `plansDirectory` robi `emit_allow` i bramka review planu przestaje istnieć bez żadnego sygnału. Zakres obejmuje wyłącznie `superdev/` i `tests/superdev/`; pozostałe trzy pluginy, wspólne skrypty i bump wersji są poza nim.

## Acceptance criteria
1. Siedem plików referencyjnych (`tdd/references/*.md` x5, `superdev-memory-writer/references/node-examples.md`, `superdev-memory/references/capture-protocol.md`) nie istnieje, a `grep -r` po `superdev/` nie znajduje odwołania do żadnego z nich.
2. `superdev/hooks/content/manifest.md` ma nie więcej niż 30 linii i nadal zawiera cztery nośne reguły: zakaz tworzenia branchy, wywiad prozą zamiast pickera, plan mode nie zastępuje wywiadu, brak kodu przed zatwierdzonym planem.
3. Kryterium `TDD: required` w `superplan/SKILL.md` jest identyczne co do treści z `simpleplan/SKILL.md`, a żaden z tych plików nie wymaga już, by marker pojawił się jako krok w `### Approach`.
4. Żaden plik w `superdev/` nie zawiera ciągu `**VERDICT:**`, a `review-plan.sh` nie zawiera ani `(\*\*)?`, ani klasy `[Vv][Ee][Rr][Dd][Ii][Cc][Tt]`.
5. `review-plan.sh` wykrywa plik planu również poza `.claude/plans/`, po nagłówku `^# SimplePlan` lub `^# SuperPlan` w treści ostatnio zapisanego pliku `.md`, i bramkuje taki przypadek tak samo jak dziś bramkuje plan w `.claude/plans/`.
6. `superbuild/SKILL.md` nie ma osobnego kroku ADR przed pętlą implementacji; `superbuild-adr` jest wołany w Close-Oucie równolegle z delegacjami `memory`, `rules`, `docs`.
7. `simpleplan/SKILL.md` i `superplan/SKILL.md` instruują zapis planu do pliku wskazanego w komunikacie plan mode i przekazanie tej samej ścieżki reviewerowi jako `plan:`, bez wymieniania jakiegokolwiek katalogu z nazwy.
8. Progi tokenowe (`<20k` / `20-64k` / `>64k`) i format tabeli pomiarowej znajdują się w `superdev-memory/SKILL.md`; `superdev-memory-writer/references/templates.md` ich nie zawiera.
9. W ośmiu skillach wymienionych w `### Files` Taska 8: każdy preload będący pojedynczym poleceniem (`date`, `printf`, `git status`) ma w `allowed-tools` wpis wzorcowy pokrywający to polecenie, a przy każdym preloadzie potokowym stoi w treści skilla, nie we frontmatterze, jednolinijkowy komentarz wyjaśniający, dlaczego wzorca tam nie ma. Skille spoza tej listy pozostają nietknięte. `simplebuild-reviewer` i `superbuild-task-reviewer` nie mają w `allowed-tools` narzędzia `Skill`.
10. `node --test "tests/**/*.test.ts"` uruchomione z katalogu głównego repo kończy się kodem 0.
11. Suma linii plików `.md` pod `superdev/` spada o co najmniej 400 względem stanu wyjściowego.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - refactor(superdev): drop seven textbook reference files and their citations
- Covers: criteria #1, #11
- TDD: none

### Dependencies
- none

### Files
- delete - superdev/skills/tdd/references/mocking.md
- delete - superdev/skills/tdd/references/tests.md
- delete - superdev/skills/tdd/references/refactoring.md
- delete - superdev/skills/tdd/references/interface-design.md
- delete - superdev/skills/tdd/references/deep-modules.md
- delete - superdev/skills/superdev-memory-writer/references/node-examples.md
- delete - superdev/skills/superdev-memory/references/capture-protocol.md
- modify - superdev/skills/tdd/SKILL.md (sekcje RED, Anti-patterns, Workflow)
- modify - superdev/skills/superdev-memory/SKILL.md (sekcja Resources, krok 6 Maintenance mode)
- modify - superdev/skills/superdev-memory-writer/SKILL.md (sekcja Write rules)

### Test Commands
*Build*
- brak - repozytorium nie ma kroku budowania ani lintera na żadnym poziomie

*Tests*
- `grep -rn "references/" superdev/skills/tdd superdev/skills/superdev-memory superdev/skills/superdev-memory-writer` - oczekiwane wyjście: brak trafień na usunięte pliki
- `node --test "tests/**/*.test.ts"` - oczekiwane: kod 0

### Approach
1. Usuń siedem plików wymienionych w `### Files` jako `delete`.
2. W `tdd/SKILL.md` skasuj odwołania `references/mocking.md` (sekcja RED oraz Anti-patterns), `references/tests.md` (Anti-patterns), `references/interface-design.md` i `references/deep-modules.md` (Workflow krok 1), `references/refactoring.md` (Workflow krok 4), zostawiając samą regułę bez wskaźnika do pliku.
3. W `superdev-memory/SKILL.md` usuń pozycję `references/capture-protocol.md` z sekcji Resources i podmień odwołanie w kroku 6 Maintenance mode na wskazanie sekcji `## Capture Questions` w tym samym pliku.
4. W `superdev-memory-writer/SKILL.md` usuń z sekcji Write rules odwołanie do `references/node-examples.md`, zachowując odwołanie do `references/templates.md`.

### Edge cases
Katalog `superdev/skills/tdd/references/` po usunięciu pięciu plików zostaje pusty - usuń również sam katalog, żeby git nie zachował pustego wpisu.

### Contracts
none

### DoD
Siedem plików nie istnieje, katalog `tdd/references/` nie istnieje, żaden plik w `superdev/` nie odwołuje się do usuniętych ścieżek, suite testowy zielony.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - refactor(superdev): cut learned-knowledge prose from tdd, simpledebug and the review skills
- Covers: criteria #11
- TDD: none

### Dependencies
- Task 1 - blocks: sekcje `tdd/SKILL.md` edytowane w obu taskach, kolejność zapobiega konfliktowi

### Files
- modify - superdev/skills/tdd/SKILL.md (Common rationalizations, Red flags, When stuck)
- modify - superdev/skills/simpledebug/SKILL.md (Red flags - stop and trace)
- modify - superdev/skills/simplebuild-implementor/SKILL.md (## 2. Review)
- modify - superdev/skills/superbuild-task-coder/SKILL.md (## 1. Implement - wyłącznie reguła o dopasowaniu do stylu otoczenia)
- modify - superdev/skills/simplebuild-reviewer/SKILL.md (Code quality, Architecture, Testing, Production readiness)
- modify - superdev/skills/superbuild-reviewer-code/SKILL.md (Code quality, Architecture, Testing, Production readiness)
- modify - superdev/skills/superspec/references/checklist.md (Content Quality, Requirement Completeness, Feature Readiness)
- modify - superdev/skills/superdev-docs-writer/references/doc-format.md (Tone rules)

### Test Commands
*Build*
- brak - repozytorium nie ma kroku budowania ani lintera

*Tests*
- `grep -c "" superdev/skills/tdd/SKILL.md` - oczekiwane: wartość nie większa niż 110 (z 153; trzy usuwane sekcje to 45 linii plus jedno zdanie z VERIFY GREEN)
- `node --test "tests/**/*.test.ts"` - oczekiwane: kod 0

### Approach
1. W `tdd/SKILL.md` usuń sekcje `## Common rationalizations`, `## Red flags - STOP and start over` i `## When stuck`; zachowaj bez zmian `## Iron Law` (z regułą delete-then-restart), oba checkpointy VERIFY, `## Per-cycle stop-condition checklist`, `## Anti-patterns (forbidden)` i `## Bypass authorization`.
2. W `simpledebug/SKILL.md` usuń sekcję `## Red flags - stop and trace`, przenosząc do `## The Iron Law` wyłącznie te pozycje, których nie ma już w trzech prawach.
3. Zredukuj `## 2. Review` w `simplebuild-implementor` do samej reguły "przeczytaj własny diff świeżym okiem przed weryfikacją, napraw co znajdziesz" plus wymóg trafienia w `DoD` i `Covered criteria`; usuń wyliczankę SRP/DRY/type safety/primitive obsession/error paths/back-compat/migracji. W `superbuild-task-coder` NIE dodawaj kroku przeglądu - ten pipeline ma osobny `superbuild-task-reviewer` i brak własnego przeglądu jest tam celowy; usuń z jego `## 1. Implement` wyłącznie zdanie "Keep the change minimal and idiomatic: match surrounding naming, patterns, and comment density", zostawiając nietkniętą regułę o zakazie refaktorów i wyjścia poza pliki taska. To samo zdanie stoi w `## 1. Implement` w `simplebuild-implementor` - usuń je tam symetrycznie, żeby oba implementory zostały z tą samą regułą.
4. W `simplebuild-reviewer` i `superbuild-reviewer-code` zredukuj cztery bloki pytań do jednego zdania na wymiar. Zachowaj nietknięte: w `simplebuild-reviewer` bramkę `Plan alignment` ze STOP, w `superbuild-reviewer-code` sekcję `## Scope` z jednowymiarowym zakresem, a w obu sekcję `## Calibration`, strukturę raportu i kontrakt `VERDICT`.
5. W `superspec/references/checklist.md` usuń trzy sekcje wyliczankowe, zachowując `### Severity classes`, `### Never flag` i `### Evidence rule`. Ponieważ obie zachowane sekcje odwołują się dziś do usuwanych wyliczanek ("any checklist item above objectively violated", "must cite the violated checklist item"), przepisz te odwołania tak, by rubryka była samodzielna - klasy Blocking mają wymieniać własne przesłanki wprost, bez odsyłania do nieistniejącej listy. W `doc-format.md` usuń `## Tone rules`, zachowując szablon oraz sekcje Good i Bad.
6. Usuń zdanie "Actually run the test - never simulate it mentally" z sekcji VERIFY GREEN w `tdd/SKILL.md`, zostawiając jedno wystąpienie w VERIFY RED. Wariant "Actually run it - never simulate it mentally" w `simpledebug/SKILL.md` ZOSTAJE - to osobny skill, ładowany bez treści `tdd`, więc nie jest to duplikat w tym samym kontekście.

### Edge cases
Reguła "no unrequested refactors, no scope creep, no files outside the task" w obu implementorach nie jest wiedzą wyuczoną - jest ograniczeniem zakresu i musi przetrwać cięcie.

### Contracts
Kontrakty wyjściowe wszystkich sześciu skilli (`VERDICT:` w pierwszej linii, `REASON:`, `REVIEW:`, struktura raportu) pozostają bez zmian.

### DoD
Wymienione sekcje nie istnieją, reguły wskazane jako zachowane nadal istnieją dosłownie, suite testowy zielony.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - refactor(superdev): trim the session manifest to its load-bearing overrides
- Covers: criteria #2, #11
- TDD: none

### Dependencies
- none

### Files
- modify - superdev/hooks/content/manifest.md

### Test Commands
*Build*
- brak - repozytorium nie ma kroku budowania ani lintera

*Tests*
- `grep -c "" superdev/hooks/content/manifest.md` - oczekiwane: wartość nie większa niż 30
- `node --test tests/superdev/session-start.test.ts` - oczekiwane: kod 0

### Approach
1. Usuń blok od "If there is even a 1% chance" do "Defaulting to invocation is ALWAYS the correct choice." włącznie.
2. Zredukuj tabelę racjonalizacji do listy czterech reguł: plan mode nie domyka wywiadu, brak kodu przed zatwierdzonym planem, zakaz zakładania nowych branchy bez prośby użytkownika, wywiad prowadzony prozą a nie `AskUserQuestion`.
3. Zachowaj bez zmian nagłówek `<superdev:manifest>` i domknięcie, sekcję `## Instruction Priority`, `## Always use precision over verbosity` i `## Save all temporary files in .temp`.
4. Zachowaj pierwsze zdanie sekcji reguł nakazujące rozstrzygnięcie, czy użytkownik chce działania natychmiast, czy zaplanowania większej całości.

### Edge cases
`session-start.sh` wstrzykuje manifest dosłownie i escape'uje go do JSON-a - skrócenie nie może wprowadzić znaku, którego `escape_for_json` nie obsługuje (obsługiwane: backslash, cudzysłów, LF, CR, TAB).

### Contracts
Plik pozostaje otoczony znacznikami `<superdev:manifest>` i `</superdev:manifest>` - `session-start.sh` wstrzykuje zawartość verbatim i nie dokłada własnych markerów.

### DoD
Manifest ma nie więcej niż 30 linii, zawiera cztery nośne reguły i trzy zachowane sekcje, test `session-start.test.ts` zielony.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - fix(superdev): unify the TDD criterion across simpleplan and superplan
- Covers: criteria #3
- TDD: none

### Dependencies
- none

### Files
- modify - superdev/skills/superplan/SKILL.md (sekcja **TDD Discipline**)
- modify - superdev/skills/simpleplan/SKILL.md (sekcja **TDD Discipline**, sekcja ### Self-Review)

### Test Commands
*Build*
- brak - repozytorium nie ma kroku budowania ani lintera

*Tests*
- `grep -n "hot path" superdev/skills/superplan/SKILL.md superdev/skills/simpleplan/SKILL.md` - oczekiwane: trafienie w obu plikach
- `grep -rn "first step is to apply the .tdd. skill" superdev/skills/` - oczekiwane: brak trafień

### Approach
1. W `superplan/SKILL.md` zastąp regułę "Every task gets `TDD: required` … unless it changes no runtime behavior" treścią z `simpleplan/SKILL.md`: domyślnie `TDD: none`, `required` wyłącznie gdy kod taska podejmuje własną decyzję (logika biznesowa lub reguła domenowa, nietrywialny warunek lub maszyna stanów, algorytm, hot path), nigdy gdy task dotyka bezpośrednio świata zewnętrznego.
2. Usuń z `simpleplan/SKILL.md` akapit wymagający, by `TDD: required` pojawiło się jako pierwszy krok `### Approach`.
3. Usuń z sekcji `### Self-Review` w `simpleplan/SKILL.md` fragment weryfikujący, że `### Approach` otwiera się krokiem skilla `tdd`; zostaw weryfikację obecności samego markera.

### Edge cases
`simplebuild-implementor` i `superbuild-task-coder` już wołają skill `tdd` na widok markera `TDD: required` - egzekucja przenosi się tam w całości i nie wolno jej przy okazji usunąć.

### Contracts
Marker `TDD:` pozostaje polem obowiązkowym w obu szablonach planu (klasa B6 w `references/plan-review-checklist.md` nie zmienia się).

### DoD
Oba pliki niosą identyczne kryterium, żaden skill nie wymaga kroku `tdd` w `### Approach`, oba implementory nadal wołają skill `tdd` na marker.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - fix(superdev): canonicalize the VERDICT marker to the unbolded form
- Covers: criteria #4, #10
- TDD: required

### Dependencies
- none

### Files
- modify - superdev/skills/simpleplan-reviewer/SKILL.md (## Output Format)
- modify - superdev/skills/superplan-reviewer/SKILL.md (## Output Format)
- modify - superdev/skills/simpleplan/SKILL.md (### Final Review)
- modify - superdev/skills/superplan/SKILL.md (## Final Review)
- modify - superdev/hooks/scripts/review-plan.sh (verdict_line, verdict_value)
- modify - tests/superdev/review-plan.test.ts (fixtury LPASS, LFAIL, LPASTE, LLEGEND, LNEG, LNEG_UPPER, LPASS_CANON, LPASS_LIST, LFAIL_LIST, LPASS_START, LFAIL_START)

### Test Commands
*Build*
- `bash -n superdev/hooks/scripts/review-plan.sh` - oczekiwane: brak wyjścia, kod 0

*Tests*
- `node --test tests/superdev/review-plan.test.ts` - oczekiwane: kod 0
- `node --test "tests/**/*.test.ts"` - oczekiwane: kod 0

### Approach
1. Zastosuj dyscyplinę skilla `tdd` (ścisły red-green-refactor) dla tego taska.
2. RED: w `tests/superdev/review-plan.test.ts` przestaw na kanoniczne `VERDICT: PASS` / `VERDICT: FAIL` każdą fixturę niosącą dziś formę pogrubioną lub inną wielkość liter niż `VERDICT` - `LPASS`, `LFAIL`, `LPASTE`, `LLEGEND`, `LNEG`, `LPASS_CANON`, `LNEG_UPPER` (jej drugi, rozstrzygający werdykt), `LPASS_START`, `LFAIL_START`. Fixtury `LPASS_LIST` i `LFAIL_LIST` zostają bez zmian: niosą `- VERDICT: \`PASS\`` / `- VERDICT: \`FAIL\``, a tolerancja markera listy `([-*] )?` i back-ticków pozostaje w regexie. Przepisz komentarz nad blokiem fixtur format-tolerance, który opisuje dziś tolerancję wielkości liter i pogrubienia. Przetytułuj przypadek `FC`, którego dzisiejsza nazwa mówi o formie pogrubionej ("canonical bold+UPPER"). Dopisz przypadek, w którym recenzent zwraca `**VERDICT:** PASS`, a oczekiwaną decyzją jest `deny`. Uruchom suite i potwierdź czerwień na nowym przypadku.
3. GREEN: w `review-plan.sh` zawęź wzorce w `verdict_line` i `verdict_value` - usuń obie opcjonalne grupy `(\*\*)?` oraz klasę znakową `[Vv][Ee][Rr][Dd][Ii][Cc][Tt]`, zostawiając literalne `VERDICT:`; zachowaj kotwice `\\n` i `"(text|content)":"`, tolerancję markera listy `([-*] )?`, back-ticki wokół wartości i kotwicę końca tokenu.
4. Zamień KAŻDE wystąpienie `**VERDICT:**` na `VERDICT:` w obu reviewerach - nie tylko w sekcji wyjściowej, ale też w sekcji `## Input`, gdzie brak wymaganej etykiety nakazuje zwrócić `**VERDICT:** FAIL` - oraz w `simpleplan` i `superplan`. Usuń zdania wymagające pogrubienia ("Bold markers required").
5. Zaktualizuj OBA komentarze w `review-plan.sh` opisujące format werdyktu - ten nad `verdict_line` i ten nad `verdict_value` - tak by opisywały format kanoniczny zamiast nieaktualnej tolerancji.

### Edge cases
Zawężenie wzorca jest fail-closed - brak dopasowania prowadzi do `emit_deny` z komunikatem o braku linii `VERDICT:`, nigdy do `emit_allow`. Przypadki G, H i NEG w suite chronią przed fałszywym PASS z wklejki, legendy i zdania zanegowanego; muszą przejść po zmianie fixtur.

### Contracts
Kanoniczny format zwracany przez każdy skill superdev: pierwsza linia dosłownie `VERDICT: PASS` albo `VERDICT: FAIL`, bez pogrubienia, bez back-ticków, bez markera listy.

### DoD
Żaden plik w `superdev/` nie zawiera `**VERDICT:**`, regex hooka nie zawiera `(\*\*)?` ani klasy `[Vv]…`, stary format pogrubiony jest odrzucany przez nowy test, cały suite zielony.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - fix(superdev): detect the plan file by format header when it sits outside .claude/plans
- Covers: criteria #5, #7, #10
- TDD: required

### Dependencies
- Task 5 - blocks: oba taski edytują `review-plan.sh` i `review-plan.test.ts`; Task 5 ustala kanoniczny format werdyktu, na którym opierają się fixtury tego taska

### Files
- modify - superdev/hooks/scripts/review-plan.sh (last_plan_write_line, plan_path)
- modify - tests/superdev/review-plan.test.ts
- modify - superdev/skills/simpleplan/SKILL.md (### Rules)
- modify - superdev/skills/superplan/SKILL.md (### Rules)

### Test Commands
*Build*
- `bash -n superdev/hooks/scripts/review-plan.sh` - oczekiwane: brak wyjścia, kod 0

*Tests*
- `node --test tests/superdev/review-plan.test.ts` - oczekiwane: kod 0
- `node --test "tests/**/*.test.ts"` - oczekiwane: kod 0

### Approach
1. Zastosuj dyscyplinę skilla `tdd` (ścisły red-green-refactor) dla tego taska.
2. RED: dopisz w `review-plan.test.ts` przypadek, w którym transkrypt zawiera `Write` do pliku `.md` spoza `.claude/plans/` (np. `plans-custom/foo.md`), plik na dysku otwiera się nagłówkiem `# SimplePlan`, a recenzent nie przebiegł - oczekiwaną decyzją jest `deny`; dopisz przypadek bliźniaczy, gdzie plik `.md` nie ma nagłówka formatu i decyzją jest `allow`. Uruchom suite i potwierdź, że pierwszy przypadek jest czerwony.
3. GREEN: w `review-plan.sh` zachowaj obecne wyszukanie `last_plan_write_line` po ścieżce jako szybką ścieżkę; gdy zwróci pustą wartość, wykonaj drugie przejście po transkrypcie szukające ostatniego `Write`/`Edit` do pliku `.md` (z tym samym wykluczeniem `.review-<N>.md` i tym samym filtrem `"(tool_name|name)":"(Write|Edit)"`), rozwiąż z niego `plan_path`, przeczytaj plik i zaakceptuj go jako plan tylko wtedy, gdy pierwsza linia pasuje do `^# (SimplePlan|SuperPlan)`. Brak takiego pliku lub brak nagłówka to nadal `emit_allow`.
4. Upewnij się, że `plan_base` jest ustawiane w obu ścieżkach - strażnik manipulacji po werdykcie z niego korzysta.
5. W `simpleplan/SKILL.md` i `superplan/SKILL.md` dopisz w sekcji `### Rules` regułę: plan zapisz do pliku wskazanego w komunikacie plan mode i tę samą ścieżkę przekaż reviewerowi jako `plan:`; nie wymieniaj żadnego katalogu z nazwy.

### Edge cases
Fallback po treści nie może uznać za plan pliku `.md`, który jedynie wspomina `superbuild` w prozie - dopasowanie kotwiczy się na pierwszej linii pliku i na nagłówku `#`, nie na wystąpieniu słowa w dowolnym miejscu. Plik zapisany, ale nieczytelny z dysku, zachowuje się jak dziś: fail-open.

### Contracts
Wejście hooka pozostaje niezmienione (stdin z `transcript_path`); nie wprowadzamy zależności od pola `cwd` ani od zmiennej `CLAUDE_PROJECT_DIR`.

### DoD
Plan poza `.claude/plans/` z nagłówkiem formatu jest bramkowany, plik `.md` bez nagłówka nie jest, wszystkie dotychczasowe przypadki nadal przechodzą, oba skille planujące instruują zapis pod ścieżkę z plan mode.

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - refactor(superbuild): move the ADR delegation into Close-Out
- Covers: criteria #6
- TDD: none

### Dependencies
- none

### Files
- modify - superdev/skills/superbuild/SKILL.md (## Config, ## Step 2 - Record ADR, numeracja kroków 3-6)

### Test Commands
*Build*
- brak - repozytorium nie ma kroku budowania ani lintera

*Tests*
- `grep -n "^## Step" superdev/skills/superbuild/SKILL.md` - oczekiwane: pięć kroków, żaden nieopisany jako Record ADR
- `node --test "tests/**/*.test.ts"` - oczekiwane: kod 0

### Approach
1. Usuń sekcję `## Step 2 - Record ADR` w całości.
2. Przenumeruj pozostałe kroki na 1-5 i popraw wszystkie odwołania w treści, w tym zdanie w sekcji `## Config` wskazujące, które kroki są bramkowane którym przełącznikiem.
3. W kroku Close-Out dopisz delegację `adr: true` obok `memory`, `rules` i `docs`, przekazując labeled block z `plan: <plan-copy path>`, `spec: <spec path>` i `adr: docs/adr`, wzorując się na analogicznej delegacji w `simplebuild/SKILL.md`.
4. W kroku Done zachowaj wymóg zrelacjonowania linii `ADR:` dosłownie w podsumowaniu.

### Edge cases
`superbuild-adr` przyjmuje `spec` jako etykietę opcjonalną (`'?spec'` w preloadzie `resolve-input.sh`), więc przekazanie `spec:` z Close-Outu jest poprawne i zachowuje dotychczasowe wejście skilla.

### Contracts
`superbuild-adr` czyta wyłącznie plan i spec, nigdy kodu - przesunięcie za pętlę implementacji nie zmienia jego wejścia ani wyjścia (`ADR: <path>` albo `ADR: none`).

### DoD
`superbuild/SKILL.md` ma pięć kroków, ADR jest jedną z równoległych delegacji Close-Outu bramkowanych configiem, oba pipeline'y wołają `superbuild-adr` w tym samym miejscu.

<!-- /TASK -->

---

<!-- TASK -->

## Task 8 - fix(superdev): correct allowed-tools, relocate the token thresholds and drop tables
- Covers: criteria #8, #9, #10, #11
- TDD: none

### Dependencies
- Task 1 - blocks: progi przenoszone do `superdev-memory/SKILL.md`, którego sekcja Resources zmienia się w Task 1
- Task 3 - blocks: tabela racjonalizacji w manifeście znika w Task 3, więc konwersja tabel nie może jej dotknąć

### Files
- modify - superdev/skills/superspec/SKILL.md (frontmatter allowed-tools)
- modify - superdev/skills/superbuild-adr/SKILL.md (frontmatter allowed-tools)
- modify - superdev/skills/superdev-memory/SKILL.md (frontmatter allowed-tools, sekcja When to Create Child Nodes)
- modify - superdev/skills/superdev-rules/SKILL.md (frontmatter allowed-tools)
- modify - superdev/skills/superdev-docs/SKILL.md (frontmatter allowed-tools)
- modify - superdev/skills/setup/SKILL.md (sekcja Bootstrap)
- modify - superdev/skills/simplebuild-reviewer/SKILL.md (frontmatter allowed-tools)
- modify - superdev/skills/superbuild-task-reviewer/SKILL.md (frontmatter allowed-tools)
- modify - superdev/skills/superdev-memory-writer/references/templates.md (sekcja Measurements Table Format)
- modify - superdev/skills/simpleplan/templates/plan.md (kursywa w Test Commands)
- modify - superdev/skills/superplan/templates/plan.md (kursywa w Test Commands)

### Test Commands
*Build*
- `bash -n superdev/skills/setup/scripts/bootstrap.sh` - oczekiwane: brak wyjścia, kod 0

*Tests*
- `grep -rn "^|" superdev/skills superdev/hooks/content` - oczekiwane: brak trafień
- `node --test tests/superdev/bootstrap.test.ts` - oczekiwane: kod 0
- `node --test "tests/**/*.test.ts"` - oczekiwane: kod 0

### Approach
1. Pokryj preloady wpisami wzorcowymi tam, gdzie polecenie jest pojedyncze i daje się dopasować: `superdev-memory`, `superdev-rules` i `superdev-docs` nie mają dziś pola `allowed-tools` w ogóle - dodaj je, wymieniając narzędzia, których każdy z nich używa, plus `Bash(date:*)` na ich jedyny preload `date +%Y%m%d-%H%M%S`; do `superspec` dopisz `Bash(date:*)` i `Bash(printf:*)`; do `superbuild-adr` dopisz `Bash(date:*)`; do `superbuild-task-reviewer` dopisz `Bash(git status:*)` na jego preload `git status --short`.
2. Preloadów potokowych (`printf … | tr … | sed … | head`) NIE pokrywaj wzorcem - wzorzec dopasowuje pojedyncze polecenie, nie potok. W trzech plikach objętych tym taskiem, które je mają (`superbuild-adr`, `simplebuild-reviewer`, `superbuild-task-reviewer`), zostaw wpis `Bash` i dopisz jednolinijkowy komentarz w TREŚCI skilla tuż nad preloadem, nigdy w linii `allowed-tools:` - w YAML zwykły skalar kończy się na `` #``, więc komentarz doklejony do tej linii zostałby zjedzony przez parser.
3. W `setup/SKILL.md` zamień wywołanie `bash "${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh"` na wywołanie bezpośrednie i dodaj wpis wzorcowy `Bash(${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh:*)` do `allowed-tools`; skrypt ma już bit wykonywalny `100755` w indeksie gita, więc nie zmieniaj uprawnień.
4. Usuń `Skill` z `allowed-tools` w `simplebuild-reviewer` i `superbuild-task-reviewer`.
5. Przenieś sekcję `## Measurements Table Format` wraz z progami z `templates.md` do `superdev-memory/SKILL.md`, do kroku 3 workflow, i zapisz ją jako listę zamiast tabeli; usuń tę sekcję z `templates.md`.
6. Zamień na listy pozostałe tabele markdown w `superdev-memory/SKILL.md` oraz kursywę `*Build*` i `*Tests*` w obu szablonach planu na zwykłe nagłówki tekstowe. Obie tabele w `tdd/SKILL.md` leżą wewnątrz sekcji usuwanych w Tasku 2, więc nie ma tam czego konwertować - nie dotykaj tego pliku.

### Edge cases
Konwersja `*Build*` i `*Tests*` w szablonach planu nie może zmienić nazw tych bloków - `decompose.sh` i implementory szukają sekcji `### Test Commands` i jej treści, a plany już wyprodukowane w `docs/.workflows/` zachowują stary zapis i muszą pozostać czytelne.

### Contracts
`allowed-tools` nie ogranicza puli narzędzi, tylko preautoryzuje - dodanie wpisu wzorcowego nie odbiera skillowi żadnego narzędzia, a usunięcie `Skill` z dwóch reviewerów nie blokuje im niczego, czego używają.

### DoD
Każdy preload jednopoleceniowy w plikach objętych tym taskiem ma pokrywający go wpis wzorcowy, a każdy preload potokowy w nich - komentarz w treści skilla wyjaśniający brak wzorca; `setup` woła bootstrap bezpośrednio, dwaj reviewerzy nie deklarują `Skill`, progi tokenowe są w `superdev-memory/SKILL.md`, `grep -rn "^|"` po `superdev/skills` i `superdev/hooks/content` nie zwraca trafień, suite zielony.

<!-- /TASK -->

---

<!-- TASK -->

## Task 9 - docs(superdev): refresh the repo CLAUDE.md and verify the net reduction
- Covers: criteria #1, #6, #11
- TDD: none

### Dependencies
- Task 1 - blocks: inwentarz plików referencyjnych
- Task 7 - blocks: opis pozycji ADR w pipeline
- Task 8 - blocks: opis progów i allowed-tools

### Files
- modify - CLAUDE.md (sekcja What this repo is, Cross-plugin architecture invariants)

### Test Commands
*Build*
- brak - repozytorium nie ma kroku budowania ani lintera

*Tests*
- `find superdev -name '*.md' | xargs grep -c "" | awk -F: '{s+=$2} END {print s}'` - oczekiwane: wartość nie większa niż 2355 (baseline zmierzony przed zmianami: 2755)
- `node --test "tests/**/*.test.ts"` - oczekiwane: kod 0

### Approach
1. Zaktualizuj w `CLAUDE.md` opis pluginu `superdev` tam, gdzie wymienia jego pliki referencyjne i pozycję kroku ADR, tak by odpowiadał stanowi po taskach 1, 7 i 8.
2. Zmierz sumę linii plików `.md` pod `superdev/` podanym poleceniem i zapisz wynik w treści commita.
3. Jeżeli redukcja jest mniejsza niż 400 linii, wróć do zakresów cięcia z tasków 1-3 i domknij różnicę wyłącznie w obrębie sekcji tam wymienionych - nie rozszerzaj zakresu na inne pliki.

### Edge cases
`CLAUDE.md` opisuje cztery pluginy - zmiana dotyczy wyłącznie akapitów o `superdev`; opisy `superui`, `supergh` i `superfix` zostają nietknięte. Baseline 2755 jest zmierzony, nie oszacowany: potwierdzony dwiema metodami (`grep -c ""` sumowane oraz `wc -l`, które daje 2752, bo trzy pliki nie kończą się znakiem nowej linii) na 42 plikach `.md` - nie przeliczaj go ręcznie.

### Contracts
none

### DoD
`CLAUDE.md` opisuje stan faktyczny pluginu po zmianach, suma linii `.md` pod `superdev/` spadła o co najmniej 400, cały suite testowy zielony.

<!-- /TASK -->
