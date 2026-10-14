---
source: C:/Projects/p2p2.claude/docs/_specs/2026-10-14-16-55-40_criteria-as-ac-n-sub-issues-and-path-only-previews/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Criteria as AC<n>, sub-issues and path-only previews

## Goal

Stop GitHub from turning acceptance-criterion references into links to unrelated old issues, let viber attach an issue it creates under a parent issue, spread a split roadmap over one parent issue and one sub-issue per part, and keep issue and pull request bodies out of the model's context during the preview.

## Problem

- A run's `qa.md` cites criteria as `Covers: #3 <text>`; once `qa-comment.sh` posts it, GitHub renders every `#3` as a link to issue 3 of the repository, issues years old. A plan pasted into an issue or a pull request has the same defect. Users fix the links by hand (30 of them on one comment).
- An issue viber creates is never attached as a sub-issue, so a split change has no issue per part and the QA scenarios of every part would land in one thread.
- The issue and pull request previews print the whole body into the conversation, which spends context for text the user can read in a file.

## Current behaviour

- `qa-format.md` and the planner's `tasks.md` template write `Covers: #<n>`; `plan-index.sh` reads `<n>` and `#<n>` tokens as criteria and reports `Covers #<n>` / `criterion #<n>` in its errors.
- `issue-create.sh` creates an issue and optionally PATCHes its type; it has no parent flag.
- `issue-save.md` (shared by `create-issue`, `intent`, `fixer`) and `create-pr` print the title, metadata and the body itself in the preview, and write the body file only after the user says yes.
- A split interview offers to save the confirmed summary as one new issue; `roadmap.md` lists parts with no issue of their own, and resuming a part ties the run to no issue.

### Must not change

- `issue-create.sh` prints `ISSUE_URL=`, `ISSUE_NUMBER=` and the `TYPE` lines exactly as today, and every existing flag keeps its meaning and exit code.
- `plan-index.sh` keeps its exit codes and its validation of every field other than `Covers`.
- `qa-comment.sh` and `post-comment.sh` post their files verbatim.
- A single issue save without a parent creates exactly one issue, as today.

## Behaviour

### S1 - Criteria cited as AC<n> [CHANGED - was: `#<n>`]

Given a plan whose tasks write `Covers: AC1, AC2`
When `plan-index.sh` validates it
Then both criteria count as covered, and a QA document written from `qa-format.md` cites `Covers: AC1 <criterion text>`, which GitHub does not link.

### S2 - Old form rejected [CHANGED - was: `#1` accepted]

Given a plan whose task writes `Covers: #1`
When `plan-index.sh` validates it
Then the task references no acceptance criterion and the plan is rejected as a broken task contract.

### S3 - Issue attached under a parent [NEW]

Given the issue script asked to attach the new issue under issue 7
When the issue is created and attaching succeeds
Then the script reports the parent applied; when attaching fails it reports the parent failed with the reason, succeeds, and the issue stands.

### S4 - Issue save naming a parent [NEW]

Given `/viber:create-issue` whose argument or conversation names issue 7 as the parent
When the preview is shown and the user creates the issue
Then the preview names the parent, the new issue lands under issue 7, and a failed attach is reported in one line with the issue kept.

### S5 - Preview by path [CHANGED - was: body printed]

Given any issue save or `create-pr`
When the preview is shown
Then it lists the title, metadata and the absolute path of the body file already written, never the body text.

### S6 - Roadmap saved as a parent issue with sub-issues [NEW]

Given a split interview, issues enabled, confirmed
When the user accepts the save offer
Then one parent issue holding the roadmap (or the issue the run started from) gets one sub-issue per part, all approved through one preview, and the hand-off `Issue:` line is this cycle's part sub-issue.

### S7 - A later part resumes tied to its sub-issue [NEW]

Given a `roadmap.md` whose next part carries its sub-issue URL
When the user resumes it with `viber:intent`
Then the run is tied to that sub-issue, and no new-issue save is offered.

### Edge cases

- The parent flag with no value or a non-number -> refused as a bad argument, gh never invoked.
- Creating one issue of a set fails -> the save stops, retries nothing, and reports which issues landed; the hand-off `Issue:` line is this part's sub-issue if it landed, else the issue the run was already tied to, else none.
- A parent named as an issue URL of another repository -> the save says in one line it cannot attach it and creates the issue with no parent.

## Glossary

- Sub-issue - an issue GitHub lists under its parent issue, with the parent's progress counting it; not a task-list checkbox.
- Issue set - one parent issue plus one sub-issue per roadmap part, approved through one preview.

## Acceptance criteria

