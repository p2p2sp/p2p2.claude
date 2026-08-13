
## Task 8 - fix(superdev): correct allowed-tools, relocate the token thresholds and drop tables
- Covers: criteria #8, #9, #10, #11
- TDD: none

### Dependencies
- Task 1 - blocks: progi przenoszone do `superdev-memory/SKILL.md`, którego sekcja Resources zmienia się w Task 1
- Task 3 - blocks: tabela racjonalizacji w manifeście znika w Task 3, więc konwersja tabel nie może jej dotknąć

### Files
- modify - superdev/skills/superspec/SKILL.md (frontmatter allowed-tools)
- modify - superdev/skills/superbuild-adr/SKILL.md (frontmatter allowed-tools)
- modify - superdev/skills/superdev-memory/SKILL.md (frontmatter allowed-tools, sekcja When to Create Child Nodes)
- modify - superdev/skills/superdev-rules/SKILL.md (frontmatter allowed-tools)
- modify - superdev/skills/superdev-docs/SKILL.md (frontmatter allowed-tools)
- modify - superdev/skills/setup/SKILL.md (sekcja Bootstrap)
- modify - superdev/skills/simplebuild-reviewer/SKILL.md (frontmatter allowed-tools)
- modify - superdev/skills/superbuild-task-reviewer/SKILL.md (frontmatter allowed-tools)
- modify - superdev/skills/superdev-memory-writer/references/templates.md (sekcja Measurements Table Format)
- modify - superdev/skills/simpleplan/templates/plan.md (kursywa w Test Commands)
- modify - superdev/skills/superplan/templates/plan.md (kursywa w Test Commands)

### Test Commands
*Build*
- `bash -n superdev/skills/setup/scripts/bootstrap.sh` - oczekiwane: brak wyjścia, kod 0

*Tests*
- `grep -rn "^|" superdev/skills superdev/hooks/content` - oczekiwane: brak trafień
- `node --test tests/superdev/bootstrap.test.ts` - oczekiwane: kod 0
- `node --test "tests/**/*.test.ts"` - oczekiwane: kod 0

### Approach
1. Pokryj preloady wpisami wzorcowymi tam, gdzie polecenie jest pojedyncze i daje się dopasować: `superdev-memory`, `superdev-rules` i `superdev-docs` nie mają dziś pola `allowed-tools` w ogóle - dodaj je, wymieniając narzędzia, których każdy z nich używa, plus `Bash(date:*)` na ich jedyny preload `date +%Y%m%d-%H%M%S`; do `superspec` dopisz `Bash(date:*)` i `Bash(printf:*)`; do `superbuild-adr` dopisz `Bash(date:*)`; do `superbuild-task-reviewer` dopisz `Bash(git status:*)` na jego preload `git status --short`.
2. Preloadów potokowych (`printf … | tr … | sed … | head`) NIE pokrywaj wzorcem - wzorzec dopasowuje pojedyncze polecenie, nie potok. W trzech plikach objętych tym taskiem, które je mają (`superbuild-adr`, `simplebuild-reviewer`, `superbuild-task-reviewer`), zostaw wpis `Bash` i dopisz jednolinijkowy komentarz w TREŚCI skilla tuż nad preloadem, nigdy w linii `allowed-tools:` - w YAML zwykły skalar kończy się na `` #``, więc komentarz doklejony do tej linii zostałby zjedzony przez parser.
3. W `setup/SKILL.md` zamień wywołanie `bash "${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh"` na wywołanie bezpośrednie i dodaj wpis wzorcowy `Bash(${CLAUDE_SKILL_DIR}/scripts/bootstrap.sh:*)` do `allowed-tools`; skrypt ma już bit wykonywalny `100755` w indeksie gita, więc nie zmieniaj uprawnień.
4. Usuń `Skill` z `allowed-tools` w `simplebuild-reviewer` i `superbuild-task-reviewer`.
5. Przenieś sekcję `## Measurements Table Format` wraz z progami z `templates.md` do `superdev-memory/SKILL.md`, do kroku 3 workflow, i zapisz ją jako listę zamiast tabeli; usuń tę sekcję z `templates.md`.
6. Zamień na listy pozostałe tabele markdown w `superdev-memory/SKILL.md` oraz kursywę `*Build*` i `*Tests*` w obu szablonach planu na zwykłe nagłówki tekstowe. Obie tabele w `tdd/SKILL.md` leżą wewnątrz sekcji usuwanych w Tasku 2, więc nie ma tam czego konwertować - nie dotykaj tego pliku.

### Edge cases
Konwersja `*Build*` i `*Tests*` w szablonach planu nie może zmienić nazw tych bloków - `decompose.sh` i implementory szukają sekcji `### Test Commands` i jej treści, a plany już wyprodukowane w `docs/.workflows/` zachowują stary zapis i muszą pozostać czytelne.

### Contracts
`allowed-tools` nie ogranicza puli narzędzi, tylko preautoryzuje - dodanie wpisu wzorcowego nie odbiera skillowi żadnego narzędzia, a usunięcie `Skill` z dwóch reviewerów nie blokuje im niczego, czego używają.

### DoD
Każdy preload jednopoleceniowy w plikach objętych tym taskiem ma pokrywający go wpis wzorcowy, a każdy preload potokowy w nich - komentarz w treści skilla wyjaśniający brak wzorca; `setup` woła bootstrap bezpośrednio, dwaj reviewerzy nie deklarują `Skill`, progi tokenowe są w `superdev-memory/SKILL.md`, `grep -rn "^|"` po `superdev/skills` i `superdev/hooks/content` nie zwraca trafień, suite zielony.


### Covered criteria
8. Progi tokenowe (`<20k` / `20-64k` / `>64k`) i format tabeli pomiarowej znajdują się w `superdev-memory/SKILL.md`; `superdev-memory-writer/references/templates.md` ich nie zawiera.
9. W ośmiu skillach wymienionych w `### Files` Taska 8: każdy preload będący pojedynczym poleceniem (`date`, `printf`, `git status`) ma w `allowed-tools` wpis wzorcowy pokrywający to polecenie, a przy każdym preloadzie potokowym stoi w treści skilla, nie we frontmatterze, jednolinijkowy komentarz wyjaśniający, dlaczego wzorca tam nie ma. Skille spoza tej listy pozostają nietknięte. `simplebuild-reviewer` i `superbuild-task-reviewer` nie mają w `allowed-tools` narzędzia `Skill`.
10. `node --test "tests/**/*.test.ts"` uruchomione z katalogu głównego repo kończy się kodem 0.
11. Suma linii plików `.md` pod `superdev/` spada o co najmniej 400 względem stanu wyjściowego.
