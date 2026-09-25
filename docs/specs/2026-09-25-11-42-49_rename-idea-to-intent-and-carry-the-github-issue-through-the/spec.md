# Rename idea to intent and carry the GitHub issue through the viber chain

Build: skill `implementor`

## Goal

The planning interview is renamed from `idea` to `intent`, and a GitHub issue becomes a first-class thread through the viber chain: an interview that did not start from an issue can save its conclusions as a new issue built from the project's own issue templates, an interview or a bug diagnosis that did start from one keeps working on that same issue, and the plan records which issue it serves. The user's later work on the implementation half needs that record in the plan.

## Problem

Today the interview ends only by handing a summary to the planner. Its conclusions never reach an issue, so work that is interviewed now but planned later is lost with the session. An issue that `triage` assessed is named to the next step only as a one-line summary, so its number is gone before any plan exists, and nothing downstream can tell which issue a run belongs to.

## Current behaviour

- `/viber:idea` runs a prose interview, writes no file, and on a confirmed summary invokes `viber:planner` with the summary restated.
- `/viber:fixer` traces a bug from a report and hands a seven-part diagnosis to the planner.
- `/viber:triage` reads a GitHub issue through `viber/skills/triage/scripts/issue-facts.sh`, can post its report through `post-comment.sh` in the same directory, and ends on the line `/viber:fixer <summary>` or `/viber:idea <summary>`.
- The planner writes a plan whose frontmatter carries `source:` and, on a draft round, `into:`; `plan-index.sh --split` drops the whole frontmatter from `spec.md`.
- `.claude/viber.yml` has no switch about issues.

### Must not change

- `triage` assesses, reports and publishes exactly as today; only its next-step line changes.
- `issue-facts.sh` and `post-comment.sh` keep their argv, stdout and exit contracts byte for byte.
- A plan whose frontmatter carries no `issue:` key splits into the same `spec.md` and task files as today.
- The interview discipline of `intent` (scope sizing, spec-shape proposal, one numbered question at a time with three options, the draft-round path) stays as `idea` has it.
- The `/viber:setup` merge keeps every value a user already set in `.claude/viber.yml`.

## Behaviour

### S1 - Save the interview as a new issue [NEW]

An interview that did not start from an issue can leave a GitHub issue behind before any plan exists.

Given the `issues` switch is on, the project has at least one issue form template, `gh` reaches a GitHub repository, and `/viber:intent` was started without an issue reference
When the user confirms the summary and answers yes to the save question
Then `intent` picks a fitting non-bug template, shows a preview of the filled issue, creates it once the user accepts the preview, reports its URL, and asks what next: the planner or stop

### S2 - Decline the save [NEW]

Given the same situation as S1
When the user answers no to the save question
Then `intent` invokes the planner with the confirmed summary, as `idea` does today

### S3 - Resume from an issue [NEW]

Given the `issues` switch is on
When the user runs `/viber:intent #N` (a number, `#N` or an issue URL as the whole argument)
Then `intent` reads the issue with its comments, treats everything they state as settled, asks only about what they leave open, and after the confirmed summary offers to post it as a comment on that issue before asking what next

### S4 - The issue reaches the plan [NEW]

Given an interview or a bug diagnosis tied to an issue, through its entry argument or through S1's save
When the planner writes the plan
Then the plan's frontmatter carries `issue: <full issue URL>`, and after `--split` the run's `spec.md` opens with a frontmatter holding that one line, so the archive keeps it

### S5 - A bug diagnosis starts from an issue [CHANGED - was: fixer took only a free-text bug report]

Given the `issues` switch is on
When the user runs `/viber:fixer #N`
Then `fixer` reads the issue with its comments as the bug report and its diagnosis carries the issue URL to the planner

### S6 - triage names the next step with the issue [CHANGED - was: `/viber:idea <summary>` or `/viber:fixer <summary>`]

Given `triage` assessed a GitHub issue
When it names the next step
Then the line reads `/viber:intent #N` or `/viber:fixer #N`; for pasted issue text it still names the step with a one-line summary

### S7 - Issues switched off [NEW]