1. `qa-format.md` and the planner's `tasks.md` template cite criteria as `AC<n>`, and `plan-index.sh` counts only `AC<n>` tokens as criteria, so a `#<n>` token covers nothing and its errors name `AC<n>`.
2. `issue-create.sh` attaches the created issue under a parent issue number of the same repository when asked and reports whether that applied or failed, the issue kept either way; without the request it reports no parent.
3. An issue save whose content names a parent issue of the same repository names the parent in the preview, attaches the new issue under it, and reports a failed attach in one line.
4. Every issue preview and the pull request preview write the body file first and show its path, never the body text.
5. A confirmed split interview with issues enabled offers one issue set: a parent issue holding the roadmap, or the issue the run started from, plus one sub-issue per part attached to it, approved through one preview, the hand-off tied to this cycle's part sub-issue.
6. Each roadmap entry carries its sub-issue URL, and resuming a part from `roadmap.md` ties the run to that URL.

## Scope

### File map

- modify - viber/scripts/plan-index.sh - counts only `AC<n>` tokens of `Covers` in both `covnums` copies; errors name `AC<n>`
- modify - tests/viber/plan-index.test.ts - fixtures and assertions use `AC<n>`; a `#<n>` token covers nothing
- modify - viber/skills/planner/templates/tasks.md - `Covers: AC<n>` form
- modify - viber/references/plan-rules.md - the Covers rule names `AC<n>`
- modify - viber/references/qa-format.md - `Covers: AC<n> <criterion text>` in both documents and the no-scenario list
- modify - viber/scripts/issue-create.sh - `--parent <N>` flag and `PARENT` output lines
- modify - tests/viber/issue-create.test.ts - proves the parent flag
- modify - viber/references/issue-save.md - path-only preview, parent line, issue set
- modify - viber/skills/create-pr/SKILL.md - path-only preview
- modify - viber/skills/intent/fragments/issues-done.true.md - roadmap issue set offer and the part sub-issue `Issue:` line
- modify - viber/skills/intent/references/split.md - the roadmap summary carries each part's sub-issue URL
- modify - viber/skills/planner/templates/spec-full.md - `## Roadmap` entry `Issue:` line
- modify - viber/skills/planner/templates/spec-lite.md - same
- modify - viber/skills/intent/references/resume.md - a resumed part ties the run to its `Issue:` URL
- modify - viber/README.md - roadmap sub-issues and the create-issue parent
- modify - viber/skills/setup/assets/help.html - roadmap sub-issues, en and pl

### Out of scope

- A warning or acceptance for the old `#<n>` form.
- The bodies `qa-comment.sh` and `post-comment.sh` post.
- A parent issue in another repository.
- Closing or deleting an issue when attaching or a later create fails.
- `skills/create-issue/SKILL.md` and `skills/fixer/fragments/issues-save.true.md`: they reach the new preview and parent through `issue-save.md` unchanged.

## Solution requirements

- Every script works on Windows (Git Bash) and macOS; `issue-create.sh` stays POSIX `#!/bin/sh`, no heredoc.
- English in every file, present-state wording, no em or en dash.

## Tasks

<!-- TASK -->
### T1 - Cite acceptance criteria as AC<n>
- TDD: required
- Covers: #1
- Uses: C1
- Depends-on: none
- Files: viber/scripts/plan-index.sh, tests/viber/plan-index.test.ts, viber/skills/planner/templates/tasks.md, viber/references/plan-rules.md, viber/references/qa-format.md
- Delivers: `Covers` criteria written and parsed as `AC<n>` across the plan template, the plan rules, the QA format and `plan-index.sh`.
- Verification: node --test tests/viber/plan-index.test.ts -> all pass
- DoD: a plan whose tasks write `Covers: AC1` and `Covers: AC2` validates with exit 0 and its task files carry the covered criteria; a task writing `Covers: #1` fails with exit 4 as referencing no acceptance criterion; a `Covers: AC9` naming no criterion fails with stderr naming `AC9`; an uncovered criterion 2 fails with stderr naming `AC2`; `tasks.md`, `plan-rules.md` and `qa-format.md` write every criterion reference as `AC<n>` and none as `#<n>`
<!-- /TASK -->

<!-- TASK -->
### T2 - Attach a created issue under a parent issue
- TDD: required
- Covers: #2
- Uses: C2
- Depends-on: none
- Files: viber/scripts/issue-create.sh, tests/viber/issue-create.test.ts
- Delivers: the `--parent <N>` flag of `issue-create.sh` and its `PARENT` output lines, header contract included.
- Verification: node --test tests/viber/issue-create.test.ts -> all pass
- DoD: `--parent 7` looks up the new issue id and POSTs it to `repos/<owner>/<repo>/issues/7/sub_issues` with `--hostname <host>`, printing `PARENT=applied`; a failing lookup or POST prints `PARENT=error` and a one-line `PARENT_ERROR=`, exits 0 and never removes the issue; no flag prints `PARENT=none` and makes no sub-issue call; `--parent` with no value or a non-number exits 2 with gh never invoked; the existing `ISSUE_URL`, `ISSUE_NUMBER` and `TYPE` lines are unchanged
<!-- /TASK -->

