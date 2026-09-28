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
