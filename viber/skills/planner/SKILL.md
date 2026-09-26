---
name: planner
description: Only for a confirmed viber:intent interview or a viber:fixer diagnosis already in context - never the entry point. Without one, suggest the viber:intent interview and let the user decide. Turns that input into a reviewed implementation plan - acceptance criteria, file map, then tasks carrying dependencies, contracts, verification and DoD.
allowed-tools: Read, Write, Edit, Grep, Glob, Agent, Skill, EnterPlanMode, ExitPlanMode, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/plan-index.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/config.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh:*), Bash(date:*)
user-invocable: false
---

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/config.sh"
```

# planner

Input: an understood change already in context - a confirmed `viber:intent` interview, or a `viber:fixer` diagnosis. Anything else is unresolved input however clear it reads: suggest the `viber:intent` interview in one line and stop here, never entering plan mode. Never size the scope yourself.

On valid input call `EnterPlanMode` first unless plan mode is already active.

The input carries three decisions already taken: the spec shape, whether this plan stops at a draft, and, on a round continuing an earlier draft, that draft's run key. Never reopen them. It may also carry one `Issue: <full issue URL>` line, present only when the run is tied to an issue; that line, not the scope, is what the write step below turns into the plan's `issue:` key.

## 1. Map the files first

Unless the plan stops at a draft, read `${CLAUDE_PLUGIN_ROOT}/references/test-strategy.md` first: it decides how the work is sliced, where each criterion's proof lives and which deliverables carry no test. A plan with an integration task also reads `${CLAUDE_PLUGIN_ROOT}/references/integration-tests.md`: the layer is designed from it as a whole.

Never plan an end-to-end test on your own: `/viber:e2e` writes them after the build. Plan one only when the input records the user explicitly asking for it, then per the test strategy; one merely suggested, implied by a UI change or thought useful stays out of every criterion, task and `Verification`.

Before writing a task, decide which files get created, modified or deleted and what each one owns: locked-in boundaries are what lets tasks run in parallel.

- One responsibility per file. Files that change together live together.
- Read the codebase for what the change FORCES, not only what it introduces: where a new type is registered, exported or wired up, where a new persisted shape is declared and migrated, every test asserting a count, an enumeration or a snapshot over what you touch.
- In an existing codebase follow its established patterns. A file you have to touch that has grown unwieldy may be split, as a task.

## 2. Write the plan

Read `${CLAUDE_PLUGIN_ROOT}/references/plan-rules.md` first, on a draft round as well, and hold the plan to every rule in it.

The specification half is `${CLAUDE_SKILL_DIR}/templates/spec-lite.md` or `${CLAUDE_SKILL_DIR}/templates/spec-full.md`, whichever shape the input names; the task half is `${CLAUDE_SKILL_DIR}/templates/tasks.md` under either. Fill the spec, append the task half under it, and write the result into the plan file plan mode names in its system message, the only file you may write while planning. Keep every section and every HTML marker of both templates, except one a template comment says to drop; add no section of your own.

Write that plan file's absolute path into the frontmatter's `source:` key: approval may clear this context, and that line is then the only way back to the file. Fill the frontmatter's `issue:` key from the input's `Issue:` line exactly when the input carries one; with no such line drop the key.

A round continuing a draft reads `docs/<directories.runs>/<key>/plan.md` first and carries its specification over, changing only what the input's remarks change - its `issue:` line travels with the rest of that specification unless a remark changes it - and writes the key into the frontmatter's `into:` key; any other plan drops that line.

An input carrying a roadmap fills `## Roadmap` with the ordered subprojects, marks the entry this plan covers and repeats every later entry under `### Out of scope`; no roadmap in the input means no such section. What a later entry brings stays absent: no task delivers a stand-in for it, no acceptance criterion depends on it, nothing is stubbed, mocked or temporarily substituted.

A plan stopping at a draft ends the step here: the specification half alone, no `## Tasks`, no `## Contracts` appendix, no `plan-index.sh` - the branch question below still applies.

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" adr "${CLAUDE_SKILL_DIR}" adr
```

Then run `"${CLAUDE_PLUGIN_ROOT}/scripts/plan-index.sh" "<plan-path>"` as one literal Bash line, no interpreter word in front - any other form stalls on a permission prompt. It must exit 0: fix whatever it reports and re-run.

Show the user the full path of the written plan.

A draft round carries its `work:` and `branch:` over, asking nothing. Otherwise:

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" branching.""mode "${CLAUDE_SKILL_DIR}" branching
```

A draft goes to step 3 next; every other plan dispatches the review below.

## 3. Review gate

Dispatch the `viber:planner-review` agent with the plan path, `refs: ${CLAUDE_PLUGIN_ROOT}/references` and `memory: <value>`, the `memory:` line of the config block resolved above. A draft adds the line `scope: spec`. From round 2 on, also pass the previous findings verbatim and one line per fix you applied.

- `VERDICT: PASS` - go to step 4.
- `VERDICT: FAIL` - show the findings, fix the plan, re-run `plan-index.sh` after every fix unless the plan is a draft, then dispatch again. A fix that changes the plan's title, issue reference or a task's `Repro:` line re-runs the branch report first; repeat the branch question only when that report's `entry:` lines or its offered answers actually changed, otherwise leave the recorded `work:` and `branch:` keys standing. A finding that needs a decision only the user can make gets asked first, and the answer starts a fresh round 1.
- `VERDICT: DENIED` - one `AskUserQuestion` naming the refused call from its `REASON:` line: permission added and retry, dispatching again in the same round, or stop with the plan unreviewed and no hand-off.

## 4. Hand off

Call `ExitPlanMode` only after a PASS.

A plan with its task half, on a change no draft preceded: name `viber:implementor` as the next step, the path shown in step 2 being the whole handover. Nothing runs here.

A plan with its task half that changes a UI or an endpoint and carries no end-to-end task adds one line to either hand-off:

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" qa "${CLAUDE_SKILL_DIR}" qa-e2e
```

A change that went through a draft lands here instead, since nothing downstream lands a plan carrying no task. Run one literal Bash line, every argument double-quoted, no interpreter word in front, nothing chained to it - the only thing this step executes:

`"${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh" --land "<plan-path>"`

The script honours the plan's `into:` key and points the landed copy's `source:` at itself; when the plan carries a `branch:` key, it puts HEAD on the run branch before copying and prints a `branch:` line (`<name> (created | switched | kept)`, or `detached (kept)`) beside `path:`, `key:` and `state:`. Show the user the landed path and that `branch:` line when it printed one.

Exit 6 - the run branch could not be set -> report the stderr reason and stop: nothing landed, and no hand-off names `viber:implementor`.

Never run git directly yourself: `plan-path.sh` alone moves HEAD for the branch step, and the landed draft is otherwise the user's to commit.

A round still carrying no task half ends there and never names `viber:implementor`: a build refuses a draft. A round that added the task half names `viber:implementor` as the next step, the landed path being the handover.