<!-- TASK -->
### T3 - Preview an issue by its body file path
- TDD: none
- Covers: #4
- Uses: C3
- Depends-on: T2
- Files: viber/references/issue-save.md
- Delivers: the issue save writes the body file before the preview and the preview shows the path in place of the body.
- Verification: grep -n "Body:" viber/references/issue-save.md && grep -n "body-file" viber/scripts/issue-create.sh -> the preview line in the reference and the `--body-file` the script sends
- DoD: the body file is written to `<root>/<directory>issue-body-<stamp>.md` before the preview question; the preview lists the lines of `C3` and never the body text; a correction rewrites that file and previews again; `Create` passes that same file to `issue-create.sh`
<!-- /TASK -->

<!-- TASK -->
### T4 - Preview a pull request by its body file path
- TDD: none
- Covers: #4
- Uses: C4
- Depends-on: none
- Files: viber/skills/create-pr/SKILL.md
- Delivers: `create-pr` writes the body file before the preview and the preview shows the path in place of the body.
- Verification: grep -n "Body:" viber/skills/create-pr/SKILL.md && grep -n "body-file" viber/scripts/pr-create.sh -> the preview line in the skill and the `--body-file` the script sends
- DoD: the body is written to `<root>/.temp/viber/create-pr/body-<stamp>.md` before the preview question; the preview lists the lines of `C4`, never the body text; a correction rewrites that file and previews again; create or draft passes that same file to `pr-create.sh`
<!-- /TASK -->

<!-- TASK -->
### T5 - Save an issue under a parent the user names
- TDD: none
- Covers: #3
- Uses: C2, C3
- Depends-on: T3
- Files: viber/references/issue-save.md, viber/README.md, viber/skills/setup/assets/help.html
- Delivers: the issue save attaches the new issue under a parent the content names, and the README and help page create-issue entries say so.
- Verification: grep -n "\-\-parent\|PARENT=" viber/references/issue-save.md viber/scripts/issue-create.sh && node --test tests/viber/help.unit.test.ts -> the flag and output key on both sides, and the help test passes
- DoD: content naming a parent issue number or a same-repository issue URL adds the `Parent` preview line and `--parent "<N>"` to the `issue-create.sh` line; an issue URL of another repository gets one line saying it cannot be attached and no `--parent`; `PARENT=error` is reported in one line with its `PARENT_ERROR=` and the issue stands; content naming no parent changes nothing; the `/viber:create-issue` entry of `viber/README.md` and the create-issue card of `help.html`, in `en` and `pl`, say a named parent issue gets the new one as a sub-issue
<!-- /TASK -->

<!-- TASK -->
### T6 - Carry each part's sub-issue through the roadmap
- TDD: none
- Covers: #6
- Uses: C5
- Depends-on: T1
- Files: viber/skills/planner/templates/spec-full.md, viber/skills/planner/templates/spec-lite.md, viber/skills/intent/references/resume.md
- Delivers: roadmap entries carrying their `Issue:` line, and a resumed part tied to it.
- Verification: grep -n "Issue:" viber/skills/planner/templates/spec-full.md viber/skills/planner/templates/spec-lite.md viber/skills/intent/references/resume.md && node --test --test-name-pattern "Roadmap shape" tests/viber/plan-index.test.ts -> the line in both templates and the resume reference, and the roadmap shape tests pass
- DoD: the `## Roadmap` example and comment of both templates show the `C5` line under each part that has an issue; resuming a part whose entry carries an `Issue:` line counts that URL as the run's issue from the start of the run, so the branching start step and the hand-off summary carry it; an entry with none ties the run to no issue
<!-- /TASK -->

