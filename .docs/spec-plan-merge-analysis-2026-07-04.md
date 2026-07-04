# Analiza: scalenie spec + plan (usunięcie superspec z głównego przepływu)

> Data: 2026-07-04
> Status: analiza / propozycja — brak zmian w źródłach
> Kontekst: pytanie, czy zapisanie planu przez `superplan` w postaci speca i usunięcie pośredniego
> `superspec` usprawni proces, przy zachowaniu (a) dostępności speca dla usera do zapisania
> (plik / issue na GitHubie) przed fazą implementacji, (b) obowiązkowego przejścia przez plan mode
> (read-only; po zatwierdzeniu harness resetuje okno kontekstowe i wstrzykuje plan).

## Wniosek główny

Proponowana ścieżka „plan bez osobnego speca" **już istnieje w źródłach jako pierwszoklasowa** —
decyzja nie dotyczy budowy nowego trybu, tylko uczynienia ścieżki standalone domyślną i losu
`superspec` (degradacja do opt-in vs. pełne usunięcie). Rekomendacja: **zdegradować, nie kasować**.

## Co już istnieje

- `superplan` ma dwa szablony: `templates/plan.md` (z nagłówkiem `> Spec:`) oraz
  `templates/plan-standalone.md`, który inline'uje własną sekcję `## Scope & acceptance criteria`
  (in/out of scope, locked decisions, kryteria akceptacji — esencja speca).
- Downstream obsługuje obie postaci fail-open:
  - `superbuild-decomposer` (Step 1a): bez `> Spec:` sekcja `## Scope & acceptance criteria` planu
    jest równoważnym źródłem WHAT dla `## Deliverable` i mapowania 1:1 `## Tests`.
  - `superplan-reviewer`: rozwiązuje „WHAT-source" jako zewnętrzny spec **albo** sekcję inline
    i przeciwko niej sprawdza pokrycie kryteriów (dim. 1 i 4).

## Bilans merge'a

### Zysk

Dziś pełna ścieżka to `superspec` (xhigh) + pętla `superspec-reviewer` + `superplan` (xhigh) +
pętla `superplan-reviewer` — cztery ciężkie przebiegi LLM i dwa dokumenty do utrzymania spójnie.
Ścieżka standalone redukuje to do jednego dokumentu i jednej pętli review.

### Koszt — trzy funkcje osobnego speca, które przy pełnym usunięciu znikają

1. **Tania bramka WHAT przed drogim HOW.** Spec zatwierdzany jest zanim `superplan` odpali
   eksplorację codebase (agenci Explore). Po scaleniu zły WHAT wychodzi dopiero przy zatwierdzaniu
   całego planu — droższa iteracja.
2. **Niezależny cykl życia.** Spec jako issue na GitHubie („spec teraz, implementacja
   kiedyś/przez kogoś innego") wymaga, by istniał przed i niezależnie od planu. Łańcuch
   `superspec → supergh:create-issue` dziś to obsługuje.
3. **Kotwica reviewera.** `superplan-reviewer` w wymiarze „spec coverage" sprawdza plan przeciw
   niezależnemu dokumentowi. Przy inline'owanym WHAT review staje się samoreferencyjny — łapie
   wewnętrzne niespójności, ale nie dryf względem intencji.

Punkty 1 i 3 częściowo amortyzuje obowiązkowy wywiad (`superdev`), zakończony syntezą zatwierdzaną
przez użytkownika — de facto lekka bramka WHAT.

## Ograniczenie plan mode i obejście

- W plan mode agent jest read-only → scalonego dokumentu nie da się zapisać do wybranego pliku
  ani opublikować jako issue *w trakcie* planowania.
- Ale: sam plik planu materializuje harness przy zatwierdzeniu `ExitPlanMode`
  (`Your plan has been saved to: <path>` — `superbuild` już kotwiczy się na tej linii). Treść jest
  na dysku **w momencie zatwierdzenia**, przed startem implementacji.
- Decyzję „gdzie utrwalić" można podjąć w plan mode (`AskUserQuestion` jest dozwolone — superplan
  już tak pyta o tryb implementacji), a **wykonać** tuż po zatwierdzeniu, zanim ruszy superbuild.
  To dokładnie istniejący wzorzec linii-markera `Implementation: superbuild|self` w §0.

## Proponowane rozwiązanie

1. **Domyślna ścieżka: `superdev` → `superplan` standalone.** W handoffie skilla `superdev` opcja
   „Handoff to superplan" staje się rekomendowaną; spec przestaje być obowiązkowym etapem przepływu.
2. **Przeniesienie rygoru superspec do superplan.** Sekcja `## Scope & acceptance criteria`
   w standalone dziedziczy twarde reguły superspec: AC = pojedyncze obserwowalne zdanie
   (bez Given/When/Then), max 3 AC na story, każde testowalne, Out of Scope ≥ 2, zakaz TBD.
   Dziś szablon ma strukturę, ale SKILL.md superplana nie egzekwuje tych reguł przy jej
   wypełnianiu — **to jedyna realna luka merge'a**.
3. **Nowy marker `Persist:` w §0 planu.** Superplan, obok pytania o tryb implementacji, pyta jednym
   `AskUserQuestion`: „Po zatwierdzeniu utrwalić plan jako: plik w repo / issue na GitHubie / nic?".
   Odpowiedź ląduje jako linia-marker w planie (zapis read-only-safe — to tylko tekst planu).
   Po zatwierdzeniu i resecie kontekstu agent główny wykonuje marker **jako pierwszy krok, przed
   markerem `Implementation:`**: kopiuje plik planu np. do `.superdev/specs/<date>-<slug>.md` albo
   odpala miękki łańcuch do `supergh:create-issue` (CSO — działa tylko gdy supergh zainstalowany,
   zgodnie z konwencją soft cross-plugin chains). Spełnia warunek „dostępny do zapisania przed
   wejściem w implementację".
4. **superspec: degradacja, nie kasacja.** Zostaje jako opt-in dla przypadków, gdzie WHAT ma żyć
   osobno (issue-first, duże feature'y z review interesariuszy) — jego triggery CSO („spec", „PRD",
   „requirements doc") to realne intencje użytkownika, które po skasowaniu skilla nie miałyby
   handlera. Znika tylko z głównego przepływu. Pełne usunięcie = świadoma utrata funkcji 1–2
   z bilansu powyżej.

## Efekt

Domyślny przepływ ma jeden dokument, jedną pętlę review i o dwa ciężkie przebiegi mniej. Plan mode
pozostaje nienaruszony (wraz z resetem kontekstu i wstrzyknięciem planu po zatwierdzeniu),
a utrwalenie speca-planu do pliku lub issue dzieje się deterministycznie tuż po zatwierdzeniu.

## Zakres ewentualnych edycji

- `superdev/skills/superdev/SKILL.md` — handoff (superplan jako rekomendacja domyślna).
- `superdev/skills/superplan/SKILL.md` + oba szablony — twarde reguły AC dla sekcji standalone,
  marker `Persist:` + pytanie w kroku Implementation mode.
- `superdev/skills/superspec/SKILL.md` — degradacja triggerów (opt-in poza głównym przepływem).
- `CLAUDE.md` + `superdev/hooks/content/manifest.md` — aktualizacja udokumentowanego łańcucha
  (zmiana przepływu = zmiana chains, więc manifest wymaga synchronizacji).
