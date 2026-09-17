# Spec: Decyzje wykonawcy zadania mają czytelnika, a show-stopper zatrzymuje bieg
Intent: docs/.workflows/2026-09-17-underspecified-decision-lines/intent.md

## Problem / context (Why)

Wykonawca zadania na ścieżce Super zapisuje dziś w notatkach zadania linię `UNDERSPECIFIED:` dla każdej wartości, której plan nie ustalił, wraz z decyzją, jaką sam podjął. W 44 biegach z ostatnich dziesięciu dni w projektach storulo, workteam.one i tym repozytorium wygląda to tak: małe biegi (1-4 zadania) nie mają takich linii wcale, duże biegi funkcjonalne mają ich 2-4 na zadanie (storulo, moduł marketingu: 48 linii na 11 zadań; workteam.one, faza uwierzytelniania: 20 na 11). Po przejrzeniu 78 linii z trzech biegów aplikacyjnych około 40% to reguły biznesowe, kształty odpowiedzi nowych punktów końcowych API i zachowania przy awarii w połowie operacji (adres nadawcy kampanii, w jakich stanach wolno wysłać wiadomość testową, czy nieudana próba zjada przydział przebiegu, co się dzieje z wierszem zapisanym, ale nieoddanym kanałowi po padzie procesu, kształt odpowiedzi nowego endpointu, domyślny i maksymalny rozmiar strony); około 25% to teksty widoczne dla użytkownika (stopka maila, ekran wypisu, napisy karty, treść zasobów błędów); reszta to przypadki brzegowe i drobiazgi, które słusznie należą do wykonawcy.

Żaden czytelnik tych linii nie ocenia samej decyzji. Bramka recenzji per-zadanie ma mandat na "odstępstwa od planu", a linia decyzji jest z definicji zapisana osobno od odstępstw. Recenzje przekrojowe (checkpoint i końcowa) skanują te linie wyłącznie w poszukiwaniu par: dwa zadania decydujące o tej samej wartości. W żadnym z 44 biegów nie powstał zapis rozstrzygnięć biegu z tych decyzji. Recenzent w storulo pochwalił notatki jako ułatwiające recenzję i sprawdził, czy kod zgadza się z decyzją; nie zapytał, czy decyzja jest właściwa. Prowadzący bieg nie dowiedział się o żadnej z nich. Od wczoraj dochodzi nowy czytelnik: agent piszący dokument akceptacyjny dla testera i plik przekazania do testów e2e czyta te notatki i opisuje zachowanie dostarczone, więc niezweryfikowana decyzja wykonawcy staje się kryterium akceptacji i testem w CI.

Po stronie planowania luka jest konkretna: reguły planowania każą ustalać tylko wartości dzielone przez więcej niż jedno zadanie, macierz metod i kodów statusu jest wymagana tylko przy zmianie mechanizmu odpowiedzi (nowy punkt końcowy nie musi mieć w planie kształtu odpowiedzi), sekcja trybów awarii musi objąć tylko gałęzie, które zadanie samo decyduje (pad procesu między zapisem a wysyłką nie musi być wymieniony), a o tekstach widocznych dla użytkownika plan nie mówi nic. Ścieżka Simple nie ma tej linii w ogóle, choć jej recenzja przekrojowa jej szuka, a notatki rund naprawczych mają ją zakazaną, choć realne notatki naprawcze ją niosą, bo znaleziska w raportach też zostawiają wartości otwarte.

## Goal (What)

