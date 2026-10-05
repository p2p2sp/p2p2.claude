---
source: C:/Projects/p2p2.claude/docs/_specs/2026-10-05-12-42-52_announce-the-run-branch-and-post-qa-on-the-pull-request/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Announce the run branch and post QA on the pull request

## Goal

Under `branching` allowed or required, the user always knows which branch a run will work on (entry, base, name, pull request target): at the start, in the confirmed summary and in the planner. A run that gains an issue after the start step re-settles its branch from that issue. A build's `qa.md` reaches the branch's pull request as a comment, posted by the build close and by `/viber:create-pr`, never twice for one run.

## Problem

Today the branch decision is partly silent. An entry picked from the issue type is taken without a word. The branch name first appears when the plan lands, after the branch already exists. The planner records "no branch" unasked when every entry needs an issue number, so the run commits onto the current branch, often an entry base. The entry question offers bare keys. An issue saved at the end of the interview or diagnosis never re-settles the branch, so a Feature-Request mapped to `develop` still ends with no run branch. The QA scenarios a build writes stay in the run directory: the person reviewing the pull request never sees them.

## Current behaviour

The start report of `plan-path.sh --start` lists each work entry with its key, base, target, usability, base presence, base position and remote lag, but no name pattern. `intent` and `fixer` take an entry mapped from the issue type silently, ask among usable entries otherwise, check the base, and hand off `Work:` (plus `Branch:` after "stay"). The planner computes the name and records it without showing it; under `allowed`, when no entry can be named, it records "no branch" unasked. A save through `issue-save.md` returns the new issue URL, which only feeds the `Issue:` line. `qa-writer` writes `qa.md` into the run directory and the build commits it; `create-pr` fills its body from the specification and the commits, and stops when the branch already has an open pull request.

### Must not change

- `plan-path.sh --branch`, `--land` and `--checkout` output lines.
- Under `branching.mode: off`, `intent`, `fixer` and `planner` say nothing about branches.
- The `Work:` / `Branch:` hand-off lines and the plan's `work:` / `branch:` keys keep their meaning.
- `post-comment.sh` and `pr-create.sh` contracts.
- `qa.md` / `qa.e2e.md` content and paths, and `qa-writer`.
- `pr-facts.sh` stop reasons and their order.

## Behaviour

### S1 - The start step names the run branch [CHANGED - was: an entry mapped from the issue type taken silently, options as bare keys]

Given `branching.mode: allowed` and a work entry `feature` (base `develop`, name `feature/{issue-number}-{slug}`, target `develop`) mapped from the issue type
When `/viber:intent #6813` starts
Then one line names the run branch before any code is read: entry `feature`, cut from `develop` as `feature/6813-{slug}`, pull request into `develop`. When several entries are usable, each option of the entry question reads its base, name pattern and target.

### S2 - An issue saved after the start step re-settles the branch [CHANGED - was: the start settlement stood]

Given a run started with no issue, settled as "no branch" or with no usable entry
When the interview (or diagnosis) saves a new issue whose type maps to `feature`
Then the start step runs again with that issue, the `feature` entry replaces the earlier settlement, the run branch line announces it, and the base check asks switch / stay / abort when HEAD is not on `develop`. The hand-off carries the re-settled branch.

### S3 - The summary shows the branch in words [CHANGED - was: only the `Work:` key]

Given a settled entry
When the confirmed summary (or diagnosis) is shown
Then it carries a readable run branch line beside `Work:`.

### S4 - The planner states the final branch [CHANGED - was: recorded silently]

Given a plan whose branch step resolved a name
When the planner records the run branch
Then it shows one line naming the final branch, its base and target, or "no run branch, commits land on `<current branch>`".

### S5 - No issue to number a name, on an entry base [CHANGED - was: no branch recorded unasked]

Given `allowed`, no work entry able to name a branch because the run has no issue, and the current branch being some work entry's base
When the planner's branch step runs
Then it says no run branch can be named and asks: continue on the current branch, or stop.

### S6 - The build posts QA under the open pull request [NEW]

Given a build that wrote `qa.md` on a branch with an open pull request
When the build close commits the QA scenarios
Then `qa.md` is posted as one comment on that pull request, opening with the run's marker and a header naming the file, and the build summary names the comment.

### S7 - create-pr posts QA [NEW]

