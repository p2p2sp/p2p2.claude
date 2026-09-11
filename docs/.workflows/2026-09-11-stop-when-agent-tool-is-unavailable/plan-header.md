Title: "Stop and report when the Agent tool is unavailable"
Intent: docs/.workflows/2026-09-11-stop-when-agent-tool-is-unavailable/intent.md


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

