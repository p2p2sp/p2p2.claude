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
2. **Describe what you want to build.** The `intent` skill fires by itself. It sends `Explore` agents into
   the codebase first, then puts the gap questions the codebase can't answer to you in short rounds of up to three -
   then interviews you in prose - one question per turn, 2-3 numbered options with a recommendation - until
   every load-bearing decision is settled.
3. **Confirm the synthesis and pick a track, or stop here** (this gate is yours, the model never routes past
   it) - the confirmed synthesis is saved to `docs/.workflows/<run>/intent.md` and `intent <path>`
   resumes it later:
   - **Simple** - small, contained, reversible changes. `simpleplan` writes the plan; the plan carries its
     own acceptance criteria, no spec.
   - **Super** - medium/large, cross-cutting or hard-to-reverse changes. `superspec` writes the
     `What & Why` spec first (saved to `docs/.workflows/<run>/spec.md`), then chains into `superplan`.
   - **Roadmap** - work too large for one spec. `roadmap` proposes a phase split, gates it on a reviewer,
     then saves `docs/.workflows/<run>/roadmap.md` plus one `phases/NN-<slug>/intent.md` per phase; each
     phase starts with `intent <phase intent>` and runs its own Simple or Super track, and
     `roadmap <roadmap.md>` resumes the run by showing phase status and proposing the next one.
4. **Approve the plan.** A forked reviewer must return `VERDICT: PASS` before `ExitPlanMode` is even allowed;
   then you approve it yourself.
5. **The build runs task by task.** The orchestrator (`simplebuild` / `superbuild`) decomposes the plan into
   `docs/.workflows/<run>/tasks/task-NN.md`, runs an implementor agent per task at the model and effort the plan
   assigned to that task (`Model:` / `Effort:` markers), and commits each task on its own, staging only the files
   that task and its notes declared. On the Super track every task also passes a reviewer agent dispatched at
   that same strength, whose **failure pass** interrogates the task's own diff: each new `catch` or fallback
   branch (what comes back, what gets logged), each widened closed set (who consumes it), each changed response
   mechanism (which methods, which codes), each outside value reaching a path, query or command (validated?) and
   each new test (can it fail?).
6. **Reviews run in rounds, each on a small delta.** After every 5th committed task, while tasks remain, a
   checkpoint review reads `git diff <since>..HEAD` and writes `implementation/checkpoint-KK.md`. The final
   review is the last round of that same chain and adds the integration mandate over the whole build: contracts
   another task consumes, the `CARRY:` lines implementors left behind, failure branches that cross tasks. Every
   round carries one budget - one fix dispatch and one re-review scoped to that fix - and then the decision is
   yours (another round / accept with open findings / abort). Findings keep stable IDs (`C1`, `I2`, `M3`) for the
   life of the build, a re-review opens with an `ADDRESSED` / `NOT ADDRESSED` table per ID, and Minor findings go
   to `implementation/debt.md` without touching any verdict. A reviewer returns `VERDICT: BLOCKED` when a
   criterion is unmet because of a decision, not because code is missing: you answer once, and every
   acceptance - there, or when you close a round with findings still open - is recorded in
   `implementation/decisions.md`, which binds every later round like plan text. The
   orchestrator writes no file at any step (agents, forks and the bundled scripts do) and escalates every
   interruption to you - a spend or session limit, a reviewer that returned no report, an undeclared change in
   your working tree - instead of finishing the work itself.
7. **Close Out** runs two waves: `adr`, `memory` and `rules` in parallel, then `changelog` (which also links
   the ADR when one was written), and commits what they touched; when `cleanup: true` it then removes the
   run's working directory and commits that removal.

Reporting a bug instead? Just say so - `simpledebug` fires first, traces the flow step by step, proves the
diagnosis with a failing test, and hands the proven fix plan to `simpleplan`.

## Config switches

`.claude/superdev.yml` in the consuming repo, all `false` by default, set once via `/superdev:setup`:

| Switch | When `true`, Close Out also… |
| --- | --- |
| `adr` | records an architectural decision at `docs/adr/<timestamp>-<title-slug>.md` (no file when the plan holds no real decision) |
| `memory` | refreshes the `CLAUDE.md` project-memory cascade |
| `rules` | refreshes the path-scoped `.claude/rules/` convention files |
| `changelog` | writes one append-only entry at `docs/changelog/<run>.md` (intent, decisions, ADR link, deviations, areas) plus an index line in `docs/changelog/README.md` |
| `cleanup` | removes the run's working directory after a completed build (a phase's directory, and the run root after its last phase) and commits the removal |

A failing delegation never blocks the build - it lands in the final summary instead.

## Skills

You invoke the entry skills; everything marked *fork* runs in its own context, driven by the track, and is
never called by hand.

### Entry and environment

