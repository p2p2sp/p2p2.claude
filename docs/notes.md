# Pomysły/Zmiany/Błędy

Wprowadzanie zmian z analizy konkurencji musi być wykonane tak, aby nie wydłużać czasu działania fazy build.

Agent może wykonać dodatkowe prace w tle kiedy wynik jego pracy nie jest koniecznie wymagany w następnym kroku.

# Prompt

Chcę potanić i wyostrzyć sprawdzenie pojedynczego zadania w torze Super
(superdev/agents/superbuild-task-reviewer.md).

PROBLEM, zaobserwowany na żywym biegu:
Zadanie oznaczone `Kind: text`, dotykające jednego pliku markdown agenta, zajęło
per-task reviewerowi bardzo długo. Review był merytorycznie dobry, ale większość
pracy była z góry wiadomo pusta - sam raport to pokazuje: "no closed-set /
response-mechanism changes ... no new tests".

TRZY PRZYCZYNY:

1. Oś `Kind:` jest wdrożona w połowie.
   Task 4 biegu 2026-09-18-build-pipelining-and-single-gate-run dodał `Kind` do
   kształtu plan-taska, który reviewer czyta (linia 16 agenta). Ale ani `## Check`
   (linie 40-53), ani `## Failure pass` (55-65) na nim nie rozgałęziają. Implementor
   ma dyscyplinę per `Kind`, reviewer widzi marker i go ignoruje.
   Dzisiejszy `## Failure pass` a-e (gałęzie catch, nowe człony zbiorów domkniętych,
   kody odpowiedzi, walidacja wejścia, nowe testy) to w 100% checklista dla
   `Kind: code`. Dla `text` jest pusta, dla `scaffold` nietrafiona.

2. Reviewer czyta cały review-contract.md przy KAŻDYM zadaniu.
   `## Contract` (linia 28): "Read <refs>/review-contract.md before any other step".
   Plik ma 540 linii. Sam kontrakt w akapicie na górze deklaruje, że per-task gate
   wiąże tylko podzbiór sekcji - niezwiązane są `## Gates` (199-295),
   `## Implementor fix-mode input` (463-483), `## Implementor stop` (484-514),
   `## Dispatch strength` (515-540), czyli ~175 linii, ~32% pliku. Reviewer i tak
   czyta wszystko.

3. Plik sam sobie przeczy: `## Scope` (linia 36) mówi "A fast per-task gate, not a
   full review", a frontmatter ma `model: sonnet`, `effort: high` (linie 5-6).

KIERUNEK, KTÓRY CHCĘ OMÓWIĆ (nie przesądzam):
Jedna checklista per `Kind` - trzy warianty `## Check` / `## Failure pass`
(`code` / `scaffold` / `text`), wybierane deterministycznie z markera, który zadanie
już niesie. Nie chodzi tylko o przycinanie: `text` powinien dostać WŁASNE checki,
których dziś nie ma (spójność z plikiem-kontraktem, brak wymyślonego słownictwa,
koherencja między plikami - dokładnie to, co ten reviewer realnie złapał na Task 4),
a `scaffold` swoje (czy generator faktycznie uruchomiony, czy output nietknięty ręcznie).

ROZWAŻANA ALTERNATYWA, KTÓREJ NIE CHCĘ, ale oceń ją sam:
Dobór checklisty podczas planowania, per zadanie, z ogólnych wytycznych w references.
Moje zastrzeżenia: dubluje `Kind`; jest niedeterministyczny (ten sam kształt zadania
dostaje różne checklisty w różnych biegach); tworzy nową klasę wady planu, której nic
nie łapie, bo to repo nie ma builda ani lintu.

CZEGO NIE CHCĘ:
- `Review: none` dla `Kind: text`. W tym repo tekst jest produktem (root CLAUDE.md
  deklaruje to wprost), więc brama zostaje. Chodzi o zwężenie i wyostrzenie, nie
  o wyłączenie.
- Utraty tego, co ten reviewer realnie łapie: rozbieżności między zmienianym plikiem
  a kontraktem lub tekstem zadania.
- Rozbicia review-contract.md tak, żeby powstała druga kopia tej samej reguły. Ten
  plik ma jednego właściciela i żaden konsument nie nosi kopii sekcji.
