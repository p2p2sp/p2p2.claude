# SuperPlan
To build this plan use the `superbuild` skill.

Title: "QA scenarios layer and Playwright E2E flow behind qa, e2e-ui and e2e-api switches"
Spec: docs/.workflows/2026-09-17-qa-scenarios-and-e2e/spec.md
Intent: docs/.workflows/2026-09-17-qa-scenarios-and-e2e/intent.md
Plan: C:\Users\dariu\.claude-p2p2\plans\tender-honking-hennessy.md

## Gate commands

#### Build
- none - the plan moves markdown, JSON and bash scripts only; nothing compiles

#### Tests
- node --test "tests/**/*.test.ts"

#### Integration
- none - the repo has no integration suite, and the new `e2e` skill needs a running host application that this repo does not have

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - Report Playwright tooling in setup
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Narzędzia raportowane przez setup` (#3), `Testy skryptów zielone` (#16)

### Dependencies
- `Add the qa, e2e-ui and e2e-api config switches` (Task 1) - blocks: the `bootstrap.test.ts` expected stdout this task extends already carries the nine-key defaults line

### Files
- add - superdev/scripts/check-playwright.sh
- add - tests/superdev/check-playwright.test.ts
- modify - superdev/skills/setup/scripts/bootstrap.sh (call of `check-playwright.sh` after the config block, header comment)
- modify - tests/superdev/bootstrap.test.ts (`seed-when-absent` and `idempotence` expected stdout)
- modify - superdev/skills/setup/SKILL.md (`## Bootstrap` description, `## Output` block)

### Task Checks
- tests/superdev/check-playwright.test.ts - node --test tests/superdev/check-playwright.test.ts
- tests/superdev/bootstrap.test.ts - node --test tests/superdev/bootstrap.test.ts

### Approach
1. Write `check-playwright.sh` (shebang `#!/usr/bin/env bash`, `set -u`, exit 0 always, header comment with the contract) and give it the exec bit in the index with `git update-index --chmod=+x superdev/scripts/check-playwright.sh` (the preload of Task 7 invokes it directly): resolve `root` as `git rev-parse --show-toplevel` falling back to the cwd; with `command -v playwright-cli` succeeding print `playwright-cli: found <first line of playwright-cli --version>`; with `command -v` failing print `playwright-cli: not found`; then print `@playwright/test: found` when `<root>/package.json` exists and `grep -q '"@playwright/test"'` matches, else `@playwright/test: not found`. argv none.
2. In `bootstrap.sh`, after the `superdev.yml` block, run `"${skill_dir}/../../scripts/check-playwright.sh"` and pass its stdout through; extend the header comment's stdout contract with the two new line shapes.
3. Write `check-playwright.test.ts` on the shared harness (`runScript`, `withTempDir`, `withStub` from `tests/harness/stub.ts`). PATH isolation, because `stubDirs` only prepends to the real PATH and a host with a global `playwright-cli` would flip the not-found cases: every case passes `opts.env.PATH` set to the one directory that resolves `grep` on the current PATH (scan `process.env.PATH` entries for `grep` or `grep.exe`), so only core utilities resolve; the found case additionally prepends a `withStub` dir via `stubDirs` whose `playwright-cli` prints `1.2.3` on `--version`. Cases: not found; found with version; found with `--version` exiting 1 (`found (version unknown)`); `@playwright/test: found` with a fixture `package.json` naming it under `devDependencies`; `not found` without a `package.json`; stdout compared as exact strings.
4. In `bootstrap.test.ts`, extend the exact expected stdout of `seed-when-absent` and `idempotence` with the two tooling lines (`playwright-cli: not found`, `@playwright/test: not found`) and run those two cases with the same `opts.env.PATH` isolation as step 3.
5. In `setup/SKILL.md`, describe the two tooling lines in `## Bootstrap` and add them to the `## Output` message shape; state that setup installs nothing.

### Failure modes
- when `playwright-cli --version` fails or prints nothing -> response `playwright-cli: found (version unknown)`, log nothing, test check-playwright.test.ts (stub exiting 1 on `--version`)
- when `./package.json` is unreadable -> response `@playwright/test: not found`, log nothing, test check-playwright.test.ts (no package.json case)

