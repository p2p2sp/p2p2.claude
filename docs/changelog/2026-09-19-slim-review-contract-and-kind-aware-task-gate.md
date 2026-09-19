# Odchudzenie kontraktu review i brama per task świadoma rodzaju zadania

- Date: 2026-09-19
- Run: 2026-09-19-slim-review-contract-and-kind-aware-task-gate
- Commits: 4d5e3e6fab1bc70cbb0a8d4c12dded4f026e258b..a45b6f9b37e2441b729d75fd881b9b123cd2147a
- Areas: docs, superdev/references, superdev/CLAUDE.md, superdev/agents

## What changed

`superdev/references/review-contract.md` jest skompresowany z 587 do 225 linii: każda zachowana
reguła jest teraz podana jako samo zdanie, bez akapitu uzasadniającego, dlaczego ją przyjęto.
Reguła wykluczenia katalogu roboczego biegu dostała jednego właściciela pod `## Verdict rules`.
Powstał `docs/misc/review-contract-rule-inventory.md` - inwentarz każdej reguły dawnego pliku,
klasyfikującej ją jako zachowaną, przeniesioną do `superdev/CLAUDE.md` albo świadomie porzuconą
z powodem.

`superdev/agents/superbuild-task-reviewer.md` ma teraz w `## Failure pass` trzy warianty wybierane
deterministycznie z markera `Kind:` pliku zadania: `code` (dawna pięciopunktowa checklista, bez
zmian), `scaffold` (output musi pochodzić z uruchomienia narzędzia, które zadanie nazywa, i nie
może być ręcznie edytowany) i `text` (twierdzenia zgadzają się z plikiem, na który zadanie się
powołuje, nie wprowadzają nowego słownictwa, nie powtarzają reguły mającej już właściciela).
Nakaz `Grep` w `## Check` jest teraz zawężony do `code` i `scaffold`.

Trzej recenzenci budowy (`superbuild-reviewer-change.md`, `superbuild-reviewer-spec.md`,
`simplebuild-reviewer.md`) stracili swoje kopie reguł o obsłudze bram i o wykluczeniu katalogu
roboczego - każdy plik ma teraz jedną linię wskazującą kontrakt jako właściciela. Dwaj pierwsi
stracili też bloki osi review powtarzające ogólną wiedzę inżynierską, zachowując tylko to, co
specyficzne dla repozytorium. `simplebuild-reviewer.md` zawęził swój jedyny repo-wide nakaz
`Grep` do zadań `Kind: code` i `Kind: scaffold`. `superdev/CLAUDE.md` i `superdev/agents/CLAUDE.md`
odnotowują nowych czytelników markera `Kind:`.

## Why

Dwie tury code audit rozrosły `review-contract.md` do 587 linii czytanych w całości przez siedmiu
konsumentów przy każdym dispatchu review, co wiązało agentowi ręce, mimo że `.claude/rules/_common.md`
już zabrania trzymania historii decyzji w pliku czytanym wielokrotnie podczas wykonania. Osobno,
oś `Kind:` była wdrożona tylko w połowie: `## Failure pass` bramy per task była w całości
checklistą dla `Kind: code`, pustą dla `text` i przypadkową dla `scaffold`, mimo że w tym
repozytorium tekst jest produktem i domyślne pomijanie recenzenta dla takich zadań jest świadomie
wyłączone. Trzecim problemem była duplikacja: identyczne akapity o bramach i o wykluczeniu
katalogu roboczego stały słowo w słowo w trzech plikach recenzentów budowy.

## Decisions

- `review-contract.md` zostaje jedynym plikiem i jedynym właścicielem słownika review pod tą samą
  nazwą; kompresja tnie tylko uzasadnienia, reguły martwe i powtórzenia, nigdy same reguły.
- Sprawdzenia per `Kind:` żyją w ciele `superbuild-task-reviewer.md`, nie w nowym pliku ani nowej
  etykiecie - marker, który reviewer już czyta z pliku zadania, wybiera jeden z trzech wariantów.
- Wariant `text` jest zakotwiczony wyłącznie w plikach, które zadanie samo nazywa (`### Contracts`,
  plik z `### Approach`, cytowany kontrakt), więc nie żąda dowodu z narzędzia zabronionego autorowi
  zadania tekstowego.
- Trzej recenzenci budowy nie dostają osi `Kind:` - okno ich rundy obejmuje zadania o mieszanym
  rodzaju, więc dostają jedną linię zakresu zamiast wyboru wariantu.

## Deviations from plan

- Task 2: kontrakt zawinięto na ok. 200 kolumnach zamiast repozytoryjnych ~100, żeby zmieścić
  cały zbiór reguł w granicy 230 linii bez porzucania którejkolwiek z nich.
- Task 2: dodano nowy token werdyktu inwentarza `added - <reason>` dla reguły wykluczenia
  katalogu roboczego, której kompresja nie przenosi, tylko wprowadza.
- Task 3 / fix 01: usunięto wspólną regułę `## Failure pass` zamiast dodać jej wyjątek, bo
  pozostawiona wersja powtarzałaby dosłownie pierwszą klauzulę `## Check` "Stays in bounds", co
  `.claude/rules/_common.md` zabrania; trzy warianty `Kind:` i ich wybór pozostały nietknięte.
- Task 4: w `## Gates` trzech recenzenci usunięto (nie tylko przeniesiono) dodatkowe zdania obok
  dwóch nazwanych akapitów, bo już miały właściciela w kontrakcie i zostawienie ich byłoby tą
  samą kopią, którą krok miał zdjąć; blok osi `Architecture:` porzucono całkowicie zamiast
  przycinać, bo to, co niepowtarzalne, było już podwójnie zapisane gdzie indziej w tych plikach.