- Wykonawca zadania rozróżnia dwie sytuacje: wartość, dla której ma obronną odpowiedź (wzorzec w repozytorium, kryterium, konwencja), przyjmuje sam i zapisuje wraz z decyzją; sprawę, której rozstrzygnąć nie potrafi (sprzeczność z zapisaną decyzją, ze specyfikacją, z inną częścią planu, kryterium niespełnialne bez zmiany zapisanej decyzji), zatrzymuje i oddaje prowadzącemu, zanim zadanie zostanie zamknięte.
- Odpowiedź prowadzącego na takie zatrzymanie wiąże resztę biegu i nie wraca jako pytanie.
- Recenzja zadania ocenia każdą decyzję wykonawcy: czy wartość naprawdę była otwarta, czy decyzja trzyma się wzorca i kryteriów, i czy wartość należała do planu.
- Recenzja końcowa biegu pokazuje prowadzącemu wszystkie decyzje wykonawców w jednym miejscu, a dokument dla testera, plik przekazania do testów e2e i statystyki biegu je znają.
- Ścieżka Simple i rundy naprawcze zachowują się tak samo jak ścieżka Super i zadania w zakresie podziału decyzji, zatrzymania i odpowiedzi prowadzącego; spis, zapis dla testera i statystyki działają na obu ścieżkach.
- Plan, który zostawia wykonawcy kształt nowego punktu końcowego API, tekst widoczny dla użytkownika bez właściciela albo awarię w połowie operacji bez decyzji, nie przechodzi recenzji planu.
- Budowanie lub testowanie całego projektu jest bramką recenzji końcowej, nigdy bramki pośredniej ani próby pojedynczego zadania: duży host nie może płacić pełnym buildem za każdy punkt kontrolny.

## Out of scope

- Specyfikacja (What & Why), jej szablon i checklista: pozostają bez kontraktów API i bez tekstów dla użytkownika.
- Zmiana nazwy istniejącej linii decyzji wykonawcy.
- Zapisywanie decyzji wykonawcy do zapisu rozstrzygnięć biegu; ten zapis oznacza akceptację prowadzącego i tylko odpowiedź prowadzącego tam trafia.
- Bramka recenzji per-zadanie na ścieżce Simple.
- Zatrzymanie zadania przez recenzenta na kryterium niespełnialnym z winy treści planu: to osobny, oczekujący bieg `docs/.workflows/2026-09-17-task-gate-blocked-on-plan-defect`, którego zakres ta zmiana nie powtarza.
- Zapisy decyzji architektonicznych (ADR) dla tego repozytorium.

## User scenarios

Jako prowadzący bieg chcę, żeby wykonawca zadania sam rozstrzygał wartości, dla których ma dobrą odpowiedź, a zatrzymywał się wyłącznie na sprawach, których rozstrzygnąć nie może, żeby duży bieg nie pytał mnie kilkanaście razy o drobiazgi, ale też nie budował się na sprzeczności.

Jako prowadzący bieg, który odpowiedział na zatrzymanie, chcę, żeby ta odpowiedź obowiązywała do końca biegu, żeby to samo pytanie nie wracało przy kolejnym zadaniu ani przy naprawie.

Jako prowadzący bieg chcę na koniec zobaczyć w jednym miejscu, co wykonawcy ustalili sami, żebym mógł ocenić, czy adres nadawcy, rozmiar strony albo tekst stopki są takie, jakich chcę, zanim trafią do testera i do CI.

Jako recenzent zadania chcę mieć jasny mandat nad decyzjami wykonawcy, żeby wartość, którą plan ustalił, a wykonawca zmienił, była znaleziskiem, a wartość, która należała do planu, zastrzeżeniem do planu.

Jako tester czytający dokument akceptacyjny chcę, żeby opisywał zachowanie dostarczone, także tam, gdzie wykonawca sam coś ustalił, żebym nie testował brzmienia planu, którego w kodzie nie ma.

Jako autor planu chcę, żeby recenzja planu odrzuciła zadanie tworzące punkt końcowy bez kontraktu, tekst bez właściciela albo krok z zapisem i działaniem zewnętrznym bez decyzji o awarii między nimi, żeby te wartości nie schodziły do wykonawcy.

Jako prowadzący bieg na ścieżce Simple chcę tych samych zachowań co na Super, żeby duży bieg bez specyfikacji też miał sposób, by stanąć na show-stopperze.

## Acceptance criteria

