# viber

Four steps from a raw idea to committed code: **understand it**, **plan it**, **build it**, **remember it**.
`viber` is the small track - one interview skill, one planner, one orchestrator, six agents - with two things
it refuses to compromise on: a plan no one builds until a reviewer passed it, and a commit per task.

It exists because the two usual failure modes of agentic building are both upstream of the code. A build that
starts from a half-understood request produces exactly what was asked and nothing that was needed. A build
driven from one context window runs out of room halfway and starts guessing. `viber` answers the first with
an interview that will not stop while an unknown is open, and the second by keeping the orchestrator empty:
it never reads a file, never runs a test, never writes a line of code - every piece of work happens inside a
subagent, and the plan file itself carries the progress.

Ships two hooks: a `PreToolUse` gate on the planner's review, enforced by the harness rather than by the
model, and a `SessionStart` hook that injects viber's manifest once per session.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install viber@p2p2 --scope user
```

No runtime dependencies - every bundled script is plain bash and awk. The one optional tool is Node, used
by `/viber:setup` to merge the recommended permissions into `.claude/settings.json`; without it that one
step prints the block for a manual merge and the setup continues.

**One caveat:** `superdev` gates `ExitPlanMode` too, and its gate denies a plan that declares neither
`# SimplePlan` nor `# SuperPlan`. A viber plan declares neither, so with both plugins installed the superdev
gate blocks viber's plan approval. Run one track at a time.

## Quick start

```
/viber:setup           once per project: the switches, the ignore rules and the permissions
/viber:idea            an interview about a raw idea, one question at a time
/viber:fixer           a bug traced to its root cause and proven, then handed to the planner
plan it                the planner, straight from an understood change
implement it           the orchestrator, straight from an approved plan
```

