# Intent: Domknięcie luki UNDERSPECIFIED w łańcuchu build superdev
Date: 2026-09-17

## Request
W fazie build implementorzy zapisują wiele linii `UNDERSPECIFIED:` (w dużych runach 2-4 na task), a żaden reviewer nie ocenia samych decyzji: per-task reviewer ma mandat tylko na "deviations", checkpoint i final skanują te linie wyłącznie pod kątem duplikatów, żaden run nie wytworzył z nich `decisions.md`, a nowy `qa-writer` zamienia je w kryteria akceptacji i testy e2e. Część tych wartości (reguły biznesowe, kształt odpowiedzi nowych endpointów, tryby awarii w połowie operacji, teksty widoczne dla użytkownika) należała do planu. Zmiana rozdziela decyzję, którą implementor ma prawo podjąć sam, od twardego show-stoppera, który zatrzymuje build, daje reviewerom jawny mandat nad obiema, a planerowi reguły, które nie pozwalają tym wartościom schodzić do tasku.

## Decisions
### 1. Kto klasyfikuje linię UNDERSPECIFIED, implementor czy czytelnik?
Implementor, przy zapisie, dwoma prefiksami. `UNDERSPECIFIED: <wartość> - <decyzja>` dla wartości, dla której implementor ma rekomendację (wzorzec w repo, kryterium, konwencja) i jej użył. `DECISION: <co> - <dlaczego nierozstrzygalne> - <opcje, jeśli jakieś widzi>` wyłącznie dla twardego show-stoppera: sprzeczność z ADR, ze spec, z inną sekcją planu, kryterium niespełnialne bez zmiany zapisanej decyzji. Reguła podziału w agencie: masz rekomendację, użyj jej i zapisz `UNDERSPECIFIED:`; nie masz, zapisz `DECISION:` i stań. Oba kształty definiuje `superdev/references/review-contract.md` w `## Notes line formats`.

### 2. Jak wygląda stop na linii DECISION?
Implementor zwraca `VERDICT: BLOCKED` z linią `REASON:` i zapisuje linie `DECISION:` w notatkach. Pętla per-task i fix loop w `superdev/skills/superbuild/SKILL.md` i `superdev/skills/simplebuild/SKILL.md` dostają gałąź BLOCKED implementora: jedno `AskUserQuestion` per linia (odpowiedź / abort), odpowiedź zapisana przez `scripts/record-decision.sh`, ten sam task lub fix dispatchowany ponownie z `decisions:` jako tekstem planu. Implementor podnosi `DECISION:` zanim dotknie plików, gdy to możliwe; wykryte w trakcie pracy zostawia drzewo robocze jak jest i ponowny dispatch kontynuuje. Linie `UNDERSPECIFIED:` nigdy nie blokują.

### 3. Co planer musi pinować, żeby te wartości nie schodziły do tasku?
Trzy reguły w `superdev/skills/superplan/SKILL.md` i `superdev/skills/simpleplan/SKILL.md` (oraz w obu `templates/plan.md`) i trzy klasy Blocking w `superdev/references/plan-review-checklist.md`: task tworzący nowy endpoint pinuje pod `### Contracts` kształt żądania, odpowiedzi i kody statusu; task produkujący tekst widoczny dla użytkownika (mail, ekran, komunikat błędu, resource) niesie ten tekst albo deleguje go jawnie linią w rodzaju `copy: implementor, wzorem <istniejący klucz/plik>`, a milczenie planu jest findingiem; `### Failure modes` obejmuje awarię infrastruktury w połowie operacji (pad procesu między zapisem a wysyłką, timeout zewnętrznego wywołania), gdy task ma taki krok.