<!-- TASK -->
### T7 - Save a split roadmap as a parent issue with sub-issues
- TDD: none
- Covers: #5, #6
- Uses: C2, C3, C5, C6
- Depends-on: T5, T6
- Files: viber/references/issue-save.md, viber/skills/intent/fragments/issues-done.true.md, viber/skills/intent/fragments/branching-start.required.md, viber/skills/intent/fragments/branching-start.allowed.md, viber/skills/intent/references/split.md, viber/README.md, viber/skills/setup/assets/help.html
- Delivers: the issue set save and the split interview offer that uses it, a resumed part counted as tied to its sub-issue, documented in the README and help page.
- Verification: grep -n "sub_issues\|PARENT=" viber/scripts/issue-create.sh && grep -n "issue set" viber/references/issue-save.md viber/skills/intent/fragments/issues-done.true.md && node --test tests/viber/help.unit.test.ts -> both sides found and the help test passes
- DoD: `issues-done.true.md` passes the set to `issue-save.md` in the `C6` shape, each title and body filled as `C6` says; `issue-save.md` saves an issue set with one template choice, writes every body file under the `C3` set names, shows one preview listing each issue's `C3` lines and asks one `Create` question; on `Create` it creates the parent first when the set has no existing parent, then each part with `--parent` set to the parent number; a create exiting 1 or 2 stops the set, retries nothing and reports every issue that landed; a part created with `PARENT=error` is reported in one line and the set goes on with the next part; after a set save both `branching-start` fragments re-run `--start` once, with this cycle's part sub-issue URL when it landed and no re-run otherwise; the Stop answer of "what next" names this cycle's part sub-issue URL and says a later part resumes from `roadmap.md`; a split interview with no issue and `STATUS=ready` asks whether to save the roadmap as an issue set in place of the single save question; a split interview tied to an issue keeps its comment question as today, then asks whether to create one sub-issue per part under that issue; the summary's roadmap lines carry each part's `C5` line and its `Issue:` line is this cycle's part sub-issue when it landed, else the issue the run was already tied to, else none; `issues-done.true.md` counts a resumed roadmap part's `C5` URL as the issue the run is tied to, so it offers no new-issue save and hands off `Issue: <that URL>`; the README roadmap paragraph and the help page roadmap entry, in `en` and `pl`, say each part gets its own sub-issue under one parent issue
<!-- /TASK -->

## Contracts

### C1 - Covers criterion token

File: viber/scripts/plan-index.sh, viber/skills/planner/templates/tasks.md

- Line: `- Covers: AC<n>[, AC<n>]...`
- A token counts as a criterion only when it matches `AC<n>`, `<n>` digits; every other token (`#3`, `3`, `(see S3)`) counts as none.
- Errors (stderr, exit 4): `task <id>: Covers AC<n>, absent from acceptance criteria`; `acceptance criterion AC<n> is covered by no task`; `task <id>: Covers references no acceptance criterion`.

### C2 - issue-create.sh parent flag

File: viber/scripts/issue-create.sh

- argv: `--parent <N>`, `<N>` a positive integer issue number of the created issue's own repository; missing or non-numeric value: exit 2, `ERROR issue-create.sh: --parent needs an issue number`, gh never invoked.
- Calls after the type step: `gh api --hostname <host> repos/<owner>/<repo>/issues/<number> --jq .id`, then `gh api --hostname <host> -X POST repos/<owner>/<repo>/issues/<N>/sub_issues -F sub_issue_id=<id>`.
- stdout, after the `TYPE` lines: `PARENT=applied|error|none`, then `PARENT_ERROR=<one line>` only with `error`. Exit 0 in every case once the issue exists.

### C3 - Issue preview

File: viber/references/issue-save.md

- One block per issue: `Title: <title>`, `Type: <type or ->`, `Labels: <list or ->`, `Assignees: <list or ->`, `Projects: <list or ->`, `Parent: <#N or "this set's parent">` (only when one), `Body: <absolute path of the written body file>`.
- Body file: `<root>/<directory>issue-body-<stamp>.md` for a single issue; in an issue set `issue-body-<stamp>-parent.md` for a new parent and `issue-body-<stamp>-<k>.md` for part `<k>`, one `<stamp>` for the whole set.

### C4 - Pull request preview

File: viber/skills/create-pr/SKILL.md

- `Title: <title>`, `Target: <branch>`, the QA line when `QA=` is set, `Body: <absolute path of the written body file>`.

### C5 - Roadmap entry issue line

File: viber/skills/planner/templates/spec-full.md, viber/skills/planner/templates/spec-lite.md

- Under a part's numbered line, its first indented line: `   - Issue: <full issue URL>`, before the part's settled decisions; absent when the part has no issue.

### C6 - Issue set input

File: viber/references/issue-save.md

- The caller names, beside `directory:` and `eligible:`, `parent:` (`new` or the existing issue URL the run is tied to) and `parts:` (one entry per roadmap part, in roadmap order), in place of the single `content:`.
- A new parent: title `{summary}` states the whole change; body holds the accepted roadmap and the confirmed summary.
- Part `<k>`: title `{summary}` states that part; body holds its roadmap line, the decisions settled for it and its open unknowns, plus the confirmed summary when it is this cycle's part.
- Result: every `ISSUE_URL=` that landed, each labelled parent or part `<k>`.
