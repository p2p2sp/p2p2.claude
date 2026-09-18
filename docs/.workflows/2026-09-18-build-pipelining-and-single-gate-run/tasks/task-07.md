
## Task 7 - Hand the gate block to the Simple track reviewer
- TDD: none
- Kind: text
- Model: sonnet
- Covers: `Reguła bramy wspólna dla obu ciężarów biegu` (#11)

### Dependencies
- `Add the gates and range labels to the review contract and move the gate run to the orchestrator` (Task 1) - blocks: the `gates:` label this orchestrator passes
- `Write run-gate.sh and its test` (Task 2) - blocks: the script this step calls
- `Add the concurrency column to the decompose index` (Task 3) - blocks: the fifth column this skill's index sentence describes
- `Read the handed gate block in the three build reviewers` (Task 5) - blocks: the reviewer that accepts `gates:`
- `Pipeline the per-task review and make the checkpoint agent conditional in superbuild` (Task 6) - blocks: the gate-block path shape and the round wording this task mirrors

### Files
- modify - superdev/skills/simplebuild/SKILL.md (frontmatter `allowed-tools`, `## Step 1 - Decompose Plan`, `### Checkpoint`, `### Fix loop`, `## Step 3 - Final Review`)

### Task Checks
- grep -n 'GATES:' superdev/skills/simplebuild/SKILL.md
- grep -n 'gates:' superdev/skills/simplebuild/SKILL.md

### Approach
1. Frontmatter: add one `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/run-gate.sh:*)` pattern to `allowed-tools`. In `## Step 1`, reduce the `printf` line to the references directory alone, drop `<runner>` from the tracked values, and update the index-row sentence that today describes four columns and tells this track to ignore the fourth: the index now carries five, and this track ignores the fourth and the fifth alike.
2. In `### Checkpoint`, run `run-gate.sh` with stage `checkpoint` before the dispatch, naming the gate file as the gate-block path contract of `Pipeline the per-task review and make the checkpoint agent conditional in superbuild` (Task 6) fixes it, and pass its `GATES:` path on `gates:` in place of `runner:`. State that this track dispatches its reviewer unconditionally, because no task of it carries a per-task review and the checkpoint is therefore its only gate.
3. In `## Step 3` and in `### Fix loop`'s re-review step, run `run-gate.sh` once per round and pass the resulting path on `gates:`, replacing each `runner:` line, naming the stage and the gate file exactly as the gate-block path contract of `Pipeline the per-task review and make the checkpoint agent conditional in superbuild` (Task 6) fixes them.

### Failure modes
- when `run-gate.sh` exits non-zero -> response `AskUserQuestion` (retry the script / dispatch the reviewer without a gate block / abort), log one `escalation` stats event carrying the exit code and the answer, test none - orchestrator prose

### Contracts
none - this task consumes the contracts Tasks 1, 2 and 6 define and introduces none of its own

### DoD
`simplebuild` runs each round's gate set once through `run-gate.sh`, hands the result on `gates:`, carries no `runner:` line, and keeps its checkpoint unconditional.


### Covered criteria
11. Reguła bramy wspólna dla obu ciężarów biegu - Zasada pojedynczego uruchomienia obowiązuje
    w biegu lżejszym tak samo jak w cięższym.
