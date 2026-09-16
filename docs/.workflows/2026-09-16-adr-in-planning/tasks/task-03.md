
## Task 3 - Carry the ADR section into phase 01 only
- TDD: none
- Model: sonnet
- Effort: low
- Covers: `Fazy` (#13)

### Dependencies
- `Add the adr skill and register it` (Task 1) - blocks: the `## ADR` section name copied here

### Files
- modify - superdev/skills/phases/SKILL.md (`## Phase intents` bullet list)

### Test Commands
#### Build
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/phases` - exit 0, last line `FAIL=0 WARN=<n>`

#### Tests
- `grep -c '`## ADR`' superdev/skills/phases/SKILL.md` - prints at least `1`
- `! LC_ALL=C grep -q $'\xe2\x80[\x93\x94]' superdev/skills/phases/SKILL.md` - exit 0

### Approach
1. In `## Phase intents`, add one bullet after the `## Out of scope` bullet: `## ADR` - phase `01` only: the master's `## ADR` section copied verbatim when the master has one; every other phase intent has no `## ADR` section, whatever its `Covers:` names.

### Failure modes
- none - markdown

### Contracts
- none

### DoD
The `## Phase intents` list carries the `## ADR` rule, the lint returns zero FAIL and the test commands pass.


### Covered criteria
13. Fazy - po podziale intentu przez `phases` sekcja `## ADR` występuje wyłącznie w `phases/01-<slug>/intent.md`; intenty pozostałych faz jej nie mają.
