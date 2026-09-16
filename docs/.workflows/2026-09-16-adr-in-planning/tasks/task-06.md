
## Task 6 - Document the ADR move in the superdev README and root CLAUDE.md
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Agent usunięty` (#9), `Skill zarejestrowany` (#10)

### Dependencies
- `Wire the adr skill into the intent synthesis` (Task 2) - blocks: the documented `intent` behaviour
- `Plan the ADR write as the first task` (Task 4) - blocks: the documented plan task
- `Remove adr-writer from the build close-out and link ADRs from git` (Task 5) - blocks: the documented close-out waves

### Files
- modify - superdev/README.md (`## Quick start` steps 3 and 7, `## Config switches` `adr` row, `### Entry and environment` table, `### Knowledge layers (also runnable on their own)` table)
- modify - CLAUDE.md (the `superdev` bullet under `## What this repo is`, the `superdev/` line of the `## Repository layout (top level)` tree, the `docs/adr/` item under `## Cross-plugin architecture invariants`, the closeout-writers sentence under `Self-documentation`)

### Test Commands
#### Build
- none - markdown only

#### Tests
- `! grep -q 'adr-writer' superdev/README.md CLAUDE.md` - exit 0
- `grep -c '| `adr` |' superdev/README.md` - prints `2` (the config-switch row and the skill row)
- `grep -c 'skills/adr' CLAUDE.md` - prints at least `1`
- `! LC_ALL=C grep -q $'\xe2\x80[\x93\x94]' superdev/README.md CLAUDE.md` - exit 0

### Approach
1. `superdev/README.md`: Quick start step 3 gains one sentence (with `adr: true`, after the confirmation the `adr` skill judges each decision against the three criteria and offers a one-paragraph ADR only for the ones that pass; accepted drafts land in `intent.md` `## ADR` and become the plan's first task, written to `docs/adr/<YYYY-MM-DD-HHMMSS>-<slug>.md` during the build); step 7 lists wave 1 as `memory` and `rules` and says `changelog` links every ADR the build wrote; the `## Config switches` table header widens from "When `true`, Close Out also…" to "When `true`…", because the `adr` row no longer describes a Close Out action; the `adr` config row reads "offers an ADR in the intent synthesis for a decision that is hard to reverse, surprising without context and a real trade-off; the plan's first task writes it to `docs/adr/<YYYY-MM-DD-HHMMSS>-<slug>.md`"; the Entry table gains a row whose first cell is exactly `` `adr` `` (bare, like the other skill rows, never `superdev:adr`) and whose text opens with "invoked by `intent` at the synthesis, never by you", so a non-invocable skill in that table reads true; the `memory-writer / rules-writer` row drops "alongside `superdev:adr-writer`"; the `superdev:adr-writer` row is removed.
2. `CLAUDE.md`: the `superdev` bullet describes the `adr` skill and names its path `superdev/skills/adr/` (main-context, invoked by `intent` at synthesis when `adr: true`, three criteria, `## ADR` in `intent.md`, the plan's first task from `superdev/references/adr-task.md`, `changelog-writer` fed by `git diff` over `docs/adr/`); the `## Repository layout (top level)` tree's `superdev/` line counts three closeout writers instead of four; the `docs/adr/` invariant item names the `adr` skill plus the plan's first task instead of the agent; the closeout sentence names three closeout writers (`memory-writer`, `rules-writer`, `changelog-writer`) and a two-agent wave 1.

### Failure modes
- none - markdown

### Contracts
- none

### DoD
Both files describe the new flow, neither mentions `adr-writer`, and the test commands pass.


### Covered criteria
9. Agent usunięty - `superdev/agents/adr-writer.md` nie istnieje, a nazwa `adr-writer` nie występuje w `superdev/.claude-plugin/plugin.json`, `superbuild/SKILL.md`, `simplebuild/SKILL.md`, `superdev/README.md` ani root `CLAUDE.md`; wave 1 close-outu obu orkiestratorów wysyła wyłącznie `memory-writer` i `rules-writer`.
10. Skill zarejestrowany - `./skills/adr/` widnieje w `plugin.json` `skills[]`, skill ma wiersz w tabeli skilli `superdev/README.md` i opis w root `CLAUDE.md`, a `lint_skill.sh` skill-designera zwraca dla niego zero FAIL.
