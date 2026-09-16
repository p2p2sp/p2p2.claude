
## Task 2 - Give both planners judgment criteria for the gate, the task checks and the build strength
- TDD: none
- Model: opus
- Effort: high
- Covers: `Kryteria zamiast reguły` (#3), `Rubryka siły jako wskazówka` (#7), `Marker Review` (#8)

### Dependencies
- `Move the gate into the plan header and rename the per-task section to Task Checks` (Task 1) - blocks: the section names, the line shapes and the `Review:` marker these rules describe

### Files
- modify - superdev/skills/superplan/SKILL.md (`**TDD Discipline**`, `**Build strength**`, `**Task Sizing**`, `### Self-Review`)
- modify - superdev/skills/simpleplan/SKILL.md (`**TDD Discipline**`, `**Build strength**`, `**Task Sizing**`, `### Self-Review`)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan - exits 0

#### Tests
- grep -c 'Gate commands' superdev/skills/superplan/SKILL.md - prints at least `1`
- grep -c 'Gate commands' superdev/skills/simpleplan/SKILL.md - prints at least `1`
- grep -c 'Review:' superdev/skills/superplan/SKILL.md - prints at least `1`
- ! grep -q 'Review:' superdev/skills/simpleplan/SKILL.md - exits 0
- ! grep -Eq 'Test Commands|Task Tests' superdev/skills/superplan/SKILL.md superdev/skills/simpleplan/SKILL.md - exits 0
- ! grep -q 'Undecided between two levels' superdev/skills/superplan/SKILL.md superdev/skills/simpleplan/SKILL.md - exits 0
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan - exits 0

### Task Tests
- none - skill text only, no test file changes

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below.
2. In both `SKILL.md`, add a `**Gate commands**` block describing the judgment for the header's three subsections: what the plan moves, which of the host's suites its memory files (`CLAUDE.md`, `.claude/rules/`) document as covering those files, proof against cost, the narrowest scope that still proves the change, and `none - <reason>` when a subsection has nothing to prove; state plainly that a build runs only where the planner judges it proof and that no rule mandates one.
3. In both `SKILL.md`, replace every `### Test Commands` / `### Task Tests` mention (in `**TDD Discipline**`, `**Task Sizing**` and `### Self-Review`) with `### Task Checks`, and state its criteria: only what the implementor runs as this task's own proof, the narrowest scope, finishing in seconds in memory, never a test connecting to a process or service outside the application, never the whole host suite, and a single test proving the task is enough; give one example in each direction (a documentation task whose only check is a grep; a task whose one test file drives its TDD cycle). Keep the TDD cycle bound to the `### Task Checks` line naming the test file being written.
4. In both `**Build strength**`, drop the sentences "Anything else, and every `TDD: required` task, is `Model: opus`" and "Undecided between two levels -> the higher one, for both markers; lost quality costs more than tokens", and rewrite the rubric as a reading of reasoning load: the planner runs on the strongest model available and judges how much reasoning the task itself demands, with examples in both directions (a text edit whose `Approach` fixes every word -> `sonnet` / `low`; a task owning an algorithm or a contract other tasks consume -> `opus` / `high`; a choice expensive to undo -> `xhigh`). Keep the `TDD: required` task off `Model: sonnet`.
5. In `superdev/skills/superplan/SKILL.md` alone, add the `Review:` rule: the per-task reviewer reads a finished diff rather than designing the change, so its load is usually lower than the implementor's; set the marker where that gap is real and leave it absent otherwise, in which case the reviewer agent's own frontmatter applies. Update both `### Self-Review` marker bullets to check `### Task Checks` presence and the `## Gate commands` block instead of the removed sections.

### Failure modes
- none - skill text

### Contracts
- none

### DoD
Both planners carry the gate-command criteria, the `### Task Checks` criteria with an example in each direction and a load-reading build-strength rubric with no "anything else is opus" and no "round up when in doubt" sentence; the superplan planner alone carries the `Review:` rule; the greps and the two lints exit as listed.


### Covered criteria
3. Kryteria zamiast reguły - reguły obu planistów dla `## Gate commands` i `### Task Checks` podają kryteria osądu (co zadanie rusza; który suite hosta wg jego pamięci pokrywa te pliki; dowód kontra koszt; najwęższy zakres; do `### Task Checks` trafia tylko test, który kończy się w sekundach i nie łączy się z procesem ani usługą poza aplikacją) z przykładem w obie strony, mówią wprost, że build biegnie tylko wtedy, gdy planista uzna go za dowód, a pojedynczy test dowodzący zadania wystarcza, i nie zawierają zdania nakazującego build lub suite na każdym zadaniu.
7. Rubryka siły jako wskazówka - reguły obu planistów dla `Model:` / `Effort:` nie zawierają zdań "wszystko inne to `opus`" ani "niezdecydowany -> wyżej", mówią planiście, że pracuje na najsilniejszym modelu i ocenia obciążenie rozumowaniem, i podają przykłady w obie strony (edycja tekstu z precyzyjnym `Approach` jako `sonnet` / `low`, własna decyzja algorytmiczna jako `opus` / `high`, nieodwracalny wybór jako `xhigh`).
8. Marker Review - szablon `superplan` niesie na zadaniu opcjonalny marker `Review: <model> <effort>` (te same dozwolone zbiory co `Model:` / `Effort:`), reguła planisty `superplan` mówi, kiedy go ustawić (recenzja to czytanie diffu, inne obciążenie niż projektowanie); szablon `simpleplan` go nie niesie, a `simplebuild` go ignoruje.
