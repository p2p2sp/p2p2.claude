---
source: /Users/dario/Projects/p2p2.claude/docs/_specs/2026-09-28-11-08-25_final-review-of-the-whole-build-in-viber/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Final review of the whole build in viber

## Goal

Give viber's build one fresh review of the whole build, after every task is committed and before the final test run. The reviewer hunts where per-task review and the test suite cannot see: at the edge of the build's diff. One coder then fixes everything it found, once, and the suite still runs once.

## Problem

Finished runs leave defects behind despite a per-task review and a green suite. A survey of 24 finished runs across four host repositories found 13 defects fixed after the run, almost all at the edge of the diff: a consumer of a changed contract or output format outside every task's files (a server omitting a null field while the client checks for an explicit null and the test fixture sends one; a style layer breaking helpers in end-to-end specs), lines coders flagged as "outside my Files" that no task ever owned, an incomplete removal (build guards, package versions and rules pointing at deleted files), a criterion whose only proof was a skipped task or a deferred test never written, and a new link helper left with no caller. Each per-task reviewer sees one task, so none of them could see these. A criterion-by-criterion conformance review in a predecessor tool marked every criterion met while whole-build code reading found the real bugs. Leaving it costs a manual clean-up after almost every run.

## Current behaviour

After its last task commit the implementor dispatches the test runner once, repairs a red run for up to three rounds, then records memory, rules and QA and archives the run. Nothing reads the build as a whole: each task was gated alone against its own task file, and `closeout` only records where the build delivered something the specification does not promise, reading coder notes and never the diff.

### Must not change

- A build whose `.claude/viber.yml` has `final-review` false or absent runs exactly as today.
- The full test suite runs once, in the build's final test run, after any final review fix.
- Every existing `commit-task.sh` form keeps its arguments, subject, status entries and output.
- A `task-coder` dispatch carrying a task file or a test-run report behaves as today.
- Every existing switch resolves and prints as today.

## Behaviour

### S1 - The whole build is reviewed before the final test run [NEW]

With the switch on, once every task is settled, fresh reviewers read the build as a whole before the suite runs.

Given a build with `final-review: true` and at least one committed task
When the last task is committed or skipped
Then the final review runs before the final test run, and a build resumed after the review's fix commit does not run it again

### S2 - The reviewer follows every change past the diff [NEW]

The reviewer starts from what changed, not from the criteria.

Given the tasks a reviewer received
When it reads their commits, their task files, their coders' notes and the run's status
Then it searches the whole repository for every consumer of each symbol, output format, contract, route, key and file those tasks changed or removed - code, tests, end-to-end specs, fixtures, docs, build configuration - and reports a consumer broken or left stale, a reference to something removed, an addition nothing reaches, a fixture shaped differently from what the real code emits, every notes line saying something was left outside the task's files or stale, and a criterion whose proof rests on a skipped or unreviewed task or on a deferred path its owning task never tested; with `memory` on it reports nothing in a `CLAUDE.md`

### S3 - Every fixable finding is fixed once [NEW]

Given reviews that found at least one finding a coder can fix
When the reviews return
Then one coder fixes every such finding, Blocking and Minor, in one round, its changes land in one commit, nothing reviews that fix again, and the final test run follows

### S4 - What no coder can fix reaches the summary [NEW]

Given a finding no code change settles - a criterion resting on a task the user skipped, a behaviour only a running environment shows
When the review returns it
Then it is named in the build's final summary and never sent to the coder

### S5 - A large build is split among reviewers by its changed files [NEW]

Given a build of more than 8 tasks
When the final review starts
Then several reviewers run in parallel, each over the files changed by at most 8 consecutive tasks of the plan, and a file changed by tasks of several slices is reviewed only in the slice holding the lowest-numbered task that changed it, so every changed file is reviewed exactly once

### S6 - The switch is seeded and documented [NEW]

Given a project running `/viber:setup`
When the config is written or merged
Then it carries `final-review: true` under its own comment, an existing value is kept, and the help page and the README describe the switch and the reviewer

### Edge cases

