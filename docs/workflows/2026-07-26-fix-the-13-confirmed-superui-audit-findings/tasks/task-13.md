
## Task 13 - docs(superui): correct the agent topology and self-contradictions in superui/CLAUDE.md
- Covers: criteria #13
- TDD: none

### Dependencies
- none - blocks: Task 14

### Files
- modify - superui/CLAUDE.md (intro paragraph, `## Layout (superui internals)`, the `setup` and `design-extractor` skill bullets, `## Agents (design-extractor-builder workers)`)

### Test Commands
*Build*
- none - markdown only; this repo has no build step

*Tests*
- `grep -c "PASS/FAIL lines with install hints" superui/CLAUDE.md` - expect 0
- `grep -c "for everything else" superui/CLAUDE.md` - expect 0
- `grep -c "measuring: source-scout" superui/CLAUDE.md` - expect 0

### Approach
1. Correct the ownership split in all five places that state it: the intro paragraph's "the six agents `design-extractor` dispatches through its builder", the `agents/` line in `## Layout`, the `design-extractor` bullet's "dispatches `design-extractor-builder` for everything else", the `design-extractor-builder` bullet's "fans out to the agents below", and the `## Agents (design-extractor-builder workers)` heading. The head skill dispatches `source-scout` (step 2) and `component-scout` (step 4) itself; the builder dispatches the other four.
2. Resolve the `source-scout` contradiction: `## Layout` classifies it as measuring while its own bullet says it measures nothing, and its frontmatter carries no `Bash`. Only `foundation-analyst` and `spec-writer` can run a measuring script - reclassify accordingly.
3. Correct the `setup` bullet: `check_env.sh` emits `NODE <cmd>|MISSING` and `VERSION <v>`, not "PASS/FAIL lines with install hints". The PASS/FAIL table lives in `skills/setup/SKILL.md`, and this file already describes the script correctly in its `## Scripts inventory` entry - align the two.
4. Leave `.claude-plugin/plugin.json` alone: its `agents[]` correctly lists six, verified against disk.

### Edge cases
- This file is dev-time orientation and never a plugin runtime input; the fix targets editor accuracy, not behavior.
- The `## Scripts inventory` section is accurate throughout and must not be rewritten.
- Keep the file's existing voice and structure - this is a correction pass, not a rewrite.

### Contracts
No interface change.

### DoD
Every claim in `superui/CLAUDE.md` about which component dispatches which agent, and about what `check_env.sh` prints, matches the shipped files.


### Covered criteria
13. `superui/CLAUDE.md` states the real agent ownership split and contradicts itself nowhere about `source-scout` or `check_env.sh`.
