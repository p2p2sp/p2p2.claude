
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


### Covered criteria
12. Warunki wstępne przebiegu E2E - Uruchomienie przebiegu E2E bez przepisu startu aplikacji, kont testowych lub konwencji testów w pamięci hosta kończy się pytaniem do operatora, a brak `playwright-cli` lub `@playwright/test` kończy się ofertą instalacji, którą wykonuje sam przebieg E2E po zgodzie operatora, albo przerwaniem; w żadnym z tych stanów nie powstaje żaden test.
13. Testy zielone przed commitem - Każdy wygenerowany plik testów przeszedł lokalnie przeciw uruchomionej aplikacji przed commitem, a scenariusz, którego test nie może przejść z winy aplikacji, jest w pliku przekazania oznaczony jako zablokowany z powodem, bez żadnej zmiany w kodzie aplikacji.
14. Testy commitowane i trasowalne - Commit przebiegu E2E zawiera dokładnie wygenerowane pliki testów i zaktualizowany plik przekazania, nic więcej; każdy test nosi ID scenariusza i tytuł kryterium, a plik przekazania zapisuje per scenariusz ścieżkę wygenerowanego pliku albo powód zablokowania; ponowne uruchomienie nad tym samym plikiem pomija scenariusze z zapisaną ścieżką i ponawia zablokowane.
