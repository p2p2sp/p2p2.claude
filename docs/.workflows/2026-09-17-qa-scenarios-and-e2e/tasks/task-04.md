
## Task 4 - Add the qa-writer close-out agent
- TDD: none
- Model: opus
- Effort: high
- Covers: `Dokument odbioru istnieje` (#4), `Scenariusz na każde kryterium` (#5), `Kroki czytelne dla człowieka` (#6), `Indeks jako widok regresji` (#7), `Zastąpienia oznaczone` (#8), `Plik przekazania istnieje` (#9), `Wpisy przekazania kompletne` (#10), `Pominięcia nazwane` (#11)

### Dependencies
- `Define the docs/qa document formats` (Task 3) - blocks: the agent writes per `<refs>/qa-format.md`

### Files
- add - superdev/agents/qa-writer.md

### Task Checks
- grep -q '^name: qa-writer' superdev/agents/qa-writer.md && grep -q '^model: opus' superdev/agents/qa-writer.md && grep -q 'qa-format.md' superdev/agents/qa-writer.md && grep -q 'QA-INDEX:' superdev/agents/qa-writer.md

### Approach
1. Write the agent in the shape of `changelog-writer.md`: frontmatter `name: qa-writer`, `description: Invoked only by superbuild or simplebuild, never directly.`, `tools: Read, Write, Edit, Grep, Glob, Bash`, `model: opus`, `effort: high`, `color: yellow`; the same `## Input` label paragraph.
2. `## Input`: required `capture` (plan copy), `workdir`, `refs`, `notes`, and the literal switch labels `qa`, `e2e-ui`, `e2e-api` (`true|false`); optional `spec`, `intent`, `reports` (the `implementation/` dir, read for the `## Coverage` table of the final spec review when present). Host memory: read the host's `CLAUDE.md` cascade and `.claude/rules/` for environment URL, accounts, UI and API locations.
3. `## Derive`: run id exactly as `changelog-writer` derives it (basename of Workdir, `<grandparent>-<basename>` under `phases/`); language as `changelog-writer`; the change classification: UI changed when a `### Files` path of `## capture` lies in a directory the host memory names as UI or frontend, or, with no such memory, when the file is a view, component, template, page or client routing file by its content; endpoints changed when a path is a controller, route, handler or API definition the same way; criteria from `## spec` (`## Acceptance criteria`) or, absent, from the plan header's `## Acceptance criteria` of `## capture`; scenario sources: criteria, `## User scenarios` of `## spec`, `### Failure modes` of every task, the `## Coverage` table (a `not met` or `blocked` criterion still gets its scenario, with its precondition noting the state), the changed view and routing code for navigation, labels and messages; write nothing when `qa`, `e2e-ui` and `e2e-api` all read `false`.
4. `## Write` per `<refs>/qa-format.md`: derive the single `QA-nn` list first (tag `ui` for a scenario observable on screen, `api` for one observable through an endpoint; a criterion observable both ways gets one scenario of each tag, two IDs), then render: the acceptance document only when `qa: true` and UI changed; the handoff file only when `e2e-ui: true` and UI changed or `e2e-api: true` and endpoints changed, with each section only under its own switch and change; `## Not automatable` for `ui` entries no test can drive (external e-mail, third-party UI); the index only when the acceptance document was written; supersedes from older `docs/qa/*.e2e.md` per the reference's match key. An artifact whose file already exists -> `VERDICT: FAIL` with `REASON: entry exists - docs/qa documents are write-once`.
5. `## Validate` (self-check): every criterion has at least one scenario; every UI-triggerable failure mode has a negative scenario; every step row holds one action and one expected result; the acceptance document contains none of `data-testid`, `.spec.ts`, `Playwright`, `locator`, `selector`; every handoff entry has every field; IDs identical across both files.
6. `## Output format`: line 1 `VERDICT: PASS|FAIL`; then `QA: <path> (created)` or `QA: skipped - <reason>`; `E2E: <path> (created)` or `E2E: skipped - <reason>`; `QA-INDEX: docs/qa/README.md (created|updated)` or `QA-INDEX: none`; on FAIL only `REASON: <one line>`.

### Failure modes
- when a required label is missing or unreadable -> response `VERDICT: FAIL`, log `REASON: missing input <label>`, test none - prompt contract
- when the target file already exists -> response `VERDICT: FAIL`, log `REASON: entry exists - docs/qa documents are write-once`, test none - prompt contract
- when no acceptance criterion can be found in `## spec` or `## capture` -> response `VERDICT: FAIL`, log `REASON: no acceptance criteria`, test none - prompt contract
- when the host memory names no environment or accounts -> response the document's preparation lines read "settle with the team" in the document language and the handoff's `Launch:` / `Accounts:` read `not declared`, log nothing, test none - prompt contract

### Contracts
- Output lines `QA:`, `E2E:`, `QA-INDEX:` in the shapes above, each path repo-relative - consumed by `Dispatch qa-writer from both orchestrators` (Task 5)
- Input label set `capture`, `workdir`, `refs`, `notes`, `qa`, `e2e-ui`, `e2e-api`, `spec`, `intent`, `reports` - consumed by `Dispatch qa-writer from both orchestrators` (Task 5)

### DoD
The agent file exists with input, derive, write, validate and output sections; every rule of the spec's criteria 4 to 11 is stated as an instruction the agent follows, and the output grammar matches the contract above.


### Covered criteria
4. Dokument odbioru istnieje - Po zakończonym buildzie z `qa: true`, który zmienił kod widoków lub routing, na torze Simple i Super, pod `docs/qa/` istnieje jeden nowy dokument odbioru tego builda w języku intentu, a ponowny zapis pod tą samą nazwą jest odrzucany jako błąd, który build zgłasza w podsumowaniu.
5. Scenariusz na każde kryterium - Każde kryterium akceptacji builda ma w dokumencie odbioru co najmniej jeden scenariusz wskazujący je po tytule, a każdy tryb awarii wywoływalny z UI ma scenariusz negatywny.
6. Kroki czytelne dla człowieka - Każdy scenariusz ma warunki wstępne i tabelę, w której każdy wiersz to jedna akcja i jeden obserwowalny wynik, a dokument nie zawiera kolumny statusu wykonania (zaliczony / niezaliczony) ani żadnej wzmianki o automatyzacji, lokatorach czy plikach testów.
7. Indeks jako widok regresji - Po każdym buildzie, który utworzył dokument odbioru, `docs/qa/README.md` zawiera jedną linię tego builda z datą, tytułem, obszarami i zakresem ID scenariuszy, umieszczoną w grupie jego obszaru, a istniejące linie pozostają nietknięte; build, który utworzył tylko plik przekazania, nie zmienia indeksu.
8. Zastąpienia oznaczone - Gdy starszy plik przekazania zawiera scenariusz o identycznej trasie (UI) albo identycznej metodzie i endpoincie (API) i o identycznym tytule kryterium, nowy dokument odbioru wymienia go w sekcji zastąpień, a indeks wskazuje nowszy scenariusz; różnica w którymkolwiek z tych elementów, albo brak starszych plików przekazania, oznacza brak zastąpienia.
9. Plik przekazania istnieje - Po zakończonym buildzie z `e2e-ui: true` lub `e2e-api: true` pod `docs/qa/` istnieje plik przekazania tego builda z sekcją scenariuszy UI tylko przy `e2e-ui` i sekcją scenariuszy API tylko przy `e2e-api`; plik przekazania istnieje niezależnie od `qa`, a gdy dokument odbioru też powstał, oba używają tych samych ID scenariuszy.
10. Wpisy przekazania kompletne - Każdy wpis UI niesie kryterium, rolę, trasę, dane startowe, kroki, asercję i pliki, każdy wpis API niesie kryterium, endpoint, uwierzytelnienie, żądanie i oczekiwaną odpowiedź, a wartość nieustalona z kodu jest zapisana jako nieznana, nigdy wymyślona.
11. Pominięcia nazwane - Build, który nie zmienił kodu widoków ani routingu, nie tworzy dokumentu odbioru ani sekcji UI, build, który nie zmienił żadnego endpointu, nie tworzy sekcji API, a podsumowanie builda podaje każde takie pominięcie z powodem.
