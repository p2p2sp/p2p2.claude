# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Route build reviewer gates through the executor fork"
Intent: docs/.workflows/2026-09-16-reviewer-gates-through-executor/intent.md
Plan: C:\Users\dario\.claude-p2p2\plans\kind-sleeping-dongarra.md

---
<!-- HEADER -->

## Goal
The three superdev build reviewers run every gate command through the `superdev:executor` fork instead of raw `Bash`, so the full output of a build or a test suite never lands in the reviewer's context. Each distinct command runs once per stage, the executor's four verdicts map onto defined gate outcomes, and the rule lives in `superdev/references/review-contract.md` with a one-sentence mirror in each reviewer. The executor skill, its `run.sh` and both task implementors stay untouched.

## Context
Today each build reviewer starts a stage by running the plan's build command, every `Test Commands` block and any documented integration suite through raw `Bash`, before it reads a single line of code. A ten-task plan yields roughly twenty runs whose full output enters a context that already carries the spec, the plan, the prior report and `git diff <since>..HEAD`. The `superdev:executor` fork already solves exactly this for both task implementors: it runs one command, logs the output under `.temp/superdev/logs/` and returns at most forty lines. `Skill` is absent from the reviewers' `allowed-tools`, so the call would stall a fork that cannot answer a permission prompt, and the contract's `## Gates` section says what to run but never how. This change adds the transport, the deduplication rule and the verdict mapping to the contract, and grants the three reviewers the tool.

## Out of scope
- `superdev/agents/superbuild-task-reviewer.md` and its `git status --short` run.
- Moving `run.sh` out of `superdev/skills/executor/scripts/`.
- Any new field in the executor's output shape.
- Converting the three build reviewers from forks into agents.
- The reviewers' own reading of `git diff <since>..HEAD`.