- Every reviewer returns no fixable finding -> no fix dispatch and no commit; a build resumed before its final test run passed reviews again, since nothing recorded the review.
- The fix coder returns no `FILES:` line, or its refusal is accepted -> nothing is committed, the reports stay uncommitted under the run's `work/` directory, and the archive drops them with the rest of `work/`; the final summary still names what the reviewers found.
- The build ended on abort, or no task was committed -> no final review.
- A reviewer's tool call is refused -> the user answers retry, accept or abort; accept leaves that reviewer's tasks unreviewed, named in the final summary.
- The fix coder fails -> whatever it changed is committed, its reason reaches the final summary, and the final test run judges the tree; refused -> the user answers retry, accept or abort, accept committing nothing.
- Two reviewers report the same place -> the single fix coder gets both reports and fixes it once.
- `memory` on -> no finding is reported in a `CLAUDE.md` and the fix touches none; `memory` off -> a stale `CLAUDE.md` is an ordinary finding.
- A skipped task -> still handed to a reviewer, which checks only whether the criteria it covers keep a proof elsewhere.

## Glossary

- final review - the build step that reviews the whole build once, after the last task and before the final test run; it is not a second per-task review.
- reviewer slice - the files changed by at most 8 consecutive tasks, less every file a lower-numbered task outside the slice also changed; one final reviewer takes one slice.
- owner finding - a finding no code change settles, reported to the user instead of the fix coder.

## Acceptance criteria

1. With `final-review: true` the implementor runs the final review once every task is settled and before the final test run; with the key false or absent the build runs as today.
2. A final reviewer searches the whole repository for consumers of every symbol, output format, contract, route, key and file its tasks changed or removed, and reports a consumer broken or left stale, a reference to something removed, an addition nothing reaches, and a fixture shaped differently from what the real code emits.
3. A final reviewer reports every notes line of its tasks saying something was left outside the task's files or stale, and every criterion whose proof rests on a skipped or unreviewed task or on a deferred path never tested.
4. A build of more than 8 tasks splits its changed files among reviewers running in parallel, each over the files changed by at most 8 consecutive tasks, every changed file reviewed exactly once.
5. One coder fixes every fixable finding, Blocking and Minor, in exactly one round; nothing reviews the fix and nothing loops.
6. An owner finding reaches the build's final summary and never the coder.
7. The fix lands in one commit recording the final review as closed, so a resumed build skips it, and the full suite still runs once, after the fix.
8. `/viber:setup` seeds `final-review: true` and merges it into an existing config keeping the user's value, and the help page and the README document the switch and the reviewer.
9. With `memory` on, the final review reports nothing in a `CLAUDE.md`.

## Scope

### File map

- modify - viber/scripts/config.sh - resolves and prints the `final-review` switch
- modify - viber/scripts/switch-text.sh - accepts `final-review` as a switch key
- modify - tests/viber/config.test.ts - the switch's resolution and print order
- modify - tests/viber/switch-text.test.ts - the fragment selected for the new key
- modify - tests/portability.test.ts - the new key among the switch keys a fragment call may use
- modify - viber/skills/setup/templates/viber.yml - seeds `final-review: true` under its comment
- modify - tests/viber/bootstrap.test.ts - merge expectations naming the new key
- modify - viber/README.md - the switch row and the switch count
- modify - viber/skills/setup/assets/usage.html - the switch entry and the reviewer's line, both languages
- modify - viber/scripts/commit-task.sh - the `--review` form committing the fix and closing the review
- modify - tests/viber/commit-task.test.ts - regression cases for `--review`
- add - viber/agents/final-reviewer.md - the whole-build reviewer of one slice
- modify - viber/.claude-plugin/plugin.json - registers the agent
- modify - viber/agents/task-coder.md - accepts final review reports as its input
- modify - viber/skills/implementor/SKILL.md - preloads the final review step and nothing else
- add - viber/skills/implementor/fragments/final-review.true.md - the final review step: its task-list entry, slices, dispatches and their models, fix round, commit, summary

### Out of scope

- Behaviour that differs between a development and a production environment, and visual judgement.
- Running end-to-end tests.
- Any change to `task-reviewer` or `planner-review`.
- Any `CLAUDE.md` node: the build's memory close updates them.
- Turning the switch on in this repository's own `.claude/viber.yml`: `/viber:setup` merges it.
- The replay of the reviewer on a past run of `geodis.pricelister` (run 06) and `seo-cms` (run 4c), done by hand after the build.

