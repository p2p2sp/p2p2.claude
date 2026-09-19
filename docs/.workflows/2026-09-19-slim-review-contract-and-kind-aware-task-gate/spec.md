# Spec: Odchudzenie kontraktu review i brama per task świadoma rodzaju zadania
Intent: docs/.workflows/2026-09-19-slim-review-contract-and-kind-aware-task-gate/intent.md

## Problem / context (Why)

Dwie tury code audit rozrosły instrukcje superdev. `superdev/references/review-contract.md` ma dziś 587 linii i około 7 200 słów, a czyta go w całości siedmiu konsumentów: trzej recenzenci budowy, recenzent bramy per task, dwa implementory zadań i oba orkiestratory. Na piętnastozadaniowym biegu sam recenzent bramy per task czyta ten plik piętnaście razy, zanim spojrzy na pierwszą linię diffu. Pomiar z biegu `build-cost-cuts` pokazuje, że review zajmuje od 40 do 53 procent czasu ściany builda, a brama per task to 21:41 na piętnaście zadań.

Objętość nie bierze się z liczby reguł, tylko z prozy wokół nich. Prawie każda reguła niesie dwie do czterech linii uzasadnienia, dlaczego przyjęto właśnie ją. Do tego plik nosi reguły martwe (wycofane etykiety `base:` i `runner:`, obsługa raportów sprzed obecnego kontraktu, których cykl życia biegu i tak nie przechowuje) oraz powtórzenia tej samej reguły w kilku sekcjach. `.claude/rules/_common.md:6-8` już deklaruje, że proza jest dla użytkownika, nie dla agenta, i należy do `CLAUDE.md` albo nagłówka skryptu, nie do kontraktu czytanego wielokrotnie w trakcie wykonania. Ta reguła istnieje i jest łamana.

Druga wada jest jakościowa. Oś `Kind:` (`code`, `scaffold`, `text`) jest wdrożona w połowie: wyprowadza ją klasa B22 z `superdev/references/plan-review-checklist.md`, dyscyplinę per rodzaj mają oba implementory, ale `superdev/agents/superbuild-task-reviewer.md` marker widzi i ignoruje. Jego `## Failure pass` to pięciopunktowa checklista (gałęzie `catch`, nowe człony zbiorów domkniętych, kody odpowiedzi, walidacja wejścia, nowe testy), z której dla zadania dostarczającego prozę nie może wystrzelić ani jeden punkt, a dla zadania uruchamiającego generator wystrzeliwują tylko przypadkiem. Pierwotny projekt zakładał, że takie zadania w ogóle nie dostaną recenzenta (`Review: none` domyślnie dla `scaffold` i `text`), ale w repozytorium, w którym tekst jest produktem, ta domyślność jest świadomie wyłączona: zadania `text` recenzenta dostają, a checklista jest pusta. Do tego jeden krok bramy żąda od recenzenta dowodu z `Grep`, którego autorowi zadania `text` jawnie zabroniono.

Trzecia wada to duplikacja u konsumentów. Preambuła kontraktu deklaruje, że żaden konsument nie nosi kopii sekcji, a mimo to identyczny akapit o odczycie bloku bram i identyczny akapit o wykluczeniu katalogu roboczego biegu stoją słowo w słowo w trzech plikach recenzentów budowy, razem około 4,5 KB. Cztery bloki osi review w tych samych plikach są przepisaniem wiedzy, którą model ma wyuczoną.

## Goal (What)

- Kontrakt czytany przed każdym dispatchem jest około jednej trzeciej dzisiejszej objętości, bez utraty choćby jednej reguły.
- Brama per task uruchamia sprawdzenia dobrane do rodzaju pracy, którą zadanie dostarczyło, więc proza i wygenerowany output po raz pierwszy dostają cele, które mogą wystrzelić.
- Recenzenci budowy przestają nosić kopie reguł mających właściciela gdzie indziej i przestają powtarzać osie review, które model już zna.
- Każda reguła usunięta po drodze jest rozliczona: zachowana, przeniesiona albo świadomie porzucona z podanym powodem.

## Out of scope

