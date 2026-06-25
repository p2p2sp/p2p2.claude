# Planowanie i implementacja

To główny tok pracy superdev. Opisujesz zmianę, zatwierdzasz plan, a wdrożenie odbywa się
automatycznie — krok po kroku, z osobnym commitem dla każdego ukończonego zadania.

## Jak przebiega

1. **Opisz zmianę.** Napisz Claude, co chcesz dodać lub poprawić, zwykłym językiem.
2. **Wywiad.** superdev zadaje kilka pytań, aby doprecyzować zakres, zanim cokolwiek zaplanuje.
3. **Plan.** Powstaje plan zmiany. Planowanie zawsze odbywa się w trybie planu, więc na tym etapie nie
   powstaje jeszcze żaden kod.
4. **Zatwierdzenie planu.** Plan przechodzi przez bramkę przeglądu i czeka na Twoją akceptację.
   Implementacja nie ruszy, dopóki nie zatwierdzisz.
5. **Wdrożenie.** Po akceptacji superdev dzieli pracę na zadania i realizuje je po kolei: pisze kod,
   uruchamia sprawdzenia projektu, recenzuje wynik i zatwierdza commitem każde ukończone zadanie.

## Dlaczego plan jest osobnym etapem

Plan pokazuje, co dokładnie się wydarzy, zanim powstanie kod. Możesz go przeczytać, poprosić o zmiany
i dopiero wtedy zaakceptować. To Twój moment kontroli nad zakresem.

## Praca toczy się w tle

Wdrożenie prowadzą wyodrębnione kroki, które przekazują sobie stan przez pliki i meldują krótkim
statusem. Dzięki temu główna rozmowa pozostaje przejrzysta, a Ty widzisz postęp bez zalewu szczegółów.

## Wskazówki

- Im konkretniej opiszesz cel na początku, tym trafniejszy będzie plan.
- Jeśli plan Ci nie odpowiada, poproś o poprawki przed akceptacją — to tańsze niż zmiany po wdrożeniu.
- Włączenie ustawienia `rules_improver` sprawia, że projekt uczy się Twoich konwencji po każdym zadaniu
  (zob. [Pamięć projektu](./pamiec-projektu.md)).

## Powiązane tematy

- [Pamięć projektu](./pamiec-projektu.md) — by Claude trzymał się Twoich zasad.
- [GitHub](./github.md) — zamień gotową pracę w pull request.
- [Diagnostyka i specyfikacje](./diagnostyka.md) — gdy zaczynasz od testów lub debugowania.