## Constraints

- Stack-agnostic: no framework, library or language is named as the way to do something.
- Tokens are a design constraint: a build with the switch off loads no final review instruction and dispatches nothing new.
- Two finding levels only, Blocking and Minor.
- Every script works on Windows (Git Bash) and macOS.
- No em dash or en dash in any written file.
- No file names a source, an author or where the knowledge came from.

## Tasks

<!-- TASK -->
### T1 - Resolve the final-review switch
- TDD: required
- Covers: #1
- Uses: C1
- Depends-on: none
- Files: viber/scripts/config.sh, viber/scripts/switch-text.sh, tests/viber/config.test.ts, tests/viber/switch-text.test.ts, tests/portability.test.ts
- Delivers: `config.sh` resolving and printing the `final-review` switch as C1 states, its header contract listing it; `switch-text.sh` accepting it as a key, its header listing it; the portability sweep knowing it as a switch key with values `true` and `false`; regression cases for each
- Verification: `node --test tests/viber/config.test.ts tests/viber/switch-text.test.ts tests/portability.test.ts` -> every test passes, 0 failed
- DoD: a config with `final-review: true` prints `final-review: true`; a config without the key or with any other value prints `final-review: false`; the `final-review` line prints directly after the `cleanup` line; `switch-text.sh final-review` prints the skill's `final-review.true.md` fragment when the switch is on and nothing when it is off; the portability sweep accepts a `switch-text.sh final-review` call and a `.true.md` fragment for it
<!-- /TASK -->

<!-- TASK -->
### T2 - Seed the final-review switch and document it
- TDD: none
- Covers: #8
- Uses: C1
- Depends-on: T1
- Files: viber/skills/setup/templates/viber.yml, tests/viber/bootstrap.test.ts, viber/README.md, viber/skills/setup/assets/usage.html
- Delivers: the setup template carrying `final-review: true` directly after `cleanup`, under a comment saying what the implementor does when it is on; the bootstrap regression cases expecting the key in a seeded and a merged config, an existing value kept; the README's switch table gaining its row, its sentence counting the switches rewritten to match the table (it is already wrong today: `issues` is off as well as `qa`), and its flow sentence ending the build on the full test suite naming the final review before it; the help page gaining a `key-final-review` entry, tagged on, in English and Polish
- Verification: `node --test tests/viber/bootstrap.test.ts tests/viber/usage.test.ts && grep -n "^final-review: true$" viber/skills/setup/templates/viber.yml && grep -n "final-review" viber/scripts/config.sh && grep -n 'id="key-final-review"' viber/skills/setup/assets/usage.html && grep -n "final-review" viber/README.md` -> every test passes and each grep prints at least one line
- DoD: the template seeds `final-review: true` directly after `cleanup`, under its own comment; a config seeded by an older version gains `final-review: true` on merge, and one already holding `final-review: false` keeps it; the README's switch table has a `final-review` row marked on and its sentence counting the switches names every switch the table marks off; the README's flow sentence names the final review before the full test suite; the help page has a `key-final-review` entry marked on, in both languages
<!-- /TASK -->

<!-- TASK -->
### T3 - Commit the final review fix and close the review
- TDD: required
- Covers: #7
- Uses: C2
- Depends-on: none
- Files: viber/scripts/commit-task.sh, tests/viber/commit-task.test.ts
- Delivers: the `--review` form of `commit-task.sh` as C2 states, listed in the header's usage, its stdout table and the usage error; regression cases in `commit-task.test.ts`
- Verification: `node --test tests/viber/commit-task.test.ts` -> every test passes, 0 failed
- DoD: `--review` commits the named files under the subject `fix(viber): final review` with a `Refs:` footer naming the plan; the same commit carries every `work/final-review-*.md` report and `work/final-fix-coder.md` present in the run directory; `status.md` in that commit gains `final-review` on its `closed:` line; a plan whose frontmatter carries `issue:` adds the `Refs: #<N>` line; named files producing no change exit 4 with nothing committed and `status.md` unchanged; a missing plan exits 2; the progress counter is unchanged
<!-- /TASK -->

