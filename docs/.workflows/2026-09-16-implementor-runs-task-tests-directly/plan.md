# SuperPlan
To build this plan use the `superbuild` skill.

Title: "Implementors run task tests directly; executor only in build reviews"
Spec: C:\Projects\p2p2.claude\docs\.workflows\2026-09-16-implementor-runs-task-tests-directly\spec.md <!-- `What & Why` specification -->
Intent: docs/.workflows/2026-09-16-implementor-runs-task-tests-directly/intent.md
Plan: C:\Users\dario\.claude-p2p2\plans\piped-leaping-alpaca.md

---

<!-- TASK -->

## Task 1 - Rename TDD Commands to Task Tests and tighten task sizing in both planners
- TDD: none
- Model: opus
- Effort: high
- Covers: `Task Tests na każdym zadaniu` (#7), `Rozmiar doradczy` (#9), `Tylko testy w pamięci` (#15)

### Dependencies
- none

### Files
- modify - superdev/skills/superplan/templates/plan.md (`### TDD Commands`)
- modify - superdev/skills/simpleplan/templates/plan.md (`### TDD Commands`)
- modify - superdev/skills/superplan/SKILL.md (`**Task Sizing**`, `**TDD Discipline**`, `### Self-Review`)
- modify - superdev/skills/simpleplan/SKILL.md (`**Task Sizing**`, `**TDD Discipline**`, `### Self-Review`)

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- grep -c '^### Task Tests' superdev/skills/superplan/templates/plan.md - prints `1`
- grep -c '^### Task Tests' superdev/skills/simpleplan/templates/plan.md - prints `1`
- ! grep -rq 'TDD Commands' superdev/skills/superplan superdev/skills/simpleplan - exits 0 (no match left)
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan - exits 0
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan - exits 0

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below; it owns the editing discipline for skill, agent and reference files.
2. In both `templates/plan.md`, rename the `### TDD Commands` section to `### Task Tests`, keep its line shape `- <test file path> - <command that runs only that file>`, and rewrite its angle-bracket annotation: the section is present on every task whatever `TDD:` says; one line per test file the task writes or changes; a task that writes or changes no test file carries the single line `none - <reason>`; every path is declared under that task's `### Files`; the command is literal, runnable as written, and carries the narrowest scope the host's runner has; only a test that runs fast in memory belongs here, never one in which a process or service the application connects to takes part.
3. In both `SKILL.md`, extend `**Task Sizing**` with the measurable bound: a `TDD: required` task writes exactly one test file and only the production code that file drives, so a second `### Task Tests` line on such a task is the signal to split it; a `TDD: none` task aims at one behaviour and a few files.
4. In both `SKILL.md`, extend `**TDD Discipline**` after its "Never `TDD: required` ..." sentence with the in-memory rule: `### Task Tests` and the TDD cycle hold only tests that run fast in memory; a test in which a process or service the application connects to takes part (a database, the network, a browser, given as examples) is an integration or e2e test, goes in neither `### Task Tests` nor the `#### Tests` block of `### Test Commands`, and runs only through the host's integration or e2e command at the final review; which suite of a host is its fast in-memory suite is settled by the host's memory files (`CLAUDE.md`, `.claude/rules/`), never by the examples here.
5. In both `### Self-Review` sections, replace every `### TDD Commands` mention with `### Task Tests` and the marker bullet's TDD clause with: every task carries `### Task Tests`, a `TDD: required` task's section carries exactly one file line, and every line names a test file declared under `### Files` or reads `none - <reason>`.

### Failure modes
- none - markdown

### Contracts
- `### Task Tests` section: present on every plan task, line shape `- <test file path> - <command that runs only that file>`, empty form `none - <reason>`, every path under that task's `### Files`; consumed by `Enforce Task Tests and one-test-file TDD tasks in the plan review checklist and ADR task` (Task 2), `Scope the integration and e2e gate to final and re-review in the review contract` (Task 3), `Run task tests directly in both task implementors and record runs in the notes` (Task 4), `Check the implementor's recorded runs in the per-task reviewer` (Task 6).
- One-test-file rule: a `TDD: required` task carries exactly one `### Task Tests` file line; consumed by `Enforce Task Tests and one-test-file TDD tasks in the plan review checklist and ADR task` (Task 2).
- In-memory rule: `### Task Tests` and `#### Tests` never hold an integration or e2e test, which runs only through the host's integration or e2e command at the final review; consumed by `Enforce Task Tests and one-test-file TDD tasks in the plan review checklist and ADR task` (Task 2), `Scope the integration and e2e gate to final and re-review in the review contract` (Task 3).

### DoD
Both templates carry `### Task Tests` with the new annotation and no `### TDD Commands`; both planners carry the sizing bound, the in-memory rule and the renamed self-review bullets; the greps and the lint exit as listed; the test suite is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - Enforce Task Tests and one-test-file TDD tasks in the plan review checklist and ADR task
- TDD: none
- Model: opus
- Effort: high
- Covers: `Jeden plik testowy przy TDD` (#8), `Rozmiar doradczy` (#9), `Integracyjne tylko w final` (#16), `Task Tests na każdym zadaniu` (#7)

### Dependencies
- `Rename TDD Commands to Task Tests and tighten task sizing in both planners` (Task 1) - blocks: the section name, the `none - <reason>` form and the one-test-file rule the classes below enforce

### Files
- modify - superdev/references/plan-review-checklist.md (`## Evidence rule`, `B2`, `B6`, `## Blocking classes`, `## Advisory (NOTES)`, `## Author self-check`)
- modify - superdev/references/adr-task.md (`## Task block`)
- modify - superdev/skills/superplan/SKILL.md (`### Self-Review`)
- modify - superdev/skills/simpleplan/SKILL.md (`### Self-Review`)
- modify - superdev/skills/superplan-reviewer/SKILL.md (`FINDINGS` bullet)
- modify - superdev/skills/simpleplan-reviewer/SKILL.md (`FINDINGS` bullet)

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- grep -c '^- B16 - ' superdev/references/plan-review-checklist.md - prints `1`
- grep -c '^### Task Tests' superdev/references/adr-task.md - prints `1`
- ! grep -rq 'TDD Commands' superdev/references/plan-review-checklist.md superdev/references/adr-task.md - exits 0
- ! grep -rq 'B1-B15' superdev/ - exits 0
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan-reviewer - exits 0
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan-reviewer - exits 0
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan - exits 0
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan - exits 0

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below.
2. In `plan-review-checklist.md`, rename `### TDD Commands` to `### Task Tests` in the stack-agnostic section list, in `B2` (its file-scoping clause stays) and in the `## Author self-check` command bullet; the marker bullet is replaced whole by step 6.
3. Rewrite the `B6` clause that today ties `### TDD Commands` to the marker: `### Task Tests` is required on every task whatever `TDD:` says; a task with no such section, a section holding neither a file line nor `none - <reason>`, or a file line whose test file path is not declared under that task's `### Files`, is B6.
4. Add `B16 - Oversized TDD task`: a `TDD: required` task whose `### Task Tests` carries more than one file line, or reads `none - <reason>`; settled by reading that task's marker line against its `### Task Tests` section. Widen every `B1-B15` range to `B1-B16` in the checklist's `## Evidence rule` and `## Advisory (NOTES)` lines and in the four skills listed under `### Files` (Grep `B1-B15`).
5. Add two `## Advisory (NOTES)` items: a `TDD: none` task that bundles more than one behaviour or touches many files; a `### Task Tests` or `#### Tests` line whose command or file path names the integration or e2e command or directory the host's memory files document.
6. Extend `## Author self-check` with the one-test-file bullet: every `TDD: required` task carries exactly one `### Task Tests` file line, and every `TDD: none` task carries the section with its file lines or `none - <reason>`.
7. In `adr-task.md` `## Task block`, add a `### Task Tests` section holding the single line `- none - documentation only` between `### Test Commands` and `### Approach`.

### Failure modes
- none - markdown

### Contracts
- none

### DoD
The checklist carries B6 as rewritten, B16, the two advisory items and the renamed self-check; no `B1-B15` range remains under `superdev/`; the ADR task template carries `### Task Tests`; the greps and the lint exit as listed; the test suite is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - Scope the integration and e2e gate to final and re-review in the review contract
- TDD: none
- Model: opus
- Effort: high
- Covers: `E2e tylko w final` (#6), `Integracyjne tylko w final` (#16)

### Dependencies
- `Rename TDD Commands to Task Tests and tighten task sizing in both planners` (Task 1) - blocks: the `### Task Tests` name the contract's never-a-gate paragraph names

### Files
- modify - superdev/references/review-contract.md (stack-agnostic section list, `## Report skeleton`, `## Gates`)

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- grep -c '### Task Tests' superdev/references/review-contract.md - prints `2` or more
- ! grep -q 'TDD Commands' superdev/references/review-contract.md - exits 0
- grep -c 'deferred to final' superdev/references/review-contract.md - prints `2` or more

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below.
2. Rename `### TDD Commands` to `### Task Tests` in the contract's opening section list and rewrite the never-a-gate paragraph of `## Gates`: `### Task Tests` belongs to the implementor writing that task (its TDD cycle and its end-of-task run), no stage collects it, and a command appearing there and nowhere else runs at no stage of a review.
3. In the `## Gates` command list, scope the third bullet: the host's integration or e2e command, when the plan or the host's memory files document one, on `stage: final` and `stage: re-review` only; a checkpoint never runs it. Add the matching rule bullet under `Rules:`: on `stage: checkpoint` the gates section carries the single sentence `integration and e2e deferred to final` in place of that command's line, the existing re-run rule on `stage: re-review` stands, and the `no e2e or integration suite in this host` sentence applies on `final` and `re-review` alone.
4. In `## Report skeleton`, extend the gates bullet with that checkpoint sentence as a third fixed single-sentence case next to the no-suite sentence and the unbounded-review sentence.

### Failure modes
- when the stage is `checkpoint` and the host documents an integration or e2e command -> response that command does not run and the gates section carries `integration and e2e deferred to final`, log that sentence in the report's gates section, test none - contract text read by the reviewer at run time.

### Contracts
- Gate stage rule: the integration or e2e command is a gate on `stage: final` and `stage: re-review` only; the checkpoint gates section carries `integration and e2e deferred to final`; consumed by `Sync README and root CLAUDE.md with the direct-run implementors` (Task 7).

### DoD
`## Gates` names `### Task Tests` as never a gate, scopes the integration or e2e command to `final` and `re-review`, and carries the checkpoint deferral rule; `## Report skeleton` lists the deferral sentence; the greps exit as listed; the test suite is green.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - Drop the runner label from both build orchestrators
- TDD: none
- Model: sonnet
- Effort: low
- Covers: `Brak runner` (#4)

### Dependencies
- `Run task tests directly in both task implementors and record runs in the notes` (Task 4) - blocks: the implementor input set without `runner`

### Files
- modify - superdev/skills/superbuild/SKILL.md (`<refs>` derivation line, implementor dispatch lines)
- modify - superdev/skills/simplebuild/SKILL.md (`<refs>` derivation line, implementor dispatch lines)

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- ! grep -q 'runner' superdev/skills/superbuild/SKILL.md - exits 0
- ! grep -q 'runner' superdev/skills/simplebuild/SKILL.md - exits 0
- grep -c 'task-implementor.*refs: <refs>' superdev/skills/superbuild/SKILL.md - prints `3`
- grep -c 'task-implementor.*refs: <refs>' superdev/skills/simplebuild/SKILL.md - prints `2`
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild - exits 0
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simplebuild - exits 0

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below.
2. In both orchestrators, cut the two `<runner>` sentences from the line that derives `<refs>` (the `printf` of `run.sh` and the "an implementor handed no `runner`" sentence), leaving the `<refs>` derivation intact.
3. Remove `runner: <runner>, ` from every implementor dispatch line: the task dispatch and the fix dispatch in both, plus the re-dispatch after a task-reviewer `FAIL` in `superbuild`. The reviewer-fork dispatches and the task-reviewer dispatch stay untouched.

### Failure modes
- none - markdown

### Contracts
- none

### DoD
No `runner` token remains in either orchestrator, every implementor dispatch still carries `refs: <refs>`, the reviewer dispatches are unchanged; the greps and the lint exit as listed; the test suite is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - Check the implementor's recorded runs in the per-task reviewer
- TDD: none
- Model: opus
- Effort: medium
- Covers: `Reviewer sprawdza Runs` (#11)

### Dependencies
- `Run task tests directly in both task implementors and record runs in the notes` (Task 4) - blocks: the `## Runs` line shape this check reads

### Files
- modify - superdev/agents/superbuild-task-reviewer.md (`## Input`, `## Check`)

### Test Commands

#### Tests
- grep -c 'Runs recorded' superdev/agents/superbuild-task-reviewer.md - prints `1`
- ! grep -Eq 'run\.sh|superdev:executor' superdev/agents/superbuild-task-reviewer.md - exits 0
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-reviewer.md - exits 0

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below.
2. `## Input`, the `task` bullet: add `Task Tests` to the plan-task shape; the `notes` bullet: say the file also carries the implementor's `## Runs` section, one line per build command and per `### Task Tests` line, in the shape `- <command verbatim> -> <summary line | exit <n>>`.
3. `## Check`: add the bullet `Runs recorded (when notes is set)`: the notes carry a `## Runs` section with one line for the task's `#### Build` command and one for every `### Task Tests` file line (a section reading `none - <reason>` needs the build line only); a missing section or a missing line is an Important finding. State in the same bullet that this reviewer runs nothing itself: no build, no test, `Bash` stays for `git status --short`.

### Failure modes
- when `notes` is not set -> response the runs check is skipped and no finding is raised for it, log none, test none - agent text.

### Contracts
- none

### DoD
The reviewer's `## Check` carries the runs bullet with its Important severity and the no-run sentence, its `## Input` describes `## Runs`; the greps and the lint exit as listed; the test suite is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - Sync README and root CLAUDE.md with the direct-run implementors
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Executor tylko u reviewerów` (#5), `Dokumentacja` (#12), `Skrypty nietknięte` (#13), `Lint` (#14)

### Dependencies
- `Scope the integration and e2e gate to final and re-review in the review contract` (Task 3) - blocks: the gate stage rule the docs describe
- `Drop the runner label from both build orchestrators` (Task 5) - blocks: every source change the docs describe is in place

### Files
- modify - superdev/README.md (`executor` row, `superdev:simplebuild-task-implementor` row, `superdev:superbuild-task-implementor` row, `superplan` row, `simpleplan` row)
- modify - CLAUDE.md (superdev bullet, the "Both task implementors and the three build reviewers" sentence)

### Test Commands

#### Tests
- grep -rl 'superdev:executor' superdev/ | sort - prints exactly `superdev/references/review-contract.md`, `superdev/skills/executor/scripts/run.sh`, `superdev/skills/simplebuild-reviewer/SKILL.md`, `superdev/skills/superbuild-reviewer-change/SKILL.md`, `superdev/skills/superbuild-reviewer-spec/SKILL.md`
- ! grep -rq 'TDD Commands' superdev/ CLAUDE.md - exits 0
- grep -c 'Task Tests' superdev/README.md - prints a count of at least `1`
- grep -c 'Task Tests' CLAUDE.md - prints a count of at least `1`
- git status --short superdev/skills/executor superdev/skills/tdd superdev/scripts/decompose.sh - prints nothing

### Approach
1. In `superdev/README.md`, spelling the fork as `executor` and never `superdev:executor` anywhere in the file, rewrite the `executor` row's last sentence: the three build reviewers call `run.sh` directly for every gate command first and dispatch `executor` in analysis mode only on `RESULT: DEVIATION`; the two task implementors never use it, they run the task's `#### Build` and `### Task Tests` lines directly and read the output themselves.
2. Rewrite both implementor rows: each runs the task's build and its `### Task Tests` lines directly with `Bash` (up to 5 rounds), never the full suite, and records every run under `## Runs` in its notes; the super row keeps the test-first sentence.
3. Extend the `superplan` and `simpleplan` rows with one clause: every task carries `### Task Tests`, one command per test file, and a `TDD: required` task owns exactly one test file.
4. In root `CLAUDE.md`, rewrite the sentence beginning "Both task implementors and the three build reviewers run build, test, lint and type-check commands through a direct `run.sh` Bash call first" so it names the three build reviewers alone as the `run.sh` and `executor` callers, adds that both task implementors run the task's `#### Build` and `### Task Tests` lines directly with `Bash` and read the output themselves, never the full suite and never the executor, records the `## Runs` notes section the per-task reviewer checks, and states that the host's integration or e2e command is a gate at the final review and its re-review only, the checkpoint deferring it.

### Failure modes
- none - markdown

### Contracts
- none

### DoD
The README rows and the root `CLAUDE.md` invariant describe the three reviewers as the only `run.sh` and executor callers and the implementors as direct runners; `superdev:executor` appears as a work step only in the three fork reviewers and the contract (the run.sh header and the executor skill are descriptive); `run.sh`, `executor/SKILL.md`, `tdd/SKILL.md` and `decompose.sh` show no change; the greps exit as listed; the test suite is green.

<!-- /TASK -->

---

<!-- repeat Task <N> per unit of work; leave intact all comment markers; keep tasks small, independently testable, and builder-executable unattended (no interactive human step) -->
