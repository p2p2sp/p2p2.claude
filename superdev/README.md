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

Same interview on the way in, two execution tracks, one shared Close Out - plus a third, plan-less vibe
track for one-sentence changes.

## Quick start

1. **Run `/superdev:setup` once per repository.** It seeds `.temp/`, `.gitignore`
   and `.claude/superdev.yml`, adds the `docs/.workflows/**` linguist rule to `.gitattributes`, and lets you
   flip the opt-in switches. It also reports whether `playwright-cli` and `@playwright/test` are present in
   the host, without installing either. It never overwrites what already exists.
2. **Describe what you want to build.** The `intent` skill fires by itself. It sends `Explore` agents into
   the codebase first, then interviews you in prose - one question per turn, 2-3 numbered options with a
   recommendation - until every load-bearing decision is settled.
3. **Confirm the synthesis and pick a track, or stop here** (this gate is yours, the model never routes past
   it) - with `adr: true`, after the confirmation the `adr` skill judges each decision against the three
   criteria and offers a one-paragraph ADR only for the ones that pass; accepted drafts land in `intent.md`'s
   `## ADR` section and become the plan's first task, written to `docs/adr/<YYYY-MM-DD-HHMMSS>-<slug>.md`
   during the build. The confirmed synthesis is saved to `docs/.workflows/<run>/intent.md` and `intent <path>`
   resumes it later, refreshing the context first: a `refresh.md` written beside `intent.md` (changelog
   entries and ADRs since the intent's date, the delivered state, movement in git) before it shows you the
   decisions; `superspec` and `simpleplan` refuse an `intent:` path under `docs/.workflows/` with no
   `refresh.md` next to it and run `intent` on that same path instead:
   - **Simple** - small, contained, reversible changes. `simpleplan` writes the plan; the plan carries its
     own acceptance criteria, no spec.
   - **Super** - medium/large, cross-cutting or hard-to-reverse changes. `superspec` writes the
     `What & Why` spec first (saved to `docs/.workflows/<run>/spec.md`), then chains into `superplan`.
   - **Phases** - work too large for one spec. `phases` proposes a phase split, gates it on a reviewer,
     then saves `docs/.workflows/<run>/phases.md` plus one `phases/NN-<slug>/intent.md` per phase; each
     phase starts with `intent <phase intent>` and runs its own Simple or Super track, and
     `phases <phases.md>` resumes the run by showing each phase's title and status and proposing the
     next one by title.

   **Or skip all of it for a one-sentence change.** Say "vibe: <change>" (or run /superdev:vibe <change>)
   and the vibe skill does it with one implementor agent, the checks your CLAUDE.md declares for that area,
   an advisory scope guard and one commit - no interview, no plan, no reviewer, no knowledge writer. The
   guard stops on more than 5 files, more than 1 new file, more than 200 changed lines, or a path your
   memory calls sensitive, and on a failed check; every stop offers approve-and-commit, revert, or hand the
   diff to intent - the choice is yours.
4. **Approve the plan.** A forked reviewer must return `VERDICT: PASS` before `ExitPlanMode` is even allowed;
   then you approve it yourself.
5. **The build runs task by task.** The orchestrator (`simplebuild` / `superbuild`) decomposes the plan into
   `docs/.workflows/<run>/tasks/task-NN.md` - refusing a plan file that differs from the one the reviewer
   approved (the `ExitPlanMode` gate records the approved plan's sha256 beside it) - runs an implementor agent
   per task at the model the plan assigned to that task (`Model:` marker - the `Agent` tool takes no `effort`
   parameter, so the agent's own frontmatter decides effort and the plan carries no effort marker), and commits
   each task on its own, staging only the files that task and its notes declared. Each task also carries a `Kind: code | scaffold |
   text` marker the planner reads off its own `### Task Checks` evidence - a test-file line is `code`, a tool
   command with no test file is `scaffold`, anything else is `text` - and `scaffold` / `text` tasks default to
   `sonnet` with no per-task reviewer, unless your memory files declare that text is your product, in which case
   a `text` task keeps its reviewer. An implementor runs that task's own `### Task Checks` and nothing else - the
   whole-build gate is the orchestrator's own single run per review round. On the Super track a `code` task's
   `Review:` marker carries three literal states: no marker dispatches the reviewer at its own
   `sonnet` / `high` frontmatter default, `Review: <model>` passes that model to the dispatch, and literally
   `Review: none` skips the per-task reviewer entirely, with no substitute check standing in for the review.
   Every task goes from the implementor's `VERDICT: PASS` straight to commit: where a reviewer does run, it
   judges that task's committed range and is dispatched beside the next task's implementor wherever the plan
   lets the two run side by side, its verdict read once that next task is committed. Where it runs, the
   reviewer's **failure pass** interrogates that diff:
   each new `catch` or fallback
   branch (what comes back, what gets logged), each widened closed set (who consumes it), each changed response
   mechanism (which methods, which codes), each outside value reaching a path, query or command (validated?) and
   each new test (can it fail?). A value the task text, its `### Contracts`, its `### Failure modes` and the
   plan header all leave open is either settled or stopped on: a defensible answer - an existing repo pattern, a
   covered criterion, a host convention - is written to the task's notes as `UNDERSPECIFIED: <value> - <the
   decision made>`, judged at the per-task gate and listed at the final review's `## Decisions taken` section;
   no defensible answer is a hard stop, `DECISION: <what> - <why> - <options>` plus a `VERDICT: BLOCKED` return,
   and the orchestrator asks you one question per line, records your answer to `implementation/decisions.md`,
   and re-dispatches the same task or fix with it. The per-task reviewer has a stop of its own: a criterion the
   task covers that the plan's own text left unreachable comes back as `VERDICT: BLOCKED`, and you decide per
   criterion - accept the gap as is, dictate the rule the task follows instead (recorded to
   `implementation/decisions.md`, then built and re-reviewed), or abort. A plan defect that leaves the task's
   criteria met stays a `NOTE: plan defect` line, which the build reviewers read and settle.
6. **Reviews run in rounds, each on a small delta.** Every round opens with one run of the `## Gate commands`
   block the plan carries above its first task - the whole build's gate, run once by the orchestrator itself
   and handed to every reviewer of that round, which reads the result instead of running anything:
   `#### Build` and `#### Tests` at a checkpoint, plus `#### Integration` at the final round and its
   re-review - and only then is any code read. `#### Build` and
   `#### Tests` carry each check at its narrowest proving scope - one project, one path, one suite - never a
   command that builds or tests the whole repository, solution or workspace; that full-scope command, when it
   is worth running at all, belongs under `#### Integration` alone. After every 5th
   committed task, while tasks remain, a
   checkpoint review reads `git diff <since>..HEAD` and writes `implementation/checkpoint-KK.md`. The final
   review is the last round of that same chain and adds the integration mandate over the whole build: contracts
   another task consumes, the `CARRY:` lines implementors left behind, failure branches that cross tasks. Every
   round carries one budget - one fix dispatch and one re-review scoped to that fix - and then the decision is
   yours (another round / accept with open findings / abort). Findings keep stable IDs and a short title
   (`` `Missing timeout test` (C1) ``) for the life of the build, a re-review opens with an `ADDRESSED` /
   `NOT ADDRESSED` / `ACCEPTED` table per ID, and Minor findings stay in the round's own report under its
   `## Debt` section without touching any verdict. A report carries new information only - a section with
   nothing to say is left out. Every escalation names a task or a finding that same way, never by a bare number
   or ID. A reviewer returns `VERDICT: BLOCKED` when a
   criterion is unmet because of a decision, not because code is missing: you answer once, and every
   acceptance - there, or when you close a round with findings still open - is recorded in
   `implementation/decisions.md`, which binds every later round like plan text. The final review and its
   re-review also write a `## Decisions taken` section, one line per `UNDERSPECIFIED:` value an implementor
   settled itself across the whole build - informational only, it never moves a verdict, and a checkpoint
   report never carries it; with `stats: true`, that run's report counts a matching `DECISION` column
   alongside `UNDERSPECIFIED` in its per-task and per-fix rows. The
   orchestrator writes no file at any step (agents and the bundled scripts do) and escalates every
   interruption to you - a spend or session limit, a reviewer that returned no report, an undeclared change in
   your working tree - instead of finishing the work itself.
7. **Close Out** runs two waves: `memory`, `rules` and, with any of `qa` / `e2e-ui` / `e2e-api` true,
   `qa-writer` in parallel, then `changelog` (which links every ADR the build wrote), and commits what
   they touched; with `stats: true` it renders the run's execution report
   to `.temp/superdev/stats/<run>.md`, and when `cleanup: true` it then removes the run's working
   directory and commits that removal. `qa-writer` writes the tester's write-once acceptance document and
   the machine-facing write-once handoff file, both under `docs/qa/`, from the same scenario IDs; a
   separate, user-only `e2e` skill (never dispatched by a build) later reads one handoff file the operator
   names, launches the host application, and dispatches `superdev:e2e-writer` once per scenario to write
   and locally prove green one `@playwright/test` file before committing it for CI - a two-stage model that
   never runs a Playwright test during a build, a checkpoint, or any review gate.

Reporting a bug instead? Just say so - `simpledebug` fires first, traces the flow step by step, proves the
diagnosis with a failing test, and hands the proven fix plan to `simpleplan`.

## Config switches

`.claude/superdev.yml` in the consuming repo, all `false` by default, set once via `/superdev:setup`:

| Switch | When `true`… |
| --- | --- |
| `adr` | offers an ADR in the intent synthesis for a decision that is hard to reverse, surprising without context and a real trade-off; the plan's first task writes it to `docs/adr/<YYYY-MM-DD-HHMMSS>-<slug>.md` |
| `memory` | refreshes the `CLAUDE.md` project-memory cascade |
| `rules` | refreshes the path-scoped `.claude/rules/` convention files |
| `changelog` | writes one append-only entry at `docs/changelog/<run>.md` (intent, decisions, ADR link, deviations, areas) plus an index line in `docs/changelog/README.md` |
| `cleanup` | removes the run's working directory after a completed build (a phase's directory, and the run root after its last phase) and commits the removal |
| `stats` | records one event per dispatch of the build (model, effort, tokens, tool uses, duration, verdict) to `.temp/superdev/stats/<run>.events` and renders that run's report to `.temp/superdev/stats/<run>.md` after Close Out |
| `qa` | writes a write-once tester acceptance document per build to `docs/qa/<run>.md` - plain-language steps to run by hand - plus one index line at `docs/qa/README.md`, both read-only for the tester, who statuses the scenarios in GitHub Projects |
| `e2e-ui` | writes the build's UI scenarios into a write-once machine handoff file, `docs/qa/<run>.e2e.md`, sharing its scenario IDs with `qa`'s acceptance document |
| `e2e-api` | writes the build's black-box API scenarios into the same handoff file |

None of the three ever runs a Playwright test during a build; the separate, operator-run `e2e` skill reads
a named handoff file, stands the application up locally, generates one `@playwright/test` file per
scenario (UI clicked through the browser, API driven black-box through `request`), proves each green
before committing it for CI.

A failing delegation never blocks the build - it lands in the final summary instead.

## Skills

You invoke the entry skills; everything marked *fork* runs in its own context, driven by the track, and is
never called by hand.

### Entry and environment

| Skill | Role |
| --- | --- |
| `intent` | The always-on entry skill. Explores the codebase (including prior changelog entries and ADRs), runs the design interview one question per turn, persists the confirmed synthesis to `docs/.workflows/<run>/intent.md`, then gates on your track choice or stopping there - `intent <path>` resumes a saved synthesis later. Every write of `intent.md`, fresh or resumed, also writes `refresh.md` beside it: a resume refreshes the context with the delta since the intent's `Date:` (changelog entries and their ADRs, a check of its `Delivers:` and `## Constraints` against the repo, movement in git) before presenting the decisions; a fresh run writes the same file from what `## Explore first` already found. `superspec` and `simpleplan` gate on that file being present next to an `intent:` path under `docs/.workflows/`, bouncing back into `intent` with the same path when it is missing. Writes no code and no plan. |
| `adr` | Invoked by `intent` at the synthesis, never by you - judges each confirmed decision against three criteria (hard to reverse, surprising without context, the result of a real trade-off) and offers a one-paragraph ADR draft for every decision that passes all three; accepted drafts become `intent.md`'s `## ADR` section and the plan's first task, which writes each one to `docs/adr/<YYYY-MM-DD-HHMMSS>-<slug>.md` during the build. |
| `phases` | Splits a confirmed intent too large for one spec into phases, refines the split in conversation, gates it on `phases-reviewer`, then saves `docs/.workflows/<run>/phases.md` and one `phases/NN-<slug>/intent.md` per phase; also resumes a run from `phases <phases.md>` by showing phase status and proposing the next phase. |
| `phases-reviewer` | Fork - read-only review of the phases file against the checklist; returns `VERDICT: PASS` / `FAIL` plus findings. Max 3 rounds. |
| `setup` | `/superdev:setup` - one-time, user-only repository bootstrap and config-switch picker; also offers to merge superdev's recommended `.claude/settings.json` permissions (tool/`Bash` allow-list, destructive-operation deny-list, `defaultMode: acceptEdits`) into the host's file on consent - a deterministic merge that needs Node on PATH, skip-with-note (the recommended block printed for a manual merge) otherwise. Idempotent. |
| `simpledebug` | Fires on any bug, crash, regression or "it behaves wrong". Traces the whole flow instead of guessing, proves the diagnosis with a failing (RED) test, then hands the fix plan to `simpleplan`. Fixes nothing itself. |
| `tdd` | Red-Green-Refactor discipline for a task marked `TDD: required` (or when you ask for test-first work). No production code without a failing test first. |
| `executor` | Fork, two modes, one reply shape (`VERDICT:`, `EXPECT:`, the tool's summary line, the failures, a `LOG:` path under `.temp/superdev/logs/`) instead of the full output. Run mode executes one build, test, lint or any other command on haiku, for you calling it yourself with a `command:` line. Analysis mode takes `log:` + `exit:` + `duration:` and runs nothing, reading a log an earlier direct `run.sh` call already wrote. The orchestrator calls `run.sh` for every command of the plan's `## Gate commands` block once per review round and hands the block that run wrote to the three build reviewers, which read it instead of running anything - a passing gate costs a reviewer the read and no fork at all - and dispatch `executor` in analysis mode only when an entry comes back `RESULT: DEVIATION`; the two task implementors never call it, running the task's `### Task Checks` lines directly with `Bash` and reading the output themselves. |
| `e2e` | User-only (`disable-model-invocation: true`), never dispatched by a build. Takes one build's `docs/qa/<run>.e2e.md` handoff file named explicitly by the operator, checks the host's launch recipe, base URL, test accounts and e2e conventions in its own memory, launches the application, then dispatches `superdev:e2e-writer` once per pending scenario ID to write and locally prove green one `@playwright/test` file, and commits the generated files plus the handoff for CI. Preflight asks the operator rather than guessing when the host memory or the Playwright tooling is missing. |

### Simple track

| Skill | Role |
| --- | --- |
| `simpleplan` | Writes the plan (`How`) from the confirmed understanding - no spec, the plan carries its own DoD; every task carries a `Kind: code \| scaffold \| text` marker read off its own `### Task Checks` evidence that decides its `Model:` (the template carries no `Review:` marker, so `Kind:` here steers `Model:` alone); the header's `## Gate commands` block (`#### Build`, `#### Tests`, `#### Integration`) is the whole build's gate, every task carries `### Task Checks` holding only its own proof, and a `TDD: required` task owns exactly one test file. Self-reviews, then calls the reviewer. |
| `simpleplan-reviewer` | Fork - read-only plan review against the checklist; returns `VERDICT: PASS` / `FAIL` plus findings. Max 3 rounds. |
| `simplebuild` | Sonnet orchestrator - decomposes the approved plan, drives the task loop, runs the checkpoint and final review rounds; writes no file itself and escalates every interruption to you; status lines only, no prose. |
| `superdev:simplebuild-task-implementor` | Agent - implements one task, reviews its own work, runs the task's `### Task Checks` lines directly with `Bash` (up to 5 rounds), never the plan's gate and never the full suite, and records every run under `## Runs` in its notes; dispatched with the `Agent` tool at the task's `Model:` marker - the tool takes no `effort` parameter, so the agent's own frontmatter (default `sonnet` / `xhigh`) supplies it. In fix mode it works a review report: every Critical and Important ID, each proven by a test that failed before the fix, and one `touched:` line per file it changed. |
| `superdev:simplebuild-reviewer` | Agent - the Simple track's single build reviewer, owning plan alignment and code quality at once, run as the checkpoint every 5 committed tasks, as the final integration round, and as the re-review after a fix (`stage: checkpoint\|final\|re-review`, plus `since:`, `prior:`, `decisions:`, `refs:` and `gates:`); dispatched with the `Agent` tool at no `model:` parameter, so its own frontmatter (`sonnet` / `high`) decides. Returns `PASS`, `FAIL` or `BLOCKED` and one report per round. |

### Vibe track

| Skill | Role |
| --- | --- |
| `vibe` | The skill: entry, reconnaissance, entry guard, brief under `.temp/superdev/vibe/<timestamp>-<slug>/`, dispatch, `vibe-guard.sh`, commit through `commit-task.sh`, the three-option stop, every override recorded as an `OVERRIDE:` line in that run's `brief.md`. |
| `superdev:vibe-implementor` | The agent: brief in, checks run directly with `Bash`, max 3 fix rounds, notes with `## Runs` and `touched:` lines, `VERDICT:` out. |

### Super track

| Skill | Role |
| --- | --- |
| `superspec` | Writes the `What & Why` spec (INVEST stories, max 3 acceptance criteria each, zero TBDs) to `docs/.workflows/<run>/spec.md`, then gates on continuing to the plan. |
| `superspec-reviewer` | Fork - spec review; no handoff without `VERDICT: PASS`. |
| `superspec-refine` | Evolves an existing spec instead of writing a new one. |
| `superplan` | Writes the plan (`How`) from the approved spec, marking each task `TDD: required` or `TDD: none`, a `Kind: code \| scaffold \| text` axis read off its own `### Task Checks` evidence, and a build strength - `Model:` (`sonnet` / `opus`) - read off the reasoning the task demands, never off its line count; there is no effort marker, since the `Agent` tool takes no `effort` parameter and the dispatched agent's own frontmatter is the only place an effort is set. The optional `Review:` marker sets that task's reviewer strength in three literal states: absent (the reviewer's own `sonnet` / `high` default), `<model>` (that model passed), or literally `Review: none` (the per-task reviewer skipped entirely - the default for `scaffold` and `text` tasks, unless the host's memory files declare text as its product). The header's `## Gate commands` block is the whole build's gate, every task carries `### Task Checks` holding only its own proof, and a `TDD: required` task owns exactly one test file. |
| `superplan-reviewer` | Fork - checks the plan against the spec and the repo; `needs-discovery` routes back to `intent` rather than looping. |
| `superbuild` | Sonnet orchestrator - decomposes the approved plan (requires a `spec:` line, otherwise the plan belongs to `simplebuild`), drives the task loop, runs the checkpoint and final review rounds; writes no file itself and escalates every interruption to you. |
| `superdev:superbuild-task-implementor` | Agent - implements one task; on `TDD: required` it goes test-first and must see RED; runs the task's `### Task Checks` lines directly with `Bash` (up to 5 rounds), never the plan's gate and never the full suite, and records every run under `## Runs` in its notes; dispatched with the `Agent` tool at the task's `Model:` marker - the tool takes no `effort` parameter, so the agent's own frontmatter (default `opus` / `xhigh`) supplies it. In fix mode it works a review report: every Critical and Important ID, each proven by a test that failed before the fix, and one `touched:` line per file it changed. |
| `superdev:superbuild-task-reviewer` | Agent - reviews every single task and runs the failure pass over its diff; `FAIL` sends the implementor back (max 3 rounds per task); `BLOCKED` stops the task on a covered criterion the plan's own text left unreachable and hands you the choice (accept as is / fix the plan / abort); dispatched with the `Agent` tool at the task's `Review:` marker in three literal states - no marker uses the reviewer's own frontmatter default (`sonnet` / `high`), `Review: <model>` passes that model to the dispatch, and literally `Review: none` skips the dispatch entirely, sending the task from the implementor's `VERDICT: PASS` straight to commit. It reads the shared review contract through `refs:` and the previous round's report through `prior:`, so finding IDs stay unique across a task's rounds. It holds the task instead when it has only notes to add, appending them as `## Review notes` and writing no report. Behaviour the task's `### Failure modes` recorded is a decision - disagreeing with it while the task's criteria stay met is a `NOTE: plan defect` line, never a finding. |
| `superdev:superbuild-reviewer-spec` | Agent - final review of the whole change against the spec, one verdict per acceptance criterion; reads its round's gate results from the block handed on `gates:` before reading any code, runs no gate command itself, and returns `BLOCKED` when a criterion is unmet by decision rather than by missing code. It owns the report's coverage table and its `## Decisions taken` section. Dispatched with the `Agent` tool at no `model:` parameter, so its own frontmatter (`sonnet` / `high`) decides. |
| `superdev:superbuild-reviewer-change` | Agent - the Super track's code reviewer, run at the checkpoint after every 5 committed tasks only when that window gives a reason - a gate command that deviated from its expectation, a task the per-task gate reported faulty, or a task no per-task review covered - as the final integration round over the whole build, and as the re-review after a fix (`stage: checkpoint\|final\|re-review`, plus `since:`, `prior:`, `decisions:`, `refs:` and `gates:`); dispatched with the `Agent` tool at no `model:` parameter, so its own frontmatter (`opus` / `high`) decides. Returns `PASS`, `FAIL` or `BLOCKED` and one report per round. At the final round it and the spec dimension go out as two `Agent` calls in ONE message and run concurrently - neither reads the other's report, and both record the one gate run the round already made. |

### Knowledge layers (also runnable on their own)

| Worker | Role |
| --- | --- |
| `superdev-memory` | Builds or audits the hierarchical `CLAUDE.md` cascade - one general root plus more specific child nodes in genuine architectural units, never a single monolith. |
| `superdev-rules` | Discovers the codebase's real conventions with examples, confirms each with you, and writes many small path-scoped files under `.claude/rules/`. |
| `superdev:changelog-writer` | Agent - writes one append-only build changelog entry at `docs/changelog/<run>.md` plus its index line at Close Out when `changelog: true`; never edits an existing entry. For a phase of a split run, the entry id is `<run>-<phase>`. |
| `superdev:memory-writer` / `superdev:rules-writer` | Agents - the writing half of each layer; also invoked at Close Out when the matching switch is on. Close Out dispatches these two with the `Agent` tool in a single message, so they run in parallel. |
| `superdev:qa-writer` | Agent - dispatched in Close Out's wave 1 alongside `memory-writer` / `rules-writer` whenever `qa`, `e2e-ui` or `e2e-api` reads `true`; writes the write-once tester acceptance document (`docs/qa/<run>.md`), the write-once machine handoff file (`docs/qa/<run>.e2e.md`), and the `docs/qa/README.md` index line, sharing one set of `QA-nn` scenario IDs across both files. Never re-writes an existing document. |
| `superdev:e2e-writer` | Agent - dispatched only by the `e2e` skill, once per pending scenario ID of a handoff file; writes one `@playwright/test` file against the application `e2e` already launched, proves it green, then records the outcome as that ID's automation status line - `file <path>` on green, `blocked - <reason>` when an application defect (never a test fix) prevents one. |
