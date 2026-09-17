
## Task 3 - Define the docs/qa document formats
- TDD: none
- Model: opus
- Effort: high
- Covers: `Kroki czytelne dla człowieka` (#6), `Indeks jako widok regresji` (#7), `Zastąpienia oznaczone` (#8), `Wpisy przekazania kompletne` (#10)

### Dependencies
- none

### Files
- add - superdev/references/qa-format.md

### Task Checks
- grep -q '^## Acceptance document' superdev/references/qa-format.md && grep -q '^## Handoff file' superdev/references/qa-format.md && grep -q '^## Index line' superdev/references/qa-format.md && grep -q '^## Supersedes rule' superdev/references/qa-format.md && grep -q '^## Automation status lines' superdev/references/qa-format.md && grep -q '^## Never write these' superdev/references/qa-format.md

### Approach
1. Write `qa-format.md` in the shape of `changelog-entry-format.md`: one section per artifact, each with a fenced template, a worked example and fixed rules.
2. `## Scenario IDs`: `QA-<nn>` zero-padded two digits, sequential from `QA-01` per build document, assigned once, exactly one tag per ID, `ui` or `api`; a criterion observable both on screen and through an endpoint yields two scenarios with two IDs; the same ID names the same case in every artifact of that build.
3. `## Acceptance document` (`docs/qa/<run id>.md`, human-only): H1 = the build title alone; a `Date:` / `Build:` line; sections in this order and with these meanings: what changed (2-3 plain sentences, no file names), preparation (environment URL, accounts by role, data; a value the host memory does not give reads "settle with the team" in the document language), one `## QA-nn <title>` block per scenario with a `Covers:` line in the reference form `` `<criterion title>` (#n) ``, a preconditions line, and a table `| # | Step | Expected result |` where every row is one action and one observable outcome, then out-of-scope, then an optional supersedes section. Every heading, label and column name is rendered in the document's language; the worked example shows the Polish rendering (`Co się zmieniło`, `Przygotowanie`, `Pokrywa`, `Warunki wstępne`, `Krok`, `Oczekiwany wynik`, `Poza zakresem tego odbioru`, `Zastępuje`). Rules: at least one scenario per acceptance criterion, one negative scenario per UI-triggerable failure mode, no execution-status column, no mention of automation, locators or test files, no "check that it works" steps.
4. `## Handoff file` (`docs/qa/<run id>.e2e.md`, machine-facing, English fixed headings): header lines `Run:`, `Base:`, `Launch:`, `Accounts:` (a copy of what the host memory said at build time, `not declared` when it gave none; the E2E flow reads the host memory first and falls back to these lines only where the memory is silent); `## UI scenarios` entries `### QA-nn <title>` with `Covers`, `Role`, `Route`, `Seed`, `Steps`, `Assert`, `Files`; `## API scenarios` entries with `Covers`, `Endpoint` (method and path), `Auth`, `Request`, `Expect`; `## Not automatable` with `- QA-nn - <reason>`; a value not established from code is the literal `unknown`, never invented.
5. `## Index line` (`docs/qa/README.md`): `# QA` heading, one `## <area>` group per area (areas derived as `changelog-writer` derives them), under it `- <YYYY-MM-DD> - [<title>](<run id>.md) - QA-01..QA-nn`, newest first inside a group; a build with several areas gets one line under each. `## Supersedes rule`: an older `docs/qa/*.e2e.md` entry with an identical `Route` (UI) or identical method plus `Endpoint` (API) and an identical `Covers` criterion title is superseded; the new acceptance document lists `QA-nn supersedes <run id>#QA-mm` and the index line of the older document gains ` (QA-mm superseded by <new run id>#QA-nn)`; any difference, or no older handoff file, means no supersedes. `## Automation status lines`: the `## Automation` section the E2E flow appends to the handoff file, one line per processed ID, `- QA-nn: file <repo-relative spec path>` or `- QA-nn: blocked - <reason>`; a re-run skips IDs with a `file` line and retries `blocked` ones.
6. `## Never write these`: results or status columns, links to `docs/.workflows/` paths, marketing tone, steps that bundle two actions, locators or file paths inside the acceptance document.

### Failure modes
- none - reference document

### Contracts
- Scenario ID grammar, both file templates, the index line, the supersedes match key and the automation status line grammar - consumed by `Add the qa-writer close-out agent` (Task 4), `Add the e2e-writer agent` (Task 6) and `Add the e2e skill` (Task 7)

### DoD
The reference exists with all six sections and a worked example per artifact; the acceptance document example carries no automation vocabulary.


### Covered criteria
6. Kroki czytelne dla człowieka - Każdy scenariusz ma warunki wstępne i tabelę, w której każdy wiersz to jedna akcja i jeden obserwowalny wynik, a dokument nie zawiera kolumny statusu wykonania (zaliczony / niezaliczony) ani żadnej wzmianki o automatyzacji, lokatorach czy plikach testów.
7. Indeks jako widok regresji - Po każdym buildzie, który utworzył dokument odbioru, `docs/qa/README.md` zawiera jedną linię tego builda z datą, tytułem, obszarami i zakresem ID scenariuszy, umieszczoną w grupie jego obszaru, a istniejące linie pozostają nietknięte; build, który utworzył tylko plik przekazania, nie zmienia indeksu.
8. Zastąpienia oznaczone - Gdy starszy plik przekazania zawiera scenariusz o identycznej trasie (UI) albo identycznej metodzie i endpoincie (API) i o identycznym tytule kryterium, nowy dokument odbioru wymienia go w sekcji zastąpień, a indeks wskazuje nowszy scenariusz; różnica w którymkolwiek z tych elementów, albo brak starszych plików przekazania, oznacza brak zastąpienia.
10. Wpisy przekazania kompletne - Każdy wpis UI niesie kryterium, rolę, trasę, dane startowe, kroki, asercję i pliki, każdy wpis API niesie kryterium, endpoint, uwierzytelnienie, żądanie i oczekiwaną odpowiedź, a wartość nieustalona z kodu jest zapisana jako nieznana, nigdy wymyślona.
