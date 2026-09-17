
## Task 5 - Judge every implementor decision at the per-task gate
- TDD: none
- Model: opus
- Effort: medium
- Covers: `Ustalona wartość nie jest decyzją` (#9), `Zła decyzja jest znaleziskiem` (#10), `Decyzja należąca do planu jest zastrzeżeniem` (#11)

### Dependencies
- `Define the two decision lines, the implementor stop and the final decisions listing in the review contract` (Task 1) - blocks: the line shapes this gate reads
- `Set the planner rules that keep endpoint contracts, user-visible text, mid-operation failures and whole-repository commands where they belong` (Task 4) - blocks: the checklist classes B18-B20 step (c) cites

### Files
- modify - superdev/agents/superbuild-task-reviewer.md (`## Input` notes bullet, `## Check`, `## Calibration`)

### Task Checks
- grep -n "UNDERSPECIFIED:" superdev/agents/superbuild-task-reviewer.md
- grep -n "DECISION:" superdev/agents/superbuild-task-reviewer.md

### Approach
1. In `## Input`, extend the `notes` bullet so it names `UNDERSPECIFIED:` and `DECISION:` lines beside `## Runs` and `CARRY:`, pointing at the contract's `## Notes line formats`.
2. In `## Check`, add the bullet `Decisions judged (when notes is set)` after `Notes honest`, with three ordered steps per `UNDERSPECIFIED:` line: (a) the value is pinned in the task text, its `### Contracts`, its `### Failure modes` or the plan header -> the line is a deviation from the plan, Important; (b) the value was open, and the decision departs from the pattern the repo already uses for that kind of value or from a criterion under `Covered criteria` -> Important, the `how to fix` naming the pattern or criterion the decision must follow; (c) the value was open and the decision holds, but the value is one the planning rules require the plan to carry (a new endpoint's request, response and status codes; user-visible text; the outcome of an infrastructure failure mid-operation - the checklist classes B18, B19, B20) -> one `NOTE: plan defect - <value> left to the implementor` line, never a finding. A `DECISION:` line in the notes of a task under review -> Important: the implementor was to stop, not to continue.
3. In `## Calibration`, add one sentence: an `UNDERSPECIFIED:` line that passes (a) and (b) is a decision the diff is judged against, like a `### Failure modes` entry.

### Failure modes
- none - agent prose

### Contracts
- none

### DoD
The per-task reviewer's `## Check` carries the three-step judgment with severities, the `DECISION:`-in-closed-task rule, and the notes input names both lines.


### Covered criteria
9. Ustalona wartość nie jest decyzją - Wartość, którą plan ustalił, a wykonawca zapisał jako własną decyzję, jest znaleziskiem recenzji zadania.
10. Zła decyzja jest znaleziskiem - Decyzja wykonawcy niezgodna z wzorcem w repozytorium lub z kryterium, które zadanie pokrywa, jest znaleziskiem recenzji zadania z konkretną poprawką.
11. Decyzja należąca do planu jest zastrzeżeniem - Decyzja wykonawcy o wartości, którą według reguł planowania plan powinien był ustalić, jest odnotowana jako zastrzeżenie do planu, nie jako znalezisko.
