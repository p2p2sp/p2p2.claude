# Przejście superdev → viber

Instrukcja dla projektu, w którym nie ma żadnych zaplanowanych ani zakończonych workflowów
superdev. Jeśli jakiś build jest w toku, dokończ go albo porzuć świadomie przed krokiem 1.

## 1. Odinstaluj superdev - najpierw, nie równolegle

`/plugin` → usuń `superdev`.

To nie jest kosmetyka: oba pluginy hookują `ExitPlanMode`, a `superdev/hooks/scripts/review-plan.sh`
odrzuca plan spod `.claude/plans/*.md`, który nie deklaruje `# SimplePlan` ani `# SuperPlan`. Plan
viber nie deklaruje żadnego z nich, więc z oboma zainstalowanymi bramka superdev zablokuje wyjście
z plan mode.

## 2. Zainstaluj viber

`/plugin` → `viber` z tego samego marketplace `p2p2`. Zrestartuj sesję, żeby wstrzyknął się
`SessionStart` manifest.

## 3. Uruchom `/viber:setup`

W projekcie, raz. Nic nie pyta, jest idempotentny:

- zasiewa `.claude/viber.yml`,
- dokłada regułę `.temp/` do `.gitignore`,
- dolewa rekomendowane permissions do `.claude/settings.json` (wymaga Node na PATH; bez niego
  drukuje blok do ręcznego merge'u i leci dalej),
- na koniec drukuje instrukcję użycia.

## 4. Sprzątnij pozostałości superdev w repo projektu

Przy braku workflowów wszystko poniżej jest puste albo nieaktualne:

| Ścieżka | Co zrobić |
|---|---|
| `.claude/superdev.yml` | usuń - viber czyta wyłącznie `.claude/viber.yml` |
| `docs/.workflows/` | usuń |
| `.temp/superdev/` | usuń |
| `.claude/plans/*.sha256` | usuń - sidecary bramki superdev |
| `docs/adr/` | **zostaw** - viber pisze tam dalej, przez `adr: true` |
| `docs/changelog/`, `docs/qa/` | **zostaw**, jeśli coś tam jest: wiedza historyczna, viber ich nie prowadzi (QA idzie teraz do katalogu runu) |

## 5. Przestaw przełączniki

Dziewięć kluczy superdev (`adr`, `rules`, `memory`, `changelog`, `cleanup`, `stats`, `qa`,
`e2e-ui`, `e2e-api`) zwija się do czterech w `.claude/viber.yml`: `adr`, `memory`, `rules`, `qa`.

Wszystkie startują włączone. Tylko `true` liczy się jako on - klucz usunięty z pliku jest off.

## 6. Nowe wejścia

Stare komendy znikają razem z pluginem:

| superdev | viber |
|---|---|
| `/superdev:intent` | `/viber:idea` |
| `simpleplan` / `superplan` | „plan it" (skill `planner` wywołuje się sam) |
| `simplebuild` / `superbuild` | „implement it" (skill `implementor`) |
| `superdev-memory` / `superdev-rules` | automatycznie w zamknięciu builda (`memory`, `rules`) |
| `qa` / `e2e` | `/viber:e2e` po buildzie (wymaga `qa: true`) |
| (brak odpowiednika) | `/viber:fixer` - bug z diagnozą i czerwonym testem |

## 7. Sprawdź `CLAUDE.md` projektu

viber nic nie wie o stacku. Dokładna komenda builda, komenda testów i sposób uruchomienia
pojedynczego pliku testowego muszą być zapisane w instrukcjach hosta - inaczej `test-runner`
zgaduje z manifestu, który akurat znajdzie, i task może zostać scommitowany na suite, który nigdy
nie poszedł.

## Co się zmienia w codziennej pracy

Runy viber trafiają do `docs/_specs/<stamp>_<slug>/` i są commitowane: plan, `status.md`,
dekompozycja, `work/` i dokumenty QA. Dzięki temu build wznawia się z samej historii, w innej
sesji albo na innej maszynie.
