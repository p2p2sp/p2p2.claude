# Intent: Odwołania po tytule, nie po samym numerze
Date: 2026-09-16

## Request
superdev w fazie planowania i budowania zapisuje do dokumentów i pisze w czacie numery (id, numery, slugi), które dla użytkownika nic nie znaczą, bo nie jest w stanie ich wszystkich zapamiętać. Każdy element pipeline (decyzja, faza, zadanie, kryterium akceptacji, finding recenzji, klasa checklisty) ma mieć tytuł, a wszystko, co czyta człowiek (narracja w czacie, bramki, eskalacje, raporty recenzentów, linie odwołań w plikach), odwołuje się do elementu po tytule z numerem jako wskaźnikiem, nigdy po samym id, numerze czy slugu. Numer zostaje dla agentów i skryptów jako łatwo identyfikowalny wskaźnik.

## Decisions
### 1. Skąd wziąć tytuł dla elementów, które dziś go nie mają (kryteria akceptacji, findingi recenzji)?
Każdy element dostaje krótki tytuł w chwili powstania: kryterium akceptacji przyjmuje formę `1. <krótka nazwa> - <warunek>` w szablonach spec i plan, finding recenzji formę `- C1 - <krótka nazwa> - file:line - co jest źle - dlaczego to ważne - jak naprawić` w `superdev/references/review-contract.md` i u recenzentów planowania; klasy checklist (`B`/`R`) są cytowane z nazwą, jaką noszą w checkliście.

### 2. Jaka jest kanoniczna forma odwołania (tytuł + numer)?
Tytuł w odwrotnych apostrofach, potem wskaźnik w nawiasie: `` `Retry przy logowaniu` (kryterium 3) ``, `` `Fundament auth` (faza 01) ``, `` `Brak testu na timeout` (C2) ``, `` Covers: `Retry przy logowaniu` (#3), `Blokada konta` (#5) ``. Jedna reguła dla czatu i plików. Nagłówki (`## Task 3 - <tytuł>`, `### 5. <pytanie>`, `### 01. <tytuł fazy>`) zostają w dotychczasowej formie.

### 3. Gdzie mieszka zasada i kto ją egzekwuje?
Zasada (forma odwołania, skąd brać tytuł, jak nadawać tytuł kryterium i findingowi) trafia jako nowa sekcja do `superdev/references/review-contract.md`. Każdy skill i agent, który pisze dla człowieka, dostaje jedno zdanie w miejscu, gdzie odwołanie powstaje (bramka, eskalacja, `Covers:`, `Depends on:`, `consumed by`, `## Impact on decisions`, raport). Recenzenci egzekwują: nowa klasa blokująca B15 w `superdev/references/plan-review-checklist.md` (odwołanie bez tytułu w planie), nowa reguła R6 w `superdev/skills/phases/references/checklist.md`, a finding bez tytułu narusza kontrakt raportu recenzji budowy.

### 4. Skąd bramka wznowienia faz bierze tytuł fazy?
`superdev/scripts/phases-status.sh` czyta `### NN. <tytuł>` z `phases.md` i drukuje trzecią kolumnę: `<dir>\t<status>\t<tytuł>` oraz `next: <dir>\t<tytuł>`. Skill `phases` tylko przepisuje wynik skryptu. Komunikaty `superdev/scripts/decompose.sh` o kryteriach cytują tytuł obok numeru. Testy w `tests/superdev/` rozszerzone o te przypadki.

## Constraints
- Zakres obejmuje obie fazy: planowanie (`intent`, `phases`, `phases-reviewer`, `superspec`, `superspec-reviewer`, `superplan`, `superplan-reviewer`, `simpleplan`, `simpleplan-reviewer`) i budowanie (`superbuild`, `simplebuild`, trzej recenzenci budowy, `superbuild-task-reviewer`, eskalacje i tabela pokrycia kryteriów).
- Numeracja opcji w wywiadzie (`2.1 / 2.2`, "Indicate: ...") i numerowane pytania luki zostają bez zmian: są w tej samej wiadomości, nic nie trzeba pamiętać.
- Pliki czytane i zatwierdzane przez człowieka (`intent.md`, `phases.md`, `plan.md`, `spec.md`, raporty w `implementation/`) wchodzą w zakres i muszą zawierać tytuł i numer.
- Bez migracji istniejących dokumentów: stare pliki bez tytułów muszą dalej się parsować (`decompose.sh`, `phases-status.sh`), a element bez tytułu jest w odwołaniu cytowany swoją treścią.
- Implementacja zmian w skillach i agentach przez skill `supercc:skill-designer`.
- Zasada "script vs fork" z repo zachowana: format, który da się wydrukować deterministycznie, drukuje skrypt, nie fork.

## Out of scope
- Manifest `superdev/hooks/content/manifest.md` bez zmian.
- Dokumentacja (`superdev/README.md`, root `CLAUDE.md`) zmieniana tylko tam, gdzie opisuje format odwołań lub wyjście skryptów.
- Nazwy plików zadań (`tasks/task-NN.md`), katalogów faz (`phases/NN-<slug>`) i katalogu runu pozostają kontraktem maszynowym.

## History
- none
