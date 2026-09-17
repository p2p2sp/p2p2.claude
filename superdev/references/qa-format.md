# QA document formats

Three artifacts, one build: the acceptance document `docs/qa/<run id>.md` (a human reads it and
performs it by hand), the handoff file `docs/qa/<run id>.e2e.md` (an agent reads it and turns it into
Playwright tests), and the index `docs/qa/README.md` (a regression view over every build that produced
an acceptance document).

`<run id>` is derived exactly as `changelog-writer` derives it: the basename of the run workdir, or
`<grandparent basename>-<basename>` when the workdir's parent directory is named `phases`. Both files of
a build are write-once: an existing target path is an error, never an overwrite. The single exception is
the `## Automation` section of the handoff file, appended later by the E2E flow.

## Scenario IDs

- `QA-<nn>`, zero-padded to two digits, sequential from `QA-01`, numbered once per build across both
  files together - not once per file. A build with more than 99 scenarios keeps counting (`QA-100`).
- An ID is assigned once, when the writer derives the scenario list, and is never renumbered, never
  reused by a later build, and never re-sorted afterwards.
- Exactly one tag per ID, `ui` or `api`. The tag is never written as a field: it is expressed by where
  the entry lands - `ui` in the acceptance document and under `## UI scenarios`, `api` under
  `## API scenarios` only.
- A criterion observable both on screen and through an endpoint yields two scenarios with two IDs, one
  of each tag - never one scenario carrying both.
- The same ID names the same case in every artifact of that build: acceptance document, handoff file,
  index line, automation status line, and the title of the generated test.

## Acceptance document

`docs/qa/<run id>.md`. Human-only, written in the language of the intent. Holds `ui` scenarios only -
manual API testing is out of scope, so an `api` ID never appears here.

### Template

```
# <build title>

- Date: <YYYY-MM-DD>
- Build: <run id>

## What changed
<2-3 plain sentences: what a person can now do, or what behaves differently. No file names.>

## Preparation
- Environment: <URL>
- Accounts: <role> (<login>), <role> (<login>)
- Data: <what must already exist before the first scenario>

## QA-01 <scenario title>
Covers: `<criterion title>` (#<n>)
Preconditions: <one sentence - the state the tester starts from>

| # | Step | Expected result |
| --- | --- | --- |
| 1 | <one action> | <one observable outcome> |
| 2 | <one action> | <one observable outcome> |

## Out of scope for this acceptance
- <what this document deliberately does not cover, and why>

## Supersedes
- QA-<nn> supersedes <older run id>#QA-<mm>
```

Sections appear in exactly that order. `## Supersedes` is written only when `## Supersedes rule` below
produces a match; every other section is always present.

### Rules

- Every heading, label and column name is rendered in the document's language. `Date:` and `Build:` are
  the only fixed English keys - they are metadata, not prose.
- At least one scenario per acceptance criterion of the build. A criterion the build made true behind an
  endpoint only, with nothing observable on screen, carries no scenario here: it is named in the
  out-of-scope section with that reason, and its `api` scenario lives in the handoff file.
