# Handoff - dwa defekty w warstwie review superdev

Data: 2026-09-16
Kontekst: build `docs/.workflows/2026-09-16-reviewer-gates-through-executor` (SimplePlan
"Route build reviewer gates through the executor fork"), zamknięty na `VERDICT: PASS`.
Oba defekty zostały wykryte przy tym buildzie, ale żaden nie jest przez niego naprawiony.

Dokument jest do **rozstrzygnięcia**, nie do wykonania: każdy defekt ma opisany stan faktyczny,
konsekwencję i warianty naprawy z wadami. Wybór wariantu należy do użytkownika.

> Uwaga operacyjna: to repo jest źródłem pluginów, nie ich instalacją. Żadna zmiana poniżej nie
> wpłynie na zachowanie sesji, dopóki nie zostanie opublikowana (commit + push do marketplace,
> potem `/plugin update`).

---

## Defekt A - pominięty pełny przegląd finału po awarii bramki zgodności z planem

**Charakter:** pre-existing dziura projektowa. Nie ma związku z buildem, przy którym ją zauważono.

**Zasięg:** wyłącznie tor Simple (`simplebuild`). Tor Super go nie ma - potwierdzone: ani
`superbuild-reviewer-spec/SKILL.md`, ani `superbuild-reviewer-change/SKILL.md` nie zawiera reguły
wczesnego powrotu; obie osie są tam rozdzielone na dwóch recenzentów.

### Stan faktyczny

Trzy reguły składają się w łańcuch, z którego nie ma wyjścia:

1. `superdev/skills/simplebuild-reviewer/SKILL.md:60`
   > On any misalignment: STOP. Write the report (misalignment under Critical), emit the verdict
   > line, and return immediately - do not run the checks below. They only apply once the plan is met.

2. `superdev/references/review-contract.md` (`## Verdict rules`, od linii 185), stopień `re-review`
   > verdict every `prior` ID first (...) then read **only** `git diff <since>..HEAD`. A new Critical
   > or Important **only for a defect the fix itself introduced**.

3. `superdev/skills/simplebuild/SKILL.md:113` (fix loop)
   > `PASS` -> close the round (...) Continue.

### Konsekwencja

Jeśli pierwsza runda `stage: final` polegnie na bramce zgodności z planem, to:

- przegląd jakości kodu, architektury, testów i gotowości produkcyjnej nie odpala się w ogóle;
- **mandat integracyjny finału** - wpisy `### Contracts` konsumowane przez inne zadanie, linie
  `CARRY:` z katalogu notatek, gałęzie błędów przecinające zadania - nie odpala się w ogóle;
- runda fixa naprawia tylko misalignment;
- `re-review` z definicji nie wraca do pominiętych osi;
- `PASS` zamyka rundę i build się kończy.

Nic w kontrakcie ani w orkiestratorze nie wymusza powrotu do pełnego przebiegu. Build kończy się
werdyktem PASS, mimo że główny mandat finału nigdy się nie wykonał.

Zadziałało dokładnie tak w tym buildzie: `implementation/review-01.md` zatrzymał się na bramce,
a `review-01-re1.md` odnotował w sekcji Notes, że pełny sweep pozostaje niewykonany.

Gryzie tym mocniej, że bramka zgodności z planem pada najczęściej wtedy, gdy build odbiegł od planu
- czyli gdy pełny przegląd jest najbardziej potrzebny.

### Warianty naprawy

**A1 - druga runda `stage: final` po zamkniętym re-review.**
Orkiestrator zapamiętuje, że runda finału zwróciła FAIL z misalignmentem; po zamknięciu re-review
na PASS dyspozycjonuje jeszcze jeden `stage: final` z `since` przesuniętym na `head`.
*Za:* nie rusza kontraktu recenzenta, tylko fix loop `simplebuild`.
*Przeciw:* orkiestrator musiałby rozpoznać, że raport zatrzymał się na bramce, a dziś nie ma do
tego żadnego sygnału w zwracanych liniach (`VERDICT:` + `REVIEW:`). Wymaga albo nowej linii
zwrotnej, albo czytania raportu przez orkiestratora - a ten ma zakaz interpretowania treści raportów.

**A2 - nowy sygnał zwrotny z recenzenta.**
Recenzent, który zatrzymał się na bramce, zwraca dodatkową linię (np. `SWEEP: skipped`), a fix loop
reaguje na nią wymuszeniem kolejnej rundy `final`.
*Za:* sygnał jest jawny, orkiestrator nie interpretuje niczego.
*Przeciw:* nowe pole w kanale zwrotnym - trzeba dodać je do `## Verdict rules` w kontrakcie i do
obu orkiestratorów; rozszerza kontrakt, który dziś ma dokładnie dwie linie.