Given a branch whose run has a `qa.md`
When `/viber:create-pr` creates the pull request, or finds one already open
Then the preview announces the QA comment, and it is posted without a question once the pull request exists, unless a comment carrying the same run's marker is already there.

### S8 - The guides describe both changes [CHANGED - was: silent branch, no QA comment described]

Given a user reading `/viber:help`, `viber/BRANCHING.md` or the README
When they look up the interview, the diagnosis, the planner, `build.qa` or `/viber:create-pr`
Then they read that the run branch is announced and settled again after a saved issue, and that `qa.md` is posted on the pull request once per run.

### S9 - The plan's source path survives the plan view on Windows [CHANGED - was: written with backslashes]

Given a plan written on Windows into `C:\Users\<user>\.claude\plans\<name>.md`
When the plan is shown for approval
Then its `source:` line reads `C:/Users/<user>/.claude/plans/<name>.md`, with no backslash lost before a dot.

### Edge cases

- The start step with an issue whose number an entry's name needs -> the announced name carries the number; with no issue that entry is shown as waiting for one and is not offered.
- Re-run after a save where the issue type maps to no entry -> an entry or "no branch" already settled stands with no question; with nothing settled before (no usable entry), the step asks among the now usable entries as usual.
- Re-run settling the same entry as before -> no second announcement.
- `fixer` re-settling after its save, with the RED reproduction test uncommitted -> a switch to a base on another commit is refused as a dirty tree; the user stays or aborts.
- Planner, `allowed`, no entry able to name a branch, current branch no entry's base -> the "no run branch" line only, no question.
- Planner "stop" answer -> no review, no hand-off, nothing landed.
- QA posted at the build close from `docs/_specs/<key>/qa.md`, then `create-pr` after archiving finds `docs/specs/<key>/qa.md` -> same run, treated as already posted.
- No open pull request, or a detached HEAD, at the build close -> nothing posted, nothing said.
- `gh` missing or no reachable repository at the build close -> one line in the build summary.
- `gh` fails or prints no comment URL -> one line naming the error, never retried; a pull request `create-pr` just created stands.
- `create-pr` with an open pull request and no `qa.md` -> stops as today.

## Glossary

- Run branch line - the one human-readable statement of entry, branch name (pattern before a plan exists, final name after), base and pull request target, or of staying on the current branch.
- QA marker - the hidden first line of a QA comment naming the `qa.md` it copies; its run key identifies the run across the run directory and the archive.

## Acceptance criteria

