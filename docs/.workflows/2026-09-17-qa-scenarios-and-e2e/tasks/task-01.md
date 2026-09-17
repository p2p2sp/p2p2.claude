
## Task 1 - Add the qa, e2e-ui and e2e-api config switches
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Przełączniki domyślnie wyłączone` (#1), `Przełączniki rozwiązywane jak dotychczasowe` (#2), `Testy skryptów zielone` (#16)

### Dependencies
- none

### Files
- modify - superdev/scripts/read-config.sh (key loop `for key in ...`, header comment `klucze:`)
- modify - superdev/skills/setup/assets/config.yml
- modify - superdev/skills/setup/scripts/bootstrap.sh (grep alternation of documented keys, `seeded from template - defaults:` echo, header comment)
- modify - tests/superdev/read-config.test.ts (`expectedBody`, every `test(` call)
- modify - tests/superdev/bootstrap.test.ts (`seed-when-absent` expected defaults line)

### Task Checks
- tests/superdev/read-config.test.ts - node --test tests/superdev/read-config.test.ts
- tests/superdev/bootstrap.test.ts - node --test tests/superdev/bootstrap.test.ts

### Approach
1. In `read-config.sh`, extend the fixed key list to `adr rules memory changelog cleanup stats qa e2e-ui e2e-api` (the three new keys appended in that order) and list the same nine keys in the header's `klucze:` line; `resolve()` stays untouched, a hyphen is literal in its grep pattern.
2. In `config.yml`, append three lines after `stats:` in the file's existing column layout: `qa: false # Manual QA scenarios -> docs/qa/`, `e2e-ui: false # Playwright UI test handoff -> docs/qa/<run>.e2e.md`, `e2e-api: false # Playwright API test handoff -> docs/qa/<run>.e2e.md`, keeping a trailing newline.
3. In `bootstrap.sh`, add the three keys to the grep alternation, to the `defaults:` echo (`..., stats=false, qa=false, e2e-ui=false, e2e-api=false`) and to the header comment listing the documented keys.
4. In `read-config.test.ts`, give `expectedBody` three more boolean parameters (`qa`, `e2eUi`, `e2eApi`) emitting `qa: `, `e2e-ui: `, `e2e-api: ` lines after `stats: `, update every call site, rename the "six keys" wording to "nine keys" in comments and test titles, and add one test proving `e2e-ui: true` and `e2e-api: true` resolve independently (a hyphenated key).
5. In `bootstrap.test.ts`, update the expected `defaults:` line to the nine-key string.

### Failure modes
- none - additive key list, resolution logic unchanged

### Contracts
- Switch names `qa`, `e2e-ui`, `e2e-api`, resolved as lines `qa: true|false`, `e2e-ui: true|false`, `e2e-api: true|false` after `stats:` in the `read-config.sh` block - consumed by `Dispatch qa-writer from both orchestrators` (Task 5) and `Catalog, docs and manifest` (Task 8)
- Seeded defaults string `superdev.yml: seeded from template - defaults: adr=false, rules=false, memory=false, changelog=false, cleanup=false, stats=false, qa=false, e2e-ui=false, e2e-api=false` - consumed by `Report Playwright tooling in setup` (Task 2)

### DoD
Both test files pass; a fresh seed writes nine `false` switches; `read-config.sh` prints nine lines in the fixed order.


### Covered criteria
1. Przełączniki domyślnie wyłączone - Świeżo zainicjowana konfiguracja zawiera `qa`, `e2e-ui` i `e2e-api` ustawione na `false`, a build z wszystkimi trzema wyłączonymi nie tworzy niczego pod `docs/qa/` ani nie zmienia podsumowania.
2. Przełączniki rozwiązywane jak dotychczasowe - Każdy z trzech kluczy jest `true` wyłącznie wtedy, gdy plik konfiguracji ma dokładnie jego linię z wartością `true`, a rozwiązany blok konfiguracji wypisuje sześć dotychczasowych kluczy i trzy nowe w stałej kolejności.
16. Testy skryptów zielone - Zestaw testów skryptów z repo root przechodzi z trzema nowymi kluczami i nowymi liniami raportu setup.
