# Intent: Zatrzymanie skilla, gdy narzędzie Agent zniknęło z sesji
Date: 2026-09-11

## Request
Harness czasem gubi narzędzia. Główne skille pluginu superdev mają dostać sprawdzenie, które po wykryciu, że nie da się dispatchować agenta, zatrzymuje skill, raportuje to użytkownikowi i sugeruje wyjście z sesji oraz ponowny start z `--resume`.

## Decisions
### 1. Czym ma być ten check?
Wyłącznie reguła w prompcie orchestratorów - tekst w SKILL.md, bez hooka, bez skryptu i bez nowej maszynerii.

### 2. Które skille dostają tę regułę?
Cztery skille dispatchujące agentów przez narzędzie `Agent`: `superbuild`, `simplebuild`, `superdev-memory`, `superdev-rules`.

### 3. Kiedy reguła ma się odpalać?
Reguła jest always-on i obowiązuje przy każdym dispatchu, więc łapie też utratę narzędzia w połowie pętli. Dodatkowo jedna linia preflightu w najwcześniejszym punkcie marnowania pracy: w buildach przed `decompose.sh`, w `superdev-memory` / `superdev-rules` przed wywiadem.

### 4. Co dokładnie ma być w komunikacie zatrzymania?
Pełny co do treści, maksymalnie zwięzły co do formy, bo zostaje w kontekście po wznowieniu. Cztery fakty: narzędzie `Agent` niedostępne; nic nie zostało wykonane ani zapisane zastępczo; gdzie stoi stan (katalog roboczy i numer ostatniego ukończonego taska ze `status.md`, a w memory/rules ścieżka pliku capture w `.temp/superdev/`); wyjść z sesji, wystartować `claude --resume` i poprosić o kontynuację builda.

## Constraints
- Awaria jest cicha: znika harnessowe narzędzie `Agent` jako takie (nie pojedyncze typy agentów), dispatch nie zwraca żadnego błędu, a model po cichu wykonuje pracę workera sam.
- Żaden skrypt ani hook nie może odpytać puli narzędzi sesji - nie ma takiego pola w payloadzie hooka, zmiennej środowiskowej ani powierzchni CLI. Detekcja pozostaje wyłącznie po stronie modelu.
- `claude --resume` przywraca narzędzie - to obserwacja użytkownika; dokumentacja nie wiąże utraty narzędzi ani z kompaktowaniem, ani z resume.
- `superbuild` i `simplebuild` mają `user-invocable: false`, więc po wznowieniu sesji nie da się ich wywołać slashem - użytkownik musi poprosić o kontynuację builda wprost.
- Buildy wznawiają się z `status.md` w katalogu roboczym, więc zatrzymanie nie gubi ukończonych tasków. `superdev-memory` i `superdev-rules` nie mają ścieżki wznowienia z pliku capture, dlatego ich preflight stoi przed wywiadem.
- Bloki always-on, do których trafia reguła, już istnieją: `## Mandatory Rules` w obu buildach, `## Core Principle` w `superdev-memory` i `superdev-rules`.
- W `superdev-memory` i `superdev-rules` reguła domyka istniejącą linię "do NOT re-verify or rewrite the nodes yourself" o przypadek braku narzędzia do dispatchu.
- Zmiana dotyczy wyłącznie plików SKILL.md; edycja markdownu jest publikacją, nie ma kroku budowania ani lintera.

## Out of scope
- Egzekwowanie hookiem - żaden nowy hook `PreToolUse`, żadna blokada `Edit` / `Write` w sesji głównej.
- Skill `intent` i jego agenci `Explore` - bez zmian.
- Forki przez narzędzie `Skill` (reviewerzy planów i specyfikacji, `tdd`) - reguła mówi wyłącznie o narzędziu `Agent`.
- `superdev/hooks/content/manifest.md` - manifest opisuje grupy i łańcuchy, a ta zmiana żadnej nie rusza.
- README - bez zmian.

## History
- none
