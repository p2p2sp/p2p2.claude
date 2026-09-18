Title: "Pipelining review per task i jedno uruchomienie bramy na rundę"
Spec: docs/.workflows/2026-09-18-build-pipelining-and-single-gate-run/spec.md
Intent: docs/.workflows/2026-09-18-build-pipelining-and-single-gate-run/intent.md

## Out of scope

- Równoległe wykonywanie wielu zadań naraz i izolowane kopie repozytorium.
- Zapisywanie dowodów wykonania jako trwałego rejestru odcisków drzewa, pozwalającego pominąć
  ponowne uruchomienie komendy w kolejnej rundzie.
- Górny limit wielkości pojedynczego zadania i nowa blokująca reguła przeglądu planu dla zadania
  ponadwymiarowego.
- Zmiana częstotliwości checkpointu: nadal wypada po każdych pięciu zapisanych zadaniach.
- Zmiana budżetu rund naprawczych, słownika ocen i sposobu numerowania znalezisk.
- Rozstrzyganie, czy zależność między zadaniami jest kolejnościowa, czy wynika z konsumpcji
  wytworu.
- Tor bez planu oraz osobny przebieg testów end-to-end po budowie.

## Constraints / assumptions

- Zmiana nie może wydłużyć fazy build. Praca, której wynik nie jest potrzebny w następnym kroku,
  ma biec równolegle z krokiem, który i tak trwa.
- Równoczesność jest rozstrzygana wyłącznie z treści planu, bez osądu prowadzącego i bez osądu
  modelu w trakcie biegu.
- Deklaracja zależności między zadaniami jest czytana zachowawczo: gdy plan wskazuje jakąkolwiek
  zależność, równoczesność nie zachodzi. Tak samo czytany jest brak danych: zadanie, którego plan
  nie opisuje kompletnie, nie kwalifikuje się do równoczesności.
- Pomiar na 23 planach w `docs/.workflows/` daje 74 ze 114 par kolejnych zadań spełniających
  warunek, a w planach od 2026-09-16 jest to 29 z 66. Po odjęciu granic, na których wypada
  checkpoint, spodziewany udział równoczesnych par przy dzisiejszym stylu planowania wynosi
  około 37%.
- Ostatnie zadanie biegu nie ma z czym biec równocześnie, więc jego sprawdzenie pozostaje na
  ścieżce krytycznej; to jest właściwość każdego wariantu tej zmiany, nie jej koszt.
- Werdykty sprawdzenia zachowują dzisiejsze znaczenie, a sprawdzenia, które nie rozstrzyga sprawy
  samo i oddaje ją prowadzącemu, dotyczy ta sama granica jednego zadania co zgłoszenia wady.
- Zysk z pojedynczego uruchomienia bramy jest w tym repozytorium zerowy, bo wszystkie podsekcje
  bramy są tu puste z podanym powodem; staje się mierzalny dopiero na projekcie z realnym
  zestawem testów.
- Wada zgłoszona po zapisaniu zadania jest ceną tej zmiany i jest przyjęta świadomie; granicą
  jej życia jest jedno zadanie, bo dokładnie na jeden krok do przodu sięga rozstrzygnięcie
  równoczesności.
- W cięższym biegu sprawdzenie pojedynczego zadania może być zniesione decyzją planu; takie
  zadanie nie ma żadnego sprawdzenia przed checkpointem, więc jego obecność w oknie jest powodem
  do oceny checkpointu.
- W lżejszym biegu żadne zadanie nie jest sprawdzane pojedynczo, więc checkpoint jest tam jedyną
  bramą i pozostaje bezwarunkowy.