Podział decyzji wykonawcy
1. Wartość z rekomendacją nie zatrzymuje - Wartość, której plan nie ustalił, a dla której wykonawca ma obronną odpowiedź opartą na wzorcu w repozytorium, kryterium lub konwencji, zostaje przyjęta przez wykonawcę i zapisana w zapisie zadania wraz z podjętą decyzją, a bieg się nie zatrzymuje.
2. Sprawa bez odpowiedzi zatrzymuje - Sprawa, której wykonawca nie potrafi rozstrzygnąć (sprzeczność z zapisaną decyzją, ze specyfikacją, z inną częścią planu, kryterium niespełnialne bez zmiany zapisanej decyzji), zatrzymuje zadanie i wraca z pytaniem do prowadzącego, zanim zadanie zostanie zamknięte.
3. Zatrzymanie nazywa sprawę - Zatrzymanie nazywa prowadzącemu, co jest nierozstrzygalne, dlaczego, i jakie opcje wykonawca widzi, jeśli jakieś widzi.

Odpowiedź prowadzącego
4. Odpowiedź wiąże resztę biegu - Odpowiedź prowadzącego zostaje zapisana w zapisie rozstrzygnięć biegu, obowiązuje przy każdym następnym zadaniu, naprawie i recenzji tego biegu i nie wraca jako pytanie ani jako znalezisko.
5. Zatrzymane zadanie idzie dalej - Po odpowiedzi to samo zadanie lub ta sama naprawa jest wykonywana ponownie z tą odpowiedzią i może zostać zamknięta.
6. Przerwanie kończy bieg - Prowadzący może zamiast odpowiedzi przerwać bieg; przerwanie zachowuje się jak dzisiejsze przerwanie z eskalacji zadania (pętla kończy się, drzewo robocze zostaje jak jest, zadanie pozostaje niezamknięte).

Obie ścieżki i tryb naprawy
7. Ścieżka Simple równa Super - Zachowania z kryteriów 1-6 działają identycznie na ścieżce Simple i na ścieżce Super.
8. Naprawa jak zadanie - Zachowania z kryteriów 1-6 działają też w rundzie naprawczej po recenzji, gdzie sprawą jest wartość, której raport nie ustalił, albo dwa znaleziska wymagające sprzecznych rzeczy.

Recenzja decyzji wykonawcy
9. Ustalona wartość nie jest decyzją - Wartość, którą plan ustalił, a wykonawca zapisał jako własną decyzję, jest znaleziskiem recenzji zadania.
10. Zła decyzja jest znaleziskiem - Decyzja wykonawcy niezgodna z wzorcem w repozytorium lub z kryterium, które zadanie pokrywa, jest znaleziskiem recenzji zadania z konkretną poprawką.
11. Decyzja należąca do planu jest zastrzeżeniem - Decyzja wykonawcy o wartości, którą według reguł planowania plan powinien był ustalić, jest odnotowana jako zastrzeżenie do planu, nie jako znalezisko.

Widoczność na koniec biegu
12. Spis decyzji na koniec - Recenzja końcowa biegu i jej ponowna recenzja po naprawie wypisują w jednym miejscu wszystkie decyzje wykonawców z całego biegu (zadanie lub naprawa, wartość, decyzja), bez wpływu na werdykt; recenzja pośrednia tego spisu nie wypisuje.
13. Zapis dla testera zna decyzje - Dokument akceptacyjny dla testera i plik przekazania do testów e2e opisują zachowanie wynikające z decyzji wykonawcy, nie z pierwotnego brzmienia planu.
14. Statystyki liczą oba rodzaje - Raport statystyk biegu liczy osobno decyzje wykonawcy i zatrzymania w każdym wierszu, który dziś ma (per zadanie i per runda naprawcza).

