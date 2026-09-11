
## Task 12 - docs(superdev): document the review chain, verify dashes and run the suite
- TDD: none
- Model: opus
- Effort: medium
- Covers: criteria #31, #34, #35

### Dependencies
- 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 - blocks: none

### Files
- modify - superdev/.claude-plugin/plugin.json (`description` of the plugin unchanged; verify `skills[]`/`agents[]` need no entry: no skill or agent was added, renamed or removed)
- modify - superdev/README.md (`## How it works` step 5, `### Simple track`, `### Super track` rows for the build orchestrators, implementors, task reviewer and the three reviewers)
- modify - CLAUDE.md (the `superdev` bullet under `## What this repo is`, the agents paragraph under `## Cross-plugin architecture invariants` naming the task reviewer, and the `docs/.workflows/` layout line listing the new run files)
- modify - superdev/hooks/content/manifest.md (new `## Build chain` section; the en dash on line 4 replaced by a hyphen)
- modify - superdev/skills/intent/SKILL.md (the two en dashes on lines 45 and 81 replaced by hyphens, through `supercc:skill-designer`)

### Test Commands
#### Build
- `node --test "tests/portability.test.ts"` - expected: all tests pass

#### Tests
- `node --test "tests/**/*.test.ts"` - expected: all tests pass
- `! grep -rn $'\u2013\|\u2014' superdev` - expected: no output, exit 0
- `! grep -rn $'\u2013\|\u2014' CLAUDE.md README.md` - expected: no output, exit 0
- `grep -n 'BLOCKED' superdev/README.md superdev/hooks/content/manifest.md` - expected: at least one hit per file
- `node -e "const p=require('./superdev/.claude-plugin/plugin.json'); console.log(p.skills.length, p.agents.length)"` - expected: `20 7`

### Approach
1. In `superdev/README.md` rewrite step 5 of the flow and the track tables to describe: the per-task gate with its failure pass (Super track), the checkpoint review every 5 committed tasks while tasks remain, the final review as an integration round with a budget of one fix dispatch and one scoped re-review followed by the user's decision, finding IDs and the `debt.md` / `decisions.md` / `checkpoint-KK.md` files, the `BLOCKED` verdict, and that the orchestrator never edits files and escalates every interruption.
2. In the root `CLAUDE.md` update the `superdev` bullet (the build pipeline description), the `docs/.workflows/` layout entry (new files under `implementation/`), and the agents paragraph so the task reviewer's failure pass and the reviewers' stage contract are named; add `superdev/references/review-contract.md` next to the mention of `superdev/references/`.
3. In `superdev/hooks/content/manifest.md` add a short `## Build chain` section (four lines: per-task gate with failure pass on the Super track; checkpoint review every 5 committed tasks while tasks remain; final review as an integration round with a budget of one fix dispatch and one scoped re-review, then the user decides; `BLOCKED` means a criterion needs the user's decision, not more code) and replace the en dash on its line 4 with a hyphen. Open `superdev/.claude-plugin/plugin.json`; confirm `skills[]` and `agents[]` need no entry (no skill or agent added, renamed or removed) and record that in the notes.
4. Replace the two en dashes in `superdev/skills/intent/SKILL.md` (lines 45 and 81) with hyphens, then run the full suite and both dash greps; fix any dash introduced by earlier tasks in `superdev/`, `CLAUDE.md` or `README.md` (plain hyphen).

### Edge cases
- A dash found inside a file this build did not touch and not listed above: fix it anyway (the criterion is repo-wide for `superdev/`), and record the file as a `touched:` line.

### Contracts
- none

### DoD
README and root CLAUDE.md describe the chain as built by Tasks 6-11; no dash characters under `superdev/`, `CLAUDE.md`, `README.md`; `node --test "tests/**/*.test.ts"` green.


### Covered criteria
31. `node --test "tests/**/*.test.ts"` przechodzi w całości pod bash i Git-Bash.
34. `superdev/.claude-plugin/plugin.json`, `superdev/README.md`, root `CLAUDE.md` i `superdev/hooks/content/manifest.md` opisują nowy łańcuch (bramka per-task z failure pass, checkpoint co 5 zadań, recenzja końcowa integracyjna z budżetem 1+1, etykiety `stage`/`prior`/`since`/`decisions`, werdykt `BLOCKED`, pliki `checkpoint-NN.md`, `debt.md`, `decisions.md`) spójnie z treścią skilli i agentów.
35. Żaden plik pluginu nie zawiera em ani en dasha (sprawdzalne grepem po U+2013 i U+2014).
