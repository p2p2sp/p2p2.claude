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
