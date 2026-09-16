
## Task 5 - Route the three build reviewers through the hybrid gate
- Covers: `success without fork` (#1), `no self-read` (#5), `single blocked owner` (#7)
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- `Give run.sh a deterministic RESULT and TAIL line` (Task 1) - blocks: the reviewers branch on `RESULT:`
- `Route the build gate through run.sh in the review contract` (Task 3) - blocks: each reviewer paragraph mirrors that contract's `## Gates`

### Files
- modify - superdev/skills/superbuild-reviewer-spec/SKILL.md (## Gates)
- modify - superdev/skills/superbuild-reviewer-change/SKILL.md (## Gates)
- modify - superdev/skills/simplebuild-reviewer/SKILL.md (## Gates)

### Test Commands
#### Build
- none - the repo has no build step (root `CLAUDE.md`)

#### Tests
- `node --test "tests/**/*.test.ts"`

### Approach
1. In each file replace the line "Build, test, lint and type-check runs go through `superdev:executor` (Skill tool) per the contract's `## Gates`…" with the hybrid sentence, worded exactly as `Route the build gate through run.sh in the review contract` (Task 3) states it: such runs go out as a direct `Bash` call to `${CLAUDE_PLUGIN_ROOT}/skills/executor/scripts/run.sh` per the contract's `## Gates`, and `superdev:executor` is invoked in analysis mode on `RESULT: DEVIATION` and on a `SUCCESS` whose `TAIL:` carries a non-zero skip count on a run some criterion's proof depends on.
2. Add to that same line the prohibition on opening the `LOG:` path with `Read`, keeping the existing reservation of raw `Bash` for `git` reads and `.temp/` probes.
3. Strike the clause "`VERDICT: BLOCKED` for a documented integration or e2e suite that cannot start here" from each file's preceding `## Gates` sentence, leaving the pointer at the contract's `## Gates` to carry every gate-command BLOCKED condition.
4. Leave all three frontmatters untouched - bare `Bash` in `allowed-tools` already covers an ordinary `run.sh` call, `${CLAUDE_PLUGIN_ROOT}` resolves inside a SKILL.md body as it already does in `superdev/skills/executor/SKILL.md`, and `Skill` is still needed for the deviation branch.

### Failure modes
- when a gate command returns `RESULT: DEVIATION` -> response dispatch `superdev:executor` in analysis mode and map its `VERDICT:` per the contract, log the `LOG:` path is handed to the fork and never opened by the reviewer, test none - the skill body is prose and the repo has no harness for skill bodies
- when `run.sh` reports `STATUS: error` or `STATUS: timeout` -> response `VERDICT: BLOCKED` per the contract's `## Gates`, settled before any dispatch, never PASS and never a finding against the code, log the `LOG:` path when one was printed, test none - same reason

### Contracts
- Consumes the hybrid gate route, the ordered mapping, the skip-count wording and the single-owner BLOCKED rule from `Route the build gate through run.sh in the review contract` (Task 3); introduces no contract of its own.

### DoD
All three reviewer bodies describe the hybrid route in the contract's own wording, none claims every gate command goes through the fork, none permits reading a log directly, and none carries its own BLOCKED summary; the suite stays green.


### Covered criteria
1. success without fork - a green gate command whose `TAIL:` shows no skipped cases completes through a direct `run.sh` Bash call, with no `superdev:executor` invocation anywhere in that path.
5. no self-read - the two task implementors and the three build reviewers are instructed to dispatch `superdev:executor` on a deviation and never to open the `LOG:` path with `Read` themselves.
7. single blocked owner - `## Gates` is the only place that states which gate-command outcomes yield `VERDICT: BLOCKED`; `## Verdict rules` and the three reviewer `## Gates` paragraphs carry a pointer to it instead of their own summary.