### 4. Co reviewerzy robią z liniami UNDERSPECIFIED?
Per-task reviewer (`superdev/agents/superbuild-task-reviewer.md`) ocenia każdą linię w trzech krokach: wartość była pinowana w tasku, `### Contracts`, `### Failure modes` lub nagłówku planu, to odstępstwo od planu, Important; decyzja nie trzyma się wzorca w repo lub kryteriów z `Covered criteria`, to Important z konkretnym "how to fix"; wartość według reguł z decyzji 3 należała do planu, to `NOTE: plan defect`, nigdy finding. Linia `DECISION:` w notatkach zamkniętego tasku to Important. Final review (`superbuild-reviewer-spec` na Super, `simplebuild-reviewer` na Simple) pisze nową sekcję raportu `## Decisions taken`, jedna linia per `UNDERSPECIFIED:` z całego runu (task, wartość, decyzja), tylko na final, informacyjna, bez wpływu na werdykt, zdefiniowana w `review-contract.md` jako drugi wyjątek skeletonu obok `## Coverage`. Skan par duplikatów w reviewerach rund zostaje bez zmian. `superdev/agents/qa-writer.md` dostaje nazwaną wprost regułę, że `UNDERSPECIFIED:` to zachowanie dostarczone. `superdev/scripts/stats-report.sh` liczy też `DECISION:` (kolumna w tabeli, `references/stats-template.md`, `tests/superdev/stats-report.test.ts`).

### 5. Simple track - symetria z Super?
Pełna symetria. `superdev/agents/simplebuild-task-implementor.md` pisze `UNDERSPECIFIED:` i `DECISION:` tak samo jak `superbuild-task-implementor.md`; gałąź BLOCKED implementora działa w obu orkiestratorach; skan par w `simplebuild-reviewer` i sekcja `## Decisions taken` na final działają na obu trackach. Kroki oceny z decyzji 4 wykonuje na Simple dopiero checkpoint/final, bo Simple nie ma per-task reviewera.

### 6. Czy notatki trybu fix mogą nieść te linie?
Tak, na tych samych zasadach co task. Wartość, której raport nie pinuje, a implementor ma rekomendację, to `UNDERSPECIFIED:`; brak rekomendacji (np. dwa findingi wymagają sprzecznych rzeczy) to `DECISION:` i `VERDICT: BLOCKED`, obsłużone gałęzią BLOCKED implementora w fix loopie. Re-review widzi linie w notatkach fixu, sekcja na final je zbiera. Reguła "fix-mode notes are three things and nothing more" w `review-contract.md` i obu implementorach rozszerza się o te dwie linie, gdy zachodzą.

## Constraints
- Nazwa `UNDERSPECIFIED:` zostaje; `stats-report.sh` liczy ją regexem `^(- )?UNDERSPECIFIED:` (tylko prefiks), a `tests/superdev/stats-report.test.ts` asertuje nagłówek tabeli i wiersze pozycyjnie, więc nowa kolumna dotyka skryptu, szablonu i testu razem.
- Skeleton raportu w `review-contract.md` mówi dziś, że tylko spec reviewer dodaje własną sekcję (`## Coverage`); `## Decisions taken` jest drugim, jawnie wpisanym wyjątkiem.
- Per-task reviewer ma dziś tylko werdykty PASS/FAIL i nie dostaje `decisions:`; nie zmienia się to, bo stop leży u implementora.
- Ścieżka BLOCKED (pytanie per bullet, `record-decision.sh`, ponowny dispatch) już istnieje dla reviewerów rund w obu orkiestratorach; gałąź implementora używa tych samych skryptów i tego samego kształtu linii w `decisions.md`.
- Manifest `superdev/hooks/content/manifest.md` (`## Build chain`), `superdev/README.md`, root `CLAUDE.md` i `superdev/CLAUDE.md` opisują nowy podział linii i stop implementora.
- Zmiana obejmuje wyłącznie markdown, jeden skrypt bash i jeden test; żadna ekosystemowa zależność hosta nie wchodzi.

## Out of scope
- `superspec`, jego szablon i checklista (spec pozostaje "What & Why", bez kontraktów API i tekstów).
- Zmiana nazwy `UNDERSPECIFIED:` na inną.
- Zapisywanie linii `UNDERSPECIFIED:` do `decisions.md` (ten plik oznacza akceptację usera).
- Per-task reviewer na Simple track.
- ADR dla tego repo (wyłączone w root `CLAUDE.md`).

## History
- none
