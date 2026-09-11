# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Stop and report when the Agent tool is unavailable"
Intent: docs/.workflows/2026-09-11-stop-when-agent-tool-is-unavailable/intent.md
Plan: C:\Users\dario\.claude-p2p2\plans\misty-skipping-frog.md

---
<!-- HEADER -->

## Goal
The four superdev skills that dispatch workers through the `Agent` tool - `superbuild`, `simplebuild`, `superdev-memory`, `superdev-rules` - carry a written path for the case where that tool is missing from the session's tool pool: they never substitute for the worker, they stop at once, and they print a four-line report naming the lost tool, the fact that nothing was done in its place, where the run's state stands, and how to come back (exit, `claude --resume`, re-enter).

## Context
The harness sometimes drops the `Agent` tool mid-session. No error surfaces: the dispatch simply never happens and the skill quietly does the worker's job itself, so a build's tasks get implemented by the orchestrator at its own `model: sonnet` / `effort: low`, with the reviewer gate skipped, and every step still prints a normal status line. No script or hook can detect this - nothing exposes the session's tool pool to a shell script - so the check can only live in the skill text, at the moment the model reaches for the tool. Today those four skills say nothing about the case, which is why the model improvises the helpful path. This change is markdown only: the repo has no build step and no lint, so editing a `SKILL.md` is shipping, and the deliverable is verified with `grep` plus the existing `node --test` suite.

## Out of scope
- Any hook, script or `hooks.json` entry - no deterministic enforcement.
- `intent` and its `Explore` agents.
- Forks through the `Skill` tool (plan, spec and change reviewers, `tdd`).
- `superdev/hooks/content/manifest.md`, `superdev/README.md`, root `README.md` and root `CLAUDE.md`.

