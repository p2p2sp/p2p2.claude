Title: "Implementor decision lines: UNDERSPECIFIED with a recommendation, DECISION as a hard stop, reviewers and planner closing the gap"
Spec: docs/.workflows/2026-09-17-underspecified-decision-lines/spec.md
Intent: docs/.workflows/2026-09-17-underspecified-decision-lines/intent.md

## Out of scope

- Specyfikacja (What & Why), jej szablon i checklista: pozostają bez kontraktów API i bez tekstów dla użytkownika.
- Zmiana nazwy istniejącej linii decyzji wykonawcy.
- Zapisywanie decyzji wykonawcy do zapisu rozstrzygnięć biegu; ten zapis oznacza akceptację prowadzącego i tylko odpowiedź prowadzącego tam trafia.
- Bramka recenzji per-zadanie na ścieżce Simple.
- Zatrzymanie zadania przez recenzenta na kryterium niespełnialnym z winy treści planu: to osobny, oczekujący bieg `docs/.workflows/2026-09-17-task-gate-blocked-on-plan-defect`, którego zakres ta zmiana nie powtarza.
- Zapisy decyzji architektonicznych (ADR) dla tego repozytorium.

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

