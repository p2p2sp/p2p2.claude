# Spec: Defekt planu zatrzymuje zadanie i wraca do prowadzącego
Intent: docs/.workflows/2026-09-17-task-gate-blocked-on-plan-defect/intent.md

## Problem / context (Why)

Bramka recenzji per-zadanie na ścieżce Super potrafi dziś powiedzieć tylko dwie rzeczy: zadanie przechodzi albo zadanie ma znalezisko do naprawy w kodzie. Kiedy kod jest zgodny z planem, a mimo to kryterium akceptacji przypisane temu zadaniu pozostaje niespełnione, bo plan opisał za mało, recenzent nie ma żadnego kanału poza linią `NOTE: plan defect`. Ta linia ma dziś pięciu piszących i ani jednego czytelnika, który by na niej cokolwiek robił: jedynym konsumentem jest licznik w `superdev/scripts/stats-report.sh`, czynny wyłącznie przy przełączniku `stats: true`. Prowadzący bieg nie dowiaduje się o niej w ogóle.

Koszt widać w biegu `docs/.workflows/2026-09-16-bloki-jako-pluginy/phases/03-tokeny-i-filtr-css` projektu seo-cms. Zadanie drugie pokrywało dziesięć kryteriów, w tym `Grafika i arkusz w limitach` (#12) i `Swoboda wewnątrz bloku` (#8). Plan opisał limit pojedynczej grafiki wyłącznie dla jednej z dwóch postaci, w jakiej grafika wchodzi do arkusza, i odrzucał konstrukcję, bez której ruch opisany w arkuszu nie ma jak zadziałać. Oba kryteria były więc niespełnialne treścią planu. Recenzent zapisał to jako `NOTE: plan defect` w rundzie pierwszej, drugiej i trzeciej; żadna z tych linii nie uruchomiła niczego, a jedna z nich do dziś wisi nietknięta w notatkach zadania. Trzy rundy naprawcze znalazły w tym czasie trzy inne przecieki tej samej konstrukcji planu, bo plan opisywał bramkę nad danymi pisanymi przez obcego autora jako listę tego, co odrzucane, a taka lista zawsze przecieka.

Bieg wyszedł z tego wyłącznie dlatego, że po trzeciej rundzie zadziałał limit rund i prowadzący napisał ręcznie pełną wymianę reguł planu, wraz ze zdaniem „obowiązkowa do wykonania w tej rundzie naprawczej", bo kanału, który by taką poprawkę wykonał, nie ma. Ta sama poprawka nie dotarła też do zadań późniejszych: notatki zadania drugiego musiały dostać dopisek, że opisują mechanizm, którego w kodzie już nie ma, i że czytający je przy zadaniu trzecim ma je brać jako historię.

Po stronie zapobiegania luka jest jedna i wąska: współdzielony `superdev/references/plan-review-checklist.md` ma klasę blokującą na wartość zewnętrzną użytą bez walidacji, ale nie ma żadnej na wartość zwalidowaną listą zakazów. Pokrycie kryteriów zadaniami w tamtym planie było kompletne, więc licznik pokrycia niczego by tu nie złapał.

## Goal (What)

- Zadanie, którego kryterium pozostaje niespełnione z winy treści planu, zatrzymuje bieg i wraca z pytaniem do prowadzącego, zamiast zostać zatwierdzone z notatką bez odbiorcy.
- Prowadzący może w odpowiedzi podyktować poprawioną regułę, a ta zostaje wykonana w kodzie, nie tylko zapisana.
- Rozstrzygnięcie zapadłe przy jednym zadaniu obowiązuje przez resztę biegu i nie wraca jako pytanie po raz drugi.
- Zastrzeżenie do planu, które żadnego kryterium tego zadania nie łamie, biegu nie zatrzymuje, ale dociera do recenzji obejmującej cały bieg.
- Dwa różne znaleziska tego samego zadania są rozróżnialne po numerze, także gdy padły w różnych rundach.
- Plan opisujący bramkę nad wartością spoza procesu jako wyliczenie tego, co odrzucane, nie przechodzi recenzji planu.

## Out of scope

- Mechaniczne liczenie pokrycia w kierunku kryterium → zadanie; w biegu, który tę zmianę wywołał, pokrycie było kompletne i taka kontrola nie złapałaby niczego.
- Wymóg, by każde pokrywane kryterium niosło opis dowodu, którym zadanie je domyka.
- Weryfikacja na bramce per-zadanie, czy naprawa z poprzedniej rundy się utrzymała, wraz z tabelą werdyktów dla znalezisk tamtej rundy.
- Ścieżka Simple, która bramki per-zadanie nie ma w ogóle: nie zyskuje żadnego nowego sposobu zapisania zastrzeżenia do planu, a jej wykonawca zadania pozostaje nietknięty. Zmienia się tam wyłącznie recenzja obejmująca cały bieg, która czyta zastrzeżenia zapisane przez własne wcześniejsze rundy.
- Edycja zatwierdzonego pliku planu w trakcie biegu.
- Naprawa filtru CSS w projekcie seo-cms, który posłużył tu wyłącznie za materiał dowodowy.

## User scenarios

Jako prowadzący bieg chcę, żeby zadanie, którego kryterium plan uczynił niespełnialnym, zatrzymało się i zapytało mnie, żebym nie dowiadywał się o dziurze po zakończeniu budowy albo wcale.

Jako prowadzący bieg, któremu zadano takie pytanie, chcę móc podyktować poprawioną regułę i dostać ją zbudowaną, żebym nie musiał przeplanowywać całości ani łatać biegu ręcznie.

Jako prowadzący bieg chcę, żeby to, co raz rozstrzygnąłem, wiązało resztę biegu i nie wracało, żeby kolejne zadania nie budowały się na nieaktualnej regule i żeby ten sam problem nie zjadał kolejnych rund.

Jako prowadzący bieg czytający jego zapis chcę wiedzieć, o którym znalezisku mówi zapisane rozstrzygnięcie, żeby reguła wiążąca resztę biegu wskazywała jedną sprawę, a nie trzy różne noszące ten sam numer.

Jako prowadzący bieg chcę, żeby zastrzeżenie do planu, które niczego nie łamie tu i teraz, dotarło do kogoś, kto patrzy na całość, żeby ryzyko międzyzadaniowe nie kończyło się jako martwa notatka.

Jako autor planu chcę, żeby recenzja planu odrzuciła bramkę nad niezaufaną wartością opisaną przez wyliczenie odrzuceń, żeby budowa nie odkrywała kolejnych przecieków rundami.

## Acceptance criteria

Zatrzymanie na defekcie planu
1. Niespełnione kryterium zatrzymuje zadanie - Zadanie, którego kod odpowiada treści planu, ale kryterium przez nie pokrywane pozostaje niespełnione właśnie z powodu tej treści, nie zostaje zatwierdzone: bieg zatrzymuje się i pyta prowadzącego.
2. Zatrzymanie nazywa sprawę - Zatrzymanie nazywa prowadzącemu niespełnione kryterium oraz powód, dla którego żadna zmiana kodu tego kryterium nie domknie.

Odpowiedź prowadzącego
3. Podyktowana poprawka zostaje zbudowana - Reguła, którą prowadzący podyktował w odpowiedzi na zatrzymanie, zostaje wykonana w kodzie tego zadania, zanim zadanie zostanie ocenione ponownie.
4. Przyjęcie dziury zamyka zadanie - Prowadzący może zamiast poprawki przyjąć dziurę taką, jaka jest; zadanie idzie wtedy dalej, a przyjęta treść zostaje zapisana w zapisie biegu.
5. Rozstrzygnięta sprawa nie wraca - Sprawa raz rozstrzygnięta przez prowadzącego nie jest w tym biegu podnoszona ponownie jako zatrzymanie ani jako znalezisko; kryterium, które po wykonaniu podyktowanej poprawki pozostaje niespełnione z innego powodu, jest sprawą nową i może zatrzymać zadanie jeszcze raz.

Zapis biegu
6. Rozstrzygnięcie wiąże dalsze zadania - Reguła przyjęta przy jednym zadaniu obowiązuje przy każdym następnym zadaniu tego biegu, bez powtarzania jej przez prowadzącego.

Rozróżnialność znalezisk
7. Znalezisko ma własny numer - Dwa różne znaleziska tego samego zadania nigdy nie noszą tego samego numeru, także gdy padły w różnych rundach naprawczych.

Zastrzeżenia nieblokujące
8. Zastrzeżenie bez kryterium nie zatrzymuje - Zastrzeżenie do planu, które nie dotyka żadnego kryterium pokrywanego przez to zadanie, biegu nie zatrzymuje i zadania nie wstrzymuje.
9. Zastrzeżenie trafia do recenzji całego biegu - Takie zastrzeżenie, zapisane przy zadaniu, zostaje przeczytane przez recenzję obejmującą cały bieg i albo podniesione w jej raporcie jako jej własne znalezisko, albo w tym raporcie odnotowane jako zamknięte.

Zapobieganie w recenzji planu
10. Wyliczenie odrzuceń odrzuca plan - Plan opisujący bramkę nad wartością pochodzącą spoza procesu przez wyliczenie tego, co odrzucane, nie przechodzi recenzji planu.
11. Zamknięty zbiór przyjęć przechodzi - Plan opisujący tę samą bramkę przez zamknięty zbiór wartości przyjmowanych przechodzi recenzję planu bez tego zarzutu.

## Constraints / assumptions

- Plan zatwierdzony przez recenzję planu jest do końca biegu niezmienny, więc poprawka reguły podyktowana przez prowadzącego musi żyć w zapisie biegu, a nie w pliku planu.
- Zapis rozstrzygnięć biegu niesie moc tekstu planu: to, co się w nim znajdzie, wiąże każdego, kto plan czyta, i nie podlega ponownej ocenie.
- Orkiestrator biegu sam nie pisze żadnego pliku; każdy zapis powstaje w agencie, forku albo dołączonym skrypcie.
- Bieg jest prowadzony przy udziale człowieka: zatrzymanie z kryteriów 1 i 2 zakłada, że jest komu odpowiedzieć w trakcie budowy. Tryb bez obecnego prowadzącego nie ma tu osobnego zachowania.
- Licznik zastrzeżeń do planu w raporcie statystyk biegu ma po tej zmianie nadal działać.
- Zmiana nie dodaje ani nie usuwa żadnego skilla ani agenta, więc katalog wtyczki pozostaje bez zmian.
- Repozytorium nie ma kroku budowania ani lintera: edycja markdown i JSON jest wydaniem, a jedyną kontrolą pozostaje uważne czytanie.
