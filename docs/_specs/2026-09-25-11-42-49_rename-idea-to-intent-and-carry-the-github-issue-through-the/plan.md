---
source: C:/Projects/p2p2.claude/docs/_specs/2026-09-25-11-42-49_rename-idea-to-intent-and-carry-the-github-issue-through-the/plan.md
---

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

## Tasks

<!-- TASK -->
### T1 - Move the issue scripts to the plugin-wide scripts directory
- TDD: none
- Covers: #2
- Uses: C1
- Depends-on: none
- Files: viber/scripts/issue-facts.sh, viber/scripts/post-comment.sh, viber/skills/triage/scripts/issue-facts.sh, viber/skills/triage/scripts/post-comment.sh, viber/skills/triage/SKILL.md, tests/viber/issue-facts.test.ts, tests/viber/post-comment.test.ts
- Delivers: both issue scripts moved (history kept) to `viber/scripts/` with headers naming viber skills as their callers; `triage` pre-approves and calls them through `${CLAUDE_PLUGIN_ROOT}/scripts/`; both tests resolve the new paths.
- Verification: `node --test tests/viber/issue-facts.test.ts tests/viber/post-comment.test.ts` -> every test passes; `grep -n 'CLAUDE_PLUGIN_ROOT}/scripts/issue-facts.sh' viber/skills/triage/SKILL.md && git ls-files -s viber/scripts/issue-facts.sh viber/scripts/post-comment.sh` -> the triage lines plus two 100755 entries
- DoD: both scripts exist under `viber/scripts/` at mode 100755 and not under `viber/skills/triage/scripts/`; their argv, stdout and exit contracts are unchanged; `triage` names them only through `${CLAUDE_PLUGIN_ROOT}/scripts/` in `allowed-tools` and in its call lines; both tests pass against the new paths
<!-- /TASK -->

<!-- TASK -->
### T2 - Add the issues switch
- TDD: required
- Covers: #3
- Uses: C2
- Depends-on: none
- Files: viber/scripts/config.sh, viber/skills/setup/templates/viber.yml, tests/viber/config.test.ts, tests/viber/bootstrap.test.ts
- Delivers: `config.sh` resolving and printing the `issues` switch in its fixed order, the setup template seeding it on with a comment, and the bootstrap merge reporting and appending it for a config that lacks it.
- Verification: `node --test tests/viber/config.test.ts tests/viber/bootstrap.test.ts` -> every test passes, including cases asserting the `issues:` line position, its default off without a file, the template seeding it on, and a merge reporting `issues`
- DoD: `config.sh` prints `issues: <true|false>` right after `plain-plan-review` and its header lists the key; the template carries `issues: true` under a one-line comment; an older config gains `issues: true` through `/viber:setup` with its own values kept; every fixture that asserts the full key set includes `issues`
<!-- /TASK -->

<!-- TASK -->
### T3 - Add the issue template lister
- TDD: required
- Covers: #4
- Uses: C3
- Depends-on: none
- Files: viber/scripts/issue-templates.sh, tests/viber/issue-templates.test.ts
- Delivers: a script that decides whether an issue can be saved in the current repository and, when it can, lists every issue form template with its top-level metadata.
- Verification: `node --test tests/viber/issue-templates.test.ts` -> every test passes, covering ready output with several templates, `config.yml` excluded, inline and block `labels`, quoted values, and each of the three skip reasons, with `gh` stubbed
- DoD: the script's output matches C3 for ready and for each skip reason; `config.yml` and `config.yaml` are never listed; `.md` templates are ignored; it always exits 0 except 2 on any argument; its header states the C3 contract; `git ls-files -s viber/scripts/issue-templates.sh` reads 100755
<!-- /TASK -->

