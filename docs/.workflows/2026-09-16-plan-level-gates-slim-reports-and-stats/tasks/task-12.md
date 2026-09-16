
## Task 12 - Retune superbuild for review strength, fix strength and stats events
- TDD: none
- Model: opus
- Effort: high
- Covers: `Siła recenzji z planu` (#11), `Siła fix z planu` (#12), `Zdarzenie jednym wywołaniem` (#18), `Raport po CloseOut` (#21)

### Dependencies
- `Rewrite the review contract for plan-level gates, slim reports and dispatch strength` (Task 4) - blocks: the `## Dispatch strength` rules this orchestrator applies
- `Print the Review marker as a decompose index column` (Task 8) - blocks: the index column it reads
- `Add the stats config switch` (Task 9) - blocks: the `stats:` line it gates on
- `Add stats-record.sh, the one-call event append` (Task 10) - blocks: the event call
- `Add stats-report.sh and its fixed report template` (Task 11) - blocks: the Step 5 render call

### Files
- modify - superdev/skills/superbuild/SKILL.md (`## Mandatory rules`, `## Config`, `## Step 1 - Decompose Plan`, `### Loop`, `### Fix loop`, `## Step 3 - Final Review`, `## Step 5 - Done`)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild - exits 0

#### Tests
- grep -c 'stats-record.sh' superdev/skills/superbuild/SKILL.md - prints at least `1`
- grep -c 'stats-report.sh' superdev/skills/superbuild/SKILL.md - prints at least `1`
- grep -c '<review>' superdev/skills/superbuild/SKILL.md - prints at least `1`
- grep -c 'Dispatch strength' superdev/skills/superbuild/SKILL.md - prints at least `1`
- ! grep -q 'debt.md' superdev/skills/superbuild/SKILL.md - exits 0

### Task Tests
- none - orchestrator skill text only, no test file changes

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below.
2. In `## Step 1`, describe the index row with its fifth `<review>` column and drop `debt.md` from the paragraph listing what `implementation/` holds; in `## Mandatory rules`, drop `debt.md` from the list of files the orchestrator never writes and add that `${CLAUDE_PLUGIN_ROOT}/references/review-contract.md`'s `## Dispatch strength` decides every `model:` / `effort:` parameter this skill passes.
3. In `### Loop` step 3, dispatch `superbuild-task-reviewer` at the task's `<review>` column - split into `model:` and `effort:` - and with `-` in that column pass neither parameter. In `### Loop` step 3's FAIL branch and in `### Fix loop` step 1, replace "no `model:` / `effort:` parameters" with the contract's rule: a fix after a task review runs at that task's own `<model>` / `<effort>`; a fix after a checkpoint or final round runs at the highest `<model>` and highest `<effort>` among the tasks whose `### Files` names a file a finding points at, read from the report and the task files, and at no parameter when no task matches.
4. In `## Config`, add `stats` to the switches listed as gating this skill, and add one `### Stats` subsection stating that every call below runs only when `stats` reads exactly `true`, that each is one `bash "${CLAUDE_PLUGIN_ROOT}/scripts/stats-record.sh" <workdir> <kind> <label> ...` Bash call with every value copied from the harness notification and none computed, and that a failed stats call is noted and never blocks the build.
5. Add the calls themselves: one `start` (or `resume` on a resumed build) event after decomposition; one event after every awaited `Agent` completion (implementor, task reviewer, close-out writer) carrying its model, effort, `subagent_tokens`, `tool_uses` and `duration_ms` from the notification plus the returned verdict; one event after every `Skill` fork return carrying kind, label and verdict with `-` for the usage fields; one after every `commit-task.sh` run; and one per escalation, its note naming the interruption and the user's answer, with the same note field used for a `FAIL` with its `REASON:`, a `BLOCKED`, a re-dispatch, an undeclared working-tree change, an agent that returned no report and a session limit. In `## Step 5`, run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/stats-report.sh" <workdir>` as step 1 when `stats: true`, before `cleanup-run.sh`, and relay its `stats:` line verbatim in the summary.

### Failure modes
- when `stats` does not read exactly `true` -> response make no `stats-record.sh` and no `stats-report.sh` call at all, log nothing, test manual
- when a `stats-record.sh` or `stats-report.sh` call exits non-zero -> response note it in the Step 5 summary and carry on, never retry and never escalate, log the summary line, test manual
- when an `Agent` notification carries no usage figures -> response pass `-` in those positions rather than computing anything, log nothing, test manual

### Contracts
- none

### DoD
`superbuild` reads the `<review>` column and dispatches the task reviewer at it, applies the contract's dispatch-strength rules in both fix branches, records every documented event through `stats-record.sh` when `stats: true`, renders the report before cleanup, mentions no `debt.md`, and its lint exits 0.


### Covered criteria
11. Siła recenzji z planu - `superbuild` dispatchuje per-task reviewera z `Review:` zadania, a bez markera bez parametrów `model` / `effort`; frontmatter agenta `superbuild-task-reviewer` brzmi `model: sonnet`, `effort: high`.
12. Siła fix z planu - oba orkiestratory dispatchują implementatora w trybie fix po recenzji zadania z `Model:` / `Effort:` tego zadania; w rundzie fix po checkpoincie lub final z najwyższymi `Model:` / `Effort:` spośród zadań, których `### Files` pokrywa plik nazwany w findingach, a gdy żaden finding nie nazywa pliku zadeklarowanego przez jakieś zadanie, bez parametrów (frontmatter agenta).
18. Zdarzenie jednym wywołaniem - `superdev/scripts/stats-record.sh` dopisuje jedną linię TSV ze znacznikiem czasu nadanym przez skrypt do `.temp/superdev/stats/<run>.events` (tworząc katalog i plik), przyjmuje rodzaj i etykietę oraz opcjonalnie model, effort, tokeny, tool_uses, duration_ms, werdykt i notkę, wypisuje jedną linię `stats: <path> -> <kind> <label>` i ma test w `tests/superdev/`; oba orkiestratory przy `stats: true` wołają go raz ze zdarzeniem `start` po dekompozycji (lub `resume` przy wznowieniu), raz po każdym powiadomieniu o zakończeniu dispatchu `Agent` (implementator, per-task reviewer, writer) z wartościami przepisanymi z powiadomienia, raz po każdym forku `Skill` tylko z rodzajem, etykietą i werdyktem, raz po każdym `commit-task.sh` i raz po każdej eskalacji z notką; przy `stats: false` nie wołają go wcale.
21. Raport po CloseOut - oba orkiestratory wołają `stats-report.sh` w Kroku 5 po commicie CloseOut i przed `cleanup-run.sh`, wyłącznie przy `stats: true`, i podają jego linię `stats:` w podsumowaniu Kroku 5.