Zapobieganie w planie
15. Nowy endpoint ma kontrakt - Plan, w którym zadanie tworzy nowy punkt końcowy API bez kształtu żądania, odpowiedzi i kodów statusu, nie przechodzi recenzji planu.
16. Tekst dla użytkownika ma właściciela - Plan, w którym zadanie tworzy tekst widoczny dla użytkownika (wiadomość, ekran, komunikat błędu, zasób tekstowy), nie niosąc go ani nie delegując jawnie ze wskazaniem istniejącego wzorca, nie przechodzi recenzji planu.
17. Awaria w połowie operacji ma decyzję - Plan, w którym zadanie ma krok złożony z zapisu i działania zewnętrznego, a nie ustala, co dzieje się przy awarii między nimi, nie przechodzi recenzji planu.

Zasięg bramek
18. Cały projekt tylko w bramce końcowej - Plan, którego bramka pośrednia (budowanie lub testy uruchamiane przy każdym punkcie kontrolnym) albo własna próba zadania buduje lub testuje całe repozytorium, rozwiązanie lub przestrzeń roboczą, choć narzędzia hosta oferują węższy zakres pokrywający to, co plan zmienia, nie przechodzi recenzji planu; pełne budowanie lub pełna suita należy wyłącznie do bramki uruchamianej na recenzji końcowej.

## Constraints / assumptions

- Istniejąca linia decyzji wykonawcy zachowuje nazwę i kształt; raport statystyk liczy ją po prefiksie na początku linii, a jego test asertuje nagłówek i wiersze tabeli pozycyjnie, więc nowa kolumna dotyka skryptu, szablonu raportu i testu razem.
- Zapis rozstrzygnięć biegu niesie moc tekstu planu i powstaje wyłącznie przez dołączony skrypt; odpowiedź prowadzącego na zatrzymanie wykonawcy trafia tam w tym samym kształcie linii co akceptacja znaleziska recenzji.
- Orkiestrator biegu sam nie pisze żadnego pliku; każdy zapis powstaje w agencie, forku albo dołączonym skrypcie.
- Bieg jest prowadzony przy udziale człowieka: zatrzymanie z kryteriów 2-3 zakłada, że jest komu odpowiedzieć w trakcie budowy. Tryb bez obecnego prowadzącego nie ma tu osobnego zachowania.
- Wykonawca podnosi zatrzymanie zanim dotknie plików, gdy sprawę widać z treści zadania; sprawę wykrytą w trakcie pracy zgłasza, zostawiając drzewo robocze jak jest, a ponowne wykonanie kontynuuje od tego stanu.
- Bramka recenzji per-zadanie zachowuje dzisiejsze dwa werdykty; zatrzymanie z kryterium 2 pochodzi od wykonawcy, nie od recenzenta.
- Oczekujący bieg `docs/.workflows/2026-09-17-task-gate-blocked-on-plan-defect` dodaje do tej samej pętli per-zadanie zatrzymanie od recenzenta; niezależnie od kolejności budowy prowadzący widzi jeden przebieg zatrzymania (pytanie per sprawa, zapis odpowiedzi, ponowne wykonanie), bez względu na to, czy zatrzymał wykonawca, czy recenzent.
- Decyzja wykonawcy wypisana w spisie z kryterium 12, którą prowadzący uzna za złą, idzie dzisiejszą drogą zamknięcia rundy końcowej: prowadzący zleca naprawę w jednej rundzie naprawczej albo przyjmuje ją jako rozstrzygnięcie.
- Na ścieżce Simple, która nie ma bramki per-zadanie, ocenę z kryteriów 9-11 wykonuje recenzja przekrojowa (pośrednia lub końcowa), a zastrzeżenie do planu z kryterium 11 ląduje w jej raporcie.
- Spis z kryterium 12 pojawia się wyłącznie w raportach rundy końcowej (recenzja i jej ponowna recenzja), nigdy w raporcie rundy pośredniej.
- Zmiana nie dodaje ani nie usuwa skilla ani agenta, więc katalog wtyczki pozostaje bez zmian; manifest i dokumentacja opisują nowy podział i zatrzymanie od wykonawcy.
- Repozytorium nie ma kroku budowania ani lintera: edycja markdown i JSON jest wydaniem, a jedyną kontrolą pozostaje uważne czytanie oraz suita testów skryptów uruchamiana z korzenia repozytorium.