1. Every `entry:` line of `plan-path.sh --start` carries `name:`: the entry's name pattern, `{issue-number}` filled in when an issue URL was given.
2. `intent` and `fixer` show the run branch line once the start step settles an entry, one mapped from the issue type included, and each option of their entry question states base, name pattern and target.
3. When `intent` or `fixer` saves a new issue after the start step, the start step runs again with its URL: an entry mapped from its type replaces the earlier settlement ("no branch" included), announced by the run branch line, followed by the base check (switch / stay / abort when HEAD is not at the base).
4. The confirmed summary of `intent` and the diagnosis of `fixer` carry the run branch line beside `Work:`, never opening with `Work:` or `Branch:`, and the hand-off restates the run branch as last settled, a re-settle after a save included.
5. The planner's branch step shows the final branch name with base and target, or "no run branch, commits land on `<current branch>`"; under `allowed` with no entry able to name a branch it asks continue / stop only when the current branch is some entry's base.
6. A bundled script posts a `qa.md` as a comment on a pull request: marker line, header line naming the file, the file verbatim. When a comment already carries a marker of the same run, whether it named the run directory or the archive, the script posts nothing and reports the skip as `STATUS=skip` with `REASON=exists` (the summary's `SKIPPED`, spelled in the house `STATUS=` / `REASON=` form the other skip reasons share).
7. The build close posts `qa.md` through that script with no question; no open pull request posts nothing, a missing `gh` or repository adds one line to the build summary.
8. `create-pr` announces the QA comment in its preview and posts it after creating the pull request; when the branch already has an open pull request and the run has a `qa.md`, it posts it with no question and ends on the comment's URL.
9. The help page (English and Polish) and `viber/BRANCHING.md` describe the run branch announcement, the re-settle after a saved issue and the QA comment; the `viber/README.md` create-pr row mentions the QA comment.
10. The planner writes the plan's `source:` path with forward slashes only (`C:/...` on Windows), so the plan view shows it as written.

## Scope

### File map

- modify - viber/scripts/run-branch.sh - the `--start` report's `entry:` line gains `name:`
- modify - viber/scripts/plan-path.sh - header contract of the `--start` report
- modify - tests/viber/plan-path.test.ts - `--start` assertions on the new field
- modify - viber/skills/intent/fragments/branching-start.allowed.md - run branch line, descriptive options, re-settle after a save
- modify - viber/skills/intent/fragments/branching-start.required.md - same, required mode
- modify - viber/skills/intent/fragments/branching-handoff.allowed.md - run branch line in the summary, re-settled branch at hand-off
- modify - viber/skills/intent/fragments/branching-handoff.required.md - same, required mode
- modify - viber/skills/fixer/fragments/branching-start.allowed.md - as intent's
- modify - viber/skills/fixer/fragments/branching-start.required.md - as intent's
- modify - viber/skills/fixer/fragments/branching-handoff.allowed.md - run branch line in the diagnosis, re-settled branch at hand-off
- modify - viber/skills/fixer/fragments/branching-handoff.required.md - same, required mode
- modify - viber/skills/planner/fragments/branching.allowed.md - final branch line, continue / stop on an entry base
- modify - viber/skills/planner/fragments/branching.required.md - final branch line
- modify - viber/skills/planner/fragments/branching-fix.allowed.md - re-announce a recomputed name
- modify - viber/skills/planner/fragments/branching-fix.required.md - same, required mode
- add - viber/scripts/qa-comment.sh - posts one `qa.md` as a pull request comment, skipping a run already posted
- add - tests/viber/qa-comment.test.ts - its test file
- modify - viber/scripts/pr-facts.sh - `QA=` line
- modify - tests/viber/pr-facts.test.ts - `QA=` assertions
- modify - viber/skills/create-pr/SKILL.md - preview line, post after create, post on an existing pull request
- modify - viber/skills/implementor/SKILL.md - pre-approval of the new script
- modify - viber/skills/implementor/fragments/qa.true.md - post after the QA commit
- modify - viber/skills/setup/assets/help.html - create-pr, build.qa and branching prose
- modify - viber/BRANCHING.md - "When the branch is settled"
- modify - viber/README.md - the create-pr row
- modify - viber/skills/planner/SKILL.md - the `source:` path written with forward slashes
- modify - viber/skills/planner/templates/spec-full.md - the `source:` placeholder names the forward-slash form
- modify - viber/skills/planner/templates/spec-lite.md - same

### Out of scope

- `qa.e2e.md`: never posted.
- No new `viber.yml` switch; posting follows from `build.qa` and an open pull request.
- `branching.mode: off`.
- `qa.md` itself, `qa-writer`, `qa-format.md`.
- `post-comment.sh` (issue comments only) and `pr-create.sh`.
- `plan-path.sh --branch` / `--land` / `--checkout` and `config.sh`.
- `viber/skills/fixer/SKILL.md`, `viber/skills/intent/SKILL.md` and their `issues-*` fragments: the re-settle lives in the branching fragments, which hold the branch rules.
- `CLAUDE.md` nodes (`viber/CLAUDE.md`, `viber/CLAUDE.run-branch.md`, `viber/CLAUDE.tool-dependencies.md`, `viber/skills/CLAUDE.md`, `viber/scripts/CLAUDE.md`, `tests/viber/CLAUDE.md`) and `.claude/rules/` lists: the build's memory and rules close updates them.

## Solution requirements

- Every new or changed script runs on Git Bash (Windows) and macOS, and each caller runs it as one literal pre-approved line.
- `implementor` opens and writes no file.
- `gh` in tests is always stubbed or absent.
- Tests follow the host's two tiers: a script test spawning a subprocess or a fixture is an integration file (`<name>.test.ts`, CI only); locally a task runs only the unit tier and, from its integration file, only the cases it adds or changes, selected by name; the full integration files and the shell matrix run in CI.
- `help.html` keeps the English/Polish alternation and no dash characters.

## Tasks

<!-- TASK -->
### T1 - Print the name pattern in the start report
- TDD: required
- Covers: #1
- Uses: C1
- Depends-on: none
- Files: viber/scripts/run-branch.sh, viber/scripts/plan-path.sh, tests/viber/plan-path.test.ts
- Delivers: the `--start` report's `entry:` lines in the C1 shape, with the header contract stating the field.
- Verification: node --test --test-name-pattern "start report" tests/viber/plan-path.test.ts -> every selected test passes (the `--start` cases only, all of them reached by the changed entry line; the rest of this integration file runs in CI); grep -c "target: <branch> | name: <pattern> | usable:" viber/scripts/plan-path.sh -> 1, and grep -c 'target: $target | name: ' viber/scripts/run-branch.sh -> at least 1
- DoD: under allowed and required with no URL, the `entry:` line of a `{type}/{slug}` entry reads `name: {type}/{slug}` in the C1 position; with an issue URL, an entry name holding `{issue-number}` reads that number in `name:` and `usable: yes`; with no URL, that entry reads the literal `{issue-number}` in `name:` and `usable: no`; the `plan-path.sh` header's `--start` block lists `name: <pattern>` in the C1 order
<!-- /TASK -->

<!-- TASK -->
### T2 - Announce and re-settle the run branch at intent's start
- TDD: none
- Covers: #2, #3
- Uses: C1, C2
- Depends-on: T1
- Files: viber/skills/intent/fragments/branching-start.allowed.md, viber/skills/intent/fragments/branching-start.required.md
- Delivers: intent's start step showing the C2 line for every settled entry, describing each entry option, and running again after a saved issue.
- Verification: grep -c '`name:`' viber/skills/intent/fragments/branching-start.allowed.md viber/skills/intent/fragments/branching-start.required.md -> each at least 1, and grep -c "target: <branch> | name: <pattern> | usable:" viber/scripts/plan-path.sh -> 1; grep -c "ISSUE_URL=" viber/skills/intent/fragments/branching-start.allowed.md viber/skills/intent/fragments/branching-start.required.md viber/scripts/issue-create.sh -> each at least 1
- DoD: both fragments show the C2 line once an entry is settled, a `suggested:` one included; both fragments describe each entry option by its `base:`, `name:` and `target:`; both fragments name every `entry:` line reading `usable: no` as waiting for an issue number and never offer it; both fragments run the step again with the `ISSUE_URL=` of a save made after it, right after that save and before the "what next" question, its base-check question asked whatever that later answer is, a `suggested:` entry other than `none` replacing the earlier settlement ("no branch" included) and followed by the base check; on that re-run `suggested: none` keeps an entry or "no branch" already settled, asks as usual when nothing was settled, and the same entry is not announced twice; on that re-run `error:` lines (an issue with no type, or one no mapping names) are shown, an earlier settlement is kept, and with none the step asks among the `usable: yes` entries
<!-- /TASK -->

<!-- TASK -->
### T3 - Show the run branch in intent's summary
- TDD: none
- Covers: #4
- Uses: C1, C2
- Depends-on: T1
- Files: viber/skills/intent/fragments/branching-handoff.allowed.md, viber/skills/intent/fragments/branching-handoff.required.md
- Delivers: the confirmed summary carrying the C2 line beside `Work:`, and the hand-off restating the branch as last settled.
- Verification: grep -c '`name:`' viber/skills/intent/fragments/branching-handoff.allowed.md viber/skills/intent/fragments/branching-handoff.required.md -> each at least 1, and grep -c "target: <branch> | name: <pattern> | usable:" viber/scripts/plan-path.sh -> 1
- DoD: both fragments add the C2 line beside `Work:`, opening with neither `Work:` nor `Branch:`; both fragments have the hand-off restate the `Work:` / `Branch:` and C2 lines of the latest settlement, replacing the confirmed summary's ones after a re-settle following a save, with no new confirmation
<!-- /TASK -->

<!-- TASK -->
### T4 - Announce and re-settle the run branch at fixer's start
- TDD: none
- Covers: #2, #3
- Uses: C1, C2
- Depends-on: T1
- Files: viber/skills/fixer/fragments/branching-start.allowed.md, viber/skills/fixer/fragments/branching-start.required.md
- Delivers: fixer's start step with the same announcement, options and re-settle as intent's, the re-settle triggered by the bug issue its save step creates.
- Verification: grep -c '`name:`' viber/skills/fixer/fragments/branching-start.allowed.md viber/skills/fixer/fragments/branching-start.required.md -> each at least 1, and grep -c "target: <branch> | name: <pattern> | usable:" viber/scripts/plan-path.sh -> 1; grep -c "ISSUE_URL=" viber/skills/fixer/fragments/branching-start.allowed.md viber/skills/fixer/fragments/branching-start.required.md viber/scripts/issue-create.sh -> each at least 1
- DoD: both fragments show the C2 line once an entry is settled, a `suggested:` one included; both fragments describe each entry option by its `base:`, `name:` and `target:`; both fragments name every `entry:` line reading `usable: no` as waiting for an issue number and never offer it; both fragments run the step again with the `ISSUE_URL=` of a save made after it, right after that save and before the hand-off, with the same replace, keep, no-repeat and `error:` rules as intent's; a switch refused over the uncommitted reproduction test leaves stay or abort
<!-- /TASK -->

<!-- TASK -->
### T5 - Show the run branch in fixer's diagnosis
- TDD: none
- Covers: #4
- Uses: C1, C2
- Depends-on: T1
- Files: viber/skills/fixer/fragments/branching-handoff.allowed.md, viber/skills/fixer/fragments/branching-handoff.required.md
- Delivers: the diagnosis carrying the C2 line beside `Work:`, and the hand-off restating the branch as last settled.
- Verification: grep -c '`name:`' viber/skills/fixer/fragments/branching-handoff.allowed.md viber/skills/fixer/fragments/branching-handoff.required.md -> each at least 1, and grep -c "target: <branch> | name: <pattern> | usable:" viber/scripts/plan-path.sh -> 1
- DoD: both fragments add the C2 line beside `Work:`, opening with neither `Work:` nor `Branch:`; both fragments have the hand-off restate the `Work:` / `Branch:` and C2 lines of the latest settlement, a re-settle after the save included
<!-- /TASK -->

<!-- TASK -->
### T6 - State the final run branch in the planner
- TDD: none
- Covers: #5
- Uses: C2
- Depends-on: none
- Files: viber/skills/planner/fragments/branching.allowed.md, viber/skills/planner/fragments/branching.required.md, viber/skills/planner/fragments/branching-fix.allowed.md, viber/skills/planner/fragments/branching-fix.required.md
- Delivers: the planner's branch step and its post-fix recompute showing the C2 line with the final name, and the `allowed` continue / stop question on an entry base.
- Verification: grep -c "commits land on" viber/skills/planner/fragments/branching.allowed.md viber/skills/planner/fragments/branching.required.md viber/skills/planner/fragments/branching-fix.allowed.md viber/skills/planner/fragments/branching-fix.required.md -> each at least 1; grep -c "current-is-base" viber/skills/planner/fragments/branching.allowed.md -> at least 1, and grep -c "current-is-base: yes | no" viber/scripts/plan-path.sh -> at least 1
- DoD: both branch fragments show the C2 line once `work:` / `branch:` are written, the "no run branch" form for `branch: none` and for a `Branch:` line; on `Work: none`, which reads no report today, the allowed fragment runs the `--branch` report to take `current:` for that line; the allowed fragment asks continue on `current:` or stop when every `entry:` reads `new: -` and `current-is-base: yes`, and only shows the line on `current-is-base: no`; a "stop" answer ends the planner with no review, no hand-off and nothing landed; both fix fragments show the C2 line again when a recompute changes `branch:`
<!-- /TASK -->

<!-- TASK -->
### T7 - Post a qa.md as a pull request comment
- TDD: required
- Covers: #6
- Uses: C3
- Depends-on: none
- Files: viber/scripts/qa-comment.sh, tests/viber/qa-comment.test.ts
- Delivers: the C3 script, a POSIX `#!/bin/sh` script with its header `Contract:` block, staged `100755`, and its integration test file (every case new to this task) with `gh` stubbed.
- Verification: node --test tests/viber/qa-comment.test.ts -> all pass; git ls-files -s viber/scripts/qa-comment.sh -> mode 100755; node --test --test-reporter=dot tests/portability.unit.test.ts -> all pass
- DoD: the script is in the git index at `100755` and passes the portability sweep; with `--pr`, the posted body is the marker line, the header line and the file verbatim, and stdout is `STATUS=posted` plus a `/pull/<N>#issuecomment-<id>` `COMMENT_URL=`; without `--pr`, the open pull request of the current branch is the target, and none, or a detached HEAD, gives `STATUS=skip` `REASON=no-pr`; a comment holding a marker of the same run key under another directory gives `REASON=exists` and no post; a marker of another run key still posts; no `gh` gives `REASON=no-gh` and no repository `REASON=no-repo`; `gh` failing to read the comments, failing to post, or printing no comment URL exits 1 with one `ERROR` line and empty stdout; a relative qa file path resolves from the repository root whatever the cwd; a missing file or bad arguments exit 2
<!-- /TASK -->

<!-- TASK -->
### T8 - Report the run's qa.md in pr-facts
- TDD: required
- Covers: #8
- Uses: C4
- Depends-on: none
- Files: viber/scripts/pr-facts.sh, tests/viber/pr-facts.test.ts
- Delivers: the `QA=` line of C4 on the ready block and on the `pr-exists` stop, with the header contract updated.
- Verification: node --test --test-name-pattern "QA=" tests/viber/pr-facts.test.ts -> every selected test passes (the cases this task adds or changes only; the rest of this integration file runs in CI)
- DoD: every case this task adds or changes, the full ready-block assertion included, carries `QA=` in its name; the ready block prints `QA=` right after `SPEC=`, naming the open run's `qa.md`, or the archived run's when SPEC comes from the archive, and empty with no such file; the `pr-exists` stop prints `QA=` after `PR_URL=`, resolved the same way with the existing pull request's base as the target, firing no other stop, and empty when no run resolves; every other stop prints no `QA=`
<!-- /TASK -->

<!-- TASK -->
### T9 - Post QA from create-pr
- TDD: none
- Covers: #8
- Uses: C3, C4
- Depends-on: T7, T8
- Files: viber/skills/create-pr/SKILL.md
- Delivers: create-pr announcing the QA comment in its preview, posting it after `pr-create.sh` exit 0, and posting it on `pr-exists` with no question.
- Verification: grep -c "qa-comment.sh" viber/skills/create-pr/SKILL.md -> at least 3 (allowed-tools plus two calls); grep -c "QA=" viber/skills/create-pr/SKILL.md viber/scripts/pr-facts.sh -> each at least 1; grep -c "STATUS=posted" viber/skills/create-pr/SKILL.md viber/scripts/qa-comment.sh -> each at least 1
- DoD: `allowed-tools` pre-approves the C3 script; the preview names the QA comment when `QA=` is set; after exit 0 it runs the C3 script with `--pr` and the new `PR_URL=`, reporting `COMMENT_URL=`, a skip reason or the `ERROR` line, never retrying; on `pr-exists` with `QA=` set it runs the same call against that `PR_URL=` with no question and ends on its result, and without `QA=` stops as before
<!-- /TASK -->

<!-- TASK -->
### T10 - Post QA at the build close
- TDD: none
- Covers: #7
- Uses: C3
- Depends-on: T7
- Files: viber/skills/implementor/SKILL.md, viber/skills/implementor/fragments/qa.true.md
- Delivers: implementor running the C3 script on the `qa.md` among the QA paths right after their commit, and folding its result into the final summary.
- Verification: grep -c "qa-comment.sh" viber/skills/implementor/SKILL.md viber/skills/implementor/fragments/qa.true.md -> each at least 1; grep -c "REASON=no-gh" viber/skills/implementor/fragments/qa.true.md viber/scripts/qa-comment.sh -> each at least 1
- DoD: `allowed-tools` pre-approves the C3 script; a `qa.md` among the `FILES:` of `WRITTEN` or `KEPT` is posted with no `--pr` and no question once the QA commit step is done; `STATUS=posted` adds the `COMMENT_URL=` to the final summary; `no-gh` or `no-repo` adds one line naming why; `no-pr` or `exists` adds nothing; exit 1 or 2 adds one line with its `ERROR`, never retried; no `qa.md` among the paths makes no call; QA paths left uncommitted (the `--qa` commit refused or failed) make no call
<!-- /TASK -->

<!-- TASK -->
### T11 - Describe both changes for users
- TDD: none
- Covers: #9
- Uses: C2, C3
- Depends-on: T2, T4, T6, T9, T10
- Files: viber/skills/setup/assets/help.html, viber/BRANCHING.md, viber/README.md
- Delivers: the help page (both languages), the branching guide and the README row stating that the run branch is announced and settled again after a saved issue, and that QA reaches the pull request as a comment.
- Verification: node --test --test-reporter=dot tests/viber/help.unit.test.ts -> all pass; grep -ci "comment on the pull request" viber/skills/setup/assets/help.html -> at least 1, grep -c "QA comment" viber/README.md -> at least 1, and grep -c "qa-comment.sh" viber/skills/create-pr/SKILL.md viber/skills/implementor/fragments/qa.true.md -> each at least 1; grep -c "settled again" viber/BRANCHING.md -> at least 1, and grep -c "ISSUE_URL=" viber/skills/intent/fragments/branching-start.allowed.md viber/skills/fixer/fragments/branching-start.allowed.md -> each at least 1; grep -c "current-is-base" viber/skills/planner/fragments/branching.allowed.md -> at least 1
- DoD: the create-pr card and the build.qa entries of `help.html` state, in English and Polish, that `qa.md` is posted as a comment on the pull request once per run; the intent, fixer and planner cards state that the run branch is announced, and settled again after a saved issue; `BRANCHING.md` "When the branch is settled" states the announcement, the re-settle after a save and the planner's continue / stop on an entry base; its "Pull requests" section states that `/viber:create-pr` and the build close post `qa.md` as a comment once per run; the README create-pr row mentions the QA comment
<!-- /TASK -->

<!-- TASK -->
### T12 - Write the plan's source path with forward slashes
- TDD: none
- Covers: #10
- Uses: none
- Depends-on: none
- Files: viber/skills/planner/SKILL.md, viber/skills/planner/templates/spec-full.md, viber/skills/planner/templates/spec-lite.md
- Delivers: the planner's `source:` instruction and both templates' placeholder asking for the absolute path in forward-slash form, the same mixed `C:/` form `plan-path.sh` writes on landing.
- Verification: grep -c "forward slash" viber/skills/planner/SKILL.md viber/skills/planner/templates/spec-full.md viber/skills/planner/templates/spec-lite.md -> each at least 1, and grep -c "cygpath -m" viber/scripts/plan-path.sh -> at least 1
- DoD: the planner's `source:` instruction asks for the absolute path with forward slashes only, a Windows drive written `C:/`; both templates' `source:` placeholder names the forward-slash form
<!-- /TASK -->

## Contracts

### C1 - Start report entry line

File: viber/scripts/run-branch.sh, viber/scripts/plan-path.sh

```
entry: <key> | base: <branch> | target: <branch> | name: <pattern> | usable: yes|no | base-exists: yes|no | at-base: yes|no | behind: <n>|unknown
```

`name:` is the work entry's `name` pattern; `{issue-number}` is replaced by the issue number of the URL argument when one is given; `{type}` and `{slug}` stay as written.

### C2 - Run branch line

File: none

One line in the conversation's language, never opening with `Work:` or `Branch:`, holding:

- entry key
- branch: the `name:` pattern (start step, summary, diagnosis) or the final `branch:` name (planner)
- base: the entry's `base:`
- target: the entry's `target:`

or, for "no branch", "stay" and `branch: none`: no run branch, commits land on `<current:>`.

### C3 - qa-comment.sh

File: viber/scripts/qa-comment.sh

```
argv:   <qa file path> [--pr <pull request URL>]
stdout: STATUS=posted
        COMMENT_URL=https://<host>/<owner>/<repo>/pull/<N>#issuecomment-<id>
   or:  STATUS=skip
        REASON=no-gh | no-repo | no-pr | exists
exit:   0 - either block
        1 - one ERROR line on stderr, empty stdout: gh failed reading the comments or posting, or printed no comment URL
        2 - bad arguments or missing qa file
path:   a relative <qa file path> resolves from the repository root, found by the script whatever the cwd
body:   line 1  <!-- viber:qa <repo-relative path of the qa file> -->
        line 2  header line naming that path
        line 3  empty
        then    the qa file verbatim
        written under <repo root>/.temp/viber/qa-comment/
run key: the name of the qa file's parent directory
exists: a comment of the target pull request holds "<!-- viber:qa " and a path ending in "/<run key>/qa.md"
target: --pr given -> that pull request; else the open pull request whose head is the current branch
```

### C4 - pr-facts QA line

File: viber/scripts/pr-facts.sh

```
QA=<repo-relative path or empty>
```

Ready block: right after `SPEC=`. `pr-exists` stop: right after `PR_URL=`, the existing pull request's base standing in for the target. Value: the `qa.md` in the same run directory as the run SPEC resolves to (the open run, else the archived run), empty when no such file exists or no run resolves.
