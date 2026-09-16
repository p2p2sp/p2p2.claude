
## Task 1 - Move the gate into the plan header and rename the per-task section to Task Checks
- TDD: none
- Model: opus
- Effort: high
- Covers: `Gate commands w nagłówku` (#1), `Task Checks na zadaniu` (#2), `Marker Review` (#8)

### Dependencies
- none

### Files
- modify - superdev/skills/superplan/templates/plan.md (`### Test Commands`, `### Task Tests`, preamble)
- modify - superdev/skills/simpleplan/templates/plan.md (`### Test Commands`, `### Task Tests`, `<!-- /HEADER -->`)
- modify - superdev/references/adr-task.md (`## Task block`)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan - exits 0

#### Tests
- grep -c '^## Gate commands' superdev/skills/superplan/templates/plan.md - prints `1`
- grep -c '^## Gate commands' superdev/skills/simpleplan/templates/plan.md - prints `1`
- grep -c '^#### Integration' superdev/skills/superplan/templates/plan.md - prints `1`
- grep -c '^### Task Checks' superdev/skills/superplan/templates/plan.md - prints `1`
- grep -c '^### Task Checks' superdev/skills/simpleplan/templates/plan.md - prints `1`
- grep -c '^### Task Checks' superdev/references/adr-task.md - prints `1`
- grep -c 'Review:' superdev/skills/superplan/templates/plan.md - prints at least `1`
- ! grep -Eq 'Test Commands|Task Tests' superdev/skills/superplan/templates/plan.md superdev/skills/simpleplan/templates/plan.md superdev/references/adr-task.md - exits 0
- ! grep -q 'Review:' superdev/skills/simpleplan/templates/plan.md - exits 0
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan - exits 0

### Task Tests
- none - templates and a reference file, no test file changes

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below; it owns the editing discipline for skill, agent, template and reference files.
2. In `superdev/skills/superplan/templates/plan.md`, insert a `## Gate commands` block between the preamble (`Plan:` line) and the `---` that precedes the first `<!-- TASK -->`: an intro annotation naming it the whole build's gate, then the three fixed subsections `#### Build`, `#### Tests`, `#### Integration`, each carrying `- <command>` lines or the single line `none - <reason>`, with an annotation saying the planner fills each subsection's scope from the host's memory and from what the plan moves, and that a build runs only where the planner judges it proof.
3. In the same file, delete `### Test Commands` with both its `#### Build` and `#### Tests` blocks, rename `### Task Tests` to `### Task Checks`, and rewrite that section's annotation: present on every task whatever `TDD:` says; one line per check the implementor runs as this task's own proof; a line that runs a test file this task declares under `### Files` opens with that path, then ` - `, then the command that runs only that file; every other check (a compile or type-check, a lint, a grep, any other proof) is the bare command on its own line; nothing to run is the single line `none - <reason>`; every command is literal and runnable as written, carries the narrowest scope the host's runner offers, and only a check that finishes in seconds without connecting to a process or service outside the application belongs here.
4. In the same file, add the optional marker line `- Review: <model> <effort>` below `- Effort:`, annotated as optional on any task, the same allowed value sets as `Model:` and `Effort:`, and absent meaning the per-task reviewer's own frontmatter default.
5. Apply steps 2 and 3 to `superdev/skills/simpleplan/templates/plan.md`, placing `## Gate commands` after `<!-- /HEADER -->` and before the `---` that precedes the first `<!-- TASK -->`, and adding NO `Review:` marker - the Simple track has no per-task reviewer. In `superdev/references/adr-task.md`'s `## Task block`, replace `### Test Commands` (with its two blocks) and `### Task Tests` by one `### Task Checks` section carrying one bare-command line per `<slug>` that proves the ADR file exists, and update the `## Fill rules` marker-order bullet only if it names a removed section.

### Failure modes
- none - templates

### Contracts
- `## Gate commands` block: sits above the first `<!-- TASK -->` in both plan templates, three fixed subsections `#### Build`, `#### Tests`, `#### Integration`, each holding command lines or the single line `none - <reason>`; consumed by `Give both planners judgment criteria for the gate, the task checks and the build strength` (Task 2), `Cut the plan review checklist classes at judgment instead of commands` (Task 3), `Rewrite the review contract for plan-level gates, slim reports and dispatch strength` (Task 4), `Point the three build reviewer forks at the plan-level gate and drop the debt file` (Task 7).
- `### Task Checks` section: present on every plan task; a test-file line opens with a path declared under that task's `### Files` followed by ` - ` and the command, every other line is a bare command, and the empty form is `none - <reason>`; consumed by `Give both planners judgment criteria for the gate, the task checks and the build strength` (Task 2), `Cut the plan review checklist classes at judgment instead of commands` (Task 3), `Rewrite the review contract for plan-level gates, slim reports and dispatch strength` (Task 4), `Run only the task checks in both task implementors and keep the notes lean` (Task 5), `Retune the per-task reviewer strength, its runs check and its notes-only path` (Task 6).
- `Review: <model> <effort>` marker: optional, superplan template only, value sets `sonnet`|`opus` and `low`|`medium`|`high`|`xhigh`, absent meaning the reviewer agent's frontmatter; consumed by `Give both planners judgment criteria for the gate, the task checks and the build strength` (Task 2), `Cut the plan review checklist classes at judgment instead of commands` (Task 3), `Print the Review marker as a decompose index column` (Task 8), `Retune superbuild for review strength, fix strength and stats events` (Task 12).

### DoD
Both templates carry `## Gate commands` above their first task block and `### Task Checks` on the task block, neither carries `### Test Commands` or `### Task Tests`, the superplan template alone carries the optional `Review:` marker, the ADR task block carries `### Task Checks`, the greps and the two lints exit as listed.


### Covered criteria
1. Gate commands w nagłówku - oba szablony planu niosą w nagłówku (przed pierwszym `<!-- TASK -->`) blok `## Gate commands` z podsekcjami `#### Build`, `#### Tests`, `#### Integration`, każda wypełniona komendami hosta w zakresie, jaki planista uzna, albo jedyną linią `none - <powód>`; sekcja `### Test Commands` nie występuje w żadnym szablonie, planiście, checklistcie, agencie ani kontrakcie w `superdev/`.
2. Task Checks na zadaniu - oba szablony planu i szablon zadania ADR (`superdev/references/adr-task.md`) niosą na każdym zadaniu sekcję `### Task Checks` (jedna linia per komenda, którą implementator uruchamia jako dowód tego zadania: plik testowy, type-check, lint, grep lub inna; albo jedyna linia `none - <powód>`), nazwa `Task Tests` nie występuje w `superdev/` ani w root `CLAUDE.md`, a linia z plikiem testowym nadal nazywa plik zadeklarowany pod `### Files` tego zadania.
8. Marker Review - szablon `superplan` niesie na zadaniu opcjonalny marker `Review: <model> <effort>` (te same dozwolone zbiory co `Model:` / `Effort:`), reguła planisty `superplan` mówi, kiedy go ustawić (recenzja to czytanie diffu, inne obciążenie niż projektowanie); szablon `simpleplan` go nie niesie, a `simplebuild` go ignoruje.
