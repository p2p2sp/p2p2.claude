
## Task 2 - Grant the three build reviewers the executor route
- Covers: `Reviewer grant` (#5), `Executor untouched` (#6)
- TDD: none
- Model: sonnet
- Effort: high

### Dependencies
- `Give the review contract the executor route, dedup and verdict mapping` (Task 1) - blocks: the sentence added here points at the contract's `## Gates` rule, which must exist first.

### Files
- modify - superdev/skills/superbuild-reviewer-spec/SKILL.md (`allowed-tools`, `## Gates`)
- modify - superdev/skills/superbuild-reviewer-change/SKILL.md (`allowed-tools`, `## Gates`)
- modify - superdev/skills/simplebuild-reviewer/SKILL.md (`allowed-tools`, `## Gates`)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild-reviewer-spec

#### Tests
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild-reviewer-change
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simplebuild-reviewer
- grep -n "^allowed-tools:.*Skill" superdev/skills/superbuild-reviewer-spec/SKILL.md
- grep -n "^allowed-tools:.*Skill" superdev/skills/superbuild-reviewer-change/SKILL.md
- grep -n "^allowed-tools:.*Skill" superdev/skills/simplebuild-reviewer/SKILL.md
- node --test "tests/**/*.test.ts"

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below.
2. In each of the three files, add `Skill` to the `allowed-tools` line, keeping every existing entry and its order, including the trailing `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/resolve-input.sh:*)` pattern and the bare `Bash` the six `printf | tr | sed | head` preloads depend on.
3. In each file's own `## Gates` section, append one sentence at the end of the section, after its last paragraph, worded the same in all three: build, test, lint and type-check runs go through `superdev:executor` (Skill tool) per the contract's `## Gates`, never through raw `Bash`, while raw `Bash` stays for `git`, file inspection and the reviewer's own probes. In `superbuild-reviewer-spec` the section has two paragraphs and the anchor is the second, the one about a plan with no `Test Commands`. Mirror the phrasing the two task implementor agents already carry.
4. Change nothing in `superdev/skills/executor/SKILL.md`, `superdev/skills/executor/scripts/run.sh`, `superdev/agents/superbuild-task-implementor.md` or `superdev/agents/simplebuild-task-implementor.md`.

### Failure modes
- none - wiring; this task adds a permission entry and one sentence and decides no branch of its own, every gate branch being owned by `Give the review contract the executor route, dedup and verdict mapping` (Task 1).

### Contracts
- none

### DoD
All three reviewers carry `Skill` in `allowed-tools` and the mirrored sentence in their `## Gates` section; each of the three greps prints its file's `allowed-tools` line; every lint run prints `FAIL=0`; `git status --short` lists no change under `superdev/skills/executor/` or `superdev/agents/`; the test suite is green.


### Covered criteria
5. Reviewer grant - `superbuild-reviewer-spec`, `superbuild-reviewer-change` and `simplebuild-reviewer` each carry `Skill` in `allowed-tools` and one sentence in their own `## Gates` section forbidding raw `Bash` for build, test, lint and type-check runs.
6. Executor untouched - `superdev/skills/executor/SKILL.md`, `superdev/skills/executor/scripts/run.sh`, `superdev/agents/superbuild-task-implementor.md` and `superdev/agents/simplebuild-task-implementor.md` carry no change from this build.
