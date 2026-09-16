Title: "Route build reviewer gates through the executor fork"
Intent: docs/.workflows/2026-09-16-reviewer-gates-through-executor/intent.md


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

