# viber

- plan powinien nieść w sobie dwie części:
1. Specification - Co i Dlaczego
    - Goal
    - Acceptance criteria
    - Scope
    - Contracts
2. Plan implementacji składający się z zadań, czyli "Jak" specyfikacja powinna być zaimplmenetowana

- implementor na samym początku waliduje plan oraz wykonuje skryptem dekompozycję i w katalogu `docs/_specs/<yyyy-MM-dd-HH-mm-ss>_<slug>/` rozpisuje:
    - spec.md
    - tasks/tN.md

- po zakończeniu idea agent powinien przeanalizować czy zachodzi potrzeba utworzenia ADR zanim pójdzie do planowania.
Jeśli trzeba dodać jakikolwiek ADR to powinny się one znaleźć w planie jako pierwsze zadania aby je utworzyć i zapisać

- na koniec implementacji (jeśli w pliku `.claude/viber.yml` utworzony przez viber:setup odpowiednie przełączniki będą ustawione na `true`) implementor powinien uruchomić:
    - memory
    - rules

- `memory` i `rules` implementor powinien osobno umieścić na liście tasków (`TaskCreate`)