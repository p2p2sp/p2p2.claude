# Analiza: reset kontekstu na granicy intent -> plan

Data: 2026-09-09
Status: analiza, brak zmian w kodzie

## Rozważana propozycja

`intent` prowadzi wywiad jak dziś, zapisuje `intent.md`, po czym wchodzi w plan mode
i od razu wywołuje `ExitPlanMode`. Treścią "planu" jest wyłącznie instrukcja uruchomienia
wybranego skilla (`simpleplan` albo `superspec`). Zatwierdzenie planu przez użytkownika
miałoby wyczyścić kontekst, a wybrany skill startowałby na czysto, czytając `intent.md`.

## Weryfikacja mechanizmu w harnessie

Sprawdzone na binarce Claude Code `2.1.266` (`~/.local/share/claude/versions/2.1.266`).

Mechanizm istnieje, ale **nie jest automatyczny**:

- Ustawienie `settings.json`: `showClearContextOnPlanAccept` - *"When true, the plan-approval
  dialog offers a 'clear context' option. **Defaults to false**."*
- Gdy włączone, dialog akceptacji planu dostaje dodatkowy wiersz:
  `Yes, clear context (N% used) and auto-accept edits` (warianty: `... and use auto mode`,
  `... and bypass permissions`). Obok stoją nadal warianty `keep-context`.
  To **wybór użytkownika w dialogu**, nie skutek samego zatwierdzenia.
- Po wybraniu wiersza z czyszczeniem: wywołanie `ExitPlanMode` zostaje **zdeniowane**
  (`behavior:"deny"`), kontekst jest czyszczony, a nowy startuje z zaszczepioną wiadomością:

  ```
  Implement the following plan:

  <PEŁNA TREŚĆ PLANU>
  ```

  Harness przekazuje **tekst planu, nigdy jego ścieżkę**. Tryb uprawnień przełącza się
  na `acceptEdits` / `auto` / `bypassPermissions`.
- `SessionStart` odpala się z `source: clear`. Matcher superdev to `startup|clear|compact`,
  więc manifest **przeżywa** czyszczenie kontekstu.

## Co propozycja faktycznie daje

1. **Reset kontekstu przed najdroższą fazą.** Wywiad plus raporty agentów `Explore` ciągną się
   dziś przez `superspec` -> `superplan` -> `superbuild`. Odcięcie ich na granicy intent/plan
   obniża bazę tokenową całego łańcucha.
2. **Wymusza samowystarczalność `intent.md`.** Dziś `simpleplan` deklaruje
   *"Input: the confirmed understanding already in context"*, a `superspec`
   *"Use whatever context the session already holds"*. To ukryta zależność od kontekstu,
   sprzeczna z tym, że plik i tak jest zapisywany. Refactor czyni kontrakt jawnym.
3. **Jedna wspólna bramka** zamiast `AskUserQuestion` plus późniejszy gate planu.

## Co propozycja łamie

### a) Twardy blocker: własny hook superdev

`superdev/hooks/hooks.json` ma `PreToolUse` na `ExitPlanMode` -> `hooks/scripts/review-plan.sh`.
Ścieżka fałszywego planu wygląda tak:

- `ExitPlanMode` **wymaga** pliku planu (`No plan file found at ... Please write your plan to
  this file`), domyślnie `~/.claude/plans/<slug>.md` - czyli dokładnie kotwica Step 1 hooka.
  Gate się uzbraja.
- **Step 1b**: plan musi zawierać `simpleplan|simplebuild|superplan|superbuild`. Plan mówiący
  "uruchom `superspec`" nie przechodzi - trzeba by skłamać o formacie.
- **Step 1c**: wymagana linia `Plan:` wskazująca sam plik. Do podrobienia.
- **Step 2**: wymagane wywołanie `simpleplan-reviewer` / `superplan-reviewer` **oraz**
  `VERDICT: PASS` po ostatnim zapisie planu. Recenzent oceniłby atrapę wg
  `plan-review-checklist.md` i słusznie zwróciłby FAIL.

Przepchnięcie tego wymaga wyjątku w `review-plan.sh`, a to jedyny mechaniczny strażnik reguły
"no code before an approved plan". Wyjątek oparty na znaczniku w pliku planu jest furtką:
każdy plan z odpowiednią frazą omija recenzję.

