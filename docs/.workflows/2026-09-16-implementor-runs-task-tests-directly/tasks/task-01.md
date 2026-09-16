
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


### Covered criteria
7. Task Tests na każdym zadaniu - oba szablony planu i obie reguły planistów wymagają sekcji `### Task Tests` na każdym zadaniu niezależnie od markera `TDD:` (jedna linia per plik testowy, jaki zadanie pisze lub zmienia, z komendą uruchamiającą tylko ten plik lub najwęższy zakres, jaki runner hosta ma; zadanie, które nie pisze ani nie zmienia żadnego pliku testowego, niesie jedyną linię `none - <powód>`, tak jak `### Failure modes`), szablon zadania ADR `superdev/references/adr-task.md` niesie tę sekcję z linią `none`, a nazwa `TDD Commands` nie występuje w `superdev/`.
9. Rozmiar doradczy - reguła rozmiaru w obu planistach każe zadaniu `TDD: none` celować w jedno zachowanie i kilka plików, a checklista niesie to jako punkt doradczy (nie blokujący).
15. Tylko testy w pamięci - obie reguły planistów mówią, że `### Task Tests` i cykl TDD obejmują wyłącznie testy biegnące szybko w pamięci, a test, w którym bierze udział zewnętrzna zależność aplikacji (proces lub usługa, z którą aplikacja się łączy: baza danych, sieć, przeglądarka i podobne, wymienione jako przykłady), jest integracyjny lub e2e i nie trafia do `### Task Tests` ani do `#### Tests` w `### Test Commands`; o tym, który suite hosta jest szybkim suite w pamięci, rozstrzyga pamięć hosta (`CLAUDE.md`, `.claude/rules/`), a lista przykładów w regule planisty nigdy jej nie nadpisuje.