Given `.claude/viber.yml` sets `issues: false`
When `intent` or `fixer` runs, with or without an issue reference
Then no issue is fetched, no save or comment question is asked, the plan gets no `issue:` key, and the chain behaves as it did before this change

### S8 - Saving is impossible [NEW]

Given the `issues` switch is on and no issue reference was given
When the project has no issue form template, `gh` is missing, or no GitHub repository is reachable
Then `intent` states the reason in one line, asks no save question, and invokes the planner on the confirmed summary

### Edge cases

- `.github/ISSUE_TEMPLATE/config.yml` (or `.yaml`) -> never listed as a template.
- Only markdown (`.md`) templates exist -> treated as no template (S8).
- Every template is a bug template -> `intent` says so and still lets the user pick one, or skip the save.
- A required template field the summary does not answer -> `intent` asks for it in prose before the preview.
- The type PATCH fails after the issue was created -> the issue stands, `intent` reports the dropped type in one line and goes on.
- `create-issue.sh` or `post-comment.sh` exits 1 -> its `ERROR` line is shown, whether anything landed is unknown, nothing is retried, and the what-next question is still asked.
- An issue reference argument the fetch rejects (exit 1 or 2) -> the `ERROR` line is shown and the skill stops.
- `issues: false` with an issue reference argument -> the token is ordinary input text; `intent` says issue handling is off.
- Resume from an issue where the interview changed nothing the issue states -> no comment is offered.
- The user answers stop after a save or a comment -> `intent` names the issue URL and says `/viber:intent #N` resumes it; nothing else runs.

## Glossary

- issue reference - an issue number, `#N` or an issue URL given as the WHOLE argument of `intent` or `fixer`; any other argument is not one.
- issues switch - the project setting that turns every issue behaviour of `intent` and `fixer` on or off; `triage` ignores it.
- save question - the prose question `intent` asks after a confirmed summary with no issue reference: save as a new issue or not.
- what-next question - the prose question asked after a save or a posted comment: invoke the planner now, or stop.
- Issue line - the reference to the run's issue that a confirmed `intent` summary or a `fixer` diagnosis carries to the planner.

## Acceptance criteria

1. `viber/.claude-plugin/plugin.json` lists `./skills/intent/`, `viber/skills/idea/` no longer exists, and `.claude/rules/plugin-manifests.md` names `intent` in the pipeline order.
2. `issue-facts.sh` and `post-comment.sh` live in `viber/scripts/` with their contracts unchanged, and `triage` calls them from there.
3. `config.sh` prints `issues: true|false` directly after `plain-plan-review`, the setup template seeds `issues: true`, and `/viber:setup` merges the key into a config that lacks it.
4. `issue-templates.sh` prints `STATUS=ready` plus one block per issue form template (`name`, `description`, `type`, `title`, `labels`, `assignees`, `projects`), or `STATUS=skip` with `REASON=no-templates|no-gh|no-repo`.
5. `create-issue.sh` creates an issue from a body file and a title, applies the template type through the REST API, and reports `ISSUE_URL`, `ISSUE_NUMBER` and `TYPE`.
6. A plan whose frontmatter carries `issue: <URL>` splits into a `spec.md` opening with a frontmatter holding exactly that line; a plan without it splits as today.
7. The planner accepts a confirmed `viber:intent` interview or a `viber:fixer` diagnosis, and writes `issue: <URL>` into the plan frontmatter exactly when that input carries an Issue line.
8. `intent` implements S1, S2, S3, S7 and S8: the issue reference entry, the save question with template choice, preview and creation, the comment offer, the what-next question, the Issue line in its planner handoff, and the switch and impossibility skips.
9. `fixer` implements S5 and its half of S7: an issue reference is read through `issue-facts.sh` and its URL rides the diagnosis as an Issue line.
10. `triage` names `/viber:intent #N` or `/viber:fixer #N` for a GitHub issue and a one-line summary for pasted text.
11. `viber/README.md`, `viber/skills/setup/assets/usage.md` and `docs/assets/viber-flow.svg` name `/viber:intent` and never `idea` as a skill, and the README switch table lists `issues`.

## Scope

### File map

