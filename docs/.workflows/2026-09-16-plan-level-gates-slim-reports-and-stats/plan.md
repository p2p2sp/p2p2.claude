# SuperPlan
To build this plan use the `superbuild` skill.

Title: "Plan-level gates, planner judgment, slim reports and a stats switch"
Spec: /Users/dario/Projects/p2p2.claude/docs/.workflows/2026-09-16-plan-level-gates-slim-reports-and-stats/spec.md <!-- `What & Why` specification -->
Intent: docs/.workflows/2026-09-16-plan-level-gates-slim-reports-and-stats/intent.md
Plan: /Users/dario/.claude-p2p2/plans/glimmering-hopping-treehouse.md

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - Rewrite the review contract for plan-level gates, slim reports and dispatch strength
- TDD: none
- Model: opus
- Effort: xhigh
- Covers: `Gate z nagłówka na etapie` (#10), `Gates jedną linią` (#14), `Bez debt.md i bez recytacji` (#15), `Notes bez duplikatów` (#16), `Siła fix z planu` (#12)

### Dependencies
- `Move the gate into the plan header and rename the per-task section to Task Checks` (Task 1) - blocks: the gate block and the task-check section this contract governs

### Files
- modify - superdev/references/review-contract.md (`## Gates`, `## Report skeleton`, `## Debt file`, `## Notes line formats`, `## Implementor fix-mode input`, `## Labels`)

### Test Commands
#### Build
- grep -c '^## Dispatch strength' superdev/references/review-contract.md - prints `1`

#### Tests
- grep -c 'Review notes' superdev/references/review-contract.md - prints at least `1`
- grep -c 'Gate commands' superdev/references/review-contract.md - prints at least `1`
- grep -c '### Task Checks' superdev/references/review-contract.md - prints at least `1`
- ! grep -q '^## Debt file' superdev/references/review-contract.md - exits 0
- ! grep -q 'debt.md' superdev/references/review-contract.md - exits 0
- ! grep -Eq 'Test Commands|Task Tests' superdev/references/review-contract.md - exits 0

### Task Tests
- none - contract text only, no test file changes

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below.
2. Rewrite `## Gates`: the commands come from the plan's `## Gate commands` block - the one above the first task block - and from nowhere else; `stage: checkpoint` runs `#### Build` and `#### Tests`, `stage: final` runs all three, and `stage: re-review` runs the set of the round it closes, read off the first line of `prior` (a `checkpoint` round -> two subsections, a `final` round -> three). A subsection reading `none - <reason>` is not run and its reason is carried into the report. State that no command is collected from a task section, that `### Task Checks` belongs to the implementor and runs at no review stage, and drop the deduplication paragraph - the block is already one list. Keep the `run.sh` transport, the three-case result reading, the evidence rules and the BLOCKED mapping untouched.
3. Rewrite `## Report skeleton` to carry only new information: the title line is `# <stage> review` with no file name; `## Gates` is one line per subsection shaped `<subsection> - <result> - <wall time>`, and on a failure that line adds the tool's own summary line and the `LOG:` path, never the commands themselves; a section with nothing to say is omitted entirely; `## Prior findings` stays as it is; `## Debt` stays as this round's Minor list and is the only home of a Minor; `## Assessment` is one sentence about the verdict with no restatement of any acceptance criterion; the bare `VERDICT:` line at the end is the only section that always appears. Add that a re-review reports its re-run in that same one-line-per-subsection shape rather than copying the prior round's block.
4. Delete `## Debt file` whole, and repoint the `minor:` label in `## Labels` and the Minor rule in `## Implementor fix-mode input` at the report's own `## Debt` section. Then Grep the whole file for every surviving `debt.md`, `### Test Commands` and `### Task Tests` mention - the opening "Stack-agnostic:" paragraph's section list and the file's own preamble among them - and rewrite each against the sections that replaced them.
5. Extend `## Notes line formats` with the rule that notes never restate the task or a report - an `### Approach` step is cited by its number and a finding by its ID - and that they are written LLM to LLM, concrete and unexplained; define `## Review notes` as the section a per-task reviewer appends its `NOTE: <what>` lines to in `task-NN-notes.md` when it raises notes and nothing else; restate fix-mode notes as `## Runs` plus exactly one status line per finding ID plus the `touched:` lines and nothing more; keep `## Runs` as the implementor's record and bind it to the task's `### Task Checks` lines (a `none - <reason>` section yielding the single line `none - <reason>`). Finally add `## Dispatch strength`: the orders `opus` over `sonnet` and `xhigh` over `high` over `medium` over `low`; the per-task reviewer runs at the task's `Review:` marker, and with none, at no `model` / `effort` parameter at all; a fix dispatch after a task review runs at that task's own `Model:` / `Effort:`; a fix dispatch after a checkpoint or final round runs at the highest `Model:` and the highest `Effort:` among the tasks whose `### Files` names a file some finding points at, and with no such task, at no parameter at all.

### Failure modes
- none - contract text

### Contracts
- Gate stage mapping: `checkpoint` -> `#### Build` + `#### Tests`, `final` -> all three, `re-review` -> the set of the round named on `prior`'s first line; consumed by `Point the three build reviewer forks at the plan-level gate and drop the debt file` (Task 7).
- Slim report shape: no file name in the title, one line per gate subsection, empty sections omitted, `## Debt` the only home of a Minor, `VERDICT:` last; consumed by `Retune the per-task reviewer strength, its runs check and its notes-only path` (Task 6), `Point the three build reviewer forks at the plan-level gate and drop the debt file` (Task 7).
- Notes line formats, `## Runs` and `## Review notes` included; consumed by `Run only the task checks in both task implementors and keep the notes lean` (Task 5), `Retune the per-task reviewer strength, its runs check and its notes-only path` (Task 6).
- `## Dispatch strength` orders and the three selection rules; consumed by `Retune superbuild for review strength, fix strength and stats events` (Task 12), `Retune simplebuild for fix strength and stats events` (Task 13).

### DoD
`review-contract.md` sources every gate command from the plan's `## Gate commands`, maps the three stages, carries the slim report shape, holds no `## Debt file` section and no `debt.md` mention, defines `## Review notes` and the lean notes rules, and owns `## Dispatch strength`; the greps exit as listed.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - Run only the task checks in both task implementors and keep the notes lean
- TDD: none
- Model: opus
- Effort: high
- Covers: `Implementator tylko Task Checks` (#9), `Notes bez duplikatów` (#16)

### Dependencies
- `Move the gate into the plan header and rename the per-task section to Task Checks` (Task 1) - blocks: the section the implementors run
- `Rewrite the review contract for plan-level gates, slim reports and dispatch strength` (Task 4) - blocks: the notes line formats these agents write

### Files
- modify - superdev/agents/superbuild-task-implementor.md (`## Input`, `## 1. Implement`, `## 2. Build + Test`, `## 3. Record notes`)
- modify - superdev/agents/simplebuild-task-implementor.md (`## Input`, `## 1. Implement`, `## 3. Run Build & Tests`, `## 4. Record notes`)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-implementor.md - exits 0

#### Tests
- grep -c '### Task Checks' superdev/agents/superbuild-task-implementor.md - prints at least `1`
- grep -c '### Task Checks' superdev/agents/simplebuild-task-implementor.md - prints at least `1`
- ! grep -Eq 'Test Commands|Task Tests|#### Build' superdev/agents/superbuild-task-implementor.md - exits 0
- ! grep -Eq 'Test Commands|Task Tests|#### Build' superdev/agents/simplebuild-task-implementor.md - exits 0
- grep -c '## Runs' superdev/agents/superbuild-task-implementor.md - prints at least `1`
- grep -c '## Runs' superdev/agents/simplebuild-task-implementor.md - prints at least `1`
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/simplebuild-task-implementor.md - exits 0

### Task Tests
- none - agent text only, no test file changes

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below, and apply every step to both agent files - their wording differs only in the step numbering and the reviewer singular/plural.
2. In `## Input`, describe the plan task's shape with `Task Checks` in place of `Test Commands` / `Task Tests`, and narrow the optional `plan` label to what it still sources: the `### Task Checks` lines of other tasks in fix mode.
3. In the build-and-test step, replace the whole command list with the task's `### Task Checks` lines alone - one direct `Bash` call per line, the command verbatim, its output read in place; a section reading `none - <reason>` means nothing runs and the step is green; a line opening with a test file path runs the command after that path's ` - `. State that neither the plan header's own gate block nor the host's integration or e2e command ever runs here - both belong to the build reviewers - and write that sentence without naming any plan section these agents must not reference, so the gate greps above stay green. Keep the command-cannot-start rule, the explicit-timeout rule and the 5-round fix loop unchanged.
4. Rewrite the fix-mode clause of that step: run the `### Task Checks` lines of every plan task in `## plan` whose `### Files` names a path that prefix-matches a file the fix touched, and when no task matches, run nothing - the round's gate belongs to the re-review.
5. In the TDD clause of the implement step, bind VERIFY RED and VERIFY GREEN to the `### Task Checks` line whose path matches the test file the cycle is writing, and make the stop condition that section carrying no such line. In the record-notes step, keep `## Runs` first - one line per command of the last green pass, `none - <reason>` when none ran - and add the lean rule from the contract: notes never restate the task or a report, an `### Approach` step is cited by its number and a finding by its ID, and fix-mode notes carry `## Runs`, one status line per ID and the `touched:` lines and nothing else.

### Failure modes
- none - agent text

### Contracts
- none

### DoD
Both implementors run the task's `### Task Checks` and nothing else, name no removed plan section and no `#### Build` block, carry the fix-mode scope rule with its run-nothing fallback, and carry the lean-notes rule; the greps and the two lints exit as listed.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - Retune the per-task reviewer strength, its runs check and its notes-only path
- TDD: none
- Model: opus
- Effort: medium
- Covers: `Siła recenzji z planu` (#11), `Bez debt.md i bez recytacji` (#15)

### Dependencies
- `Rewrite the review contract for plan-level gates, slim reports and dispatch strength` (Task 4) - blocks: the `## Review notes` section and the slim report shape
- `Run only the task checks in both task implementors and keep the notes lean` (Task 5) - blocks: the `## Runs` content this gate verifies

### Files
- modify - superdev/agents/superbuild-task-reviewer.md (frontmatter, `## Input`, `## Check`, `## Output format`)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-reviewer.md - exits 0

#### Tests
- grep -c '^model: sonnet' superdev/agents/superbuild-task-reviewer.md - prints `1`
- grep -c '^effort: high' superdev/agents/superbuild-task-reviewer.md - prints `1`
- grep -c '## Review notes' superdev/agents/superbuild-task-reviewer.md - prints at least `1`
- grep -c '### Task Checks' superdev/agents/superbuild-task-reviewer.md - prints at least `1`
- ! grep -Eq 'Test Commands|Task Tests|debt.md' superdev/agents/superbuild-task-reviewer.md - exits 0

### Task Tests
- none - agent text only, no test file changes

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below.
2. In the frontmatter, set `model: sonnet` and `effort: high` - the default the orchestrator falls back to when a task carries no `Review:` marker.
3. In `## Input`, describe the plan task with `Task Checks` in place of `Test Commands` / `Task Tests`, and describe `notes` as opening with a `## Runs` section holding one line per `### Task Checks` line the implementor ran, or the single `none - <reason>` line. In `## Scope`, drop `debt.md` from the list of bookkeeping files the run directory holds.
4. In `## Check`, rewrite the runs bullet against that shape: the notes carry one `## Runs` line per `### Task Checks` line of the task, a section reading `none - <reason>` needing only the matching single line, and a missing section or a missing line is an Important finding; keep "you run nothing yourself" as it stands.
5. In `## Output format`, replace the notes-only branch: a review that holds everything and raised only notes writes NO report file and instead appends a `## Review notes` section to the `notes` path with one `NOTE: <what>` line per note - read that file first and write it back with the new section appended, since the writing tool truncates - then returns the single line `VERDICT: PASS`; with `notes` unset it returns `VERDICT: PASS` and drops the notes. Trim the report skeleton to the slim shape: `# task review` with no file name, `## Findings`, `## Notes` and a one-sentence `## Assessment` ending in the bare verdict line, sections with nothing to say omitted.

### Failure modes
- when the `notes` path cannot be read before the notes-only append -> response write the report file instead with its `## Notes` and `## Assessment` sections and return `VERDICT: PASS`, log the reason in that report's `## Notes`, test manual - a notes file the orchestrator always creates
- when `notes` is unset and only notes were raised -> response return the single line `VERDICT: PASS` and drop the notes, log nothing, test manual

### Contracts
- none

### DoD
The reviewer's frontmatter reads `sonnet` / `high`, its runs check follows the `### Task Checks` shape, a notes-only review appends `## Review notes` to the notes file and writes no report, its report skeleton is the slim one, and no removed section name or `debt.md` mention survives; the greps and the lint exit as listed.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 8 - Print the Review marker as a decompose index column
- TDD: none
- Model: opus
- Effort: high
- Covers: `Kolumna Review w indeksie` (#13)

### Dependencies
- `Move the gate into the plan header and rename the per-task section to Task Checks` (Task 1) - blocks: the `Review:` marker this column carries

### Files
- modify - superdev/scripts/decompose.sh (header comment, the awk task splitter)
- modify - tests/superdev/decompose.test.ts (index-row assertions)

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- grep -c 'review\[n\]' superdev/scripts/decompose.sh - prints at least `1`
- bash -n superdev/scripts/decompose.sh - exits 0

### Task Tests
- tests/superdev/decompose.test.ts - node --test tests/superdev/decompose.test.ts

### Approach
1. In `decompose.sh`'s awk program, capture the first `- Review:` line of each task block into a `review` array exactly as `model` and `effort` are captured - value trimmed, passed through verbatim, never validated - and print it as a fifth tab-separated column in the `END` loop, `-` when the marker is absent.
2. Update the script's header comment in English, as the newer paragraphs around it already are: the index row becomes `<task-path><TAB><title><TAB><model><TAB><effort><TAB><review>`, the `review` column comes from the task's own `- Review:` marker on both tracks, and `-` means the consumer passes nothing so the reviewer agent's frontmatter default applies.
3. In `decompose.test.ts`, extend the existing `Model:`/`Effort:` marker test with a task carrying `- Review: sonnet high` and one carrying none, asserting both rows including the new column; then Grep the file for every other index-row assertion - the `deepEqual` row lists and the happy-path `assert.equal` over the whole stdout alike - and add the fifth column to each.
4. Update the tab-in-title edge test: a well-formed row now has five fields, so an embedded tab yields six.

### Failure modes
- when a task carries a `Review:` line with an empty value -> response print `-` in that column, exactly as an absent marker does, log nothing, test the marker test's unmarked row
- when a task carries two `Review:` lines -> response the first wins, as with `Model:` and `Effort:`, log nothing, test none - covered by the shared first-wins capture

### Contracts
- Decompose index row: `<task-file>\t<title>\t<model>\t<effort>\t<review>`, the fifth column `-` when the task carries no `Review:` marker, on both tracks; consumed by `Retune superbuild for review strength, fix strength and stats events` (Task 12), `Retune simplebuild for fix strength and stats events` (Task 13).

### DoD
`decompose.sh` prints five tab-separated columns per task with `Review:` verbatim or `-`, its header documents that row, `decompose.test.ts` covers a marked and an unmarked task, and the whole suite is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 9 - Add the stats config switch
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Przełącznik stats` (#17)

### Dependencies
- none

### Files
- modify - superdev/scripts/read-config.sh (header contract, the key loop)
- modify - superdev/skills/setup/assets/config.yml
- modify - superdev/skills/setup/scripts/bootstrap.sh (header contract, the grep, the seeded-defaults line)
- modify - tests/superdev/read-config.test.ts
- modify - tests/superdev/bootstrap.test.ts

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- grep -c 'stats' superdev/scripts/read-config.sh - prints at least `1`
- grep -c '^stats:' superdev/skills/setup/assets/config.yml - prints `1`
- bash -n superdev/scripts/read-config.sh - exits 0
- bash -n superdev/skills/setup/scripts/bootstrap.sh - exits 0

### Task Tests
- tests/superdev/read-config.test.ts - node --test tests/superdev/read-config.test.ts
- tests/superdev/bootstrap.test.ts - node --test tests/superdev/bootstrap.test.ts

### Approach
1. In `read-config.sh`, append `stats` to the `for key in ...` loop after `cleanup` and to the `klucze:` list in the header contract, so the resolved block prints six lines in a fixed order.
2. In `superdev/skills/setup/assets/config.yml`, add `stats:     false   # Workflow execution stats -> .temp/superdev/stats/` as the last line, matching the column alignment of the lines above it.
3. In `bootstrap.sh`, add `stats` to the switch-reporting `grep -E` alternation, to the seeded-defaults line (`... cleanup=false, stats=false`) and to the two header-contract sentences that enumerate the documented keys.
4. In `read-config.test.ts`, widen `expectedBody` to a sixth `stats` parameter, update every call site and the fixed-order assertion, and add one case flipping `stats: true` alone.
5. In `bootstrap.test.ts`, update the seeded-defaults string and the idempotence run's expected switch lines with the new `stats:` line.

### Failure modes
- none - configuration wiring

### Contracts
- `stats: <true|false>` as the sixth line of `read-config.sh`'s resolved block, after `cleanup`; consumed by `Retune superbuild for review strength, fix strength and stats events` (Task 12), `Retune simplebuild for fix strength and stats events` (Task 13).

### DoD
`read-config.sh` prints six switch lines ending in `stats`, the seeded config carries it, `bootstrap.sh` reports it in both branches, both test files assert the new shape, and the whole suite is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 10 - Add stats-record.sh, the one-call event append
- TDD: none
- Model: opus
- Effort: high
- Covers: `Zdarzenie jednym wywołaniem` (#18)

### Dependencies
- none

### Files
- add - superdev/scripts/stats-record.sh
- add - tests/superdev/stats-record.test.ts

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- bash -n superdev/scripts/stats-record.sh - exits 0
- test -x superdev/scripts/stats-record.sh - exits 0

### Task Tests
- tests/superdev/stats-record.test.ts - node --test tests/superdev/stats-record.test.ts

### Approach
1. Write `superdev/scripts/stats-record.sh` with `#!/usr/bin/env bash`, `set -euo pipefail`, the exec bit set, and a header carrying its whole I/O contract, modelled on `record-decision.sh`: usage `stats-record.sh <workdir> <kind> <label> [model] [effort] [tokens] [tool_uses] [duration_ms] [verdict] [note]`, the first three required, every optional argument defaulting to `-` when absent or empty.
2. Derive the run id from `<workdir>`: normalise a trailing `/` and a leading `./` away, take the path tail after the last `docs/.workflows/` segment and join its remaining segments with `-`, so a phase directory gets its own id; a workdir with no such segment falls back to its basename. Append the event to `.temp/superdev/stats/<run>.events`, creating the directory and the file as needed, and writing a leading newline first when the existing file does not end in one.
3. Write one tab-separated line whose first field is the script's own `date +%s` stamp, followed by kind, label, model, effort, tokens, tool_uses, duration_ms, verdict and note, in that order; strip every tab, carriage return and newline out of each argument first, so one event is always exactly one line and the file stays parseable.
4. Print the single machine line `stats: <path> -> <kind> <label>` on stdout and exit 0.
5. Write `tests/superdev/stats-record.test.ts` in the repo's convention - `runScript` and `withTempDir` from `tests/harness/`, `slash()` for every path comparison, no `chmod` - covering: a minimal three-argument call writing one line with `-` in every optional field and creating the directory; a full ten-argument call; two calls appending two lines; an existing file with no trailing newline; a run id derived from a phase workdir; a run id derived from a workdir outside `docs/.workflows/`; an argument carrying a tab or a newline flattened into one line; a missing required argument exiting 1 with usage on stderr.

### Failure modes
- when `<workdir>`, `<kind>` or `<label>` is missing or empty -> response print `error: missing required parameter` plus the usage line on stderr and exit 1 writing nothing, log nothing, test the missing-argument case in `stats-record.test.ts`
- when `<workdir>` carries no `docs/.workflows/` segment -> response use its basename as the run id and write the event as usual, log nothing, test the outside-workflows case in `stats-record.test.ts`
- when an argument carries a tab, a carriage return or a newline -> response strip those characters before writing, so the event stays one parseable line, log nothing, test the control-character case in `stats-record.test.ts`
- when the stats directory cannot be created -> response let `set -e` abort with the shell's own message on stderr and a non-zero exit, log nothing, test none - the caller escalates a failed script call like any other

### Contracts
- `.temp/superdev/stats/<run>.events`: one tab-separated line per event, fields `<epoch seconds>`, `kind`, `label`, `model`, `effort`, `tokens`, `tool_uses`, `duration_ms`, `verdict`, `note`, an absent optional field written as `-`; the run id is the workdir tail after the last `docs/.workflows/` joined with `-`, falling back to the workdir's basename when it carries no such segment; consumed by `Add stats-report.sh and its fixed report template` (Task 11), `Retune superbuild for review strength, fix strength and stats events` (Task 12), `Retune simplebuild for fix strength and stats events` (Task 13).

### DoD
`stats-record.sh` exists, is executable, appends one well-formed line per call under `.temp/superdev/stats/`, prints its one machine line, rejects a missing required argument with exit 1, and its test file plus the whole suite is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 11 - Add stats-report.sh and its fixed report template
- TDD: none
- Model: opus
- Effort: xhigh
- Covers: `Raport ze stałego szablonu` (#19), `Anomalie z dwóch źródeł` (#20)

### Dependencies
- `Add stats-record.sh, the one-call event append` (Task 10) - blocks: the event file shape and the run id this report reads

### Files
- add - superdev/references/stats-template.md
- add - superdev/scripts/stats-report.sh
- add - tests/superdev/stats-report.test.ts

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- bash -n superdev/scripts/stats-report.sh - exits 0
- test -x superdev/scripts/stats-report.sh - exits 0
- grep -c '{{ANOMALIES}}' superdev/references/stats-template.md - prints `1`

### Task Tests
- tests/superdev/stats-report.test.ts - node --test tests/superdev/stats-report.test.ts

### Approach
1. Write `superdev/references/stats-template.md`: a fixed markdown skeleton with a title carrying `{{RUN}}`, a per-task table (task, implementor model and effort, review rounds, wall time, tokens) at `{{TASKS_TABLE}}`, a per-dispatch-kind table at `{{KINDS_TABLE}}`, a `## Totals` block at `{{TOTALS}}` (wall time from the `start` event to the last event, total tokens, dispatch count) and a `## Anomalies` section at `{{ANOMALIES}}`; every placeholder appears exactly once and nothing outside them varies.
2. Write `superdev/scripts/stats-report.sh` with `#!/usr/bin/env bash`, `set -euo pipefail`, the exec bit set and a header carrying its I/O contract: usage `stats-report.sh <workdir>`, the run id derived from `<workdir>` exactly as `stats-record.sh` derives it - its basename fallback included, so both scripts always name the same file - input `.temp/superdev/stats/<run>.events`, output `.temp/superdev/stats/<run>.md`, one machine line `stats: <path>` on stdout.
3. Aggregate the events in one awk pass: group by label for the task table and by kind for the kind table; a row's wall time is its own `duration_ms` when the event carries one, and otherwise the gap between the previous event's stamp and its own - the rule that gives a `Skill` fork its time; tokens sum only the numeric fields, a `-` contributing nothing and printing `-` where a row has none.
4. Build `## Anomalies` from two sources: one line per event carrying a note, shaped `<mm:ss offset from start> <kind> <label> - <note>`, and a counter table per task built by counting `UNDERSPECIFIED:`, `CARRY:`, `touched:` and `NOTE: plan defect` lines in `<workdir>/implementation/*.md` plus the task review rounds past the first (the `task-NN-review-R.md` files); neither source yielding anything prints the single line `none`.
5. Render by substituting each placeholder in the template with its built block and writing the result to the output path, then print the `stats:` line. Write `tests/superdev/stats-report.test.ts` in the repo's convention (`runScript`, `withTempDir`, `slash()`, no `chmod`) covering: a run with several events rendering every table and the totals; a fork event timed from the previous stamp; a run with no note and no counter printing `none` under anomalies; counters read out of a fixture `implementation/` directory; a missing events file exiting 1 with a message on stderr; the output being byte-identical in structure to the template's section order.

### Failure modes
- when `<workdir>` is missing or empty -> response print `error: missing required parameter` plus the usage line on stderr and exit 1, log nothing, test the missing-argument case in `stats-report.test.ts`
- when the events file does not exist -> response print `error: no events file: <path>` on stderr and exit 1 without writing a report, log nothing, test the missing-events case in `stats-report.test.ts`
- when `<workdir>/implementation/` does not exist -> response render the report with every counter at zero and no counter table rows, log nothing, test the anomalies-`none` case
- when an event line carries fewer fields than the contract -> response treat every missing field as `-` and keep rendering, log nothing, test none - `stats-record.sh` is the only writer and always writes the full line

### Contracts
- `stats-report.sh <workdir>` renders `.temp/superdev/stats/<run>.md` from `superdev/references/stats-template.md` - whose placeholders `{{RUN}}`, `{{TASKS_TABLE}}`, `{{KINDS_TABLE}}`, `{{TOTALS}}` and `{{ANOMALIES}}` each appear exactly once and are substituted by this same script - and prints the single line `stats: <path>`; consumed by `Retune superbuild for review strength, fix strength and stats events` (Task 12), `Retune simplebuild for fix strength and stats events` (Task 13).

### DoD
The template carries its five placeholders, `stats-report.sh` exists, is executable, renders both tables, the totals and the two-source anomalies section, prints its one machine line, exits 1 on a missing argument or a missing events file, and its test file plus the whole suite is green.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 14 - Sync the plugin documentation with the new split
- TDD: none
- Model: opus
- Effort: medium
- Covers: `Dokumentacja spójna` (#22), `Nietknięte i zielone` (#23)

### Dependencies
- `Retune simplebuild for fix strength and stats events` (Task 13) - blocks: the last behaviour this documentation describes

### Files
- modify - superdev/README.md (`## Config switches`, `## Skills`, the build narrative)
- modify - CLAUDE.md (the superdev paragraph, the `docs/.workflows/` layout entry, the `.temp/` invariant)
- modify - superdev/hooks/content/manifest.md (`## Build chain`)

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- grep -c 'stats' superdev/README.md - prints at least `1`
- grep -c 'Task Checks' superdev/README.md - prints at least `1`
- grep -c 'stats' superdev/hooks/content/manifest.md - prints at least `1`
- grep -c 'Task Checks' CLAUDE.md - prints at least `1`
- ! grep -Eq 'Test Commands|Task Tests|debt\.md' superdev/README.md CLAUDE.md superdev/hooks/content/manifest.md - exits 0
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild - exits 0

### Task Tests
- none - documentation only, no test file changes

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for the manifest edit; edit `superdev/README.md` and the root `CLAUDE.md` directly.
2. In `superdev/README.md`, add the `stats` row to the config-switch table, replace every `### Task Tests` mention in the planner, implementor and reviewer rows with `### Task Checks` plus the plan-level `## Gate commands`, drop the "rounded up when in doubt" clause from the `superplan` row now that the strength rubric reads load instead, describe the optional `Review:` marker in the `superplan` and `superbuild-task-reviewer` rows with its `sonnet` / `high` default, and replace the `implementation/debt.md` sentence with the report's own `## Debt`.
3. In the root `CLAUDE.md` superdev paragraph, record the plan-level gate, `### Task Checks`, the `Review:` marker and its index column, the slim reports with no debt file, and the `stats` switch with its `.temp/superdev/stats/` output; keep the existing `run.sh` / executor sentences intact.
4. In the same file, update the `docs/.workflows/` layout entry (no `debt.md`) and the `.temp/` invariant's example list with `.temp/superdev/stats/<run>.events` and `<run>.md`.
5. In `manifest.md`'s `## Build chain`, add one line naming the `stats` switch as a config-gated area: with it on, the orchestrator records one event per dispatch and renders a run report under `.temp/superdev/stats/` after Close Out.
6. Finally grep `superdev/` and the root `CLAUDE.md` for any surviving `Test Commands`, `Task Tests` or `debt.md` mention and fix each one in the file that carries it, so the two names and the retired file are gone repo-wide outside `docs/.workflows/` and `tests/`.

### Failure modes
- when a surviving mention sits in a file no task of this plan declares -> response fix it here and record the file as a `touched:` line in the notes, log the notes line, test the repo-wide grep above

### Contracts
- none

### DoD
The README documents the `stats` switch, `### Task Checks`, the plan-level gate and the `Review:` marker; the root `CLAUDE.md` and the manifest match; no `Test Commands`, `Task Tests` or `debt.md` mention survives under `superdev/` or in the root `CLAUDE.md`; `tdd`, `executor` and `cleanup-run.sh` are unchanged against HEAD; the whole suite is green.

<!-- /TASK -->

---

<!-- repeat Task <N> per unit of work; leave intact all comment markers; keep tasks small, independently testable, and builder-executable unattended (no interactive human step) -->