| Skill | Role |
| --- | --- |
| `intent` | The always-on entry skill. Explores the codebase (including prior changelog entries and ADRs), puts the gap questions to you in short rounds of up to three, runs the design interview, persists the confirmed synthesis to `docs/.workflows/<run>/intent.md`, then gates on your track choice or stopping there - `intent <path>` resumes a saved synthesis later. Writes no code and no plan. |
| `roadmap` | Splits a confirmed intent too large for one spec into phases, refines the split in conversation, gates it on `roadmap-reviewer`, then saves `docs/.workflows/<run>/roadmap.md` and one `phases/NN-<slug>/intent.md` per phase; also resumes a run from `roadmap <roadmap.md>` by showing phase status and proposing the next phase. |
| `roadmap-reviewer` | Fork - read-only roadmap review against the checklist; returns `VERDICT: PASS` / `FAIL` plus findings. Max 3 rounds. |
| `setup` | `/superdev:setup` - one-time, user-only repository bootstrap and config-switch picker. Idempotent. |
| `simpledebug` | Fires on any bug, crash, regression or "it behaves wrong". Traces the whole flow instead of guessing, proves the diagnosis with a failing (RED) test, then hands the fix plan to `simpleplan`. Fixes nothing itself. |
| `tdd` | Red-Green-Refactor discipline for a task marked `TDD: required` (or when you ask for test-first work). No production code without a failing test first. |

### Simple track

| Skill | Role |
| --- | --- |
| `simpleplan` | Writes the plan (`How`) from the confirmed understanding - no spec, the plan carries its own DoD. Self-reviews, then calls the reviewer. |
| `simpleplan-reviewer` | Fork - read-only plan review against the checklist; returns `VERDICT: PASS` / `FAIL` plus findings. Max 3 rounds. |
| `simplebuild` | Sonnet orchestrator - decomposes the approved plan, drives the task loop, runs the checkpoint and final review rounds; writes no file itself and escalates every interruption to you; status lines only, no prose. |
| `superdev:simplebuild-task-implementor` | Agent - implements one task, reviews its own work, runs build + tests (up to 5 rounds); dispatched with the `Agent` tool at the task's `Model:` / `Effort:` (frontmatter default `sonnet` / `high`). In fix mode it works a review report: every Critical and Important ID, each proven by a test that failed before the fix, and one `touched:` line per file it changed. |
| `simplebuild-reviewer` | Fork - the Simple track's code reviewer, run as the checkpoint every 5 committed tasks, as the final integration round, and as the re-review after a fix (`stage: checkpoint\|final\|re-review`, plus `since:`, `prior:` and `decisions:`); returns `PASS`, `FAIL` or `BLOCKED` and one report per round. |

### Super track

| Skill | Role |
| --- | --- |
| `superspec` | Writes the `What & Why` spec (INVEST stories, max 3 acceptance criteria each, zero TBDs) to `docs/.workflows/<run>/spec.md`, then gates on continuing to the plan. |
| `superspec-reviewer` | Fork - spec review; no handoff without `VERDICT: PASS`. |
| `superspec-refine` | Evolves an existing spec instead of writing a new one. |
| `superplan` | Writes the plan (`How`) from the approved spec, marking each task `TDD: required` or `TDD: none` and assigning it a build strength - `Model:` (`sonnet` / `opus`) and `Effort:` (`low` … `xhigh`), rounded up when in doubt. |
| `superplan-reviewer` | Fork - checks the plan against the spec and the repo; `needs-discovery` routes back to `intent` rather than looping. |
| `superbuild` | Sonnet orchestrator - decomposes the approved plan (requires a `spec:` line, otherwise the plan belongs to `simplebuild`), drives the task loop, runs the checkpoint and final review rounds; writes no file itself and escalates every interruption to you. |
| `superdev:superbuild-task-implementor` | Agent - implements one task; on `TDD: required` it goes test-first and must see RED; dispatched with the `Agent` tool at the task's `Model:` / `Effort:` (frontmatter default `opus` / `high`). In fix mode it works a review report: every Critical and Important ID, each proven by a test that failed before the fix, and one `touched:` line per file it changed. |
| `superdev:superbuild-task-reviewer` | Agent - reviews every single task and runs the failure pass over its diff; `FAIL` sends the implementor back (max 3 rounds per task); dispatched with the `Agent` tool at the task's `Model:` / `Effort:`, the same values as the implementor (frontmatter default `opus` / `high`). Behaviour the task's `### Failure modes` recorded is a decision - disagreeing with it is a `NOTE: plan defect` line, never a finding. |
| `superbuild-reviewer-spec` | Fork - final review of the whole change against the spec; runs the full suite before reading any code and returns `BLOCKED` when a criterion is unmet by decision rather than by missing code. |
| `superbuild-reviewer-change` | Fork - the Super track's code reviewer, run as the checkpoint every 5 committed tasks, as the final integration round over the whole build, and as the re-review after a fix (`stage: checkpoint\|final\|re-review`, plus `since:`, `prior:` and `decisions:`); returns `PASS`, `FAIL` or `BLOCKED` and one report per round. |

### Knowledge layers (also runnable on their own)

| Worker | Role |
| --- | --- |
| `superdev-memory` | Builds or audits the hierarchical `CLAUDE.md` cascade - one general root plus more specific child nodes in genuine architectural units, never a single monolith. |
| `superdev-rules` | Discovers the codebase's real conventions with examples, confirms each with you, and writes many small path-scoped files under `.claude/rules/`. |
| `superdev:changelog-writer` | Agent - writes one append-only build changelog entry at `docs/changelog/<run>.md` plus its index line at Close Out when `changelog: true`; never edits an existing entry. For a roadmap phase, the entry id is `<run>-<phase>`. |
| `superdev:memory-writer` / `superdev:rules-writer` | Agents - the writing half of each layer; also invoked at Close Out when the matching switch is on. Close Out dispatches these two alongside `superdev:adr-writer` with the `Agent` tool in a single message, so they run in parallel. |
| `superdev:adr-writer` | Agent - records the architectural decision at Close Out when `adr: true`; writes no file when the plan commits to none. |
