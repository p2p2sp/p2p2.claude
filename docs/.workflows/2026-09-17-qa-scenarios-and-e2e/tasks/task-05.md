
## Task 5 - Dispatch qa-writer from both orchestrators
- TDD: none
- Model: sonnet
- Effort: low
- Covers: `Przełączniki domyślnie wyłączone` (#1), `Dokument odbioru istnieje` (#4), `Plik przekazania istnieje` (#9), `Pominięcia nazwane` (#11)

### Dependencies
- `Add the qa, e2e-ui and e2e-api config switches` (Task 1) - blocks: the `## Config` block the orchestrators read carries the three new lines
- `Add the qa-writer close-out agent` (Task 4) - blocks: the label set and output lines the dispatch relays

### Files
- modify - superdev/skills/superbuild/SKILL.md (`## Config` paragraph, `## Step 4 - Close Out` items 2, 4, 5, `## Step 5 - Done` item 3)
- modify - superdev/skills/simplebuild/SKILL.md (same sections)

### Task Checks
- grep -q 'superdev:qa-writer' superdev/skills/superbuild/SKILL.md && grep -q 'superdev:qa-writer' superdev/skills/simplebuild/SKILL.md && grep -q 'QA-INDEX' superdev/skills/superbuild/SKILL.md && grep -q 'QA-INDEX' superdev/skills/simplebuild/SKILL.md

### Approach
1. In both `## Config` paragraphs, name `qa`, `e2e-ui` and `e2e-api` among the switches gating the Step 4 close-out delegations.
2. In both Step 4 item 2 (wave 1), add a third bullet: any of `qa`, `e2e-ui`, `e2e-api` reading `true` -> `subagent_type: superdev:qa-writer`, labeled-line prompt `capture: <plan-copy path>`, `workdir: <workdir>`, `notes: <workdir>/implementation/`, `reports: <workdir>/implementation/`, `refs: <refs>`, `qa: <value>`, `e2e-ui: <value>`, `e2e-api: <value>` copied verbatim from the `## Config` block, plus `spec: <spec path>` (superbuild only) and `intent: <intent path>` only when the decompose index printed one.
3. In both Step 4 item 4, add `QA:` / `E2E:` / `QA-INDEX:` to the relayed lines; in item 5, add one `--path` per path a `QA:`, `E2E:` or `QA-INDEX:` line names (a `skipped` or `none` line declares nothing) and extend the commit title to `chore(<track>): close out memory, rules, changelog and qa`.
4. In both Step 5 item 3, relay the `QA:` / `E2E:` / `QA-INDEX:` lines verbatim, a `skipped - <reason>` line included, or "disabled" when all three switches are off.

### Failure modes
- none - the existing rule that a failing delegation is non-fatal and lands in the summary covers the new writer

### Contracts
- none

### DoD
Both orchestrators dispatch `qa-writer` in wave 1 under the three switches, commit what it relays, and echo its lines in the final summary; with the three switches off nothing new runs.


### Covered criteria
1. Przełączniki domyślnie wyłączone - Świeżo zainicjowana konfiguracja zawiera `qa`, `e2e-ui` i `e2e-api` ustawione na `false`, a build z wszystkimi trzema wyłączonymi nie tworzy niczego pod `docs/qa/` ani nie zmienia podsumowania.
4. Dokument odbioru istnieje - Po zakończonym buildzie z `qa: true`, który zmienił kod widoków lub routing, na torze Simple i Super, pod `docs/qa/` istnieje jeden nowy dokument odbioru tego builda w języku intentu, a ponowny zapis pod tą samą nazwą jest odrzucany jako błąd, który build zgłasza w podsumowaniu.
9. Plik przekazania istnieje - Po zakończonym buildzie z `e2e-ui: true` lub `e2e-api: true` pod `docs/qa/` istnieje plik przekazania tego builda z sekcją scenariuszy UI tylko przy `e2e-ui` i sekcją scenariuszy API tylko przy `e2e-api`; plik przekazania istnieje niezależnie od `qa`, a gdy dokument odbioru też powstał, oba używają tych samych ID scenariuszy.
11. Pominięcia nazwane - Build, który nie zmienił kodu widoków ani routingu, nie tworzy dokumentu odbioru ani sekcji UI, build, który nie zmienił żadnego endpointu, nie tworzy sekcji API, a podsumowanie builda podaje każde takie pominięcie z powodem.
