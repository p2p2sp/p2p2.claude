
## Task 3 - Cut the plan review checklist classes at judgment instead of commands
- TDD: none
- Model: opus
- Effort: high
- Covers: `Klasa braku osądu` (#4), `B6 i B16 przecięte` (#5), `Doradcze pozostaje doradcze` (#6)

### Dependencies
- `Move the gate into the plan header and rename the per-task section to Task Checks` (Task 1) - blocks: the section names and line shapes the classes below judge

### Files
- modify - superdev/references/plan-review-checklist.md (`## Evidence rule`, `B2`, `B6`, `B16`, `## Blocking classes`, `## Advisory (NOTES)`, `## Author self-check`)
- modify - superdev/skills/superplan-reviewer/SKILL.md (`FINDINGS` bullet)
- modify - superdev/skills/simpleplan-reviewer/SKILL.md (`FINDINGS` bullet)
- modify - superdev/skills/superplan/SKILL.md (`### Self-Review` class range)
- modify - superdev/skills/simpleplan/SKILL.md (`### Self-Review` class range)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan-reviewer - exits 0

#### Tests
- grep -c '^- B17 - ' superdev/references/plan-review-checklist.md - prints `1`
- grep -c 'B1-B17' superdev/references/plan-review-checklist.md - prints at least `1`
- grep -c 'B1-B17' superdev/skills/superplan-reviewer/SKILL.md - prints `1`
- grep -c 'B1-B17' superdev/skills/simpleplan-reviewer/SKILL.md - prints `1`
- ! grep -rq 'B1-B16' superdev/references/plan-review-checklist.md superdev/skills/superplan-reviewer superdev/skills/simpleplan-reviewer superdev/skills/superplan superdev/skills/simpleplan - exits 0
- ! grep -Eq 'Test Commands|Task Tests' superdev/references/plan-review-checklist.md - exits 0
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan-reviewer - exits 0

### Task Tests
- none - checklist and reviewer text only, no test file changes

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below.
2. In `plan-review-checklist.md`, replace `### Test Commands` and `### Task Tests` by `## Gate commands` and `### Task Checks` in the stack-agnostic section list, add `Review:` to the marker list there, and widen `B2` to cover the header's `## Gate commands` subsections and the task's `### Task Checks` lines on the same terms it uses today.
3. Rewrite `B6` down to markers alone: `TDD:`, `Model:` and `Effort:` present on every task with values from their allowed sets, the optional `Review:` carrying values from those same sets when present (allowed on a task of either track, never required), and no `TDD: required` task on `Model: sonnet`. Move every `### Task Checks` presence and shape clause out of `B6`.
4. Add `B17 - Gate or check with no judgment`: a `none` line with no reason, or with a reason the task's own `### Files` or the host's memory files (`CLAUDE.md`, `.claude/rules/`) contradict, in `## Gate commands` and in `### Task Checks` alike; the same class also covers a task carrying no `### Task Checks` section at all and a test-file line whose path is not declared under that task's `### Files`. Settled by reading those sections against `### Files` and the memory files. Widen every `B1-B16` range to `B1-B17` in all four other files under `### Files` - both plan reviewers' `FINDINGS` bullets and both planners' `### Self-Review` opening line - as well as in this one.
5. Narrow `B16` to count only `### Task Checks` lines that open with a test file path (a build, lint or grep line never counts): a `TDD: required` task carries exactly one such line, and zero or two and more is B16. In `## Advisory (NOTES)`, keep the `Model:` / `Effort:` too-low item, extend it to `Review:`, add a plan that moves code with no command anywhere in `## Gate commands`, and rewrite the integration-or-e2e item against `### Task Checks` and `#### Integration`. Update `## Author self-check` to the same class boundaries, and Grep this file for every remaining `Test Commands` and `Task Tests` mention - `B13`'s list of places a test is described among them - renaming each to the section that replaced it.

### Failure modes
- none - checklist text

### Contracts
- none

### DoD
The checklist carries B17, a marker-only B6, a test-file-line-only B16, the extended B2 and the three advisory items; no `B1-B16` range and no `### Test Commands` / `### Task Tests` mention survives in it, in either plan reviewer or in either planner; the greps and the two lints exit as listed.


### Covered criteria
4. Klasa braku osądu - `superdev/references/plan-review-checklist.md` ma nową klasę blokującą: linia `none` bez powodu albo z powodem sprzecznym z `### Files` zadania lub z pamięcią hosta (`CLAUDE.md`, `.claude/rules/`), w `## Gate commands` i w `### Task Checks` jednakowo; B2 obejmuje komendy nagłówka i sekcji zadań; oba recenzenty planu wymieniają nowy zakres klas.
5. B6 i B16 przecięte - B6 sprawdza wyłącznie obecność i dozwolony zbiór markerów `TDD:`, `Model:`, `Effort:` oraz opcjonalnego `Review:` (dozwolony na zadaniu obu torów, nigdy wymagany; obecność `### Task Checks` przechodzi do klasy z kryterium 4); B16 liczy wyłącznie linie `### Task Checks` z plikiem testowym (linia buildu, lintu czy grepa nie wlicza się): zadanie `TDD: required` ma dokładnie jedną taką linię, a zero lub dwie i więcej to B16.
6. Doradcze pozostaje doradcze - checklista niesie jako punkty doradcze (nigdy blokujące): `Model:` / `Effort:` / `Review:` odczytane jako za niskie oraz plan ruszający kod bez ani jednej komendy w `## Gate commands`; reguła "recenzent weryfikuje tylko `Read` / `Grep` / `Glob`" zostaje.