`planner` and `implementor` are model-invocable - they fire on the intent ("break this down", "build the
plan", "go ahead"), not on a command. `setup`, `idea` and `fixer` are user-only: the slash command is the
only way in. `tdd` is neither - `task-coder` invokes it through the `Skill` tool, and you never call it
yourself.

`setup` writes `.claude/viber.yml`, three switches that are all on there and all off when the file is
absent: `adr` (decisions worth keeping become the plan's first tasks), `memory` and `rules` (the build
closes by updating the project's `CLAUDE.md` nodes and `.claude/rules/`). It also seeds a `.gitignore` when
the project has none, appends the `.temp/` rule when it has one, and offers to merge a recommended
permissions block into `.claude/settings.json` - additively, so every entry already there survives.

## The steps

### 1. `idea` - the interview

Reads the repo first, so no question is spent on something the code already states. Then one question at a
time, each with 3 concrete options and a recommendation, in dependency order: the problem, the
done-condition, the boundaries, the binding constraints, the unknowns. It challenges a weak answer out loud
and asks again. It stops when nothing is open, shows a summary under 15 lines, and hands over to the planner
on your confirmation. It writes nothing.

With `adr` on it does one more pass before that summary: which decision made here is significant enough and
lasting enough to be worth an architecture decision record. You accept or drop each candidate, and the
accepted ones reach the planner.

### 2. `planner` - the plan, and the gate

Maps the files before writing a single task - locked-in file boundaries are what lets tasks run in parallel
later. Then a plan carrying the goal, numbered acceptance criteria, the file map, the contracts, and small
dependency-ordered tasks, each with a TDD marker, a `Covers` list, a runnable `Verification` and an
observable `DoD`. Task ids run `T1`, `T2`, … and the whole heading line, `T<n> - <title>`, is the commit
subject. An accepted decision record comes first, one task per ADR, carrying the record's own text.

`plan-index.sh` validates the structure - duplicate ids, missing fields, a dependency pointing forward, a
`Covers` naming a criterion that does not exist, and the same file claimed by two tasks that have no
dependency path between them, which would put two coders in one file at once. Then the `planner-review` agent
reads the plan against the actual codebase and returns PASS or blocking findings.

`ExitPlanMode` is gated on that PASS by the hook, not by the model's good intentions: no verdict, a FAIL
verdict, or a plan edited after its own verdict all deny the exit with the next step spelled out.

### 3. `implementor` - the build

Lands the plan in its own dated directory, `docs/_specs/<yyyy-mm-dd-HH-mm-ss>_<slug>/plan.md`, stamped at the
moment it lands - a second run of the same plan never overwrites the first. Then splits it in place:
`spec.md` carries the goal, the criteria, the scope and the contracts, and `tasks/T1.md`, `tasks/T2.md`, …
carry one task each, with the criteria it covers copied in. A coder gets the spec and its own task file and
nothing else, so it has no way to wander into a task another agent is holding open right now.

Then it profiles every task by the nature of its work: mechanical and
bounded goes to `haiku` with no review, ordinary feature work to `sonnet` with review, a load-bearing task
that defines a contract others consume to `opus` with review.

Dispatch is as wide as the rules allow - a task waits only for its real dependencies, and the validated plan
already guarantees that two tasks running at once never share a file. Each finished task is reviewed by `task-reviewer` against its own
definition, sent back to the coder on a FAIL (two rounds, then it asks you), and committed by
`commit-task.sh`, which stages **only** that task's files and takes the commit subject from the task's own
heading, so nothing outside the file map slips into a commit and the history reads like the plan. The run
closes with `test-runner` on the full suite; a repair it triggers is committed against the task it belongs
to, under `T<n>(<round>) - <title>`, so a fix is never an anonymous commit.

### 4. The close - what the build taught

Every coder leaves at most eight lines behind: the convention this codebase forced on it, the constraint it
discovered, the trap the next person would walk into - what the diff does not say. With `memory` and `rules`
on, the run ends by dispatching two agents over those notes, in parallel: one folds what is now true into the
project's `CLAUDE.md` nodes, the other records a convention the build actually demonstrated in
`.claude/rules/`. Whatever they wrote is committed in one `chore(viber):` commit whose subject follows the
paths, not the model.

Both are deltas, not reports. A build that taught the project nothing leaves nothing behind.

## Resuming

The plan file is the state. `commit-task.sh` records each finished task in the plan's own `<!-- done: ... -->`
marker and updates its `## Tasks (x/N)` header, so a build interrupted by a context reset resumes by
re-reading the plan: done tasks are skipped, the rest continue.

## What it ships

| Kind | Name | Role |
| --- | --- | --- |
| Skill | `setup` | The switches, the ignore rules and the permissions. User-only, once per project. |
| Skill | `idea` | The interview. User-only, writes nothing. |
| Skill | `planner` | The plan plus its review gate. |
| Skill | `implementor` | The orchestrator. Reads no code, runs no tests. |
| Skill | `fixer` | A bug traced to its root cause and proven by a failing test, then handed to the planner. |
| Skill | `tdd` | The Red-Green-Refactor discipline a `TDD: required` task is built under. |
| Agent | `planner-review` | Gates the plan. Read-only. |
| Agent | `task-coder` | Implements one task, or fixes one report, and proves it green. |
| Agent | `task-reviewer` | Gates one implemented task. Writes only its report. |
| Agent | `test-runner` | One full suite run, one-line verdict, log stays out of the caller. |
| Agent | `memory-writer` | Folds what the build taught into the project's `CLAUDE.md` nodes. |
| Agent | `rules-writer` | Records a convention the build confirmed in `.claude/rules/`. |
| Script | `plan-path.sh` | Resolves the run's dated directory - a new run or the one already open. |
| Script | `plan-index.sh` | Validates the plan, returns the task index, and on `--split` decomposes it. |
| Script | `commit-task.sh` | Stages the task's files, commits, records progress in the plan. |
| Script | `config.sh` | Resolves the three switches. Fail-open: no file, nothing on. |
| Hook | `plan-gate.sh` | `PreToolUse` on `ExitPlanMode` - the review gate. |
| Hook | `session-start.sh` | `SessionStart` - injects `hooks/content/manifest.md` once per session. |

## Where it writes

- `docs/_specs/<yyyy-mm-dd-HH-mm-ss>_<slug>/` - `plan.md` carrying its own progress, plus the `spec.md` and
  `tasks/T<n>.md` the agents read.
- `.temp/viber/<yyyy-mm-dd-HH-mm-ss>_<slug>/` - review reports, test reports and the coders' notes.
- `.claude/viber.yml` - the three switches, written once by `setup`.
- `.gitignore` and `.claude/settings.json` - only through `setup`, only additively: a file you already
  have keeps its own entries.
- `docs/adr/`, your `CLAUDE.md` nodes and `.claude/rules/` - only through a task or an agent, only with the
  matching switch on.

Nothing else. No plugin-named dot-dir in your repo, no state file.