- Podział kontraktu review na wiele plików. Zostaje jedna nazwa i jeden właściciel.
- Orkiestratory obu torów budowy - ich rozgałęzienia sterowania pozostają nietknięte.
- Checklista recenzenta planu i jej klasy blokujące - review planu to osobny problem.
- Pozostałe referencje superdev poza kontraktem review, w tym format dokumentów QA.
- Indeks zadań budowany przez `decompose.sh`, jego kolumny i jego testy.
- Domyślne wartości siły dispatchu przypisywane przez skille planujące oraz mechanizm nadpisania ich deklaracją z pamięci hosta.
- Pozostałe pluginy repozytorium: superui, supergh, superfix, superbiz, supercc.

## User scenarios

- Jako deweloper prowadzący bieg na torze Super chcę, żeby każdy dispatch review wydawał swój kontekst na moją zmianę, a nie na słownik, którego i tak nie użyje, żeby review przestało zjadać połowę czasu biegu.
- Jako deweloper, którego zadanie dostarcza prozę albo wygenerowany output, chcę, żeby jego recenzja sprawdzała to, co w takiej pracy naprawdę może być zepsute, żeby brama łapała rozjazd zamiast przebiegać pustą listę.
- Jako opiekun reguł review chcę czytać w kontrakcie samą regułę bez historii jej przyjęcia, żeby znaleźć i zmienić regułę bez przedzierania się przez uzasadnienia.

## Acceptance criteria

1. Kontrakt skrócony - Kontrakt czytany przez pracownika budowy liczy najwyżej 230 linii wobec dzisiejszych 587.
2. Jedna reguła, jedno miejsce - Każda reguła słownika review istnieje w dokładnie jednym miejscu w całym pluginie i żaden recenzent nie nosi jej drugiej kopii.
3. Bez dodatkowej pracy na dispatch - Żaden dispatch review nie czyta więcej plików, nie uruchamia więcej komend ani nie wykonuje więcej kroków niż przed zmianą.
4. Sprawdzenia dobrane do rodzaju pracy - Recenzja zadania uruchamia sprawdzenia, które mogą wystrzelić na tym, co zadanie dostarczyło, wybrane deterministycznie z rodzaju pracy, który zadanie już deklaruje.
5. Rozjazd w prozie złapany - Zadanie dostarczające prozę jest flagowane, gdy jego tekst przeczy plikowi, na który się powołuje, wprowadza słownictwo, którego ten plik nie definiuje, albo powtarza regułę mającą już swoje miejsce.
6. Żadne sprawdzenie nie żąda zakazanego narzędzia - Żaden krok recenzji nie wymaga dowodu z narzędzia, którego autorowi tego zadania zabroniono.
7. Reguły bez historii - Kontrakt podaje każdą regułę bez relacji z tego, dlaczego została przyjęta.
8. Każda reguła rozliczona - Każda reguła, którą kontrakt niósł przed zmianą, jest odnotowana jako zachowana, przeniesiona albo świadomie porzucona z podanym powodem.

## Constraints / assumptions

- Zmiana nie może wydłużyć fazy build. Review zajmuje dziś od 40 do 53 procent czasu ściany, więc każdy dodany krok musi zmieścić się w tym budżecie albo iść w tle.
- Markdown i JSON są produktem tego repozytorium. Nie ma builda ani lintu na żadnym poziomie, więc jedyną bramą jakości jest review, a błąd w tekście jest błędem produkcyjnym.
- W tym repozytorium tekst jest produktem, więc zadania dostarczające prozę zachowują bramę per task; domyślne pomijanie recenzenta dla takich zadań pozostaje wyłączone.
- Wyłączna własność słownika review jest przypisana do jednej nazwy pliku przez pięć wcześniej zapisanych decyzji, a dziesiątki plików celowo na tę ścieżkę wskazują. Nazwa i własność pozostają bez zmian.
- Rodzaj pracy jest wyprowadzany wyłącznie z dowodu, który zadanie uruchamia jako własny proof, przez klasę blokującą w checklistcie recenzenta planu, która pozostaje jedynym właścicielem tej derywacji.
- Recenzent bramy per task już widzi deklarowany rodzaj pracy w pliku zadania, który dostaje na wejściu; nie trzeba mu go dostarczać nowym kanałem.
- Część usuwanej prozy powstała jako zapis realnie zaobserwowanego defektu, więc rozliczenie z kryterium 8 jest warunkiem bezpieczeństwa tej zmiany, nie formalnością.
