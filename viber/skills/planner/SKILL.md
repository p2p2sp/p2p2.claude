---
name: planner
description: Turns an understood change into a reviewed implementation plan - acceptance criteria, file map, then tasks carrying dependencies, contracts, verification and DoD. Invoked by viber:idea with a confirmed interview or by viber:fixer with a diagnosis; any other input goes to viber:idea first.
allowed-tools: Read, Write, Edit, Grep, Glob, Agent, Skill, EnterPlanMode, ExitPlanMode, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/plan-index.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/config.sh:*), Bash(date:*)
user-invocable: false
---

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/config.sh"
```

CRITICAL: call `EnterPlanMode` first unless plan mode is already active.

Display the full path to the plan file to the user.

# planner

Input: an understood change already in context, arriving one of two ways - a confirmed `viber:idea` interview, or a `viber:fixer` diagnosis with its fix plan. Anything else is unresolved input however clear it reads: invoke the `viber:idea` skill, then come back with what it confirms. Never size the scope yourself - splitting an idea too broad for one cycle happens in that interview.

The input carries three decisions already taken: the spec shape, whether this plan stops at a draft, and - on a round continuing an earlier draft - that draft's run key. Take all three as given and never reopen them. A round continuing a draft opens by asking the user which round it is: another draft to circulate, or the task half on top of a settled specification.

The plan answers HOW. It carries every detail, acceptance criterion and DoD the implementation needs, and says nothing about the way a task should be coded.

## 1. Map the files first

Read `${CLAUDE_PLUGIN_ROOT}/references/test-strategy.md` first: it decides how the work is sliced, where each criterion's proof lives, and which deliverables carry no test at all. A plan stopping at a draft skips it - nothing is sliced yet.

Before writing a single task, decide which files get created, modified or deleted and what each one owns. Locked-in file boundaries are what lets tasks run in parallel later.

- One responsibility per file. Files that change together live together.
- Map what the change FORCES, not only what it introduces: where a new type is registered, exported or wired up for anything to resolve it, where a new persisted shape is declared and migrated, every test asserting an aggregate over what you touch - a count, an enumeration, a snapshot. Read the codebase for them now. Left off the map they surface mid-build, inside a coder bounded by a file list that does not name them.
- In an existing codebase follow its established patterns instead of restructuring around them. A file you have to touch that has grown unwieldy may be split - say so as a task.

## 2. Write the plan

The plan is two halves. The specification is `${CLAUDE_SKILL_DIR}/templates/spec-lite.md` or `${CLAUDE_SKILL_DIR}/templates/spec-full.md`, whichever shape the input names; the task half is `${CLAUDE_SKILL_DIR}/templates/tasks.md`, the same file behind either shape. Fill the chosen spec, append the task half under it, and write the result into the plan file plan mode names in its system message - while planning it is the only file you may write. Keep every section and every HTML marker from both templates, add no sections of your own.

Write that plan file's own path, absolute and in full, into the frontmatter's `source:` key. Approving the plan may clear this context and leave the implementor holding the plan's TEXT alone, so that line is the only way back to the file.

An input carrying a roadmap fills `## Roadmap` with the ordered subprojects, marks the entry this plan covers and repeats every later entry under `### Out of scope`; no roadmap in the input means no such section. The plan file is the only place the roadmap survives, because the next cycle starts in a context this one never reaches. What a later entry brings stays absent: no task delivers a stand-in for it, no acceptance criterion depends on it, and nothing is stubbed, mocked or temporarily substituted to make this plan look finished.

Everything above `## Tasks` is WHAT and WHY: goal, problem, current behaviour, roadmap, scenarios, glossary, acceptance criteria, file map, boundary, constraints. Not one signature, type, endpoint, error code or dictionary key belongs there - every shape lives in a `## Contracts` block below the tasks and reaches a coder through its `Uses:` line. That half is split off as `spec.md` and read whole by whoever reads it.

A `## Glossary` term the code has to name - one that becomes an identifier, a field, a state or a value a coder writes - therefore gets its own `### C<n>` block as well, named by the `Uses:` of every task that writes or reads it. The glossary explains the concept to a person and reaches no coder; the block is the only way the term arrives spelled. `File: none` is the right answer for a term living in no file of its own.

A plan stopping at a draft ends the step here: the specification half alone, no `## Tasks`, no `## Contracts` appendix and no `plan-index.sh` to validate them. The rest of this step is the round that adds them; go to step 3.

Task rules:

