# viber

- jak planner już jest na branchu i robi kolejny plan to nie powinien pytać o wybór brancha.

- jak pyta o zmiany poza buildem to jedna opcja powinna być pomiń, a druga zakomituj teraz - i tyle.

- final review też powinno mieć swobodę i agent samemu może roztrzygać co było źle i zlecać poprawki - zwłaszcza, że zgłasza tylko userowi co robić, ale nie pisze dlaczego. jak dostanie swobodę to tylko powinien napisać co było źle i co poprawia.

- błąd w projekcie p2p2.backoffice

"To błąd planu, nie kodera. Koder T5 zrobił dokładnie to, co było w zadaniu, i nie mógł zrobić więcej, bo koder zmienia tylko pliki z listy Files swojego zadania.

- Co zapisał plan: kontrakt C7 i zadanie T5 mówiły tylko o AccessDecisionService. C7 stwierdzał wręcz „AccessPolicy bez zmian”. Planner doszedł więc do wspólnej reguły limitu (AccessPolicy.ExceedsInstanceLimit), ale nie sprawdził, kto jeszcze z niej korzysta. Korzysta też ProjectAccessPolicyService, a pośrednio konsola IdentityAccess.tsx.
- Co zrobił koder: zmienił tylko swój plik i swoje testy. Pozostałych miejsc nie miał w Files, więc ich nie ruszył.
- Kto mógł to złapać wcześniej: planner-review przepuścił plan z tą samą luką. Wyłapał ją dopiero final review, który patrzy poza pliki pojedynczych zadań.

Jeśli chcesz poprawić vibera, to w viber:planner (i jego review): kiedy plan zmienia współdzieloną regułę, powinien wypisać wszystkie miejsca, które z niej korzystają, i objąć je zadaniami albo jawnie wyłączyć w Out of scope."