
## Task 5 - Document the vibe track in the README and the root CLAUDE.md
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Katalog i README spójne` (#18)

### Dependencies
- `Route the vibe track in the manifest and the neighbouring skill descriptions` (Task 4) - blocks: the wording the README mirrors

### Files
- modify - superdev/README.md (`## Quick start`, `## Skills`)
- modify - CLAUDE.md (`## What this repo is`, `## Cross-plugin architecture invariants`)

### Task Checks
- grep -n "### Vibe track" superdev/README.md
- grep -n "vibe" CLAUDE.md

### Approach
1. `superdev/README.md`: under `## How it works` change the caption sentence to `Same interview on the way in, two execution tracks, one shared Close Out - plus a third, plan-less vibe track for one-sentence changes.`; in `## Quick start` add after step 3's track list one paragraph `**Or skip all of it for a one-sentence change.** Say "vibe: <change>" (or run /superdev:vibe <change>) and the vibe skill does it with one implementor agent, the checks your CLAUDE.md declares for that area, an advisory scope guard and one commit - no interview, no plan, no reviewer, no knowledge writer. The guard stops on more than 5 files, more than 1 new file, more than 200 changed lines, or a path your memory calls sensitive, and on a failed check; every stop offers approve-and-commit, revert, or hand the diff to intent - the choice is yours.`; add a `### Vibe track` table after `### Simple track` with two rows: `vibe` (the skill: entry, reconnaissance, entry guard, brief under `.temp/superdev/vibe/<timestamp>-<slug>/`, dispatch, `vibe-guard.sh`, commit through `commit-task.sh`, the three-option stop, every override recorded as an `OVERRIDE:` line in that run's `brief.md`) and `superdev:vibe-implementor` (the agent: brief in, checks run directly with `Bash`, max 3 fix rounds, notes with `## Runs` and `touched:` lines, `VERDICT:` out).
2. Root `CLAUDE.md`: in the `superdev` bullet of `## What this repo is` add one sentence naming the vibe track (skill `vibe`, agent `vibe-implementor`, script `scripts/vibe-guard.sh`, no plan, no reviewer, no knowledge layer, machine state under `.temp/superdev/vibe/`); in the `.temp/` list of the dot-dir invariant add `.temp/superdev/vibe/<timestamp>-<slug>/` (the vibe track's brief and notes); in the self-documentation invariant's agents list add `vibe-implementor` (dispatched by the `vibe` skill alone, never at Close Out).

### Failure modes
- none - documentation

### Contracts
- none

### DoD
`superdev/README.md` carries the caption change, the Quick start paragraph and the `### Vibe track` table; root `CLAUDE.md` names the track, the `.temp/superdev/vibe/` location and the `vibe-implementor` agent; both greps under `### Task Checks` print at least one line.


### Covered criteria
18. Katalog i README spójne - `plugin.json` superdev wymienia nowy skill w `skills[]` i nowego agenta w `agents[]` (nigdy w obu), a `superdev/README.md` i root `CLAUDE.md` opisują tor `vibe`, jego strażnika i to, że nie pisze żadnej warstwy wiedzy.
