---
name: planner
description: Only for a confirmed viber:idea interview or a viber:fixer diagnosis already in context - never the entry point. Without one, suggest the viber:idea interview and let the user decide. Turns that input into a reviewed implementation plan - acceptance criteria, file map, then tasks carrying dependencies, contracts, verification and DoD.
allowed-tools: Read, Write, Edit, Grep, Glob, Agent, Skill, EnterPlanMode, ExitPlanMode, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/plan-index.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/config.sh:*), Bash(date:*)
user-invocable: false
---

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/config.sh"
```

# planner

Input: an understood change already in context - a confirmed `viber:idea` interview, or a `viber:fixer` diagnosis. Anything else is unresolved input however clear it reads: invoke the `viber:idea` skill instead and stop here, never entering plan mode. Never size the scope yourself.

On valid input call `EnterPlanMode` first unless plan mode is already active.

The input carries three decisions already taken: the spec shape, whether this plan stops at a draft, and, on a round continuing an earlier draft, that draft's run key. Never reopen them.

## 1. Map the files first

Unless the plan stops at a draft, read `${CLAUDE_PLUGIN_ROOT}/references/test-strategy.md` first: it decides how the work is sliced, where each criterion's proof lives and which deliverables carry no test.

Before writing a task, decide which files get created, modified or deleted and what each one owns: locked-in boundaries are what lets tasks run in parallel.

- One responsibility per file. Files that change together live together.
- Read the codebase for what the change FORCES, not only what it introduces: where a new type is registered, exported or wired up, where a new persisted shape is declared and migrated, every test asserting a count, an enumeration or a snapshot over what you touch.
- In an existing codebase follow its established patterns. A file you have to touch that has grown unwieldy may be split, as a task.

## 2. Write the plan

Read `${CLAUDE_PLUGIN_ROOT}/references/plan-rules.md` first, on a draft round as well, and hold the plan to every rule in it.

The specification half is `${CLAUDE_SKILL_DIR}/templates/spec-lite.md` or `${CLAUDE_SKILL_DIR}/templates/spec-full.md`, whichever shape the input names; the task half is `${CLAUDE_SKILL_DIR}/templates/tasks.md` under either. Fill the spec, append the task half under it, and write the result into the plan file plan mode names in its system message, the only file you may write while planning. Keep every section and every HTML marker of both templates; add no section of your own.

Write that plan file's absolute path into the frontmatter's `source:` key: approval may clear this context, and that line is then the only way back to the file.

An input carrying a roadmap fills `## Roadmap` with the ordered subprojects, marks the entry this plan covers and repeats every later entry under `### Out of scope`; no roadmap in the input means no such section. What a later entry brings stays absent: no task delivers a stand-in for it, no acceptance criterion depends on it, nothing is stubbed, mocked or temporarily substituted.

A plan stopping at a draft ends the step here: the specification half alone, no `## Tasks`, no `## Contracts` appendix, no `plan-index.sh`. Go to step 3.

With `adr: true` above, read `${CLAUDE_SKILL_DIR}/references/adr-tasks.md` before writing the tasks and follow it; otherwise skip it.

Then run `"${CLAUDE_PLUGIN_ROOT}/scripts/plan-index.sh" <plan-path>` as one literal Bash line, no interpreter word in front - any other form stalls on a permission prompt. It must exit 0: fix whatever it reports and re-run.

Show the user the full path of the written plan.

## 3. Review gate

Dispatch the `viber:planner-review` agent with the plan path and `refs: ${CLAUDE_PLUGIN_ROOT}/references`. A draft adds the line `scope: spec`. From round 2 on, also pass the previous findings verbatim and one line per fix you applied.

- `VERDICT: PASS` - go to step 4.
- `VERDICT: FAIL` - show the findings, fix the plan, re-run `plan-index.sh` whenever a fix touched a task's fields, ids, `Depends-on`, `Files` or `Covers`, then dispatch again. A finding that needs a decision only the user can make gets asked first, and the answer starts a fresh round 1.

## 4. Hand off

Call `ExitPlanMode` only after a PASS.

A plan with its task half, on a change no draft preceded: name `viber:implementor` as the next step, the path shown in step 2 being the whole handover. Nothing runs here.

A change that went through a draft lands here instead, since nothing downstream lands a plan carrying no task. Run one literal Bash line, every argument double-quoted, no interpreter word in front, nothing chained to it - the only thing this step executes:

`"${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh" --land "<plan-path>"`

A round continuing an earlier draft adds `--into "<key>"`, the key its input carries. Then rewrite the landed file's frontmatter `source:` to the landed path, since the plan-mode file is gone by the next round, and show the user the landed path.

Never commit and never run git: the landed draft is the user's to commit.

A round still carrying no task half ends there and never names `viber:implementor`: a build refuses a draft. A round that added the task half names `viber:implementor` as the next step, the landed path being the handover.
