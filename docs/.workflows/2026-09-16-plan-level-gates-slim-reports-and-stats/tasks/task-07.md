
## Task 7 - Point the three build reviewer forks at the plan-level gate and drop the debt file
- TDD: none
- Model: opus
- Effort: medium
- Covers: `Gate z nagłówka na etapie` (#10), `Bez debt.md i bez recytacji` (#15)

### Dependencies
- `Rewrite the review contract for plan-level gates, slim reports and dispatch strength` (Task 4) - blocks: the gate stage mapping and the slim report shape these forks point at

### Files
- modify - superdev/skills/superbuild-reviewer-spec/SKILL.md (`## Input`, `## Gates`, `## Calibration`)
- modify - superdev/skills/superbuild-reviewer-change/SKILL.md (`## Input`, `## Gates`, `## Calibration`)
- modify - superdev/skills/simplebuild-reviewer/SKILL.md (`## Input`, `## Gates`, `## Calibration`)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild-reviewer-change - exits 0

#### Tests
- grep -c 'Gate commands' superdev/skills/superbuild-reviewer-spec/SKILL.md - prints at least `1`
- grep -c 'Gate commands' superdev/skills/superbuild-reviewer-change/SKILL.md - prints at least `1`
- grep -c 'Gate commands' superdev/skills/simplebuild-reviewer/SKILL.md - prints at least `1`
- ! grep -rq 'debt.md' superdev/skills/superbuild-reviewer-spec superdev/skills/superbuild-reviewer-change superdev/skills/simplebuild-reviewer - exits 0
- ! grep -rEq 'Test Commands|Task Tests' superdev/skills/superbuild-reviewer-spec superdev/skills/superbuild-reviewer-change superdev/skills/simplebuild-reviewer - exits 0
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild-reviewer-spec - exits 0
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simplebuild-reviewer - exits 0

### Task Tests
- none - fork skill text only, no test file changes

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below, and apply every step to all three fork files.
2. In each `## Gates` section, say that the gate commands come from the plan's `## Gate commands` block and that the contract's `## Gates` decides which subsections this stage runs; keep the `run.sh` paragraph as it is and drop any sentence about collecting commands from tasks.
3. In `superbuild-reviewer-spec`, rewrite its "a plan with no `Test Commands`" paragraph against a `## Gate commands` block whose subsections all read `none - <reason>`: say so in the gates section and review by reading alone, a criterion needing a run staying not met.
4. In each `## Calibration`, drop the sentence appending Minor to `debt.md` and leave the Minor rule at the report's `## Debt` section and its no-verdict effect. Drop the `## Input` clause exempting the debt file from "you write nothing else into the repo tree" so the report path is the only file each fork writes.
5. In each `## Contract` section, keep the list of binding contract sections but remove `## Debt file` from it.

### Failure modes
- none - skill text

### Contracts
- none

### DoD
All three forks source their gate from `## Gate commands` and the contract's stage mapping, none mentions `debt.md` or a removed plan section, and each writes only its report path; the greps and the three lints exit as listed.


### Covered criteria
10. Gate z nagłówka na etapie - `review-contract.md ## Gates` mówi, że reviewer-fork czyta `## Gate commands` z nagłówka planu, na `stage: checkpoint` uruchamia `#### Build` i `#### Tests`, na `stage: final` wszystkie trzy podsekcje, a na `stage: re-review` ten sam zestaw co runda, którą zamyka (po checkpoincie dwie, po final trzy); `none - <powód>` oznacza brak biegu z tym powodem w raporcie, żadna komenda z sekcji zadań nie jest zbierana ani deduplikowana, a trzej reviewerzy-forki wskazują tam bez własnego streszczenia.
15. Bez debt.md i bez recytacji - `debt.md` nie jest tworzony ani wymieniany w `superdev/` ani w root `CLAUDE.md` (Minor żyje wyłącznie w `## Debt` raportu), `## Assessment` to jedno zdanie o werdykcie bez powtarzania DoD, a recenzja zadania z samymi uwagami nie pisze własnego pliku, tylko dopisuje `NOTE:` linie pod `## Review notes` w `task-NN-notes.md`.