- One negative scenario per failure mode that a person can trigger from the UI.
- Each scenario block carries a `Covers:` line in the reference form `` `<criterion title>` (#<n>) ``, a
  preconditions line, and a step table - in that order, with no other lines between them.
- One table row is one action and one observable outcome. A row whose step contains "and" joining two
  actions is two rows. A row whose expected result cannot be seen on screen is not a row.
- A preparation value the host memory does not give reads "settle with the team" in the document
  language, never a guess and never a placeholder like `<url>`.
- No execution-status column, no automation vocabulary, no locators, no test file names.

### Worked example (Polish rendering)

```
# Zatwierdzanie kart pracy przez kierownika

- Date: 2026-09-14
- Build: 2026-09-14-zatwierdzanie-kart-pracy

## Co się zmieniło
Kierownik widzi na swoim pulpicie listę kart pracy czekających na decyzję i może je zatwierdzić
albo odrzucić. Odrzucenie wymaga podania powodu, który trafia do pracownika. Karta zatwierdzona
znika z listy oczekujących i nie można jej już edytować.

## Przygotowanie
- Środowisko: https://staging.example.internal
- Konta: kierownik (kierownik@example.test), pracownik (pracownik@example.test) - hasła ustalić z zespołem
- Dane: pracownik ma jedną wysłaną kartę pracy za bieżący tydzień

## QA-01 Zatwierdzenie karty pracy
Pokrywa: `Kierownik zatwierdza kartę` (#1)
Warunki wstępne: zalogowany jako kierownik, na liście oczekujących jest karta pracownika za bieżący tydzień.

| # | Krok | Oczekiwany wynik |
| --- | --- | --- |
| 1 | Otwórz pulpit kierownika | Lista "Do zatwierdzenia" zawiera wiersz pracownika z bieżącym tygodniem |
| 2 | Kliknij wiersz pracownika | Otwiera się karta pracy z dniami tygodnia i sumą godzin |
| 3 | Kliknij "Zatwierdź" | Karta pokazuje status "Zatwierdzona" oraz datę decyzji |
| 4 | Wróć na pulpit kierownika | Wiersza tego pracownika nie ma już na liście "Do zatwierdzenia" |

## QA-02 Odrzucenie bez powodu jest blokowane
Pokrywa: `Odrzucenie wymaga powodu` (#2)
Warunki wstępne: zalogowany jako kierownik, otwarta karta pracy pracownika ze statusem "Wysłana".

| # | Krok | Oczekiwany wynik |
| --- | --- | --- |
| 1 | Kliknij "Odrzuć" | Pojawia się pole na powód odrzucenia z pustą treścią |
| 2 | Kliknij "Potwierdź" bez wypełniania pola | Pole powodu pokazuje komunikat o wymaganej treści, okno pozostaje otwarte |
| 3 | Zamknij okno | Karta nadal ma status "Wysłana" |

## Poza zakresem tego odbioru
- Powiadomienia e-mail o decyzji kierownika - wysyłka dzieje się poza aplikacją.
- `Karta widoczna dla kadr` (#4) - kryterium obserwowalne wyłącznie przez endpoint, bez ekranu; scenariusz QA-04 w pliku przekazania.

## Zastępuje
- QA-01 zastępuje 2026-06-02-lista-kart-pracy#QA-03
```

## Handoff file

`docs/qa/<run id>.e2e.md`. Machine-facing. Its headings and field names are fixed English whatever the
acceptance document's language is; scenario titles and criterion titles keep the wording they have in
the acceptance document.

### Template

```
Run: <run id>
Base: <base URL of the running application | not declared>
Launch: <command that starts the application | not declared>
Accounts: <role> <login> / <role> <login> - <where the passwords live> | not declared

## UI scenarios

### QA-<nn> <scenario title>
- Covers: `<criterion title>` (#<n>)
- Role: <role the scenario runs as | unknown>
- Route: <path the scenario starts on>
- Seed: <what must exist and how to create it, as a request | none>
- Steps:
  1. <one action>
  2. <one action>
- Assert: <the observable outcome the test proves>
- Files: <repo-relative source paths the scenario exercises>

## API scenarios

### QA-<nn> <scenario title>
- Covers: `<criterion title>` (#<n>)
- Endpoint: <METHOD> <path>
- Auth: <how the request authenticates | none | unknown>
- Request: <body or query | none>
- Expect: <status plus the response facts asserted>

## Not automatable
- QA-<nn> - <reason no test can drive this scenario>
```

### Rules

- The four header lines always appear, in that order, before any section. `Base:`, `Launch:` and
  `Accounts:` are a copy of what the host memory said at build time and read `not declared` when it said
  nothing. The E2E flow reads the host memory first and falls back to these lines only where the memory
  is silent.
- A UI entry carries all seven fields, an API entry all five, each on its own `- <Field>: ` line, in the
  order of the template. A field is never omitted: nothing to seed is `none`, nothing to authenticate
  with is `none`.
- A value not established from the code is the literal `unknown`, never invented. `unknown` is a field
  the E2E flow resolves against the running application; an invented value is a test that proves nothing.
- `## UI scenarios` exists only when the run's `e2e-ui` switch is on and UI code changed; `## API
  scenarios` only when `e2e-api` is on and an endpoint changed. A section with no entries is left out
  entirely rather than written empty.
- `## Not automatable` holds IDs no test can drive at all (an external inbox, a third-party UI). Those
  IDs get no entry under either scenario section and no automation status line.
- The IDs here are the build's IDs. When an acceptance document was written too, every `ui` ID appears in
  both files under the same number and the same title.

### Worked example

```
Run: 2026-09-14-zatwierdzanie-kart-pracy
Base: http://localhost:5173
Launch: npm run dev
Accounts: manager kierownik@example.test / employee pracownik@example.test - passwords in .env.test

## UI scenarios

### QA-01 Zatwierdzenie karty pracy
- Covers: `Kierownik zatwierdza kartę` (#1)
- Role: manager
- Route: /manager/timesheets
- Seed: POST /api/timesheets {"employeeId": "<employee>", "week": "current", "status": "submitted"}
- Steps:
  1. open /manager/timesheets
  2. click the row of the seeded employee
  3. click the approve button
  4. go back to /manager/timesheets
- Assert: the detail view shows status "Zatwierdzona" with today's date, and the pending list no longer contains that employee row
- Files: src/pages/manager/TimesheetList.tsx, src/pages/manager/TimesheetDetail.tsx

### QA-02 Odrzucenie bez powodu jest blokowane
- Covers: `Odrzucenie wymaga powodu` (#2)
- Role: manager
- Route: /manager/timesheets/<id>
- Seed: POST /api/timesheets {"employeeId": "<employee>", "week": "current", "status": "submitted"}
- Steps:
  1. open the seeded timesheet detail
  2. click the reject button
  3. submit the reject dialog with an empty reason
- Assert: the reason field shows the required-value message, the dialog stays open, and GET /api/timesheets/<id> still reports status "submitted"
- Files: src/pages/manager/TimesheetDetail.tsx, src/api/timesheets.ts

## API scenarios

### QA-04 Karta widoczna dla kadr
- Covers: `Karta widoczna dla kadr` (#4)
- Endpoint: GET /api/hr/timesheets
- Auth: bearer token from POST /api/login as the hr role
- Request: ?week=current&status=approved
- Expect: 200; the list contains the approved timesheet with its approver and decision date; a submitted timesheet is absent

### QA-05 Odrzucenie bez powodu jest odrzucane przez API
- Covers: `Odrzucenie wymaga powodu` (#2)
- Endpoint: POST /api/timesheets/{id}/reject
- Auth: bearer token from POST /api/login as the manager role
- Request: {"reason": ""}
- Expect: 422; the body carries a field error on `reason`; the timesheet stays `submitted`

## Not automatable
- QA-03 - the decision e-mail leaves through an external provider; no inbox is reachable from the test run
```

## Index line

`docs/qa/README.md`, written only when an acceptance document was written - a build that produced the
handoff file alone leaves the index untouched.

### Template

```
# QA

## <area>
- <YYYY-MM-DD> - [<title>](<run id>.md) - QA-01..QA-<nn>
```

### Rules

- Areas are derived exactly as `changelog-writer` derives them. The area is carried by the group
  heading, not repeated in the line; a build spanning several areas gets the same line under each group.
- Newest first inside a group. A group that does not exist yet is appended after the last existing
  group; existing groups keep their order.
- The ID range spans the first and the last ID assigned in that build, whether or not every ID in
  between reached the acceptance document. A build with one scenario writes that one ID alone (`QA-01`),
  not a range.
- The link is always the acceptance document, relative (`<run id>.md`) - the index and the documents sit
  in the same directory.
- Existing lines are never rewritten. The one exception is the supersedes suffix below.

### Worked example

```
# QA

## Kadry
- 2026-09-14 - [Zatwierdzanie kart pracy przez kierownika](2026-09-14-zatwierdzanie-kart-pracy.md) - QA-01..QA-05
- 2026-06-02 - [Lista kart pracy](2026-06-02-lista-kart-pracy.md) - QA-01..QA-04 (QA-03 superseded by 2026-09-14-zatwierdzanie-kart-pracy#QA-01)

## Raporty
- 2026-09-14 - [Zatwierdzanie kart pracy przez kierownika](2026-09-14-zatwierdzanie-kart-pracy.md) - QA-01..QA-05
```

## Supersedes rule

The match runs over every older `docs/qa/*.e2e.md` - handoff files only, never acceptance documents,
never the file being written. The comparison is exact string equality after trimming surrounding
whitespace; there is no fuzzy, similar or judgment-based match.

An older entry is superseded when all elements of its key are identical to the new entry's:

- UI entry: the `Route` value, and the criterion title of the `Covers` line.
- API entry: the method and the path of the `Endpoint` value, and the criterion title of the `Covers`
  line.

A difference in any element, or no older handoff file at all, means no supersedes. Two effects, both or
neither:

- The new acceptance document's supersedes section gains `QA-<nn> supersedes <older run id>#QA-<mm>` -
  the verb rendered in the document's language (Polish: `zastępuje`), the IDs and the run id never
  translated.
- The older build's index line gains the suffix ` (QA-<mm> superseded by <new run id>#QA-<nn>)`, the
  rest of that line untouched.

A build that wrote no acceptance document records no supersedes anywhere, index included - there is no
document to point a reader at.

## Automation status lines

The `## Automation` section the E2E flow appends to the handoff file - the only part of that file
written after the build.

### Template

```
## Automation
- QA-<nn>: file <repo-relative spec path>
- QA-<nn>: blocked - <reason the application, not the test, prevents a green run>
```

### Rules

- The section is created by the first processed ID and lives at the end of the handoff file; every later
  line is appended to it.
- One line per processed ID, never two. A retry rewrites that ID's line in place.
- `file` means the test was green locally at least once. `blocked` means the application, not the test,
  prevented it; the generated file is deleted in that case, so no `blocked` line ever names a path.
- A re-run over the same handoff file skips every ID with a `file` line and retries every ID with a
  `blocked` line. An ID with no line at all is pending.
- An ID listed under `## Not automatable` never gets a line here.

### Worked example

```
## Automation
- QA-01: file tests/e2e/qa-01-zatwierdzenie-karty-pracy.spec.ts
- QA-02: file tests/e2e/qa-02-odrzucenie-bez-powodu.spec.ts
- QA-04: file tests/e2e/qa-04-karta-widoczna-dla-kadr.spec.ts
- QA-05: blocked - the endpoint answers 500 on an empty reason; the field error this entry expects is never produced
```

## Never write these

- An execution-status column or field - no "Status", "Wynik", pass/fail, checkbox or tick anywhere in
  the acceptance document. Results live in GitHub Projects, not in the repo.
- Automation vocabulary inside the acceptance document: `Playwright`, `locator`, `selector`,
  `data-testid`, `.spec.ts`, a test directory, a CI job name.
- Links to `docs/.workflows/` paths, the intent or the spec - those are removed when the run is cleaned
  up. Link only to durable artifacts under `docs/`.
- Marketing tone ("seamless", "powerful", "significantly improved") - flat, factual sentences only.
- A step that bundles two actions ("open the list and approve the first row"), or one whose expected
  result is "check that it works", "everything works" or any other unobservable outcome.
- File paths or code identifiers inside the acceptance document - `## Files` belongs to the handoff
  file, which no tester reads.
- An invented value in the handoff file - a guessed route, role, endpoint or payload. The literal
  `unknown` is the only honest answer when the code does not establish it.
- A second document for the same run id, or an edit to an acceptance document of an earlier build. Both
  files are write-once; a correction to a shipped build is a new build's document plus a supersedes
  line.