## Acceptance criteria
1. `superdev/skills/superbuild/SKILL.md` and `superdev/skills/simplebuild/SKILL.md` each carry, appended to their `## Mandatory Rules` block, a rule stating that the orchestrator never does a worker's job itself (no implementing, no editing project files, no writing what an agent owes) and that the `Agent` tool missing from the tool pool means an immediate STOP, followed by the fenced four-line report block; the whole `## Mandatory Rules` section is byte-identical between the two files.
2. In both build orchestrators, `## Step 1 - Decompose Plan` opens with a tool-pool preflight that stops before the plan is resolved, before the git preflight and before `decompose.sh` runs, reporting with `State: not decomposed yet`.
3. `superdev/skills/superdev-memory/SKILL.md` and `superdev/skills/superdev-rules/SKILL.md` each carry the same rule appended to `## Core Principle`, naming their own writer agent (`superdev:memory-writer` / `superdev:rules-writer`) and their own re-entry command, plus a `0. Preflight` step placed inside the existing `## Workflow` fenced block immediately above `1. Detect state`.
4. Each of the four report blocks carries the four facts in this order: the `Agent` tool is unavailable, nothing was done in its place, where the state stands (`<workdir>` plus the last completed task for the builds, the capture file path for memory/rules), and the fix (exit the session, restart with `claude --resume`, then the skill's own re-entry instruction - "ask to continue this build" for the builds, since they are `user-invocable: false`, and "run the skill again" for memory/rules).
5. No file outside those four `SKILL.md` files is modified, and `node --test "tests/**/*.test.ts"` stays green.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - feat(superdev): stop and report when the Agent tool is unavailable
- Covers: criteria #1, #2, #3, #4, #5
- TDD: none
- Model: sonnet
- Effort: high

### Dependencies
- none

### Files
- modify - superdev/skills/superbuild/SKILL.md (`## Mandatory Rules`, `## Step 1 - Decompose Plan`)
- modify - superdev/skills/simplebuild/SKILL.md (`## Mandatory Rules`, `## Step 1 - Decompose Plan`)
- modify - superdev/skills/superdev-memory/SKILL.md (`## Core Principle`, `## Workflow`)
- modify - superdev/skills/superdev-rules/SKILL.md (`## Core Principle`, `## Workflow`)

### Test Commands
#### Build
- `node --test "tests/**/*.test.ts"` - all tests pass (this task touches no script; the suite guards the repo stays green)

#### Tests
- `grep -l 'AGENT TOOL UNAVAILABLE' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md superdev/skills/superdev-memory/SKILL.md superdev/skills/superdev-rules/SKILL.md | wc -l | tr -d ' '` - prints `4`
- `diff <(sed -n '/^## Mandatory Rules/,/^## Config/p' superdev/skills/superbuild/SKILL.md) <(sed -n '/^## Mandatory Rules/,/^## Config/p' superdev/skills/simplebuild/SKILL.md) && echo IDENTICAL` - prints `IDENTICAL`
- `grep -c 'Preflight the tool pool' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md` - prints `:1` for each of the two files
- `grep -c '^0. Preflight' superdev/skills/superdev-memory/SKILL.md superdev/skills/superdev-rules/SKILL.md` - prints `:1` for each of the two files
- `grep -c 'stand in for the writer' superdev/skills/superdev-memory/SKILL.md superdev/skills/superdev-rules/SKILL.md` - prints `:1` for each of the two files (the added rule paragraph, not the pre-existing mention of the writer agent)
- `grep -q 'then run .superdev-memory. again' superdev/skills/superdev-memory/SKILL.md && grep -q 'then run .superdev-rules. again' superdev/skills/superdev-rules/SKILL.md && echo REENTRY` - prints `REENTRY`
- `grep -c 'claude --resume' superdev/skills/superbuild/SKILL.md superdev/skills/simplebuild/SKILL.md superdev/skills/superdev-memory/SKILL.md superdev/skills/superdev-rules/SKILL.md` - prints `:1` for each of the four files
- `git status --porcelain -- superdev | sed 's/^...//' | sort | tr '\n' ' '` - prints exactly `superdev/skills/simplebuild/SKILL.md superdev/skills/superbuild/SKILL.md superdev/skills/superdev-memory/SKILL.md superdev/skills/superdev-rules/SKILL.md ` (run while the task is still uncommitted; after the orchestrator's per-task commit it prints nothing, which is not a regression)
- `git status --porcelain -- CLAUDE.md README.md tests .github superdev/hooks superdev/scripts superdev/agents superdev/references superdev/.claude-plugin | wc -l | tr -d ' '` - prints `0`

### Approach
1. In `superdev/skills/superbuild/SKILL.md`, append to `## Mandatory Rules` (after the existing labeled-block line) the rule paragraph and the fenced report block from `### Contracts`, build variant.
2. In the same file, insert the preflight paragraph from `### Contracts` as the first paragraph of `## Step 1 - Decompose Plan`, above the existing `Resolve <plan-file> ...` paragraph.
3. Apply steps 1-2 to `superdev/skills/simplebuild/SKILL.md` with the same bytes, so the two `## Mandatory Rules` sections stay identical.
4. In `superdev/skills/superdev-memory/SKILL.md`, append to `## Core Principle` the rule paragraph and fenced report block from `### Contracts`, writer variant, with `superdev:memory-writer`, "you never write a node yourself", the capture path `.temp/superdev/memory/capture-<RUN_ID>.md` and the re-entry `run superdev-memory again`; then insert the `0. Preflight` step inside the existing `## Workflow` fence, immediately above `1. Detect state`.
5. Apply step 4 to `superdev/skills/superdev-rules/SKILL.md` with `superdev:rules-writer`, "you never write a rule file yourself", `.temp/superdev/rules/capture-<RUN_ID>.md` and `run superdev-rules again`.

### Edge cases
- The `## Workflow` body of both memory/rules skills is already one fenced code block: `0. Preflight` goes INSIDE that fence as a plain numbered step, never as a nested fence.
- The report block in `## Mandatory Rules` / `## Core Principle` is a new fenced block in prose context - it must not be opened inside another fence and must be closed.
- Do not touch any `` !` `` preload line, any frontmatter key or any `allowed-tools` list: nothing here adds a tool or a command.
- Never use an em dash or an en dash anywhere in the added text - plain hyphens only, matching the surrounding files.

### Contracts
Rule paragraph, build variant (appended to `## Mandatory Rules`, verbatim in both build orchestrators):

```
Every agent runs through the `Agent` tool - you never do a worker's job yourself: no implementing, no editing project files, no writing what an agent owes. Its absence from your tool pool means the harness lost the tool, never that you may stand in for the worker: STOP at once, report exactly these four lines, and end the turn - do not decompose, do not commit, do not continue.
```

Report block, build variant (fenced, directly under the paragraph above):

```
AGENT TOOL UNAVAILABLE - stopped at <step>.
Nothing was implemented, written or committed in its place.
State: <workdir> - last completed task <NN from status.md>, or "not decomposed yet".
Fix: exit this session, restart with `claude --resume`, then ask to continue this build (this skill is `user-invocable: false` - there is no slash command).
```

Preflight paragraph, build variant (first paragraph of `## Step 1 - Decompose Plan`, verbatim in both):

```
Preflight the tool pool: the `Agent` tool must be present - absent -> STOP and report per `## Mandatory Rules`, with `State: not decomposed yet`. Do not resolve the plan, do not preflight git, do not run `decompose.sh`.
```

Rule paragraph, writer variant (appended to `## Core Principle`; `<writer>`, `<never>`, `<capture>` and `<re-entry>` are filled per skill):

```
**The `<writer>` agent writes this skill's output - you <never> yourself.** The `Agent` tool missing from your tool pool means the harness lost the tool, never that you may stand in for the writer: STOP at once, report exactly these four lines, and end the turn.
```

Report block, writer variant (fenced, directly under the paragraph above):

```
AGENT TOOL UNAVAILABLE - stopped at <step>.
Nothing was written in its place.
State: <capture>, or "no capture written yet".
Fix: exit this session, restart with `claude --resume`, then <re-entry>.
```

Preflight step, writer variant (inside the `## Workflow` fence, above `1. Detect state`):

```
0. Preflight
   `Agent` tool present in your tool pool? Absent → STOP and report per `## Core Principle`
   (State: no capture written yet). Do not run the scripts, do not start the interview.
```

Per-skill fills for the writer variant:

| skill | `<writer>` | `<never>` | `<capture>` | `<re-entry>` |
|---|---|---|---|---|
| `superdev-memory` | `superdev:memory-writer` | never write a node | `.temp/superdev/memory/capture-<RUN_ID>.md` | run \`superdev-memory\` again |
| `superdev-rules` | `superdev:rules-writer` | never write a rule file | `.temp/superdev/rules/capture-<RUN_ID>.md` | run \`superdev-rules\` again |

### DoD
All four `SKILL.md` files carry their rule paragraph, report block and preflight at the anchors above; every command under `### Test Commands` returns its stated output; no other file in the repo is modified.

<!-- /TASK -->
