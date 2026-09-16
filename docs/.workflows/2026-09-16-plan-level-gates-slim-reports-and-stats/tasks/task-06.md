
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


### Covered criteria
11. Siła recenzji z planu - `superbuild` dispatchuje per-task reviewera z `Review:` zadania, a bez markera bez parametrów `model` / `effort`; frontmatter agenta `superbuild-task-reviewer` brzmi `model: sonnet`, `effort: high`.
15. Bez debt.md i bez recytacji - `debt.md` nie jest tworzony ani wymieniany w `superdev/` ani w root `CLAUDE.md` (Minor żyje wyłącznie w `## Debt` raportu), `## Assessment` to jedno zdanie o werdykcie bez powtarzania DoD, a recenzja zadania z samymi uwagami nie pisze własnego pliku, tylko dopisuje `NOTE:` linie pod `## Review notes` w `task-NN-notes.md`.
