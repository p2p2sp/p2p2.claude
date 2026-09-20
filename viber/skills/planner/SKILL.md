---
name: planner
description: Writes and reviews the implementation plan for an understood change.
allowed-tools: Read, Write, Edit, Grep, Glob, Agent, Skill, EnterPlanMode, ExitPlanMode, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/plan-index.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/config.sh:*), Bash(date:*), Bash(git log:*), Bash(git status:*)
user-invocable: false
---

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/config.sh"
```

CRITICAL: call `EnterPlanMode` first unless plan mode is already active.

# planner

Input: an understood change, already in context. Anything still open - the goal, the done-condition, the boundaries - means the input is not ready: run the `viber:idea` skill, then come back.

The plan answers HOW. It carries every detail, acceptance criterion and DoD the implementation needs, and says nothing about the way a task should be coded - that choice belongs to whoever implements it.

## 1. Map the files first

Before writing a single task, decide which files get created, modified or deleted and what each one owns. Locked-in file boundaries are what lets tasks run in parallel later.

- One responsibility per file. Files that change together live together.
- In an existing codebase follow its established patterns instead of restructuring around them. A file you have to touch that has grown unwieldy may be split - say so as a task.

## 2. Write the plan

Fill `${CLAUDE_SKILL_DIR}/templates/plan.md` into the plan file plan mode names in its system message - while planning it is the only file you may write. Keep every section and every HTML marker from the template, add no sections of your own.

The `<!-- source: -->` marker carries that same path, absolute and written out in full. Approving the plan may clear this context and leave the implementor holding the plan's TEXT alone, so that line is the only way back to the file it has to land.

Everything above `## Tasks` is WHAT and WHY: goal, acceptance criteria, file map, boundary. Not one signature, type, endpoint, error code or dictionary key belongs there - every shape lives in a `## Contracts` block below the tasks and reaches a coder through its `Uses:` line. That half is split off as `spec.md` and read whole by whoever reads it; a contract parked in it is the whole plan's detail in the context of a task that touches one line of it.

Task rules:

- Smallest unit that carries its own verification and is worth a reviewer's gate. Fold setup, config and docs into the task whose deliverable needs them.
- Task ids are `T1`, `T2`, … in order. `Depends-on` may reference lower-numbered tasks only, which keeps the graph acyclic.
- Declare a dependency only for a real ordering constraint - one task consuming what another produces. Every false dependency costs parallelism.
- `Files` is the task's complete file map, comma-separated on one line: exact repo-relative paths, no globs, no directories, no annotations. It is what gets staged for the commit and what the collision check compares.
- `Uses` names every contract block the task touches - the ones it writes and the ones it only calls - or `none`. It is mandatory, because the task file is a coder's whole input: a shape left off the line reaches nobody and gets invented instead.
- Tasks with no dependency path between them must not list the same file - they run at the same time.
- `Delivers` states WHAT the task produces. Never how to code it, never a line number.
- `Verification` is a runnable command plus the result that counts as proof, scoped to the task's own `Files` and the tests covering them, never a whole-project suite: other tasks are being written in the same tree at the same time, and the full run is the build's close. A task with no runtime behaviour verifies its artefact instead: the file exists and its required content greps, never "read it and judge".
- `TDD: required` by default. `TDD: none` only where the task changes no runtime behaviour: config, docs, mechanical rename, scaffolding.
- A reproduction test already RED in the tree goes into the fixing task's `Files:` - nothing outside a file map gets committed - and that task carries `TDD: none`: its RED cycle is done.
- Every acceptance criterion is covered by at least one task's `Covers` - an uncovered one is rejected at validation. A condition no single task delivers, like the suite staying green, is not an acceptance criterion: that is the build's own close.
- The whole heading line, `T<n> - <title>`, is committed verbatim as the commit subject, so the title is one short imperative summary of what the task delivers.

Contract rules:

- One `### C<n> - <name>` block per shape the change introduces or consumes, ids `C1`, `C2`, … in order, all of them under the `## Contracts` appendix below the tasks. A change that introduces no shape has no appendix and every task carries `Uses: none`.
- The block carries the shape itself and nothing else - no rationale, no history, no instruction on how to build it.
- Every block is named by at least one task's `Uses`; one nobody names is rejected at validation, because the split slices contracts by that line and no coder would ever see it.
- Never say which task writes a block and which only calls it: the task whose `Files` holds the block's own file writes it, every other one takes it exactly as written.

ADR tasks, only with `adr: true` above; otherwise skip the rest of this section entirely.

- Before writing the tasks, look over the change and the design decisions this plan settles for one that is architecturally significant and lasting: it constrains work that comes after it, reversing it is expensive, and `docs/adr/` does not record it yet. A choice the code already implies is not one, and neither is a preference. No candidate means no question and no ADR task.
- Put each candidate to the user in prose, one line each - the decision, the alternative it beat - and let them accept or drop it. Each accepted one becomes a task of its own, ahead of every other task.
- `Files: docs/adr/<yyyy-mm-dd>-<slug>.md`, the date from `date +%Y-%m-%d` so the path is exact - it is a commit file map, not a pattern. `TDD: none`, `Uses: none`, `Depends-on: none`, and nothing ever depends on it.
- `Delivers` carries the record itself, because the task file is all its writer gets: the title, `Status: accepted` with the date, then Context, Decision, Alternatives (what it beat and why not) and Consequences.
- `Verification: test -f <path> && grep -q '^Status: accepted' <path> -> exit 0`, that path written out in full both times; `DoD`: the record exists there and carries every part `Delivers` lists.
- Add one acceptance criterion for the record and point every ADR task's `Covers` at it.

Then run `"${CLAUDE_PLUGIN_ROOT}/scripts/plan-index.sh" <plan-path>` as one literal Bash line, no interpreter word in front - any other form is an unapproved call that stalls on a permission prompt. It must exit 0 - it validates ids, required fields, dependency direction, `Covers` and `Uses` in both directions (every reference points at a real criterion or contract block, every criterion and every block is reached by some task), the `Files` format, and that no two tasks without a dependency path between them list the same file. Fix whatever it reports and re-run.

Show the user the full path of the written plan.

## 3. Review gate

Dispatch the `viber:planner-review` agent with the plan path. From round 2 on, also pass the previous findings verbatim and one line per fix you applied.

- `VERDICT: PASS` - go to step 4.
- `VERDICT: FAIL` - show the findings, fix the plan, re-run `plan-index.sh` whenever a fix touched a task's fields, ids, `Depends-on`, `Files` or `Covers`, then dispatch again. A finding that needs a decision only the user can make gets asked first, and the answer starts a fresh round 1.

## 4. Hand off

Call `ExitPlanMode` only after a PASS - the user approves a reviewed plan, not a draft. Name `viber:implementor` as the next step and repeat the plan file's full path with it: the approval may clear this context, and that path is the whole handover.
