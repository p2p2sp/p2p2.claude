
## Task 3 - refactor(superdev): trim the session manifest to its load-bearing overrides
- Covers: criteria #2, #11
- TDD: none

### Dependencies
- none

### Files
- modify - superdev/hooks/content/manifest.md

### Test Commands
*Build*
- brak - repozytorium nie ma kroku budowania ani lintera

*Tests*
- `grep -c "" superdev/hooks/content/manifest.md` - oczekiwane: wartość nie większa niż 30
- `node --test tests/superdev/session-start.test.ts` - oczekiwane: kod 0

### Approach
1. Usuń blok od "If there is even a 1% chance" do "Defaulting to invocation is ALWAYS the correct choice." włącznie.
2. Zredukuj tabelę racjonalizacji do listy czterech reguł: plan mode nie domyka wywiadu, brak kodu przed zatwierdzonym planem, zakaz zakładania nowych branchy bez prośby użytkownika, wywiad prowadzony prozą a nie `AskUserQuestion`.
3. Zachowaj bez zmian nagłówek `<superdev:manifest>` i domknięcie, sekcję `## Instruction Priority`, `## Always use precision over verbosity` i `## Save all temporary files in .temp`.
4. Zachowaj pierwsze zdanie sekcji reguł nakazujące rozstrzygnięcie, czy użytkownik chce działania natychmiast, czy zaplanowania większej całości.

### Edge cases
`session-start.sh` wstrzykuje manifest dosłownie i escape'uje go do JSON-a - skrócenie nie może wprowadzić znaku, którego `escape_for_json` nie obsługuje (obsługiwane: backslash, cudzysłów, LF, CR, TAB).

### Contracts
Plik pozostaje otoczony znacznikami `<superdev:manifest>` i `</superdev:manifest>` - `session-start.sh` wstrzykuje zawartość verbatim i nie dokłada własnych markerów.

### DoD
Manifest ma nie więcej niż 30 linii, zawiera cztery nośne reguły i trzy zachowane sekcje, test `session-start.test.ts` zielony.


### Covered criteria
2. `superdev/hooks/content/manifest.md` ma nie więcej niż 30 linii i nadal zawiera cztery nośne reguły: zakaz tworzenia branchy, wywiad prozą zamiast pickera, plan mode nie zastępuje wywiadu, brak kodu przed zatwierdzonym planem.
11. Suma linii plików `.md` pod `superdev/` spada o co najmniej 400 względem stanu wyjściowego.
