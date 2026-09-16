
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


### Covered criteria
8. Jeden plik testowy przy TDD - `plan-review-checklist.md` ma klasę blokującą dla zadania `TDD: required` z więcej niż jedną linią w `### Task Tests`, klasa B6 obejmuje brak `### Task Tests` na dowolnym zadaniu i linię z plikiem spoza `### Files` tego zadania, a reguła rozmiaru w obu planistach mówi: zadanie `TDD: required` pisze dokładnie jeden plik testowy i tylko kod, który ten plik napędza.
9. Rozmiar doradczy - reguła rozmiaru w obu planistach każe zadaniu `TDD: none` celować w jedno zachowanie i kilka plików, a checklista niesie to jako punkt doradczy (nie blokujący).
16. Integracyjne tylko w final - test integracyjny lub e2e napisany przez zadanie biegnie wyłącznie przez komendę integracyjną / e2e hosta na `stage: final` i `stage: re-review`; implementator go nie uruchamia, a checklista planu flaguje doradczo linię `### Task Tests` lub `#### Tests` nazywającą udokumentowaną komendę albo katalog integracyjny / e2e hosta.
7. Task Tests na każdym zadaniu - oba szablony planu i obie reguły planistów wymagają sekcji `### Task Tests` na każdym zadaniu niezależnie od markera `TDD:` (jedna linia per plik testowy, jaki zadanie pisze lub zmienia, z komendą uruchamiającą tylko ten plik lub najwęższy zakres, jaki runner hosta ma; zadanie, które nie pisze ani nie zmienia żadnego pliku testowego, niesie jedyną linię `none - <powód>`, tak jak `### Failure modes`), szablon zadania ADR `superdev/references/adr-task.md` niesie tę sekcję z linią `none`, a nazwa `TDD Commands` nie występuje w `superdev/`.