<!-- TASK -->
### T4 - Add the issue creator
- TDD: required
- Covers: #5
- Uses: C4
- Depends-on: none
- Files: viber/scripts/create-issue.sh, tests/viber/create-issue.test.ts
- Delivers: a script that creates one issue from a body file and a title with the template's labels, assignees and projects, applies its type through the REST API, and reports the result, ported from the retired supergh `create.sh` (git history before commit 6e9b1004).
- Verification: `node --test tests/viber/create-issue.test.ts` -> every test passes, covering `TYPE=applied|dropped|error|none`, flag forwarding in order, a missing body file, bad flags, a failed create and a non-github.com host passed to the PATCH, with `gh` stubbed
- DoD: the script's output and exit codes match C4; the body always travels through `--body-file`; a failed type PATCH never removes the created issue; its header states the C4 contract; `git ls-files -s viber/scripts/create-issue.sh` reads 100755
<!-- /TASK -->

<!-- TASK -->
### T5 - Carry the issue key into the specification
- TDD: required
- Covers: #6
- Uses: C5
- Depends-on: none
- Files: viber/scripts/plan-index.sh, tests/viber/plan-index.test.ts, viber/skills/planner/templates/spec-lite.md, viber/skills/planner/templates/spec-full.md
- Delivers: `--split` writing the plan frontmatter's `issue:` line as `spec.md`'s own frontmatter, and both spec templates offering the `issue:` frontmatter line with its drop-otherwise comment and no `idea` wording.
- Verification: `node --test tests/viber/plan-index.test.ts` -> every test passes, including a plan with `issue:` whose `spec.md` starts with the three-line frontmatter and the existing no-frontmatter case unchanged; `grep -n '^issue:' viber/skills/planner/templates/spec-lite.md viber/skills/planner/templates/spec-full.md` -> one line in each
- DoD: a plan frontmatter `issue:` line with a value lands in `spec.md` as C5 states; a plan without it produces a byte-identical `spec.md` to today; `source:` and `into:` never reach `spec.md`; both templates carry the `issue:` line and neither contains the word `idea`
<!-- /TASK -->

<!-- TASK -->
### T6 - Teach the planner the intent input and the issue key
- TDD: none
- Covers: #7
- Uses: C5, C6
- Depends-on: T5
- Files: viber/skills/planner/SKILL.md
- Delivers: the planner's description and input contract naming a confirmed `viber:intent` interview or a `viber:fixer` diagnosis, with or without an Issue line, and its write step putting the URL into the frontmatter `issue:` key exactly when the input carries one.
- Verification: `grep -n 'Issue:\|^issue:\|issue:' viber/skills/planner/SKILL.md viber/skills/planner/templates/spec-full.md && grep -c 'idea' viber/skills/planner/SKILL.md` -> the Issue line and the `issue:` key named on both sides, and a count of 0
- DoD: the description and body name `viber:intent`, never `viber:idea`; the input contract names the Issue line of C6; the write step fills `issue:` from it and drops the line when absent; a round continuing a draft carries the draft's `issue:` line over like the rest of its specification
<!-- /TASK -->

<!-- TASK -->
### T7 - Replace idea with the intent skill and its issue flow
- TDD: none
- Covers: #1, #8
- Uses: C1, C2, C3, C4, C6
- Depends-on: T1, T2, T3, T4, T6
- Files: viber/skills/intent/SKILL.md, viber/skills/intent/references/issue.md, viber/skills/idea/SKILL.md, viber/.claude-plugin/plugin.json, .claude/rules/plugin-manifests.md
- Delivers: the `intent` skill carrying the whole interview of `idea` plus the switch preload, the issue reference entry and resume (S3), the save question (S1, S2), the comment offer, the what-next question, the impossibility skip (S8), the switch-off path (S7) and the Issue line in its planner handoff; the save and comment mechanics in its reference file, read only at that step; the manifest and the pipeline-order rule naming it.
- Verification: `grep -n 'scripts/config.sh\|scripts/issue-facts.sh\|scripts/issue-templates.sh\|scripts/create-issue.sh\|scripts/post-comment.sh' viber/skills/intent/SKILL.md viber/skills/intent/references/issue.md && ls viber/scripts/issue-templates.sh viber/scripts/create-issue.sh && grep -n 'skills/intent' viber/.claude-plugin/plugin.json && grep -n 'issues\|Issue:' viber/skills/intent/SKILL.md viber/scripts/config.sh viber/skills/planner/SKILL.md` -> each script named in a literal call line and an `allowed-tools` pattern, both scripts present, one manifest line, and the switch and the Issue line named on the intent side and on the config and planner side
- DoD: `viber/skills/idea/` is gone and `plugin.json` lists `./skills/intent/` in its old position; `intent` preloads `config.sh` and skips every issue step when `issues` is false; an argument that is exactly an issue reference is fetched through `issue-facts.sh` and its content treated as settled; with no reference the save question follows the confirmed summary, runs `issue-templates.sh`, skips with a one-line reason on `STATUS=skip`, prefers a non-bug template by `TYPE`, shows a preview before `create-issue.sh`; with a reference a comment is offered only when the interview changed something and posts through `post-comment.sh`; a save or comment is followed by the what-next question, a decline of the save goes straight to the planner; every planner handoff tied to an issue carries the C6 Issue line; every bundled call is a literal line with a matching `allowed-tools` pattern, and `Write` is pre-approved for the body and comment files under `.temp/viber/intent/`; `plugin-manifests.md` names intent in the order
<!-- /TASK -->