<!-- TASK -->
### T4 - Add the final reviewer agent
- TDD: none
- Covers: #2, #3, #6, #8, #9
- Uses: C3
- Depends-on: T2
- Files: viber/agents/final-reviewer.md, viber/.claude-plugin/plugin.json, viber/skills/setup/assets/usage.html
- Delivers: `final-reviewer.md` taking the C3 input and returning the C3 output: it reads in full only the specification, `status.md`, its slice's task files, their coders' notes and their commits, and reaches the rest of the repository through targeted searches; its slice is the files its tasks' commits changed, less every file a lower-numbered task outside `tasks` also changed; it searches the whole repository for every consumer of each symbol, output format, contract, route, key and file of its slice changed or removed; it reports what S2 lists, owner findings on `OWNER:` lines only, nothing in a `CLAUDE.md` when `memory` is true, and no style, naming or architecture opinion as a finding; each finding carries its location, the consumer or reference that proves it and the fix; a finding is Blocking when it breaks behaviour, a test, the build or a consumer, and Minor when it leaves only a stale comment, stale document or dead reference with no effect; any fixable finding, a Minor one alone included, writes the report and returns `FAIL`, unlike the per-task gate, because the fix round fixes both levels; the agent registered in `plugin.json`'s `agents[]`; the help page gaining an `agent-final-reviewer` line in both languages, linked from the `key-final-review` entry, and the implementor card's sentence on the test suite naming the final review before it
- Verification: `grep -n "^name: final-reviewer$" viber/agents/final-reviewer.md && grep -n '"./agents/final-reviewer.md"' viber/.claude-plugin/plugin.json && grep -n "OWNER:" viber/agents/final-reviewer.md && grep -n "final-review-" viber/agents/final-reviewer.md && grep -n "tasks: " viber/agents/final-reviewer.md && grep -n "memory: " viber/agents/final-reviewer.md && node --test tests/viber/usage.test.ts` -> each grep prints at least one line and every test passes
- DoD: the agent's frontmatter carries `name`, a description ending "Invoked only by the implementor skill, never directly.", `tools: Read, Write, Grep, Glob, Bash`, `model: opus`, `effort` and a `color` that is not red; its body takes exactly C3's input lines and returns exactly C3's output lines; its slice excludes every file a lower-numbered task outside its `tasks` also changed; it searches consumers across the whole repository, not only inside the diff; it reports notes lines left outside a task's files and criteria resting on a skipped, unreviewed or never-tested deferred proof; it names Blocking and Minor for its own findings and returns `FAIL` with a report on a Minor-only result; an owner finding goes on an `OWNER:` line and never into the report; with `memory` true it reports nothing in a `CLAUDE.md`; its git use is read-only; `plugin.json` lists the agent; the help page has an `agent-final-reviewer` line in both languages and its implementor card names the final review
<!-- /TASK -->

