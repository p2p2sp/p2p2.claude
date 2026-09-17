
## Task 6 - Add the e2e-writer agent
- TDD: none
- Model: opus
- Effort: high
- Covers: `Testy zielone przed commitem` (#13), `Testy commitowane i trasowalne` (#14)

### Dependencies
- `Define the docs/qa document formats` (Task 3) - blocks: the handoff entry fields it reads and the automation status line it appends

### Files
- add - superdev/agents/e2e-writer.md

### Task Checks
- grep -q '^name: e2e-writer' superdev/agents/e2e-writer.md && grep -q 'playwright-cli' superdev/agents/e2e-writer.md && grep -q 'VERDICT: BLOCKED' superdev/agents/e2e-writer.md

### Approach
1. Frontmatter: `name: e2e-writer`, `description: Invoked only by the e2e skill, never directly.`, `tools: Read, Write, Edit, Grep, Glob, Bash`, `model: opus`, `effort: high`, `color: green`; the `## Input` label paragraph of the implementor agents.
2. `## Input`: required `handoff` (the `.e2e.md` path), `id` (one `QA-nn`), `spec-dir` (host directory for the generated test), `base-url`, `refs`; optional `memory` (host `CLAUDE.md` path) and `rules` (host `.claude/rules/` dir) for Page Objects, fixtures and locator conventions, `accounts` (the host's test accounts source path). Read the entry block of `id` from `handoff` per `<refs>/qa-format.md`.
3. `## Generate`: for a `ui` entry, open `base-url` plus `Route` with `playwright-cli` and take a snapshot to confirm every locator the entry names or to pick one where it reads `unknown` (prefer role and label, then `data-testid`); write one `@playwright/test` file `<spec-dir>/<qa-id>-<slug>.spec.ts` following the host conventions found in `memory` and `rules`, with the test title `QA-nn <title> (covers: <criterion title>)`, using `request` for `Seed` and for the `Assert` side effect where the entry says so; for an `api` entry write the same file shape with `request` only. Every scratch file goes under `.temp/superdev/e2e/`.
4. `## Run`: `npx playwright test <file>` with an explicit generous timeout; a failing run is classified: a test defect (selector, timing, wrong seed) is fixed and re-run, max 5 rounds; a failure where every step executed and the business assertion of the entry is false is an application defect -> delete the generated file, append the `blocked` status line of `<refs>/qa-format.md` (`## Automation status lines`) under `## Automation` of `handoff`, return `VERDICT: BLOCKED`. On green append the `file` status line there and return PASS. Never edit application code.
5. `## Output format`: line 1 `VERDICT: PASS|BLOCKED|FAIL`; on PASS `FILE: <repo-relative path>`; on BLOCKED or FAIL `REASON: <one line>`.

### Failure modes
- when `base-url` does not answer before the first snapshot -> response `VERDICT: FAIL`, log `REASON: application unreachable at <base-url>`, test none - prompt contract
- when `npx playwright test` cannot start (command not found, config error) -> response `VERDICT: FAIL`, log `REASON: <command> - <shell message>`, test none - prompt contract
- when the test is still red after 5 rounds without an application defect -> response `VERDICT: FAIL` with the generated file deleted, log `REASON: <failing assertion>`, test none - prompt contract
- when `handoff` carries no entry for `id` -> response `VERDICT: FAIL`, log `REASON: missing entry <id>`, test none - prompt contract

### Contracts
- Input label set `handoff`, `id`, `spec-dir`, `base-url`, `refs`, `memory`, `rules`, `accounts` and the output lines `FILE:` / `REASON:` - consumed by `Add the e2e skill` (Task 7)

### DoD
The agent file exists with input, generate, run and output sections; the blocked branch deletes the file and writes the status line; the green branch writes the `file` status line.


### Covered criteria
13. Testy zielone przed commitem - Każdy wygenerowany plik testów przeszedł lokalnie przeciw uruchomionej aplikacji przed commitem, a scenariusz, którego test nie może przejść z winy aplikacji, jest w pliku przekazania oznaczony jako zablokowany z powodem, bez żadnej zmiany w kodzie aplikacji.
14. Testy commitowane i trasowalne - Commit przebiegu E2E zawiera dokładnie wygenerowane pliki testów i zaktualizowany plik przekazania, nic więcej; każdy test nosi ID scenariusza i tytuł kryterium, a plik przekazania zapisuje per scenariusz ścieżkę wygenerowanego pliku albo powód zablokowania; ponowne uruchomienie nad tym samym plikiem pomija scenariusze z zapisaną ścieżką i ponawia zablokowane.