- add - viber/scripts/issue-facts.sh - moved from triage: fetches one issue as a fixed block (contract unchanged)
- add - viber/scripts/post-comment.sh - moved from triage: posts one file as an issue comment (contract unchanged)
- delete - viber/skills/triage/scripts/issue-facts.sh - moved
- delete - viber/skills/triage/scripts/post-comment.sh - moved
- add - viber/scripts/issue-templates.sh - save preflight plus the list of issue form templates
- add - viber/scripts/create-issue.sh - creates one issue from a body file, applies its type
- modify - viber/scripts/config.sh - the `issues` switch
- modify - viber/scripts/plan-index.sh - `--split` carries the `issue:` line into `spec.md`
- modify - viber/skills/setup/templates/viber.yml - `issues: true` with its comment
- modify - viber/skills/planner/templates/spec-lite.md - frontmatter `issue:` line; `idea` wording
- modify - viber/skills/planner/templates/spec-full.md - frontmatter `issue:` line; `idea` wording
- modify - viber/skills/planner/SKILL.md - intent naming, the Issue line input and the `issue:` key
- add - viber/skills/intent/SKILL.md - the renamed interview plus the issue entry, save, comment and what-next flow
- add - viber/skills/intent/references/issue.md - template choice, field filling, issue form body format, preview, creation and comment steps
- delete - viber/skills/idea/SKILL.md - replaced by intent
- modify - viber/skills/fixer/SKILL.md - issue reference entry, switch preload, Issue line in the diagnosis
- modify - viber/skills/triage/SKILL.md - plugin-wide script paths, next-step line with the issue
- modify - viber/.claude-plugin/plugin.json - `./skills/intent/` in place of `./skills/idea/`
- modify - .claude/rules/plugin-manifests.md - pipeline order names intent
- modify - viber/README.md - intent, the issue flow, the `issues` switch row
- modify - viber/skills/setup/assets/usage.md - intent and the issue flow
- modify - docs/assets/viber-flow.svg - intent in place of idea
- modify - tests/viber/issue-facts.test.ts - new script path
- modify - tests/viber/post-comment.test.ts - new script path
- add - tests/viber/issue-templates.test.ts - issue-templates.sh contract
- add - tests/viber/create-issue.test.ts - create-issue.sh contract
- modify - tests/viber/config.test.ts - the `issues` key
- modify - tests/viber/bootstrap.test.ts - fixtures and merge report with the `issues` key
- modify - tests/viber/plan-index.test.ts - the `issue:` line in `spec.md`

### Out of scope

- `implementor`, `commit-task.sh`, `archive-run.sh`, `closeout` and the `commit` skill reading the `issue:` key (the user's next cycle).
- `fixer` offering to save or comment on an issue.
- Markdown (`.md`) issue templates and GitHub Enterprise specific flows beyond what `gh` resolves itself.
- Editing an existing issue's body.
- Any alias or redirect from `/viber:idea`.
- Archived runs under `docs/specs/` and `docs/archive/`, and `docs/notes.md`.
- The `CLAUDE.md` nodes (`viber/CLAUDE.md`, root `CLAUDE.md`): the build's memory close updates them.
- This repo's own `.claude/viber.yml`: `/viber:setup` merges the new key.
- The script enumerations in `.claude/rules/shell-script-header.md` and `.claude/rules/shell-preload-contract.md`: the build's rules close updates them.

## Constraints

- Every script is POSIX `sh` or bash that runs under Git Bash on Windows and on macOS, carries its I/O contract in its header, and ships with git mode 100755.
- Every bundled-script call in a skill is one literal `"${CLAUDE_PLUGIN_ROOT}/scripts/x.sh" <args>` line with a matching `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/x.sh:*)` pattern in `allowed-tools`; no heredoc anywhere.
- A multi-line issue body or comment travels only as a file under `.temp/viber/intent/` through `--body-file`.
- `gh` is reached only through the bundled scripts; its absence never breaks the interview.
- Like every switch, an absent `issues` key resolves to false; only the template default is true.
- Tests use the `tests/harness` stubs and never call the real `gh`.
- No em dash or en dash in any file.
