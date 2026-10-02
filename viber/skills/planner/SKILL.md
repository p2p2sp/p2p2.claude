---
name: planner
description: Only for a confirmed viber:intent interview or a viber:fixer diagnosis already in context - never the entry point. Without one, suggest the viber:intent interview and let the user decide. Turns that input into a reviewed implementation plan - acceptance criteria, file map, then tasks carrying dependencies, contracts, verification and DoD.
allowed-tools: Read, Write, Edit, Grep, Glob, Agent, SendMessage, Skill, EnterPlanMode, ExitPlanMode, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/plan-index.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/config.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh:*), Bash(date:*)
user-invocable: false
effort: high
---

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/config.sh"
```

# planner

Input: an understood change already in context - a confirmed `viber:intent` interview, or a `viber:fixer` diagnosis. Anything else is unresolved input however clear it reads: suggest the `viber:intent` interview in one line and stop here, never entering plan mode. Never size the scope yourself.

On valid input call `EnterPlanMode` first unless plan mode is already active.

The input carries three decisions already taken: the spec shape, whether this plan stops at a draft, and, on a round continuing an earlier draft, that draft's run key. Never reopen them.

Every bundled-script run below is one literal Bash line, every argument double-quoted, never prefixed with an interpreter word, never assigned to a variable, never preceded by `cd`, never chained with `;`, `&&` or `||`.

## 1. Map the files first

Read `${CLAUDE_PLUGIN_ROOT}/references/plan-rules.md` first, on a draft round as well, and hold the plan to every rule in it. A plan carrying an integration test also reads `${CLAUDE_PLUGIN_ROOT}/references/integration-tests.md`: the layer is designed from it as a whole.

Never plan an end-to-end test on your own: `/viber:e2e` writes them after the build. Plan one only when the input records the user explicitly asking for it, then per `plan-rules.md`'s End-to-end rule; one merely suggested, implied by a UI change or thought useful stays out of every criterion, task and `Verification`.

Before writing a task, decide which files get created, modified or deleted and what each one owns: locked-in boundaries are what lets tasks run in parallel.

- One responsibility per file. Files that change together live together.
- Read the codebase for everything `plan-rules.md`'s Reach and Owned rules force into the file map, not only what the change introduces.
- A file you have to touch that has grown unwieldy may be split, as a task.

## 2. Write the plan

The specification half is `${CLAUDE_SKILL_DIR}/templates/spec-lite.md` or `${CLAUDE_SKILL_DIR}/templates/spec-full.md`, whichever shape the input names; the task half is `${CLAUDE_SKILL_DIR}/templates/tasks.md` under either. Fill the spec, append the task half under it, and write the result into the plan file plan mode names in its system message, the only file you may write while planning. Keep every section and every HTML marker of both templates, except one a template comment says to drop; add no section of your own.

Write that plan file's absolute path into the frontmatter's `source:` key: approval may clear this context, and that line is then the only way back to the file. Fill the frontmatter's `issue:` key from the input's `Issue:` line, never from the scope, exactly when the input carries one; with no such line drop the key, unless the plan continues a draft (below).

A round continuing a draft reads `docs/<directories.runs>/<key>/plan.md` first and carries its specification over, changing only what the input's remarks change - its `issue:` line travels with the rest of that specification unless a remark changes it - and writes the key into the frontmatter's `into:` key; any other plan drops that line.

An input carrying a roadmap fills `## Roadmap` in the template's shape with the ordered subprojects, marks the entry this plan covers `(this plan)`, lists every later entry's settled decisions as indented `- ` lines under it and repeats every later entry under `### Out of scope`; no roadmap in the input means no such section. What a later entry brings stays absent: no task delivers a stand-in for it, no acceptance criterion depends on it, nothing is stubbed, mocked or temporarily substituted. A part is never a release: no acceptance criterion needs a working application between parts.

An input carrying a `Roadmap: <path>` line continues a roadmap: read that `roadmap.md`, mark every earlier entry `(built)`, and move this plan's own entry's decisions from the roadmap into the specification, out of the `## Roadmap` section.

A plan stopping at a draft writes the specification half alone: no `## Tasks`, no `## Contracts` appendix, no decision record screening.

Every plan but a draft then runs `"${CLAUDE_PLUGIN_ROOT}/scripts/plan-index.sh" "<plan-path>"`. It must exit 0: fix whatever it reports and re-run.

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" planning.adr "${CLAUDE_SKILL_DIR}" adr
```

Show the user the full path of the written plan.

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" branching.""mode "${CLAUDE_SKILL_DIR}" branching
```

A draft goes to step 3 next; every other plan dispatches the review below.

## 3. Review gate

Dispatch the `viber:planner-review` agent with the plan path, `refs: ${CLAUDE_PLUGIN_ROOT}/references`, `memory: <value>` (the `build.memory:` line of the config block resolved above), and the line:

```
input:
<the confirmed viber:intent summary or viber:fixer diagnosis in context, verbatim>
```

A draft adds the line `scope: spec`. From round 2 on, also pass the previous findings verbatim and one line per fix you applied.

A reply with no `VERDICT:` line gets one `SendMessage`, `Finish your task, then return your output lines.`; a second reply without one is handled as `VERDICT: DENIED` with `REASON: no verdict returned`.

- `VERDICT: PASS` - go to step 4 without writing the plan again: its Minor findings stay unapplied, since any write after the PASS voids it. A PASS reached through that `SendMessage` whose `ExitPlanMode` the plan gate still refuses is followed by the fresh dispatch the gate names, not treated as a stall.
- `VERDICT: FAIL` - show the findings, fix the plan, re-run `plan-index.sh` after every fix unless the plan is a draft, then dispatch again. A finding that needs a decision only the user can make gets asked first through one `AskUserQuestion`, and the answer starts a fresh round 1.
- `VERDICT: DENIED` - one `AskUserQuestion` naming the refused call from its `REASON:` line: permission added and retry, dispatching again in the same round, or stop with the plan unreviewed and no hand-off.

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" branching.""mode "${CLAUDE_SKILL_DIR}" branching-fix
```

## 4. Hand off

Call `ExitPlanMode` only after a PASS from a review dispatched after your last write to the plan file. Every later write voids that PASS, whatever caused it - the user's remark on a refused `ExitPlanMode`, an answer to your question, a Minor finding, your own second thought: re-run `plan-index.sh` unless the plan is a draft, then dispatch step 3 again, as a fresh round 1, before the next `ExitPlanMode`.

Then exactly one case applies:

- A plan with its task half, on a change no draft preceded: name `viber:implementor` as the next step, the path shown in step 2 being the whole handover. Nothing runs here.
- A round still carrying no task half: land it below and end there, never naming `viber:implementor`: a build refuses a draft.
- A round that added the task half to a draft: land it below, then name `viber:implementor` as the next step, the landed path being the handover.

A plan with its task half that changes a UI or an endpoint and carries no end-to-end task adds one line to its hand-off:

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" build.qa "${CLAUDE_SKILL_DIR}" qa-e2e
```

A change that went through a draft lands here, since nothing downstream lands a plan carrying no task - the only thing this step executes:

`"${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh" --land "<plan-path>"`

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" branching.""mode "${CLAUDE_SKILL_DIR}" branching-land
```

Show the user the landed path. Never run git directly yourself: the landed draft is the user's to commit.