### Contracts
- `check-playwright.sh` stdout: exactly two lines, `playwright-cli: found <version> | found (version unknown) | not found` and `@playwright/test: found | not found`, exit 0 - consumed by `Add the e2e skill` (Task 7)

### DoD
Both test files pass; `/superdev:setup` output ends with the two tooling lines; no install command exists in either script.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - Add the e2e skill
- TDD: none
- Model: opus
- Effort: high
- Covers: `Warunki wstępne przebiegu E2E` (#12), `Testy zielone przed commitem` (#13), `Testy commitowane i trasowalne` (#14)

### Dependencies
- `Report Playwright tooling in setup` (Task 2) - blocks: the `check-playwright.sh` preload
- `Add the e2e-writer agent` (Task 6) - blocks: the label set it dispatches with

### Files
- add - superdev/skills/e2e/ (SKILL.md, the skill's only file)

### Task Checks
- grep -q '^name: e2e' superdev/skills/e2e/SKILL.md && grep -q '^disable-model-invocation: true' superdev/skills/e2e/SKILL.md && grep -q 'check-playwright.sh' superdev/skills/e2e/SKILL.md && grep -q 'superdev:e2e-writer' superdev/skills/e2e/SKILL.md && grep -q 'commit-task.sh' superdev/skills/e2e/SKILL.md

### Approach
1. Frontmatter: `name: e2e`, `description: Generate and locally verify Playwright tests for the scenarios of one docs/qa handoff file, then commit them for CI.`, `user-invocable: true`, `disable-model-invocation: true`, `allowed-tools: Read, Grep, Glob, Bash, Agent, AskUserQuestion, TaskCreate, TaskUpdate, TaskStop, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/check-playwright.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:*)`, `disallowed-tools: Edit, Write, NotebookEdit`; a `## Tooling` section whose body is the preload `` !`"${CLAUDE_PLUGIN_ROOT}/scripts/check-playwright.sh"` ``; argument line `handoff: <path>` (a bare path is accepted as the same).
2. `## Preflight`: the `Agent` tool absent -> the four-line STOP report of `superdev-memory`; resolve the `handoff:` value (an existing file whose name ends in `.e2e.md`, per `### Failure modes` otherwise) and read it; read the host `CLAUDE.md` cascade and `.claude/rules/` for the launch recipe, base URL, test accounts source, e2e directory and conventions, falling back to the handoff's `Launch:` / `Accounts:` lines where the memory is silent and they read other than `not declared`; each item still missing -> one `AskUserQuestion` (provide it now / abort), never a guess; a tooling line reading `not found` -> one `AskUserQuestion` (install / abort), install on yes with `npm install -g @playwright/cli@latest` for `playwright-cli` and `npm i -D @playwright/test` plus `npx playwright install` for the test runner, each as its own Bash call, the package name kept as written and never re-derived; a `@playwright/test` install changes the host's `package.json` and lockfile, so the skill tells the operator before the loop that those two files are committed or stashed by the operator, never by the E2E commit of step 5.
3. `## Launch`: run the launch recipe as a background Bash command, poll the base URL with `curl -sf` up to a timeout, then continue; the base URL answering before the launch counts as already running.
4. `## Loop`: `TaskCreate` one task per ID found under `## UI scenarios` and `## API scenarios`, applying the re-run rule of `<refs>/qa-format.md` (`## Automation status lines`) to the `## Automation` section; for each pending ID dispatch `superdev:e2e-writer` (`Agent`) with `handoff:`, `id:`, `spec-dir:`, `base-url:`, `refs: ${CLAUDE_PLUGIN_ROOT}/references`, `memory:`, `rules:`, `accounts:` on separate lines, await it, keep its `FILE:` or `REASON:` line for `## Done`.
5. `## Commit`: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "test(e2e): <handoff title>" --path <handoff path>` plus one `--path` per `FILE:` line.
6. `## Done`: summary of at most five sentences plus one line per ID (`QA-nn: file <path>`, `QA-nn: blocked - <reason>` or `QA-nn: skipped - <REASON line>` for an ID the operator skipped); the skill writes no file itself.

### Failure modes
- when the base URL does not answer within the launch timeout -> response `AskUserQuestion` (retry with a longer timeout / abort), log the recipe's last output lines under `.temp/superdev/e2e/launch.log`, test none - prompt contract
- when the `handoff:` value is missing, names no existing file, or names a file not ending in `.e2e.md` -> response stop with a one-line report naming the value and the expected shape, nothing dispatched, log nothing, test none - prompt contract
- when the handoff file has no `## UI scenarios` and no `## API scenarios` section -> response stop with a one-line report naming the file, log nothing, test none - prompt contract
- when the `Agent` tool is absent -> response the four-line STOP report, log nothing, test none - prompt contract
- when `e2e-writer` returns `VERDICT: FAIL` -> response one retry with the same arguments, then on a second FAIL `AskUserQuestion` (retry / skip / abort), log the writer's `REASON:` line kept for `## Done`, test none - prompt contract
- when `commit-task.sh` exits 2 -> response the undeclared-paths `AskUserQuestion` of `superbuild` (remove or stash / include named / abort), log every `undeclared: <path>` line quoted in that question, test none - prompt contract
- when an install command exits non-zero or the binary is still absent afterwards -> response `AskUserQuestion` (retry / abort) with nothing generated in either case, log the command's last output lines under `.temp/superdev/e2e/install.log`, test none - prompt contract

### Contracts
- none

### DoD
The skill exists, is user-only, preloads the tooling check, refuses to generate without the host recipe or tools, dispatches one `e2e-writer` per pending ID, commits generated files plus the handoff, and never writes a file itself.

<!-- /TASK -->

---

<!-- TASK -->

## Task 8 - Catalog, docs and manifest
- TDD: none
- Model: sonnet
- Effort: low
- Covers: `Katalog i dokumentacja aktualne` (#15)

### Dependencies
- `Add the qa-writer close-out agent` (Task 4) - blocks: the agent path it catalogs
- `Add the e2e-writer agent` (Task 6) - blocks: the agent path it catalogs
- `Add the e2e skill` (Task 7) - blocks: the skill path it catalogs

### Files
- modify - superdev/.claude-plugin/plugin.json (`skills`, `agents`)
- modify - superdev/README.md (`## Quick start` step 1 and step 7, `## Config switches` table, `### Entry and environment` table, `### Knowledge layers (also runnable on their own)` table)
- modify - CLAUDE.md (the `superdev` bullet under `## What this repo is`, the `docs/<layer>/` invariant, the self-documentation invariant's agent list)
- modify - superdev/hooks/content/manifest.md (`## Build chain`)

### Task Checks
- node -e "JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8'))"
- grep -q './agents/qa-writer.md' superdev/.claude-plugin/plugin.json && grep -q './agents/e2e-writer.md' superdev/.claude-plugin/plugin.json && grep -q './skills/e2e/' superdev/.claude-plugin/plugin.json && grep -q 'docs/qa/' CLAUDE.md && grep -q 'e2e-api' superdev/README.md && grep -q 'e2e-api' superdev/hooks/content/manifest.md

### Approach
1. `plugin.json`: append `"./skills/e2e/"` to `skills` and `"./agents/qa-writer.md"`, `"./agents/e2e-writer.md"` to `agents`.
2. `README.md`: three rows in the config table (`qa`, `e2e-ui`, `e2e-api`) in the wording of the spec's Goal; step 1 mentions the tooling report; step 7 names `qa` in wave 1 and the two-stage model; an `e2e` row in the entry table; `superdev:qa-writer` and `superdev:e2e-writer` rows in the knowledge-layers table.
3. `CLAUDE.md`: extend the `superdev` bullet with the QA layer (three switches, `qa-writer` in wave 1, the two `docs/qa/` documents, the user-only `e2e` skill dispatching `e2e-writer`, tests never run in a build); add `docs/qa/` to the `docs/<layer>/` invariant; add the two agents to the self-documentation invariant's list of superdev agents; note `superdev/scripts/check-playwright.sh` where the plugin's shared scripts are described.
4. `manifest.md`: one bullet under `## Build chain`: config-gated by `qa`, `e2e-ui` and `e2e-api`, Close Out writes the QA acceptance document and the E2E handoff under `docs/qa/`; Playwright tests are generated only by the user-run `e2e` skill, never during a build.

### Failure modes
- none - documentation

### Contracts
- none

### DoD
`plugin.json` parses and lists the three new entries; README, root CLAUDE.md and manifest describe the switches, the `docs/qa/` layer and the E2E flow.

<!-- /TASK -->

---