- Smallest unit that carries its own verification and is worth a reviewer's gate. Fold setup, config and docs into the task whose deliverable needs them.
- Task ids are `T1`, `T2`, … in order. `Depends-on` may reference lower-numbered tasks only, which keeps the graph acyclic.
- Declare a dependency only for a real ordering constraint - one task consuming what another produces. Every false dependency costs parallelism.
- `Files` is the task's complete file map, comma-separated on one line: exact repo-relative paths, no globs, no directories, no annotations. It is what gets staged for the commit and what the collision check compares. A bracket wrapping a whole path segment (`[id]`, `[...slug]`, `[[...slug]]`) is part of the file's own name, not a glob - write such a path exactly as it is on disk.
- Complete means nothing outside that list has to change for the task to deliver and its `Verification` to pass. A file the task's own work forces - its registration, its schema, the aggregate test its change invalidates - belongs to that task, not to whichever task happens to own the neighbourhood. A shape two tasks need is written by the first one that cannot deliver without it.
- Tasks with no dependency path between them must not list the same file - they run at the same time.
- `Exclusive: true` only where a task genuinely cannot share the working tree or a machine-wide resource - a fixed port, one database, a suite that has to run alone. Leave the line out everywhere else: an exclusive task stops the whole build for as long as it runs.
- `Uses` names every contract block the task touches, the ones it writes and the ones it only calls, or `none`. It is mandatory, because the task file is a coder's whole input: a shape left off the line reaches nobody and gets invented instead.
- `Delivers` states WHAT the task produces. Never how to code it, never a line number.
- `Verification` is a runnable command plus the result that counts as proof, scoped to the task's own `Files` and the tests covering them, never a whole-project suite: other tasks are being written in the same tree at the same time. A task with no runtime behaviour greps instead, for an identifier the code really declares and on both sides in one command - the document and the source file that defines the identifier. A command any file carrying the word would satisfy is not a verification, and neither is "read it and judge".
- `DoD` separates its clauses with semicolons and each clause is independently observable on its own: the decomposition cuts that line into `DoD.1`, `DoD.2`, …, a coder answers for each clause and a reviewer gates each one, so a clause that only makes sense wrapped in the sentence around it is gated by nobody.
- `TDD: required` by default. `TDD: none` only where the task changes no runtime behaviour: config, docs, mechanical rename, scaffolding.
- A reproduction test already RED in the tree goes into the fixing task's `Files:` - nothing outside a file map gets committed - and that task carries `TDD: none`: its RED cycle is done.
- Integration tasks are the plan's last tasks, each `TDD: none`, `Exclusive: true`, depending on the tasks whose work it exercises, and each `Verification` runs that task's own integration test and nothing wider.
- Every acceptance criterion is covered by at least one task's `Covers`. A condition no single task delivers, like the suite staying green, is not an acceptance criterion: that is the build's own close.
- The heading line is committed verbatim as the commit subject, so the title is one short imperative summary of what the task delivers.

Contract rules:

- One `### C<n> - <name>` block per shape the change introduces or consumes, ids `C1`, `C2`, … in order, all under the `## Contracts` appendix below the tasks. A change that introduces no shape has no appendix and every task carries `Uses: none`.
- The block opens with `File:` - the repo-relative paths the shape is declared in, or `none` for one that lives in no file of its own - then the shape itself and nothing else: no rationale, no history, no instruction on how to build it.
- Every block is named by at least one task's `Uses`; one nobody names is rejected at validation, because no coder would ever see it.
- Never say which task writes a block and which only calls it: the task whose `Files` holds the block's own file writes it, every other one takes it exactly as written. So every `File:` path is in some task's `Files` unless the tree already holds it, and at least one task holding it names the block - otherwise its writer never sees the shape and a consumer writes it outside its own file map. Both are rejected at validation.

With `adr: true` above, read `${CLAUDE_SKILL_DIR}/references/adr-tasks.md` before writing the tasks and follow it; otherwise skip it entirely.

Then run `"${CLAUDE_PLUGIN_ROOT}/scripts/plan-index.sh" <plan-path>` as one literal Bash line, no interpreter word in front - any other form is an unapproved call that stalls on a permission prompt. It validates every rule above and must exit 0: fix whatever it reports and re-run.

Show the user the full path of the written plan.

## 3. Review gate

Dispatch the `viber:planner-review` agent with the plan path and `refs: ${CLAUDE_PLUGIN_ROOT}/references`. A draft adds the line `scope: spec`, which gates the specification alone. From round 2 on, also pass the previous findings verbatim and one line per fix you applied.

- `VERDICT: PASS` - go to step 4.
- `VERDICT: FAIL` - show the findings, fix the plan, re-run `plan-index.sh` whenever a fix touched a task's fields, ids, `Depends-on`, `Files` or `Covers`, then dispatch again. A finding that needs a decision only the user can make gets asked first, and the answer starts a fresh round 1.

## 4. Hand off

Call `ExitPlanMode` only after a PASS - the user approves a reviewed plan, not an unreviewed one.

A plan with its task half, on a change no draft preceded: name `viber:implementor` as the next step and repeat the plan file's full path with it - that path is the whole handover. Nothing runs here.

A change that went through a draft lands here instead, because nothing downstream lands a plan carrying no task. One literal Bash line, every argument double-quoted, no interpreter word in front, nothing chained to it - and it is the only thing this step executes:

`"${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh" --land "<plan-path>"`

A round continuing an earlier draft adds `--into "<key>"`, the key its input carries, so every round of one discussion lands in the directory the first one made. Then rewrite the landed file's frontmatter `source:` to the landed path: the plan-mode file it names is gone by the next round. Show the user the landed path.

You never commit and never run git - the landed draft is the user's to commit.

A round still carrying no task half ends there, and never names `viber:implementor`: a build refuses a draft. A round that added the task half ends like any full plan, with the LANDED path as the handover.
