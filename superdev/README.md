# superdev

The agentic-development ecosystem for Claude Code: project memory, planning, and the implementation
pipeline. Every creative request - a new idea, a feature, a change to an existing solution - enters through
the same design interview, and nothing gets implemented before you approve a reviewed plan.

superdev is the only plugin in this repo that ships hooks: a `SessionStart` hook injects its dispatcher
manifest once per session, and a `PreToolUse` hook (`review-plan.sh`) blocks `ExitPlanMode` until the plan
reviewer returns `VERDICT: PASS`. That gate is the single entrance to code on both tracks.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install superdev@p2p2 --scope user
```

No runtime dependencies - the plugin is Markdown, JSON and bash scripts.

## How it works

![superdev flow - the Simple track and the Super track](../docs/assets/superdev-flow.svg)

Same interview on the way in, two execution tracks, one shared Close Out.

## Quick start

1. **Run `/superdev:setup` once per repository.** It seeds `.temp/`, `.gitignore`
   and `.claude/superdev.yml`, adds the `docs/.workflows/**` linguist rule to `.gitattributes`, and lets you
   flip the opt-in switches. It never overwrites what already exists.
2. **Describe what you want to build.** The `superdev` skill fires by itself. It sends `Explore` agents into
   the codebase first, then interviews you in prose - one question per turn, 2-3 numbered options with a
   recommendation - until every load-bearing decision is settled.
3. **Confirm the synthesis and pick a track** (this gate is yours, the model never routes past it):
   - **Simple** - small, contained, reversible changes. `simpleplan` writes the plan; the plan carries its
     own acceptance criteria, no spec.
   - **Super** - medium/large, cross-cutting or hard-to-reverse changes. `superspec` writes the
     `What & Why` spec first (saved to `docs/.workflows/<date>-<slug>.md`), then chains into `superplan`.
4. **Approve the plan.** A forked reviewer must return `VERDICT: PASS` before `ExitPlanMode` is even allowed;
   then you approve it yourself.
5. **The build runs task by task.** The orchestrator (`simplebuild` / `superbuild`) decomposes the plan into
   `docs/.workflows/<run>/tasks/task-NN.md`, runs a coder fork per task, commits each task separately, and
   ends with the final review round.
6. **Close Out** runs the enabled delegations in parallel and commits what they touched.

Reporting a bug instead? Just say so - `simpledebug` fires first, traces the flow step by step, proves the
diagnosis with a failing test, and hands the proven fix plan to `simpleplan`.

## Config switches

`.claude/superdev.yml` in the consuming repo, all `false` by default, set once via `/superdev:setup`:

| Switch | When `true`, Close Out also… |
| --- | --- |
| `adr` | records an architectural decision at `docs/adr/<timestamp>-<title-slug>.md` (no file when the plan holds no real decision) |
| `memory` | refreshes the `CLAUDE.md` project-memory cascade |
| `rules` | refreshes the path-scoped `.claude/rules/` convention files |
| `docs` | refreshes the user-facing product docs at `docs/product/<feature-slug>.md` |

A failing delegation never blocks the build - it lands in the final summary instead.

## Skills

You invoke the entry skills; everything marked *fork* runs in its own context, driven by the track, and is
never called by hand.

### Entry and environment

| Skill | Role |
| --- | --- |
| `superdev` | The always-on entry skill. Explores the codebase, runs the design interview, presents the synthesis, then gates on your track choice. Writes no code and no plan. |
| `setup` | `/superdev:setup` - one-time, user-only repository bootstrap and config-switch picker. Idempotent. |
| `simpledebug` | Fires on any bug, crash, regression or "it behaves wrong". Traces the whole flow instead of guessing, proves the diagnosis with a failing (RED) test, then hands the fix plan to `simpleplan`. Fixes nothing itself. |
| `tdd` | Red-Green-Refactor discipline for a task marked `TDD: required` (or when you ask for test-first work). No production code without a failing test first. |

### Simple track

| Skill | Role |
| --- | --- |
| `simpleplan` | Writes the plan (`How`) from the confirmed understanding - no spec, the plan carries its own DoD. Self-reviews, then calls the reviewer. |
| `simpleplan-reviewer` | Fork - read-only plan review against the checklist; returns `VERDICT: PASS` / `FAIL` plus findings. Max 3 rounds. |
| `simplebuild` | Sonnet orchestrator - decomposes the approved plan and drives the task loop; status lines only, no prose. |
| `simplebuild-implementor` | Fork - implements one task, reviews its own work, runs build + tests (up to 5 rounds). |
| `simplebuild-reviewer` | Fork - one final review of the whole change; `FAIL` sends it back to the implementor (max 2 rounds). |

### Super track

| Skill | Role |
| --- | --- |
| `superspec` | Writes the `What & Why` spec (INVEST stories, max 3 acceptance criteria each, zero TBDs) to `docs/.workflows/<date>-<slug>.md`, then gates on continuing to the plan. |
| `superspec-reviewer` | Fork - spec review; no handoff without `VERDICT: PASS`. |
| `superspec-refine` | Evolves an existing spec instead of writing a new one. |
| `superplan` | Writes the plan (`How`) from the approved spec, marking each task `TDD: required` or `TDD: none`. |
| `superplan-reviewer` | Fork - checks the plan against the spec and the repo; `needs-discovery` routes back to `superdev` rather than looping. |
| `superbuild` | Sonnet orchestrator - decomposes the approved plan (requires a `spec:` line, otherwise the plan belongs to `simplebuild`) and drives the task loop. |
| `superbuild-task-coder` | Fork (opus) - implements one task; on `TDD: required` it goes test-first and must see RED. |
| `superbuild-task-reviewer` | Fork - reviews every single task; `FAIL` sends the coder back (max 3 rounds per task). |
| `superbuild-reviewer-spec` | Fork - final review of the whole change against the spec. |
| `superbuild-reviewer-code` | Fork - final code review, run after the spec reviewer passes. |

### Knowledge layers (also runnable on their own)

| Skill | Role |
| --- | --- |
| `superdev-memory` | Builds or audits the hierarchical `CLAUDE.md` cascade - one general root plus more specific child nodes in genuine architectural units, never a single monolith. |
| `superdev-rules` | Discovers the codebase's real conventions with examples, confirms each with you, and writes many small path-scoped files under `.claude/rules/`. |
| `superdev-docs` | Maintains user-facing product docs at `docs/product/<feature-slug>.md`. Docs are treated as user intent: a doc-vs-code divergence is surfaced as a requirement, never silently overwritten. |
| `superdev-memory-writer` / `superdev-rules-writer` / `superdev-docs-writer` | Forks - the writing half of each layer; also invoked at Close Out when the matching switch is on. |
| `superbuild-adr` | Fork - records the architectural decision at Close Out when `adr: true`; writes no file when the plan commits to none. |
