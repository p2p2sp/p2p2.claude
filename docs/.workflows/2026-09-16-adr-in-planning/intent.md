# Intent: ADR rozstrzygany w fazie planowania, zapisywany jako zadanie planu
Date: 2026-09-16

## Request
ADR w superdev jest tworzony w złym miejscu: agent `adr-writer` pisze go w close-oucie buildu, z planu i speca, gdy decyzje już zapadły i uzasadnienia zniknęły. ADR wynika z decyzji, więc ma być rozstrzygany (i ewentualnie szkicowany) w fazie planowania. Trzeba dodać skill uruchamiany w tej fazie, a agenta `adr-writer` usunąć z procesu build. ADR ma być oferowany oszczędnie i być krótki: sam fakt podjęcia decyzji i jej powód, nie wypełnianie sekcji.

## Decisions
### 1. Gdzie w łańcuchu planowania pada osąd „to zasługuje na ADR” i powstaje jego treść?
W skillu `intent`, w kroku Synthesis, po potwierdzeniu syntezy przez użytkownika. `intent` wywołuje nowy skill, ten ocenia każdą potwierdzoną decyzję trzema kryteriami, proponuje użytkownikowi ADR tylko dla przechodzących i zapisuje zaakceptowany szkic do `intent.md` w nowej sekcji `## ADR`. `simpleplan` i `superplan` zamieniają tę sekcję w zadanie planu, które w buildzie zapisuje plik.

### 2. Jaki kształt ma nowy skill i jak wchodzi do `intent`?
Skill doktrynalny `superdev:adr` działający w głównym kontekście (bez `context: fork`, bez agenta), `user-invocable: false`, guard w `description:` („invoked by the intent skill only”). `intent` preloaduje `read-config.sh` (pattern entry w `allowed-tools`) i wywołuje skill wyłącznie przy `adr: true`; przy `false` skill nie ładuje się do kontekstu.

### 3. Jak treść ADR trafia do planu, kto zapisuje plik i skąd changelog bierze ścieżkę?
Zadanie planu niesie pełną treść ADR dosłownie i jest pierwszym zadaniem planu (`Model: sonnet`, `Effort: low`, `TDD: none`); w `### Approach` krok `date +%Y-%m-%d-%H%M%S` dla nazwy pliku, w `### Files` ścieżka `docs/adr/<stamp>-<slug>.md`. Task implementor zapisuje plik zwykłym `Write`, bez nowego skryptu. Wiele kwalifikujących decyzji to wiele plików w tym samym jednym zadaniu. Po buildzie orkiestrator wykonuje `git diff --name-only <base>..HEAD -- docs/adr/` i przekazuje wynik jako `adr: <path>` do `changelog-writer`, którego kontrakt nie zmienia się.

## Constraints
- Przełącznik `adr` w `.claude/superdev.yml` pozostaje bramką: bez `adr: true` skill nie proponuje ADR. Klucz zostaje w `read-config.sh`, `setup/assets/config.yml` i `setup/scripts/bootstrap.sh`; zmienia się tylko komentarz w `config.yml` i tekst README. Testy `read-config` i `bootstrap` bez zmian.
- Nazwa pliku ADR: `docs/adr/<YYYY-MM-DD-HHMMSS>-<slug>.md`, stempel liczony w chwili zapisu pliku (w buildzie), na przykład `docs/adr/2026-09-16-105405-<slug>.md`.
- ADR oferowany tylko gdy spełnione są wszystkie trzy kryteria: trudne do odwrócenia (koszt zmiany decyzji później jest istotny), zaskakujące bez kontekstu (przyszły czytelnik zapyta „dlaczego tak?”), wynik realnego trade-offu (istniały prawdziwe alternatywy i wybrano jedną z konkretnych powodów). Brak jednego kryterium = brak ADR.
- Treść ADR: `# <krótki tytuł decyzji>` plus 1-3 zdania (kontekst, co zdecydowano, dlaczego). ADR może być jednym akapitem. Sekcje opcjonalne tylko gdy dodają realną wartość: frontmatter `status` (proposed | accepted | deprecated | superseded by <ścieżka ADR>) gdy decyzje bywają rewidowane, `Considered Options` gdy odrzucone alternatywy warto zapamiętać, `Consequences` gdy trzeba wskazać nieoczywiste skutki downstream.
- Wpis changelogu po buildzie nadal linkuje ADR (bullet `ADR:`), ścieżka pochodzi z `git diff` orkiestratora; format wpisu changelogu bez zmian.
- Sekcja `## ADR` w `intent.md` jest jedynym dozwolonym wyjątkiem od reguły szablonu „bez uzasadnień i alternatyw”, ograniczonym do treści ADR. `intent-template.md` dostaje tę sekcję. Resume bez otwierania decyzji zachowuje sekcję; otwarcie decyzji uruchamia skill `adr` ponownie dla tej decyzji. `phases` kopiuje `## ADR` wyłącznie do intentu fazy 01.
- Checklisty reviewerów planu (`simpleplan-reviewer`, `superplan-reviewer`, `plan-review-checklist.md`) dostają regułę, że zadanie „Write ADR” z pełną treścią w `### Approach` nie jest błędem „prozy w Approach”.
- Usunięcie agenta: plik `superdev/agents/adr-writer.md`, wpis w `plugin.json` `agents[]`, dispatch w wave 1 close-outu `superbuild` i `simplebuild` (wave 1 to odtąd `memory` + `rules`), wiersze w `superdev/README.md` i root `CLAUDE.md`. Nowy skill rejestrowany w `plugin.json` `skills[]`, opisany w `superdev/README.md` i root `CLAUDE.md`.
- Pliki skilli i agentów tworzone i refaktorowane przez `supercc:skill-designer` (lint bez FAIL).
- Bez em dash i en dash w żadnym pliku.

## Out of scope
- `docs/assets/superdev-flow.svg` (ręczny diagram, nie odświeżany w tej zmianie).
- Agent historii w `intent` (dalej czyta `docs/adr/` i linki `ADR:` changelogu, bez zmian).
- `superspec`, `superspec-refine` i format wpisu changelogu (`changelog-entry-format.md`, `changelog-writer.md`).
- Migracja istniejących ADR nazwanych stemplem `YYYYMMDDHHMMSS`.

## History
- none
