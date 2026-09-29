# viber

- czy kolor agenta można nadpisać przy wywołaniu?

- plikach claude, readme, help - nie opisuj historii zmian, jeśli coś teraz działa inaczej to zostaje info jako ADR (jeśli trzeba) oraz historia zmian w git a w nich pełna amnezja. W tych dokumentach ma być tylko stan obecny. Zapisać jako ważną niezmienną regułę.

- błąd w projekcie p2p2.backoffice

"To błąd planu, nie kodera. Koder T5 zrobił dokładnie to, co było w zadaniu, i nie mógł zrobić więcej, bo koder zmienia tylko pliki z listy Files swojego zadania.

- Co zapisał plan: kontrakt C7 i zadanie T5 mówiły tylko o AccessDecisionService. C7 stwierdzał wręcz „AccessPolicy bez zmian”. Planner doszedł więc do wspólnej reguły limitu (AccessPolicy.ExceedsInstanceLimit), ale nie sprawdził, kto jeszcze z niej korzysta. Korzysta też ProjectAccessPolicyService, a pośrednio konsola IdentityAccess.tsx.
- Co zrobił koder: zmienił tylko swój plik i swoje testy. Pozostałych miejsc nie miał w Files, więc ich nie ruszył.
- Kto mógł to złapać wcześniej: planner-review przepuścił plan z tą samą luką. Wyłapał ją dopiero final review, który patrzy poza pliki pojedynczych zadań.

Jeśli chcesz poprawić vibera, to w viber:planner (i jego review): kiedy plan zmienia współdzieloną regułę, powinien wypisać wszystkie miejsca, które z niej korzystają, i objąć je zadaniami albo jawnie wyłączyć w Out of scope."