<!-- TASK -->
### T5 - Run the final review in the build
- TDD: none
- Covers: #1, #4, #5, #6, #7
- Uses: C1, C2, C3, C4
- Depends-on: T3, T4
- Files: viber/skills/implementor/SKILL.md, viber/skills/implementor/fragments/final-review.true.md, viber/agents/task-coder.md
- Delivers: `SKILL.md` preloading the `final-review` fragment through `switch-text.sh` at the opening of step 5, before the test runner, its body otherwise unchanged; `final-review.true.md` creating the final review's own task-list entry when the step starts and completing it when the step ends, stating that its two dispatches carry `model` as an exception to the skill's model rule, skipping the step when the index's `closed:` line names `final-review`, the build ended on abort or no task was committed, cutting every task of the index, skipped ones included, into groups of at most 8 consecutive tasks, one group per slice, dispatching one `viber:final-reviewer` per slice in one message with C3's input and model `opus` clamped into the tiers range, answering a refused reviewer with retry / accept / abort, dispatching one fix coder with C4's input and model `sonnet` clamped into the tiers range when any reviewer returned a report, committing its `FILES:` through C2, answering a refused fix coder with retry / accept / abort, and carrying every `OWNER:` line, the fix coder's failure reason and every accepted refusal to the final summary; `task-coder.md` taking C4's `review` lines: fix every finding of each report, Blocking and Minor, prove by running the tests covering the files it changed and never the whole suite, and return `FILES:` as a report with no task file does today
- Verification: `grep -n 'switch-text.sh" final-review' viber/skills/implementor/SKILL.md && grep -n "viber:final-reviewer" viber/skills/implementor/fragments/final-review.true.md && grep -n 'commit-task.sh" --review' viber/skills/implementor/fragments/final-review.true.md && grep -n "review: " viber/skills/implementor/fragments/final-review.true.md && grep -n '`review`' viber/agents/task-coder.md && grep -n "final-review-" viber/agents/final-reviewer.md && grep -n "\-\-review" viber/scripts/commit-task.sh && node --test tests/portability.test.ts` -> each grep prints at least one line and every test passes
- DoD: `SKILL.md` preloads the `final-review` fragment at the opening of step 5, before the test runner dispatch, and gains no other text; the fragment creates and completes its own task-list entry and states the model exception for its two dispatches; the fragment skips the step when `closed:` names `final-review`, on abort, or when no task was committed; it cuts every task of the index into groups of at most 8 consecutive tasks, each task in exactly one; it dispatches one final reviewer per slice in one message with C3's input and model `opus` clamped into the tiers range; it dispatches exactly one fix coder with C4's input only when a reviewer returned a report, and never a second review or fix round; it commits the fix coder's `FILES:` through C2, and commits nothing when there is no `FILES:` line; it carries every `OWNER:` line, a fix coder's `REASON:` and every accepted refusal to the final summary; a refused reviewer or fix coder is answered with retry / accept / abort; `task-coder.md` fixes every finding of a `review` report, Blocking and Minor, proves it with the tests covering its changed files and never the whole suite, and returns `FILES:`
<!-- /TASK -->

## Contracts

### C1 - The final-review switch

File: viber/scripts/config.sh, viber/scripts/switch-text.sh

- `.claude/viber.yml` key: `final-review`, a top-level switch read like `cleanup`.
- `config.sh` stdout line: `final-review: true` only when the value is `true` in any letter case; absent or anything else -> `final-review: false`. Printed directly after the `cleanup:` line.
- `switch-text.sh` key: `final-review`, values `true` | `false`; fragment file `<skill dir>/fragments/<name>.<value>.md`.

### C2 - The --review commit form

File: viber/scripts/commit-task.sh

`commit-task.sh --review <plan-file> <file> [<file>...]`

- Stages the named files, plus each run-directory trail file present: `work/final-review-*.md`, `work/final-fix-coder.md`.
- Subject: `fix(viber): final review`. Footer: `Refs: <plan-file> final review`, plus `Refs: #<N>` when the plan's frontmatter carries `issue:`.
- `status.md` gains `final-review` on its `closed:` line, inside the same commit.
- stdout: `committed: <short sha>`, `subject: <subject>`.
- exit: 2 - bad arguments or missing plan; 4 - the named files produced no change, nothing committed, `status.md` unchanged; 5 - staging or committing failed, `status.md` restored.

### C3 - Final reviewer dispatch

File: viber/agents/final-reviewer.md

Input, one labelled line each:

```
run: <run directory>
tasks: <task id>, <task id>, ...
report: <run directory>/work/final-review-<slice number>.md
refs: <plugin references directory>
memory: <true|false>
```

Output lines:

- `VERDICT: PASS` - no finding a coder can fix; no report written.
- `VERDICT: FAIL` then `REPORT: <report path>` - the report written: one item per finding, its location (`path:line`), what is wrong, the consumer or reference proving it, how to fix it; Blocking first, then Minor.
- `VERDICT: DENIED` then `REASON: <refused tool name>: <the exact refused command, or the path for a file tool>` - nothing else.
- After `PASS` or `FAIL`: zero or more `OWNER: <one line naming the finding and why no code change settles it>`.

### C4 - Fix coder dispatch for a final review

File: viber/agents/task-coder.md

Input, one labelled line each, `review` repeated once per report:

```
spec: <run directory>/spec.md
review: <run directory>/work/final-review-<slice number>.md
notes: <run directory>/work/final-fix-coder.md
out: .temp/viber/final-fix/
refs: <plugin references directory>
```

Output: as a report with no task file - `VERDICT: PASS | FAIL | DENIED`, `REASON:` on FAIL or DENIED, `FILES: <every repo-relative path changed, comma-separated>` on PASS or FAIL, omitted when nothing changed.
