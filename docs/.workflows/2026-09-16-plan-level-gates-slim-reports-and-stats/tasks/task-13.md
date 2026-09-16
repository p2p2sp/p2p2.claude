
## Task 13 - Retune simplebuild for fix strength and stats events
- TDD: none
- Model: opus
- Effort: medium
- Covers: `Siła fix z planu` (#12), `Zdarzenie jednym wywołaniem` (#18), `Raport po CloseOut` (#21)

### Dependencies
- `Retune superbuild for review strength, fix strength and stats events` (Task 12) - blocks: the wording of the stats and dispatch-strength paragraphs this file mirrors

### Files
- modify - superdev/skills/simplebuild/SKILL.md (`## Mandatory rules`, `## Config`, `## Step 1 - Decompose Plan`, `### Fix loop`, `## Step 5 - Done`)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simplebuild - exits 0

#### Tests
- grep -c 'stats-record.sh' superdev/skills/simplebuild/SKILL.md - prints at least `1`
- grep -c 'stats-report.sh' superdev/skills/simplebuild/SKILL.md - prints at least `1`
- grep -c 'Dispatch strength' superdev/skills/simplebuild/SKILL.md - prints at least `1`
- grep -c '<review>' superdev/skills/simplebuild/SKILL.md - prints at least `1`
- ! grep -q 'debt.md' superdev/skills/simplebuild/SKILL.md - exits 0

### Task Tests
- none - orchestrator skill text only, no test file changes

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below, mirroring Task 12's wording wherever the two orchestrators already read alike.
2. In `## Step 1`, describe the index row with its fifth `<review>` column, state that this track has no per-task reviewer so the column is ignored here, and drop `debt.md` from the paragraph listing what `implementation/` holds; in `## Mandatory rules`, drop `debt.md` there too and add the pointer to the contract's `## Dispatch strength`.
3. In `### Fix loop` step 1, replace "no `model:` / `effort:` parameters" with the contract's checkpoint-and-final rule: the highest `<model>` and highest `<effort>` among the tasks whose `### Files` names a file a finding points at, and no parameter when no task matches.
4. In `## Config`, add `stats` to the gating switches and the same `### Stats` subsection as Task 12, then add the event calls this track has: `start` / `resume` after decomposition, one per awaited `Agent` completion (implementor, close-out writer) with the notification's figures and the returned verdict, one per `Skill` fork return with `-` for the usage fields, one per `commit-task.sh` run and one per escalation with its note.
5. In `## Step 5`, run `stats-report.sh <workdir>` as step 1 when `stats: true`, before `cleanup-run.sh`, and relay its `stats:` line verbatim in the summary.

### Failure modes
- when `stats` does not read exactly `true` -> response make no `stats-record.sh` and no `stats-report.sh` call at all, log nothing, test manual
- when a `stats-record.sh` or `stats-report.sh` call exits non-zero -> response note it in the Step 5 summary and carry on, never retry and never escalate, log the summary line, test manual

### Contracts
- none

### DoD
`simplebuild` ignores the `<review>` column explicitly, applies the contract's fix-strength rule, records every documented event through `stats-record.sh` when `stats: true`, renders the report before cleanup, mentions no `debt.md`, and its lint exits 0.


### Covered criteria
12. Siła fix z planu - oba orkiestratory dispatchują implementatora w trybie fix po recenzji zadania z `Model:` / `Effort:` tego zadania; w rundzie fix po checkpoincie lub final z najwyższymi `Model:` / `Effort:` spośród zadań, których `### Files` pokrywa plik nazwany w findingach, a gdy żaden finding nie nazywa pliku zadeklarowanego przez jakieś zadanie, bez parametrów (frontmatter agenta).
18. Zdarzenie jednym wywołaniem - `superdev/scripts/stats-record.sh` dopisuje jedną linię TSV ze znacznikiem czasu nadanym przez skrypt do `.temp/superdev/stats/<run>.events` (tworząc katalog i plik), przyjmuje rodzaj i etykietę oraz opcjonalnie model, effort, tokeny, tool_uses, duration_ms, werdykt i notkę, wypisuje jedną linię `stats: <path> -> <kind> <label>` i ma test w `tests/superdev/`; oba orkiestratory przy `stats: true` wołają go raz ze zdarzeniem `start` po dekompozycji (lub `resume` przy wznowieniu), raz po każdym powiadomieniu o zakończeniu dispatchu `Agent` (implementator, per-task reviewer, writer) z wartościami przepisanymi z powiadomienia, raz po każdym forku `Skill` tylko z rodzajem, etykietą i werdyktem, raz po każdym `commit-task.sh` i raz po każdej eskalacji z notką; przy `stats: false` nie wołają go wcale.
21. Raport po CloseOut - oba orkiestratory wołają `stats-report.sh` w Kroku 5 po commicie CloseOut i przed `cleanup-run.sh`, wyłącznie przy `stats: true`, i podają jego linię `stats:` w podsumowaniu Kroku 5.
