Title: "Odchudzenie kontraktu review i brama per task świadoma rodzaju zadania"
Spec: docs/.workflows/2026-09-19-slim-review-contract-and-kind-aware-task-gate/spec.md
Intent: docs/.workflows/2026-09-19-slim-review-contract-and-kind-aware-task-gate/intent.md

## Out of scope

- Podział kontraktu review na wiele plików. Zostaje jedna nazwa i jeden właściciel.
- Orkiestratory obu torów budowy - ich rozgałęzienia sterowania pozostają nietknięte.
- Checklista recenzenta planu i jej klasy blokujące - review planu to osobny problem.
- Pozostałe referencje superdev poza kontraktem review, w tym format dokumentów QA.
- Indeks zadań budowany przez `decompose.sh`, jego kolumny i jego testy.
- Domyślne wartości siły dispatchu przypisywane przez skille planujące oraz mechanizm nadpisania ich deklaracją z pamięci hosta.
- Pozostałe pluginy repozytorium: superui, supergh, superfix, superbiz, supercc.

## Constraints / assumptions

- Zmiana nie może wydłużyć fazy build. Review zajmuje dziś od 40 do 53 procent czasu ściany. Sam dispatch review nie zyskuje kroku w żadnym wariancie (kryterium 3); praca dokładana gdziekolwiek indziej w biegu musi zmieścić się w dzisiejszym budżecie albo iść w tle.
- Markdown i JSON są produktem tego repozytorium. Nie ma builda ani lintu na żadnym poziomie, więc jedyną bramą jakości jest review, a błąd w tekście jest błędem produkcyjnym.
- W tym repozytorium tekst jest produktem, więc zadania dostarczające prozę zachowują bramę per task; domyślne pomijanie recenzenta dla takich zadań pozostaje wyłączone.
- Wyłączna własność słownika review jest przypisana do jednej nazwy pliku przez pięć wcześniej zapisanych decyzji, a dziesiątki plików celowo na tę ścieżkę wskazują. Nazwa i własność pozostają bez zmian.
- Rodzaj pracy jest wyprowadzany wyłącznie z dowodu, który zadanie uruchamia jako własny proof, przez klasę blokującą w checklistcie recenzenta planu, która pozostaje jedynym właścicielem tej derywacji.
- Recenzent bramy per task już widzi deklarowany rodzaj pracy w pliku zadania, który dostaje na wejściu; nie trzeba mu go dostarczać nowym kanałem.
- Część usuwanej prozy powstała jako zapis realnie zaobserwowanego defektu, więc rozliczenie z kryterium 8 jest warunkiem bezpieczeństwa tej zmiany, nie formalnością.

