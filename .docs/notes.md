A. simpleplan - selektywny marker (rdzeń zmiany)

1. simpleplan/templates/plan.md - dodać w nagłówku zadania, pod - Covers:, linię - TDD: <marker>. Identyczna składnia jak w superplan/templates/plan.md:12, żeby oba tory mówiły tym samym polem.
2. simpleplan/SKILL.md, sekcja ### Rules - dodać blok TDD Discipline z kryterium odwrotnym do superplan: domyślnie TDD: none; TDD: required tylko gdy zadanie dotyka logiki biznesowej lub reguły domenowej, nietrywialnego warunku albo maszyny stanów, algorytmu (transformacja, parsowanie, obliczenia), hot-path - ale nigdy gdy kod dotyka bezpośrednio świata zewnętrznego prowadzącego do pisania testów integracyjnych. Superplan zostaje bez zmian - tam "required wszędzie" jest celowe.
3. Do tego samego bloku dopisać, że TDD: required wymusza zastosowanie dyscypliny tdd (skill tdd). Bez tego marker jest ozdobą, a Approach to jedyne pole, które coder faktycznie wykonuje krok po kroku.
4. ### Self-Review - dopisać weryfikację markera do listy sprawdzeń.

Efekt uboczny, który wychodzi za darmo: references/plan-review-checklist.md:40 (B6) jest sformułowane warunkowo - "the template requires a TDD: marker on a task and it is absent". Po dodaniu pola do szablonu simpleplan B6 aktywuje się dla simpleplan-reviewer sam, bez żadnej edycji checklisty.

B. simplebuild-implementor - egzekucja markera

5. ## 1. Implement - dodać blok TDD analogiczny do superbuild-task-coder/SKILL.md:30-32: TDD: required → wywołaj skill tdd przed pierwszą linią kodu produkcyjnego; TDD: none → implementuj wprost, testy z DoD nadal obowiązkowe.
6. ## Input, linia 20 - dopisać TDD do wyliczenia pól plan taska (ma Approach, Files, Test Commands…), inaczej coder nie wie, że pole istnieje.

C. domknięcie osieroconego skilla tdd

7. superbuild-task-coder/SKILL.md:31 - zamienić dwuliniowe streszczenie RGR na jawne wywołanie tdd przez Skill. Teraz jest wykonalne, a streszczenie i tak gubi to, co realnie egzekwuje dyscyplinę: delete-then-restart, VERIFY-RED jako obserwację, zakaz horizontal slicing, checklist stop-condition.
8. tdd/SKILL.md, description: - zawęzić. Obecne "Always use this BEFORE writing any production code" jest szersze niż mechanizm markera i wprost kłóci się z TDD: none. Skoro wywołanie ma być jawne z obu coderów, description powinien przestać obiecywać routing na każdą linię kodu.

D. reviewerzy

9. simplebuild-reviewer/SKILL.md, sekcja **Testing:** (linie 52-56) - dodać punkt wzorowany na superbuild-task-reviewer/SKILL.md:32: przy TDD: required testy istnieją i pokrywają nowe zachowanie. Bez tego marker w torze simple nie ma żadnej bramki po stronie build.

E. bez zmian

10. plugin.json, manifest superdev, CLAUDE.md - nic. Żaden skill ani agent nie dochodzi i nie znika, manifest listuje grupy i chainy, nie pojedyncze pola szablonu.
11. plan-review-checklist.md - nic, patrz punkt A.

Jedna decyzja jest Twoja i przechodzi przez punkty 5 i 7: wywołanie tdd przez Skill to dodatkowy hop i doładowanie ~150 linii do kontekstu forka przy każdym zadaniu z markerem. Alternatywa to wciągnięcie samej esencji (Iron Law + VERIFY-RED/GREEN + stop-condition) wprost do obu coderów. Rekomenduję wywołanie skilla - masz jedno źródło prawdy zamiast dwóch kopii, które się rozjadą, a koszt kontekstu ponosisz tylko przy required, czyli po zmianie A3 rzadko.