## Acceptance criteria
1. Executor route - `## Gates` in `superdev/references/review-contract.md` names `superdev:executor` (Skill tool) as the route for every gate command, one command per invocation, and states that raw `Bash` remains for `git` reads and for the reviewer's own probes under `.temp/`.
2. Command dedup - `## Gates` collects the gate commands first and runs each distinct command string exactly once per stage, treating a filtered variant as its own command; `## Report skeleton` describes the report's gates section as one line per distinct command naming the tasks that declared it.
3. Verdict mapping - `## Gates` maps `VERDICT: PASS` to a green gate, `VERDICT: FAIL` to a red one, and `VERDICT: ERROR` or `VERDICT: TIMEOUT` to `VERDICT: BLOCKED` with a `### Needs decision` bullet, never PASS and never a finding against the code, and requires an explicit `timeout:` on every gate invocation.
4. Skip evidence - `## Gates` states that the executor's `SUMMARY:` line is read verbatim and that a non-zero skip count on a run a criterion's proof depends on obliges the reviewer to open the `LOG:` path before marking that criterion met.
5. Reviewer grant - `superbuild-reviewer-spec`, `superbuild-reviewer-change` and `simplebuild-reviewer` each carry `Skill` in `allowed-tools` and one sentence in their own `## Gates` section forbidding raw `Bash` for build, test, lint and type-check runs.
6. Executor untouched - `superdev/skills/executor/SKILL.md`, `superdev/skills/executor/scripts/run.sh`, `superdev/agents/superbuild-task-implementor.md` and `superdev/agents/simplebuild-task-implementor.md` carry no change from this build.
7. Docs synced - the root `CLAUDE.md` and `superdev/README.md` both say the three build reviewers route their gate runs through the executor, alongside the two task implementors.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - Give the review contract the executor route, dedup and verdict mapping
- Covers: `Executor route` (#1), `Command dedup` (#2), `Verdict mapping` (#3), `Skip evidence` (#4)
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- none

### Files
- modify - superdev/references/review-contract.md (`## Gates`, `## Report skeleton`)

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- grep -n "superdev:executor" superdev/references/review-contract.md

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below; it owns the editing discipline for skill, agent and reference files.
2. In `superdev/references/review-contract.md`, keep the existing `## Gates` list of what to run and add how it runs: every gate command goes through the `superdev:executor` skill with the Skill tool, one `command:` per invocation with an explicit `timeout:` generous enough for the host's slowest documented suite; raw `Bash` stays for `git` reads and for the reviewer's own probes under `.temp/`. Keep the section stack-agnostic per the contract's own opening clause: no ecosystem's tool names.
3. In the same section, add the collection-and-dedup rule: the gate commands are gathered from the plan before any run, matched by exact string, and each distinct string runs once per stage; a filtered variant of a suite is a distinct command and runs on its own.
4. In the same section, add the verdict mapping: `VERDICT: PASS` is a green gate, `VERDICT: FAIL` is a red one whose failures feed findings as they do today, and `VERDICT: ERROR` or `VERDICT: TIMEOUT` is BLOCKED for any gate command. That means widening the section's existing cannot-start branch, today scoped to the integration or e2e command alone, so it covers every gate command whatever its kind.
5. In the same section, add the evidence rule: the executor's `SUMMARY:` line is carried into the report verbatim, and a non-zero skip count on a run that a criterion's proof depends on sends the reviewer to the `LOG:` path before that criterion may be marked met, alongside the existing rule that a run which did not happen never makes a criterion met. State the rule's own bound: it reads whatever figure the aggregate line carries, and an aggregate line that reports no skips at all leaves the reviewer nothing to infer, so the section's other rules stand unchanged there.
6. In `## Report skeleton`, change the gates bullet from one line per command run to one line per distinct command, each carrying that command's `VERDICT:` and `SUMMARY:` and the plan tasks that declared it, leaving the section's position and the two existing single-sentence cases unchanged.

### Failure modes
- when a gate command returns `VERDICT: ERROR` or `VERDICT: TIMEOUT` from the executor -> response `VERDICT: BLOCKED` with a `### Needs decision` bullet naming that command, never PASS and never a finding against the code, log that command's line in the report's gates section carrying the executor verdict verbatim, test none - contract text, exercised by the reviewer reading the contract at run time.
- when input is invalid (a plan declaring no `Test Commands` and no command documented anywhere) -> response the existing read-only review stands and every criterion needing a run stays not met, log the sentence the section already requires in the report's gates section, test none - contract text, branch unchanged by this task.

### Contracts
- `## Gates` transport rule of `superdev/references/review-contract.md`: gate commands run through `superdev:executor` (Skill tool), raw `Bash` reserved for `git` reads and `.temp/` probes; consumed by `Grant the three build reviewers the executor route` (Task 2).
- `## Gates` verdict mapping: `PASS` green, `FAIL` red, `ERROR` and `TIMEOUT` to `BLOCKED`; consumed by `Grant the three build reviewers the executor route` (Task 2).

### DoD
`## Gates` carries the transport rule, the dedup rule, the verdict mapping and the skip-evidence rule; `## Report skeleton` describes the gates section as one line per distinct command; the grep finds `superdev:executor` in the contract; the test suite is green.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - Sync the repo documentation with the new gate route
- Covers: `Docs synced` (#7)
- TDD: none
- Model: sonnet
- Effort: low

### Dependencies
- `Grant the three build reviewers the executor route` (Task 2) - blocks: the documentation states the delivered route, so it lands after that route exists.

### Files
- modify - CLAUDE.md (superdev bullet, the executor sentence)
- modify - superdev/README.md (the `executor` skill-table row)

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- grep -n "build reviewers" superdev/README.md

### Approach
1. In the root `CLAUDE.md`, extend the superdev bullet's sentence that today names only the two task implementors as the executor's callers, so it also names the three build reviewers running their gate commands the same way, and leave the sentence about the reviewers staying forks in `skills[]` as it is.
2. In `superdev/README.md`, change the `executor` row of the skill table so its clause about who routes through it names the two task implementors and the three build reviewers.

### Failure modes
- none - documentation; this task changes no instruction any worker executes.

### Contracts
- none

### DoD
The root `CLAUDE.md` and `superdev/README.md` both name the three build reviewers as executor callers; the grep finds the phrase in the README; the test suite is green.

<!-- /TASK -->

---

<!-- repeat Task <N> per unit of work; leave intact all comment markers; keep tasks small, independently testable, and builder-executable unattended (no interactive human step) -->
