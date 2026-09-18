# Spec: Pipelining sprawdzenia zadania i jedno uruchomienie bramy na rundę
Intent: docs/.workflows/2026-09-18-build-pipelining-and-single-gate-run/intent.md

## Problem / context (Why)

Faza build superdev trwa długo, a pomiar mówi, gdzie ten czas leży. Raport
`docs/stats/2026-09-17-build-cost-cuts.md` pokazuje bieg 15 zadań w 109:27, w którym sprawdzanie
pochłania 53% czasu ściany: 21:41 na sprawdzenia pojedynczych zadań i 36:36 na rundy recenzentów
budowy. Changelog `docs/changelog/2026-09-17-build-cost-cuts.md` dokłada dwie obserwacje: około
97% czasu ściany to generacja modelu, napędzana liczbą tur, a nie siłą modelu, a sprawdzenie
pojedynczego zadania kosztuje kwotę niemal niezależną od wielkości tego zadania.

Trzy rzeczy w dzisiejszym przebiegu płacą tę kwotę bez potrzeby. Sprawdzenie zadania blokuje
pętlę: następne zadanie nie może się zacząć, dopóki poprzednie nie zostanie ocenione, nawet gdy
z jego wyniku nie korzysta. Checkpoint po każdych pięciu zadaniach zawsze uruchamia pełną ocenę,
także gdy nic w oknie nie zostało zgłoszone. Na rundzie końcowej dwaj oceniający biegną naraz
i każdy z nich uruchamia ten sam komplet komend bramy na tym samym drzewie.

Jednocześnie żadna z tych trzech rzeczy nie może po prostu zniknąć. Sprawdzenie pojedynczego
zadania jest tym, co odróżnia cięższy tor od lżejszego. Checkpoint jest pierwszym momentem,
w którym w ogóle uruchamiają się komendy budowy i testów z planu: wykonawca zadania uruchamia
wyłącznie własne, najwęższe sprawdzenia, a oceniający pojedyncze zadanie nie uruchamia niczego.
Ograniczenie zapisane przez prowadzącego w `docs/notes.md` mówi wprost, że zmiana nie może
wydłużyć fazy build.

## Goal (What)

- Sprawdzenie ukończonego zadania przestaje opóźniać start następnego, ilekroć następne zadanie
  nie korzysta z wyniku sprawdzanego i nie sięga do tych samych plików.
- Zakres i głębokość sprawdzania nie maleją: każde zadanie dostaje to sprawdzenie, które
  dostawało dotąd.
- Wada wykryta po zapisaniu zadania jest naprawiana w granicy jednego zadania, a nie odkładana.
- Dowód maszynowy, że budowa i testy przechodzą, biegnie na każdym checkpoincie tak jak dotąd;
  znika tylko ocena, której nikt nie potrzebował.
- Każda komenda bramy danego etapu wykonuje się w rundzie dokładnie raz, niezależnie od tego,
  ilu oceniających czyta jej wynik.

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

## User scenarios

- Jako prowadzący bieg budowy chcę, żeby sprawdzenie ukończonego zadania nie wstrzymywało
  kolejnego, gdy jest to bezpieczne, żeby bieg kończył się szybciej bez rezygnacji z choćby
  jednego sprawdzenia. (kryteria 1, 2, 3)
- Jako prowadzący bieg budowy chcę, żeby wada zgłoszona już po zapisaniu zadania była domykana
  natychmiast, żeby nie rozlała się na dalszą pracę. (kryteria 4, 5)
- Jako prowadzący bieg budowy chcę, żeby checkpoint nadal dowodził maszynowo, że budowa i testy
  przechodzą, ale nie płacił za ocenę, gdy w oknie nic nie zostało zgłoszone. (kryteria 6, 7, 8)
- Jako prowadzący bieg budowy chcę, żeby ta sama komenda bramy nie wykonywała się w jednej
  rundzie dwa razy, żeby długi zestaw testów kosztował raz, a nie tyle razy, ilu jest oceniających.
  (kryteria 9, 10, 11)

## Acceptance criteria

1. Sprawdzenie nie wstrzymuje następnego zadania - Sprawdzenie ukończonego zadania biegnie
   równocześnie z pracą nad następnym, gdy następne nie korzysta z wyniku sprawdzanego ani nie
   sięga do tych samych plików.
2. Zakres sprawdzania bez zmian - Każde zadanie dostaje po zmianie dokładnie to sprawdzenie,
   które dostawało przed nią.
3. Zadanie zależne czeka na werdykt - Zadanie, które korzysta z wyniku poprzedniego albo dzieli
   z nim pliki, rozpoczyna się dopiero po werdykcie sprawdzenia tego poprzedniego.
4. Wada domknięta w granicy jednego zadania - Wada zgłoszona przez sprawdzenie, które biegło
   równocześnie z inną pracą, zostaje naprawiona zanim rozpocznie się praca o jedno zadanie
   dalej.
5. Naprawa odróżnialna w historii - Naprawa trafia do historii repozytorium jako osobny commit,
   odróżnialny od commitu zadania, którego dotyczy.
6. Dowód maszynowy na każdym checkpoincie - Każdy checkpoint niesie maszynowy dowód, że budowa
   i testy z planu przechodzą, niezależnie od tego, czy cokolwiek w oknie zostało zgłoszone.
7. Ocena checkpointu tylko gdy jest powód - Ocena checkpointu odbywa się wyłącznie wtedy, gdy
   któraś komenda bramy odbiegła od oczekiwania, któreś zadanie w oknie zostało zgłoszone jako
   wadliwe albo któreś zadanie w oknie nie podlegało sprawdzeniu.
8. Checkpoint zaczyna się z kompletem werdyktów - Checkpoint rozpoczyna się dopiero wtedy, gdy
   każde zadanie w jego oknie ma już werdykt sprawdzenia albo sprawdzeniu nie podlegało.
9. Komenda bramy raz na rundę - Każda komenda bramy danego etapu wykonuje się w tej rundzie
   dokładnie raz, choćby jej wynik czytało wielu oceniających.
10. Wynik bramy w raporcie każdego oceniającego - Wynik tego jednego uruchomienia jest widoczny
    w raporcie każdego oceniającego z tej rundy.
11. Reguła bramy wspólna dla obu ciężarów biegu - Zasada pojedynczego uruchomienia obowiązuje
    w biegu lżejszym tak samo jak w cięższym.

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