### b) Domyślnie wyłączone i niedeterministyczne

Plugin nie może włączyć `showClearContextOnPlanAccept` u konsumenta - to `settings.json`
użytkownika lub repo. Bez niego zatwierdzenie planu nie czyści kontekstu i zostaje sam absurd:
"plan", którego treścią jest "uruchom skill". Degradacja jest cicha. Nawet z włączonym
ustawieniem użytkownik może wybrać wiersz `keep context`.

### c) Podwójna bramka

Wybór toru (Simple / Spec / Stop) i tak musi zajść wcześniej przez `AskUserQuestion`, bo
`ExitPlanMode` jest binarne (approve / reject). Powstaje: pytanie o tor -> plan powtarzający
tę samą informację -> zatwierdzenie. Jedno pytanie za dużo, i to takie, które uczy klikania
"yes" bez czytania.

### d) Niespójność semantyczna

Nowy kontekst dostaje `Implement the following plan:` i tryb `acceptEdits`, żeby uruchomić
skill planistyczny, który natychmiast wywoła `EnterPlanMode` i zrobi drugi taniec plan mode.
Dwa plan mode'y pod rząd, pierwszy udawany.

### e) Utrata niuansu wywiadu

`intent.md` z założenia nie zapisuje odrzuconych opcji ani uzasadnień
("NEVER record a rejected option, nor why it lost"). Po twardym czyszczeniu `superspec` ma
tylko to. Część odkryć `Explore` trzeba odtworzyć - oszczędność tokenów jest mniejsza niż
wygląda, bo praca się przenosi, a nie znika.

## Kluczowa obserwacja

**Ten mechanizm już działa w superdev, tylko o jedną bramkę dalej.** Komentarz w
`review-plan.sh` (Step 1c) mówi wprost:

> the plan MUST declare its own file path so both build orchestrators can resolve it
> **after a context reset** (the harness passes the plan TEXT, never its path)

Granica `plan -> build` jest już zaprojektowana pod ten scenariusz: `simpleplan` / `superplan`
kończą `ExitPlanMode`, plan niesie linie `Plan:` i `Intent:`, jego treść zawiera
"must use simplebuild / superbuild", więc po wyczyszczeniu build startuje na czysto
i resolwuje pliki ze ścieżek w zaszczepionym tekście. Wystarczy
`showClearContextOnPlanAccept: true`, zero zmian w źródłach. I tam bramka jest uczciwa:
plan jest prawdziwym planem, a `Implement the following plan` to dosłownie prawda.

Propozycja duplikuje ten mechanizm na granicy, gdzie kosztuje najwięcej i daje najmniej.

## Wnioski i rekomendacja

1. **Nie robić atrapy planu w `intent`.** Koszt (wyjątek w gate recenzji) jest
   nieproporcjonalny do zysku, a zysk jest warunkowy.
2. **Włączyć `showClearContextOnPlanAccept: true`** i opisać to w `superdev/README.md` jako
   zalecaną konfigurację. Największy reset dostajemy tam, gdzie kontekst jest najgrubszy
   (wywiad + spec + plan) i gdzie plugin jest już na niego przygotowany.
3. **Utwardzić granicę intent -> plan tak, żeby ręczny `/clear` był bezpieczny.** To jest
   wartościowa część propozycji, tania i bez zależności od harnessa:
   - `simpleplan`: zamienić *"Input: the confirmed understanding already in context"* na
     "gdy podano `intent: <path>` - przeczytaj ten plik jako źródło prawdy; kontekst jest
     dodatkiem, nigdy warunkiem".
   - `superspec`: analogicznie w sekcji `## Inputs`.
   - Rozszerzyć opcję **Stop here** o gotową komendę do wklejenia w świeżej sesji
     (`/clear`, potem `/superdev:superspec intent: <ścieżka>`), albo dodać czwartą opcję
     "Fresh session" robiącą to samo jawnie.

Wariant 3 daje ten sam efekt co propozycja (planowanie startuje na czysto, czytając tylko
`intent.md`), jest deterministyczny na każdej wersji Claude Code, nie rusza gate'u recenzji
i kosztuje użytkownika jedno wklejenie.
