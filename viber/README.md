# viber

Three steps from a raw idea to committed code: **understand it**, **plan it**, **build it**. `viber` is the
small track - one interview skill, one planner, one orchestrator, four agents - with two things it refuses
to compromise on: a plan no one builds until a reviewer passed it, and a commit per task.

It exists because the two usual failure modes of agentic building are both upstream of the code. A build that
starts from a half-understood request produces exactly what was asked and nothing that was needed. A build
driven from one context window runs out of room halfway and starts guessing. `viber` answers the first with
an interview that will not stop while an unknown is open, and the second by keeping the orchestrator empty:
it never reads a file, never runs a test, never writes a line of code - every piece of work happens inside a
subagent, and the plan file itself carries the progress.

Ships one `PreToolUse` hook: the planner's review gate, enforced by the harness rather than by the model.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install viber@p2p2 --scope user
```

No runtime dependencies - both bundled scripts are plain bash and awk.

**One caveat:** `superdev` gates `ExitPlanMode` too, and its gate denies a plan that declares neither
`# SimplePlan` nor `# SuperPlan`. A viber plan declares neither, so with both plugins installed the superdev
gate blocks viber's plan approval. Run one track at a time.

## Quick start

```
/viber:idea            an interview about a raw idea, one question at a time
plan it                the planner, straight from an understood change
implement it           the orchestrator, straight from an approved plan
```

`planner` and `implementor` are model-invocable - they fire on the intent ("break this down", "build the
plan", "go ahead"), not on a command. `idea` is user-only: `/viber:idea` is the only way in.

## The three steps

### 1. `idea` - the interview

Reads the repo first, so no question is spent on something the code already states. Then one question at a
time, each with 2-4 concrete options and a recommendation, in dependency order: the problem, the
done-condition, the boundaries, the binding constraints, the unknowns. It challenges a weak answer out loud
and asks again. It stops when nothing is open, shows a summary under 15 lines, and hands over to the planner
on your confirmation. It writes nothing.

### 2. `planner` - the plan, and the gate

Maps the files before writing a single task - locked-in file boundaries are what lets tasks run in parallel
later. Then a plan carrying the goal, numbered acceptance criteria, the file map, the contracts, and small
dependency-ordered tasks, each with a TDD marker, a `Covers` list, a runnable `Verification` and an
observable `DoD`. The task title is its commit subject.

`plan-index.sh` validates the structure - duplicate ids, missing fields, a dependency pointing forward, a
`Covers` naming a criterion that does not exist, and the same file claimed by two tasks that have no
dependency path between them, which would put two coders in one file at once. Then the `planner-review` agent
reads the plan against the actual codebase and returns PASS or blocking findings.

`ExitPlanMode` is gated on that PASS by the hook, not by the model's good intentions: no verdict, a FAIL
verdict, or a plan edited after its own verdict all deny the exit with the next step spelled out.

### 3. `implementor` - the build

Lands the plan in its own dated directory, `docs/plans/<yyyy-mm-dd-HH-mm-ss>_<slug>/plan.md`, stamped at the
moment it lands - a second run of the same plan never overwrites the first. Then profiles every task by the
nature of its work: mechanical and
bounded goes to `haiku` with no review, ordinary feature work to `sonnet` with review, a load-bearing task
that defines a contract others consume to `opus` with review.

Dispatch is as wide as the rules allow - a task waits only for its real dependencies, and the validated plan
already guarantees that two tasks running at once never share a file. Each finished task is reviewed by `task-reviewer` against its own
definition, sent back to the coder on a FAIL (two rounds, then it asks you), and committed by
`commit-task.sh`, which stages **only** that task's files, so nothing outside the file map slips into a
commit. The run closes with `test-runner` on the full suite.

## Resuming

The plan file is the state. `commit-task.sh` records each finished task in the plan's own `<!-- done: ... -->`
marker and updates its `## Tasks (x/N)` header, so a build interrupted by a context reset resumes by
re-reading the plan: done tasks are skipped, the rest continue.

## What it ships

| Kind | Name | Role |
| --- | --- | --- |
| Skill | `idea` | The interview. User-only, writes nothing. |
| Skill | `planner` | The plan plus its review gate. |
| Skill | `implementor` | The orchestrator. Reads no code, runs no tests. |
| Agent | `planner-review` | Gates the plan. Read-only. |
| Agent | `task-coder` | Implements one task, or fixes one report, and proves it green. |
| Agent | `task-reviewer` | Gates one implemented task. Writes only its report. |
| Agent | `test-runner` | One full suite run, one-line verdict, log stays out of the caller. |
| Script | `plan-path.sh` | Resolves the plan's dated directory - a new run or the one already open. |
| Script | `plan-index.sh` | Validates the plan, returns the compact task index. |
| Script | `commit-task.sh` | Stages the task's files, commits, records progress in the plan. |
| Hook | `plan-gate.sh` | `PreToolUse` on `ExitPlanMode` - the review gate. |

## Where it writes

- `docs/plans/<yyyy-mm-dd-HH-mm-ss>_<slug>/plan.md` - the plan, carrying its own progress.
- `.temp/viber/<yyyy-mm-dd-HH-mm-ss>_<slug>/` - review and test reports of that run.

Nothing else. No plugin-named dot-dir in your repo, no state file.
