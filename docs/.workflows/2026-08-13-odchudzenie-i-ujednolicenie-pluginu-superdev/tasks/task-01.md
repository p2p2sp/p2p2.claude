
## Task 1 - refactor(superdev): drop seven textbook reference files and their citations
- Covers: criteria #1, #11
- TDD: none

### Dependencies
- none

### Files
- delete - superdev/skills/tdd/references/mocking.md
- delete - superdev/skills/tdd/references/tests.md
- delete - superdev/skills/tdd/references/refactoring.md
- delete - superdev/skills/tdd/references/interface-design.md
- delete - superdev/skills/tdd/references/deep-modules.md
- delete - superdev/skills/superdev-memory-writer/references/node-examples.md
- delete - superdev/skills/superdev-memory/references/capture-protocol.md
- modify - superdev/skills/tdd/SKILL.md (sekcje RED, Anti-patterns, Workflow)
- modify - superdev/skills/superdev-memory/SKILL.md (sekcja Resources, krok 6 Maintenance mode)
- modify - superdev/skills/superdev-memory-writer/SKILL.md (sekcja Write rules)

### Test Commands
*Build*
- brak - repozytorium nie ma kroku budowania ani lintera na żadnym poziomie

*Tests*
- `grep -rn "references/" superdev/skills/tdd superdev/skills/superdev-memory superdev/skills/superdev-memory-writer` - oczekiwane wyjście: brak trafień na usunięte pliki
- `node --test "tests/**/*.test.ts"` - oczekiwane: kod 0

### Approach
1. Usuń siedem plików wymienionych w `### Files` jako `delete`.
2. W `tdd/SKILL.md` skasuj odwołania `references/mocking.md` (sekcja RED oraz Anti-patterns), `references/tests.md` (Anti-patterns), `references/interface-design.md` i `references/deep-modules.md` (Workflow krok 1), `references/refactoring.md` (Workflow krok 4), zostawiając samą regułę bez wskaźnika do pliku.
3. W `superdev-memory/SKILL.md` usuń pozycję `references/capture-protocol.md` z sekcji Resources i podmień odwołanie w kroku 6 Maintenance mode na wskazanie sekcji `## Capture Questions` w tym samym pliku.
4. W `superdev-memory-writer/SKILL.md` usuń z sekcji Write rules odwołanie do `references/node-examples.md`, zachowując odwołanie do `references/templates.md`.

### Edge cases
Katalog `superdev/skills/tdd/references/` po usunięciu pięciu plików zostaje pusty - usuń również sam katalog, żeby git nie zachował pustego wpisu.

### Contracts
none

### DoD
Siedem plików nie istnieje, katalog `tdd/references/` nie istnieje, żaden plik w `superdev/` nie odwołuje się do usuniętych ścieżek, suite testowy zielony.


### Covered criteria
1. Siedem plików referencyjnych (`tdd/references/*.md` x5, `superdev-memory-writer/references/node-examples.md`, `superdev-memory/references/capture-protocol.md`) nie istnieje, a `grep -r` po `superdev/` nie znajduje odwołania do żadnego z nich.
11. Suma linii plików `.md` pod `superdev/` spada o co najmniej 400 względem stanu wyjściowego.
