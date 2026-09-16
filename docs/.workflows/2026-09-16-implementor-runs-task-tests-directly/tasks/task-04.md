
## Task 4 - Run task tests directly in both task implementors and record runs in the notes
- TDD: none
- Model: opus
- Effort: xhigh
- Covers: `Bezpośredni bieg` (#1), `Cykl TDD bezpośrednio` (#2), `Bez pełnego suite` (#3), `Executor tylko u reviewerów` (#5), `Sekcja Runs` (#10)

### Dependencies
- `Rename TDD Commands to Task Tests and tighten task sizing in both planners` (Task 1) - blocks: the `### Task Tests` section the implementor runs

### Files
- modify - superdev/agents/superbuild-task-implementor.md (`## Input`, `## 1. Implement`, `## 2. Build + Test`, `## 3. Record notes`)
- modify - superdev/agents/simplebuild-task-implementor.md (`## Input`, `## 1. Implement`, `## 3. Run Build & Tests`, `## 4. Record notes`)

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- ! grep -Eq 'run\.sh|runner:|superdev:executor|LOG:|RESULT:' superdev/agents/superbuild-task-implementor.md - exits 0
- ! grep -Eq 'run\.sh|runner:|superdev:executor|LOG:|RESULT:' superdev/agents/simplebuild-task-implementor.md - exits 0
- grep -q '## Runs' superdev/agents/superbuild-task-implementor.md && echo ok - prints `ok`
- grep -q '## Runs' superdev/agents/simplebuild-task-implementor.md && echo ok - prints `ok`
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-implementor.md - exits 0
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/simplebuild-task-implementor.md - exits 0

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below; apply each edit to both agents identically, the only differences being their section numbers and the `spec` / `UNDERSPECIFIED:` lines the simple agent lacks today.
2. `## Input`: delete the `runner` bullet; in the `task` bullet replace `TDD Commands (on a TDD: required task only)` with `Task Tests`; in the `plan` bullet say it sources the `#### Build` block and the `### Task Tests` lines when `task` is a findings report or lists no build command.
3. `## 1. Implement`, the `TDD: required` bullet: keep the `tdd` skill invocation and the "no line for the test file -> `VERDICT: FAIL`" rule; replace the runner, heredoc, `expect-exit:` and three `RESULT:` cases with the direct form: every VERIFY RED and VERIFY GREEN run is a direct `Bash` call of the `### Task Tests` line whose path matches the test file the cycle writes, verbatim, its output read in place; RED holds only when that output shows the test ran and failed on its assertion, so a compile or transform error, a "no tests found" line or a passing test is not RED and is answered by fixing the test or adding the stub the cycle needs (a symbol with no behaviour, never production code); GREEN holds when that file passes in full. The `#### Tests` block of `### Test Commands` never runs in a cycle.
4. The build-and-test step: rewrite it as the direct form: run the task's `#### Build` block, then every `### Task Tests` file line (a section reading `none - <reason>` means the build alone), each command as one direct `Bash` call verbatim, its output read in place; the `#### Tests` block of `### Test Commands` is the build reviewers' gate and never runs here, and neither does the host's integration or e2e command; a task with no `#### Build` takes the plan's, and with no plan either the host's documented build command. Any red -> fix, re-run. Fix loop max 5 rounds; still failing after 5 -> `VERDICT: FAIL`, `REASON:` naming the last failing command and its failing test or error line. Fix mode: `#### Build` plus the `### Task Tests` lines of every plan task from `## plan` whose `### Files` path prefix-matches a file the fix touched; no task matches -> the build alone. Replace the scope sentence: `Bash` runs the build, the task tests, `git` and file inspection; nothing else.
5. Record-notes step: add, above the deviation lines, a `## Runs` section written on every PASS: one line per command of the last, green pass of the build-and-test step, in run order, shape `- <command verbatim> -> <the tool's own summary line, or exit <n> when it printed none>`.

### Failure modes
- when the task's `### Task Tests` reads `none - <reason>` -> response the build runs alone and `## Runs` carries the build line only, log none, test none - agent text.
- when the task lists no `#### Build` block -> response the plan's `#### Build` block runs, and with no plan given the host's documented build command, log the command used on its `## Runs` line, test none - agent text.
- when a `TDD: required` cycle finds no `### Task Tests` line for its test file -> response `VERDICT: FAIL` with `REASON:` naming that file and nothing changed, log the reason line, test none - agent text.
- when a run's tool prints no summary line -> response the `## Runs` line carries `exit <n>`, log that line, test none - agent text.
- when fix mode touches a file under no plan task's `### Files` -> response the build runs alone for that file, log none, test none - agent text.
- when a command cannot start (command not found, shell error) -> response `VERDICT: FAIL` with `REASON:` naming the command and the shell's message, no retry, log the reason line, test none - agent text.
- when a command still fails after 5 rounds -> response `VERDICT: FAIL` with `REASON:` naming that command and its failing test or error line, log the reason line, test none - agent text.

### Contracts
- `## Runs` notes section: written on PASS only, one line per command of the last green pass in run order, shape `- <command verbatim> -> <summary line | exit <n>>`; consumed by `Check the implementor's recorded runs in the per-task reviewer` (Task 6).
- Implementor input set: `plan-header`, `task`, `refs`, `plan`, `spec` (super only), `more`, `minor`, `notes` - no `runner`; consumed by `Drop the runner label from both build orchestrators` (Task 5).

### DoD
Both agents run `#### Build` and `### Task Tests` directly with `Bash`, run neither `#### Tests` nor the integration or e2e command, carry the direct TDD cycle, the fix-mode scope and the `## Runs` section, and mention no `run.sh`, `runner:`, `superdev:executor`, `LOG:` or `RESULT:`; the greps and the lint exit as listed; the test suite is green.


### Covered criteria
1. Bezpośredni bieg - oba implementatory uruchamiają blok `#### Build` zadania i każdą linię `### Task Tests` jako zwykłe wywołanie Bash, czytają output i naprawiają w pętli max 5 rund, a żaden z dwóch plików agentów nie zawiera odwołania do `run.sh`, etykiety `runner:`, `superdev:executor`, `LOG:` ani `RESULT:`.
2. Cykl TDD bezpośrednio - przy `TDD: required` VERIFY RED i VERIFY GREEN biegną linią `### Task Tests` pisanego pliku tą samą drogą; RED jest uznany tylko gdy output pokazuje test, który został uruchomiony i nie przeszedł przez asercję (błąd kompilacji, brak testów lub test, który przeszedł, kończy się poprawą testu, nie kodem produkcyjnym), GREEN gdy ten plik przechodzi w całości; w hoście kompilowanym doprowadzenie testu do biegu (stub symbolu bez zachowania) jest krokiem cyklu, który implementator nazywa w swoim opisie RED/GREEN, i nie jest kodem produkcyjnym.
3. Bez pełnego suite - implementator nigdy nie uruchamia bloku `#### Tests` z `### Test Commands`; w trybie fix po raporcie reviewera uruchamia `#### Build` oraz linie `### Task Tests` każdego zadania, którego `### Files` pokrywa (przez prefiks) plik dotknięty poprawką, a gdy żadne zadanie nie pasuje, sam `#### Build`; pełny suite należy do re-review.
5. Executor tylko u reviewerów - w `superdev/` wywołanie `superdev:executor` jako kroku pracy występuje wyłącznie w trzech reviewerach-forkach i w `review-contract.md`; opisy w `executor/SKILL.md`, nagłówku `run.sh`, `README.md` i root `CLAUDE.md` nie liczą się jako wywołanie.
10. Sekcja Runs - plik `notes:` zadania (gdy etykieta podana) ma sekcję `## Runs` z jedną linią na każde końcowe uruchomienie (`#### Build` i każda linia `### Task Tests`; przy `### Task Tests` równym `none` sam `#### Build`): komenda verbatim plus linia podsumowania narzędzia, a gdy narzędzie nic nie wypisuje, jego kod wyjścia.