**A3 - poszerzenie `re-review` o pominięte osie.**
Gdy `prior` zatrzymał się na bramce, `re-review` po zweryfikowaniu ID wykonuje pełny sweep zamiast
czytać tylko deltę fixa.
*Za:* zero zmian w orkiestratorze, wszystko w kontrakcie.
*Przeciw:* łamie obecną, wąską definicję `re-review` ("nowy finding tylko za defekt wprowadzony
przez fix") i miesza dwa stopnie w jednym; recenzent musiałby sam wykryć, co poprzednia runda
pominęła, czytając `prior`.

**A4 - usunięcie wczesnego powrotu.**
`simplebuild-reviewer` przestaje zatrzymywać się na bramce i zawsze wykonuje wszystkie osie,
raportując misalignment jako zwykły Critical.
*Za:* najprostsze, jedna linia; zrównuje tor Simple z torem Super, który nie ma wczesnego powrotu.
*Przeciw:* wczesny powrót istnieje po coś - przegląd jakości kodu, który nie realizuje planu, bywa
stratą kontekstu i generuje findingi o kodzie przeznaczonym do wyrzucenia.

### Do rozstrzygnięcia

1. Czy naprawiać w ogóle, skoro dotyczy tylko toru Simple i tylko przy awarii bramki?
2. Który wariant - a jeśli A2, czy poszerzać kanał zwrotny recenzenta o trzecią linię?
3. Czy wczesny powrót ma zostać zachowany jako mechanizm (A1/A2/A3), czy zlikwidowany (A4)?

---

## Defekt B - rozjazd definicji `VERDICT: BLOCKED` po poszerzeniu `## Gates`

**Charakter:** wprowadzony przez build `2026-09-16-reviewer-gates-through-executor`. Przed nim
stan był spójny.

### Stan faktyczny

Task 1 poszerzył mapowanie w `superdev/references/review-contract.md`, `## Gates` (linia 160):

> `VERDICT: ERROR` or `VERDICT: TIMEOUT`, **on any gate command whatever its kind** - `VERDICT: BLOCKED`
> with a `### Needs decision` bullet naming that command and the executor's own reason.

Cztery miejsca nadal niosą starą, węższą definicję:

| Plik | Linia | Treść |
|---|---|---|
| `superdev/references/review-contract.md` | 211 | `## Verdict rules`: BLOCKED gdy "a documented **integration or e2e** command exists but cannot run in this environment" |
| `superdev/skills/simplebuild-reviewer/SKILL.md` | 37 | "`VERDICT: BLOCKED` for a documented **integration or e2e** suite that cannot start here" |
| `superdev/skills/superbuild-reviewer-change/SKILL.md` | 37 | jw. |
| `superdev/skills/superbuild-reviewer-spec/SKILL.md` | 37 | jw. |

### Konsekwencja

Recenzent, któremu komenda jednostkowa (build, lint, type-check, suite testowy) wróci z executora
jako `VERDICT: ERROR` lub `VERDICT: TIMEOUT`, dostaje dwie sprzeczne instrukcje z tego samego
kontraktu: `## Gates` każe zwrócić BLOCKED, `## Verdict rules` nie wymienia takiego warunku wcale.
Który przepis wygrywa, jest niezdefiniowane - rozstrzygnie to model, za każdym razem inaczej.

Linia 37 w trzech plikach recenzentów jest streszczeniem `## Gates` i dziś streszcza go nieprawdziwie.

### Przyczyna

Zakres planu, nie wykonanie. `### Files` w Task 1 obejmowało wyłącznie `## Gates` i
`## Report skeleton`; `## Verdict rules` leży poza tym zakresem, a Task 2 dokładał recenzentom
tylko jedno zdanie. Implementator zachował się poprawnie: zgłosił rozjazd jako dwie linie `CARRY:`
w `implementation/task-01-notes.md`, zamiast wyjść poza zadeklarowany zakres.

### Warianty naprawy

**B1 - wyrównać cztery miejsca do nowej, szerszej definicji.**
`## Verdict rules` linia 211 dostaje brzmienie obejmujące każdą komendę bramkową; trzy linie 37
dostają dopasowane streszczenie.
*Za:* zgodne z intencją builda, mechaniczne, cztery jednozdaniowe edycje.
*Przeciw:* utrwala szersze BLOCKED bez osobnej decyzji, czy to na pewno właściwy próg.

**B2 - `## Verdict rules` przestaje wyliczać warunki bramkowe.**
Linia 211 zostawia tylko warunek "decyzja zamiast brakującego kodu" i odsyła do `## Gates` po
warunki wynikające z komend.
*Za:* jeden właściciel reguły, rozjazd nie może się powtórzyć przy kolejnym poszerzeniu `## Gates`.
*Przeciw:* rozprasza definicję BLOCKED po dwóch sekcjach; czytelnik `## Verdict rules` nie widzi
już pełnej listy w jednym miejscu.

**B3 - cofnąć poszerzenie w `## Gates`.**
ERROR/TIMEOUT na komendzie innej niż integracyjna/e2e przestaje być BLOCKED.
*Za:* wraca stan spójny sprzed builda.
*Przeciw:* wywraca kryterium akceptacyjne #3 świeżo zamkniętego builda; ERROR na buildzie lub
suite jednostkowym musiałby wtedy dostać jakąś inną obsługę, bo PASS-em nie jest.

### Do rozstrzygnięcia

1. Czy szersze BLOCKED (ERROR/TIMEOUT na dowolnej komendzie) to docelowy próg - B1/B2 - czy
   nadgorliwość świeżego builda, do cofnięcia - B3?
2. Jeśli B1 lub B2: czy `## Verdict rules` ma pozostać jedynym miejscem z pełną listą warunków
   BLOCKED, czy oddać część `## Gates`?
3. Czy trzy linie 37 mają w ogóle streszczać kontrakt, skoro streszczenie rozjeżdża się przy każdej
   zmianie źródła - czy zastąpić je samym odesłaniem?

---

## Kolejność i ryzyko

Defekty są niezależne: B nie dotyka żadnej reguły z A, A nie dotyka `## Gates` ani `## Verdict rules`
w części bramkowej. Można je rozstrzygać i naprawiać osobno, w dowolnej kolejności.

- **B** jest mechaniczny (cztery miejsca, jedno zdanie każde) i nadaje się na osobny SimplePlan
  zaraz po wyborze wariantu.
- **A** wymaga decyzji projektowej o kanale zwrotnym recenzenta i zasługuje na własny wywiad
  przez `intent`, nie na plan pisany wprost.

Oba to tekst, nie kod wykonywalny - żaden nie wywraca builda w trakcie, oba zmieniają to, jak model
zachowa się w rundzie review.
