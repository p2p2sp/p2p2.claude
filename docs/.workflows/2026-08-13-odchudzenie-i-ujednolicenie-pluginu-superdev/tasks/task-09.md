
## Task 9 - docs(superdev): refresh the repo CLAUDE.md and verify the net reduction
- Covers: criteria #1, #6, #11
- TDD: none

### Dependencies
- Task 1 - blocks: inwentarz plików referencyjnych
- Task 7 - blocks: opis pozycji ADR w pipeline
- Task 8 - blocks: opis progów i allowed-tools

### Files
- modify - CLAUDE.md (sekcja What this repo is, Cross-plugin architecture invariants)

### Test Commands
*Build*
- brak - repozytorium nie ma kroku budowania ani lintera

*Tests*
- `find superdev -name '*.md' | xargs grep -c "" | awk -F: '{s+=$2} END {print s}'` - oczekiwane: wartość nie większa niż 2355 (baseline zmierzony przed zmianami: 2755)
- `node --test "tests/**/*.test.ts"` - oczekiwane: kod 0

### Approach
1. Zaktualizuj w `CLAUDE.md` opis pluginu `superdev` tam, gdzie wymienia jego pliki referencyjne i pozycję kroku ADR, tak by odpowiadał stanowi po taskach 1, 7 i 8.
2. Zmierz sumę linii plików `.md` pod `superdev/` podanym poleceniem i zapisz wynik w treści commita.
3. Jeżeli redukcja jest mniejsza niż 400 linii, wróć do zakresów cięcia z tasków 1-3 i domknij różnicę wyłącznie w obrębie sekcji tam wymienionych - nie rozszerzaj zakresu na inne pliki.

### Edge cases
`CLAUDE.md` opisuje cztery pluginy - zmiana dotyczy wyłącznie akapitów o `superdev`; opisy `superui`, `supergh` i `superfix` zostają nietknięte. Baseline 2755 jest zmierzony, nie oszacowany: potwierdzony dwiema metodami (`grep -c ""` sumowane oraz `wc -l`, które daje 2752, bo trzy pliki nie kończą się znakiem nowej linii) na 42 plikach `.md` - nie przeliczaj go ręcznie.

### Contracts
none

### DoD
`CLAUDE.md` opisuje stan faktyczny pluginu po zmianach, suma linii `.md` pod `superdev/` spadła o co najmniej 400, cały suite testowy zielony.


### Covered criteria
1. Siedem plików referencyjnych (`tdd/references/*.md` x5, `superdev-memory-writer/references/node-examples.md`, `superdev-memory/references/capture-protocol.md`) nie istnieje, a `grep -r` po `superdev/` nie znajduje odwołania do żadnego z nich.
6. `superbuild/SKILL.md` nie ma osobnego kroku ADR przed pętlą implementacji; `superbuild-adr` jest wołany w Close-Oucie równolegle z delegacjami `memory`, `rules`, `docs`.
11. Suma linii plików `.md` pod `superdev/` spada o co najmniej 400 względem stanu wyjściowego.
