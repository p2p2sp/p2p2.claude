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
