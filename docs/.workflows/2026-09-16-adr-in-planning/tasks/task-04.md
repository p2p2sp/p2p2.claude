
## Task 4 - Plan the ADR write as the first task
- TDD: none
- Model: opus
- Effort: high
- Covers: `Zadanie ADR w planie` (#4), `Brak ADR, brak zadania` (#5), `Reviewerzy planu` (#6), `Plik ADR` (#7)

### Dependencies
- `Add the adr skill and register it` (Task 1) - blocks: the `## ADR` block shape (`### <slug>`, `Supersedes:`, fenced body) this task turns into a plan task

### Files
- add - superdev/references/adr-task.md (the filled `Write ADR` task block both planners copy)
- modify - superdev/skills/simpleplan/SKILL.md (`### Rules`, `### Initial Understanding` refreshed-intent gate)
- modify - superdev/skills/superplan/SKILL.md (`### Rules`)
- modify - superdev/references/plan-review-checklist.md (`## Never flag`)

### Test Commands
#### Build
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan && bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan` - exit 0, each last line `FAIL=0 WARN=<n>`

#### Tests
- `grep -c 'references/adr-task.md' superdev/skills/simpleplan/SKILL.md superdev/skills/superplan/SKILL.md` - prints `1` for each file
- `grep -c 'date +%Y-%m-%d-%H%M%S' superdev/references/adr-task.md` - prints at least `1`
- `grep -c 'add - docs/adr/' superdev/references/adr-task.md` - prints `1`
- `grep -c 'docs/adr/<YYYY-MM-DD-HHMMSS>-<slug>.md' superdev/references/adr-task.md` - prints at least `1` (the name pattern is stated literally)
- `grep -c 'Write ADR' superdev/references/plan-review-checklist.md` - prints at least `1`
- `! LC_ALL=C grep -q $'\xe2\x80[\x93\x94]' superdev/references/adr-task.md superdev/skills/simpleplan/SKILL.md superdev/skills/superplan/SKILL.md superdev/references/plan-review-checklist.md` - exit 0

### Approach
1. `superdev/references/adr-task.md`: one section `## Fill rules` (title `Write ADR `<title>`` for one ADR, `Write ADRs` for several; the fenced body of every `## ADR` block copied verbatim; `<slug>` and `Supersedes:` taken from the block; the task is always Task 1 and every other task is renumbered after it and never depends on it) and one section `## Task block` in the plan template's exact task shape: `- TDD: none`, `- Model: sonnet`, `- Effort: low`, `- Covers: `ADR` (intent `## ADR`)`; `### Dependencies` `none`; `### Files` `add - docs/adr/ (<slug>.md per ADR, name stamped at write time)` plus one `modify - <Supersedes path>` per `Supersedes:` line; `### Test Commands` with `#### Build` `none - documentation only` and `#### Tests` `ls docs/adr/ | grep -c -- '-<slug>.md$'` prints `1` per slug; `### Approach`: run `date +%Y-%m-%d-%H%M%S` once for `<stamp>`, `Write` `docs/adr/<stamp>-<slug>.md` (the name pattern written out as `docs/adr/<YYYY-MM-DD-HHMMSS>-<slug>.md`) with the fenced content verbatim (the `Write` creates `docs/adr/`), for each `Supersedes:` path set or add the YAML frontmatter `status: superseded by docs/adr/<stamp>-<slug>.md` at the top of that file; `### Failure modes` `none - single write` (one stamp with seconds, one task, so no collision within a run); `### Contracts` `none`; a note that `decompose.sh` prints `warning: ... has no 'Covers:' criteria - none appended` for this task on every build and continues, which is expected and not a problem; `### DoD` every listed file exists with the given content.
2. `simpleplan/SKILL.md` `### Rules`: the `intent:` file carries a `## ADR` section -> Task 1 is `${CLAUDE_PLUGIN_ROOT}/references/adr-task.md` filled by its `## Fill rules`; no `## ADR` section, or no `intent:` -> no such task. Scope the refreshed-intent gate's "the file's content is never read" sentence to that gate alone, so the skill does not carry two opposite instructions about the same file.
3. `superplan/SKILL.md` `### Rules`: the same rule, the intent reached through the spec's `Intent:` line (Read that file for its `## ADR` section only); a spec with no `Intent:` line, or one whose path no longer resolves, is treated exactly like an intent with no `## ADR` section -> no such task.
4. `plan-review-checklist.md` `## Never flag`: the `Write ADR` task built from `superdev/references/adr-task.md` - its `### Approach` carrying the ADR text verbatim, its `Covers:` naming the intent's `## ADR` instead of a criterion (exempt from the numeric-criterion reference form as well, not only from the coverage class), and its `### Files` declaring `docs/adr/` by directory. Add the same exemption as a clause on each planner's own `### Rules` bullet beginning "`### Approach` carries symbol, signature and algorithm only", so a planner does not shrink the ADR text before review.

### Failure modes
- when the spec carries no `Intent:` line, or its `Intent:` path does not resolve -> response: `superplan` plans no `Write ADR` task, log: nothing, test: `grep -c 'no longer resolves' superdev/skills/superplan/SKILL.md` prints at least `1`

### Contracts
- `adr-task.md` `## Task block` (markers, `docs/adr/` directory declaration, the `<stamp>` step, the `Supersedes:` frontmatter step) - consumed by `Remove adr-writer from the build close-out and link ADRs from git` (Task 5), which relies on the written files sitting under `docs/adr/` in the build's commits

### DoD
Both planners point at `adr-task.md`, the reference carries the filled task block, the checklist's `## Never flag` covers that task, both lints return zero FAIL and the test commands pass.


### Covered criteria
4. Zadanie ADR w planie - plan napisany przez `simpleplan` lub `superplan` z intentu zawierającego `## ADR` zaczyna się zadaniem „Write ADR `<title>`” z `Model: sonnet`, `Effort: low`, `TDD: none`, którego `### Files` deklaruje katalog `docs/adr/` (nazwa pliku jest generowana w buildzie, więc zgodnie z regułą B1 checklisty planu deklaruje ją katalog nadrzędny z ukośnikiem), a `### Approach` niesie pełną treść każdego ADR i wzór nazwy `docs/adr/<YYYY-MM-DD-HHMMSS>-<slug>.md`; wiele ADR to wiele plików w tym jednym zadaniu.
5. Brak ADR, brak zadania - plan napisany z intentu bez sekcji `## ADR` nie zawiera zadania „Write ADR”.
6. Reviewerzy planu - `simpleplan-reviewer` i `superplan-reviewer` nie zgłaszają pełnej treści ADR w `### Approach` zadania „Write ADR” jako blokującego naruszenia reguły „no prose in Approach”.
7. Plik ADR - po buildzie każdy ADR z zadania istnieje pod `docs/adr/<YYYY-MM-DD-HHMMSS>-<slug>.md`, gdzie stempel to data i czas (godzina, minuty, sekundy) chwili zapisu pliku, a treść pliku jest identyczna z treścią w zadaniu planu.
