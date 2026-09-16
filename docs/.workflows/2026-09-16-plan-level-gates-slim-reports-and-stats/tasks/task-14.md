
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


### Covered criteria
22. Dokumentacja spójna - `superdev/README.md` (tabela przełączników, opis planistów, implementatorów, reviewerów i skryptów), root `CLAUDE.md` (akapit superdev, inwariant `.temp/`, inwariant run.sh / executor) i `superdev/hooks/content/manifest.md` (obszar gated przez `stats`) opisują nowy podział: gate w nagłówku planu, `### Task Checks`, `Review:`, raporty bez `debt.md`, stats w `.temp/superdev/stats/`.
23. Nietknięte i zielone - `superdev/skills/tdd/SKILL.md`, `superdev/skills/executor/` i `superdev/scripts/cleanup-run.sh` są identyczne z HEAD sprzed zmiany, `node --test "tests/**/*.test.ts"` przechodzi, a `lint_skill.sh` skill-designera zwraca zero FAIL dla każdego zmienionego pliku SKILL.md i agenta.