<!-- TASK -->
### T8 - Let fixer start from an issue
- TDD: none
- Covers: #9
- Uses: C1, C2, C6
- Depends-on: T1, T2, T6
- Files: viber/skills/fixer/SKILL.md
- Delivers: `fixer` preloading `config.sh`, reading an argument that is exactly an issue reference through `issue-facts.sh` as the bug report when `issues` is on, and restating the Issue line with its diagnosis in the planner handoff.
- Verification: `grep -n 'scripts/config.sh\|scripts/issue-facts.sh\|Issue:' viber/skills/fixer/SKILL.md viber/skills/planner/SKILL.md` -> the preload, the call line, the `allowed-tools` patterns and the Issue line on the fixer side, the Issue line on the planner side
- DoD: `fixer` preloads `config.sh` through a literal line with a matching pattern; with `issues` on, an issue reference argument is fetched and read with its comments, and an `ERROR` from the fetch is shown and stops the skill; the diagnosis adds the Issue line only when an issue was read; with `issues` off the argument is plain report text
<!-- /TASK -->

<!-- TASK -->
### T9 - Name the next step with the issue in triage
- TDD: none
- Covers: #10
- Uses: C1
- Depends-on: T1, T7
- Files: viber/skills/triage/SKILL.md
- Delivers: the next-step line naming `/viber:intent #N` or `/viber:fixer #N` for a GitHub issue and a one-line summary for pasted text, and every mention of `viber:idea` replaced by `viber:intent`.
- Verification: `grep -n 'viber:intent\|viber:fixer' viber/skills/triage/SKILL.md && grep -n '^name: intent' viber/skills/intent/SKILL.md && grep -c 'idea' viber/skills/triage/SKILL.md` -> both next-step forms on the triage side, the skill name on the intent side, and a count of 0
- DoD: a GitHub issue ends on `/viber:intent #<N>` or `/viber:fixer #<N>`; pasted text ends on the step plus a one-line summary; the Stop section names `viber:intent`; nothing else in the assessment or publish steps changes
<!-- /TASK -->

<!-- TASK -->
### T10 - Update the user docs for intent and issues
- TDD: none
- Covers: #11
- Uses: C2
- Depends-on: T2, T7
- Files: viber/README.md, viber/skills/setup/assets/usage.md, docs/assets/viber-flow.svg
- Delivers: the README, the usage page and the flow diagram naming `/viber:intent`, a short account of saving an interview as an issue and starting `intent` or `fixer` from `#N`, and the `issues` row in the switch table.
- Verification: `grep -n 'viber:intent\|issues' viber/README.md viber/skills/setup/assets/usage.md && grep -n '^issues:' viber/skills/setup/templates/viber.yml && grep -c 'viber:idea\|>idea<' viber/README.md viber/skills/setup/assets/usage.md docs/assets/viber-flow.svg` -> the doc lines, the template key, and counts of 0
- DoD: both docs name `/viber:intent` wherever they named `/viber:idea`; both describe the issue save and the `#N` entry in plain usage terms; the README switch table has an `issues` row stating it is on by default; the diagram labels the interview step `intent`
<!-- /TASK -->

