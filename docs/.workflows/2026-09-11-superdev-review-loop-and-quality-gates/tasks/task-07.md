
## Task 7 - feat(agents): task reviewer failure pass and plan-defect rule
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #4, #5

### Dependencies
- 1, 6 - blocks: 12

### Files
- modify - superdev/agents/superbuild-task-reviewer.md (`## Input` task shape, `## Check`, new `## Failure pass`, `## Calibration`, `## Output format`)

### Test Commands
#### Build
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-reviewer.md` - expected: last line `FAIL=0 WARN=<n>`, exit 0

#### Tests
- `grep -n '## Failure pass' superdev/agents/superbuild-task-reviewer.md` - expected: one hit
- `grep -n 'C<n>' superdev/agents/superbuild-task-reviewer.md` - expected: at least one hit (IDs in the report)
- `grep -n 'Failure modes' superdev/agents/superbuild-task-reviewer.md` - expected: at least two hits (input shape and plan-defect rule)
- `! grep -n 'Edge cases' superdev/agents/superbuild-task-reviewer.md` - expected: no output, exit 0
- `grep -n 'plan defect' superdev/agents/superbuild-task-reviewer.md` - expected: one hit

### Approach
1. Through `supercc:skill-designer`, rename `Edge cases` to `Failure modes` in the `## Input` task shape and in `## Check`, and add `CARRY:` awareness: a `CARRY:` line in `notes` (shape from Task 1 `## Notes line formats`) is not an unrecorded deviation.
2. Add `## Failure pass` after `## Check`, run on the task's diff: (a) every new `catch`, fallback or default-on-error branch: what the caller receives and what is logged, both must match a `### Failure modes` entry or be an obvious bug; (b) every new member of a closed set (enum, variant, status, kind): Grep the repo for the type name and confirm every switch/map/consumer handles it; (c) every changed response mechanism: the methods and status codes match the task's `### Contracts` matrix; (d) every header, path segment, query or form value that enters a path, query, command or routing decision: a validation exists; (e) every new test: it fails without the change (an assertion on a constant, a fixture equal to the expectation, or a throttle test with no throttled call is a finding). A failed point is a Critical (a, b, d when reachable from outside; e when the test guards a criterion) or Important (the rest) in the report.
3. Add to `## Calibration` the rule from Task 1 `## Verdict rules`: a behaviour recorded under the task's `### Failure modes` is a decision; disagreement is a `NOTE: plan defect - <what>` line in the report, never a Critical or Important.
4. Rewrite `## Output format` so the FAIL report uses Task 1 `## Report skeleton` (title `# task review - <report basename>`, `## Findings` with `### Critical` / `### Important` bullets carrying `C<n>` / `I<n>` IDs, `## Notes`, `## Assessment` with the bare `VERDICT: FAIL` line; `## Gates`, `## Prior findings` and `## Debt` omitted - this gate has no Minor and no prior); the return channel stays `VERDICT: PASS` alone or `VERDICT: FAIL` + `REVIEW: <path>`; a PASS with plan-defect notes still returns the single `VERDICT: PASS` line and writes the notes to the report path.
5. Keep the agent under 85 lines; lint with `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-reviewer.md` (expected: `FAIL=0`).

### Edge cases
- A task with `### Failure modes` equal to `none - <reason>`: the failure pass still runs on the diff; any new failure branch found is Important (it was not planned).
- A findings-list task (fix mode): the failure pass runs on the fix diff only.

### Contracts
- Consumes Task 1 `## Notes line formats` (`CARRY:`) and `## Verdict rules` (plan-defect NOTE); consumes Task 6 section names.

### DoD
The agent file carries the five failure-pass points, the plan-defect rule and the `Failure modes` names; greps hold; portability sweep green.


### Covered criteria
4. `agents/superbuild-task-reviewer.md` ma sekcję „failure pass” wykonywaną na diffie zadania: każda nowa gałąź `catch`/fallback (co wraca, co się loguje), każdy nowy wariant zamkniętego zbioru (grep po konsumentach), każda zmiana mechanizmu odpowiedzi (metody i kody), każda wartość z nagłówka lub parametru wchodząca w ścieżkę, zapytanie lub polecenie (walidacja), każdy nowy test (czy może paść); niespełnienie dowolnego punktu to znalezisko Critical lub Important w raporcie zadania.
5. Recenzent zadania i recenzenci buildu mają regułę: zachowanie zapisane w `### Failure modes` zadania to decyzja, a niezgoda z nim to `NOTE: plan defect` w raporcie, nigdy Critical ani Important.