## Contracts

### C1 - issue-facts.sh and post-comment.sh

File: viber/scripts/issue-facts.sh, viber/scripts/post-comment.sh

```
issue-facts.sh <N | #N | https://<host>/<owner>/<repo>/issues/<N>>
  stdout (exit 0): NUMBER=<N>, URL=<url>, TITLE=, STATE=, AUTHOR=, LABELS=, COMMENTS=<count>,
                   "--- body ---", body lines, then per comment "--- comment <k> by <login> at <ISO> ---" + body
  exit 1: one ERROR line on stderr (no gh, gh failed, no NUMBER= line); exit 2: bad argument
post-comment.sh <issue ref> <comment file>
  stdout (exit 0): COMMENT_URL=https://<host>/<owner>/<repo>/issues/<N>#issuecomment-<id>
  exit 1: ERROR line, landing unknown, never retried; exit 2: bad arguments or missing file
```

### C2 - issues switch

File: viber/scripts/config.sh, viber/skills/setup/templates/viber.yml

```
.claude/viber.yml:  issues: true            (template default; absent key -> false)
config.sh stdout:   ... plain-plan-review: <bool>
                    issues: <true|false>
                    directories.runs: ...
```

### C3 - issue-templates.sh

File: viber/scripts/issue-templates.sh

```
issue-templates.sh            (no arguments; cwd anywhere inside the repository)
checks, in order: .github/ISSUE_TEMPLATE/*.yml|*.yaml minus config.yml|config.yaml exist;
                  gh on PATH; `gh repo view` resolves a repository
stdout, exit 0, ready:
  STATUS=ready
  REPO=<repository url>
  then per template, file name order:
  --- template <repo-relative path> ---
  NAME=<name>
  DESCRIPTION=<description>
  TYPE=<type or empty>
  TITLE=<title or empty>
  LABELS=<name>, <name>        (empty when none)
  ASSIGNEES=<login>, <login>   (empty when none)
  PROJECTS=<project>, <project> (empty when none)
stdout, exit 0, skip:
  STATUS=skip
  REASON=no-templates|no-gh|no-repo
values: top-level keys only, surrounding quotes stripped, CR stripped;
        a list may be inline [a, "b"], a block of "- a" lines, or one comma string
exit 2: any argument given
```

### C4 - create-issue.sh

File: viber/scripts/create-issue.sh

```
create-issue.sh <body file> <title> [--type <T>] [--label <L>]... [--assignee <A>]... [--project <P>]...
stdout, exit 0:
  ISSUE_URL=https://<host>/<owner>/<repo>/issues/<N>
  ISSUE_NUMBER=<N>
  TYPE=applied|dropped|error|none
  TYPE_ERROR=<one line>        (only with dropped or error)
TYPE: none = no --type; applied = PATCH repos/<owner>/<repo>/issues/<N> type=<T> on --hostname <host> succeeded;
      dropped = PATCH failed on not enabled / not found / issue types / validation failed / 403 / 404;
      error = any other PATCH failure; the issue is never removed
exit 1: one ERROR line on stderr, nothing on stdout (gh missing, create failed, no issue URL printed)
exit 2: missing body file or title, body file not found, unknown or valueless flag
```

### C5 - issue key in the plan and the specification

File: viber/skills/planner/templates/spec-lite.md, viber/skills/planner/templates/spec-full.md, viber/scripts/plan-index.sh

```
plan.md frontmatter:   ---
                       source: <path>
                       into: <key>            (draft rounds only)
                       issue: <full issue URL> (only when the input carries an Issue line)
                       ---
spec.md after --split, only when the plan frontmatter has a non-empty issue: line:
                       ---
                       issue: <full issue URL>
                       ---
                       <blank line>
                       <the specification as today>
```

### C6 - Issue line in the planner handoff

File: viber/skills/planner/SKILL.md

```
One line inside the confirmed intent summary or the fixer diagnosis restated to viber:planner:
Issue: <full issue URL>
Present only when the run is tied to an issue (entry reference or a save); the URL is the URL= value
of issue-facts.sh or the ISSUE_URL= value of create-issue.sh.
```
