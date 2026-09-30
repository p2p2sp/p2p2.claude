To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# GitHub issue and pull request skills, grouped viber.yml with a schema number

## Goal

viber gains two dedicated GitHub actions: filing an issue from the project's issue form templates at any moment (`/viber:create-issue`), and opening a pull request by hand for the current branch per the configured branching (`/viber:create-pr`). Alongside, `.claude/viber.yml` is regrouped by the stage that reads each switch, carries a schema number, and a session start tells the user when `/viber:setup` has to run.

## Problem

- An issue can be created only at the end of a `/viber:intent` interview with the `issues` switch on, never from a bug template, so a bug cannot be filed through viber at all and a plain "file this" has no entry point.
- viber never opens a pull request: a run's branch and its `target:` are known, yet the developer pushes and writes the pull request, its title and its template by hand.
- `.claude/viber.yml` is a flat list of ten switches with no structure, and nothing tells a user that their file lags behind the installed version, so new switches stay invisible until someone happens to run `/viber:setup`.

## Current behaviour

- `config.sh` reads ten column-0 switches (`adr`, `memory`, `rules`, `qa`, `cleanup`, `final-review`, `plain-plan-review`, `issues`, `fast-path`, `baseline-tests`) and prints them as `<key>: <true|false>` lines, then `directories.*`, `tiers.*`, `branching.mode`.
- `switch-text.sh` accepts those ten keys plus `branching.mode`; 26 skill preloads call it with a flat key; `plan-gate.sh` greps `plain-plan-review: true`.
- `bootstrap.sh` appends a missing top-level key or group whole and inserts a missing child only into `directories:`; it never moves a key.
- `session-start.sh` drains stdin unread and prints `viber loaded <version>` plus the manifest.
- `intent` under `issues: true` saves its summary through `intent/references/issue.md` `## Save`: `issue-templates.sh`, a non-bug template, title = the template's `title:` plus a one-line statement, then `scripts/create-issue.sh`. `fixer` has no save.
- No pull request is ever created or pushed; `implementor`'s final summary names the branch and its `target:` as the pull request target.

### Must not change

- A project with no `.claude/viber.yml` resolves every switch off and every directory, tier and branching value to its default.
- `directories.*`, `tiers.*`, `branching.mode` and `config.sh --branching` resolve exactly as today.
- The existing `issue-templates.sh` lines keep their text and order; the issue creation script's arguments, stdout and exit codes stay identical under its new name.
- Nothing is pushed, merged or deleted by any build or branching step.
- A deleted child of `tiers:` or `branching:` is not restored by setup.
- viber never writes under `.github/`.

## Behaviour

### S1 - Switches read from their groups [CHANGED - was: ten flat column-0 keys]

A switch takes effect only when written inside its group: `planning:`, `build:` or `github:`.

Given a `.claude/viber.yml` whose `build:` group turns `memory` off
When a build closes
Then no memory update runs, and a flat `memory: true` elsewhere in the file changes nothing.

### S2 - Setup migrates a flat file [CHANGED - was: flat keys kept, missing groups appended at defaults]

Given a flat `.claude/viber.yml` with `memory: false` and no `schema:` line
When the user runs `/viber:setup`
Then the file holds `schema: 1`, a `build:` group with `memory: false`, no flat `memory:` line, and setup reports the moved keys with the user's values kept.

### S3 - Session start names an outdated file [NEW]

Given a project whose `.claude/viber.yml` has no `schema:` line
When a session starts
Then the banner reads `viber loaded <version>` followed by a note that the file is at schema 0, this version expects 1, and `/viber:setup` has to run.

### S4 - Filing an issue directly [NEW]

Given a repository with issue form templates, `gh` and the `github.issues` switch off
When the user asks to file an issue, or types `/viber:create-issue <text>`
Then viber proposes a template (a bug template included), fills its fields, shows a preview with a title built from `github.issue-title`, and creates the issue only after the user accepts.

### S5 - Saving a fixer diagnosis as a bug issue [NEW]

Given `github.issues: true` and a bug reported as pasted text
When `fixer` has stated its diagnosis
Then it offers to save the diagnosis through a bug template; a created issue's URL becomes the diagnosis's `Issue:` line handed to the planner.

### S6 - Opening a pull request [NEW]

Given a committed branch that the branching config resolves to a work entry with a target
When the user types `/viber:create-pr`
Then viber shows the title from `github.pr-title`, the body filled from the entry's template, and `Closes #N` or `Refs #N`, then asks create, create as draft or cancel, and on create pushes the branch and prints the pull request URL.

### S7 - Build summary points to the pull request skill [CHANGED - was: names branch and target only]

Given a build on a run branch with a `target:` other than the branch
When the build closes
Then its summary line names the branch and target and suggests `/viber:create-pr`.

### S8 - intent's saved issue follows the title pattern [CHANGED - was: template title plus a one-line statement]

Given `github.issues: true`, an interview with no issue and `github.issue-title: '[{type}] {summary}'`
When the user agrees to save the confirmed summary
Then the preview's title is the template's type in brackets followed by the one-line statement, and the issue is created through `scripts/issue-create.sh`.

### S9 - A pull request template per kind of branch [NEW]

Given `.github/PULL_REQUEST_TEMPLATE/hotfix.md` and a branch on the `hotfix` work entry
When the user opens a pull request through `/viber:create-pr`
Then the body follows the hotfix template; `BRANCHING.md` and the help page show that convention with a feature and a hotfix template example.

### Edge cases

- A flat key and its grouped twin both present -> the grouped value counts; migration drops the flat line.
- A deleted child of `planning:`, `build:` or `github:` -> setup restores it at its default.
- `schema:` higher than the template's -> the banner says to update the plugin; setup leaves the number alone.
- `schema:` missing or not a number -> treated as 0.
- No `.claude/viber.yml`, or no readable template -> the plain banner.
- A title pattern holding spaces or a `#` inside its quotes -> kept whole.
- No template of the eligible kind (fixer: no bug template) -> said in one line, no issue.
- `branching.mode: off` -> no entry is resolved; the user is asked for the target, the default branch offered.
- A branch matching the name patterns of two entries -> the user picks one.
- Detached HEAD, uncommitted tracked changes, a branch equal to the default branch or any entry base or target, an open pull request for the branch, or no commit ahead of the target -> `/viber:create-pr` stops, naming the reason (the existing pull request's URL included).
- A target branch unknown locally and at the remote -> no commits listed, no stop.
- A pull request template with HTML comments -> the comments are left out of the body.
- A section nothing in the run answers -> `_No response_`, never an invented text.

## Glossary

- schema number - the layout version a configuration file follows, raised whenever setup would change the file; not the plugin version.
- legacy flat key - one of the ten switches written at column 0, as before grouping.
- title pattern - the `github.issue-title` or `github.pr-title` value, a text with placeholders the skill fills in.
- closing keyword - `Closes #N` in a pull request body, which GitHub acts on only when the pull request targets the default branch; `Refs #N` otherwise.
- eligible templates - the kind of issue template a caller of the shared save steps allows: bug, non-bug or any.

## Acceptance criteria

1. `config.sh` prints `planning.*`, `build.*` and `github.issues` switch lines read only from inside their groups; a legacy flat key resolves off.
2. `config.sh` prints `github.issue-title` and `github.pr-title`, defaulting to `{template-title}{summary}` and `{type}: {summary}`, a quoted value kept whole.
3. Every fragment preload and the plan gate read the grouped switches.
4. The setup template carries `schema: 1` and the three groups, and the help page, README and flow diagrams name every key by its group.
5. `/viber:setup` moves every legacy flat key into its group keeping its value, restores a deleted child of `planning`, `build` or `github`, writes the schema number and changes nothing on a second run.
6. A development guard (a test) fails when the template's key list changes without a schema number change, so the S3 note always fires for a changed layout.
7. The session start banner adds the run-setup note for a lower or missing schema, the update-plugin note for a higher one, and nothing when no file exists.
8. `/viber:create-issue`, model-invocable with a description under 25 words, creates an issue from any template, bug included, without the `github.issues` switch, titled by `github.issue-title`.
9. `intent`'s save runs the shared save steps with its title from `github.issue-title`, and the creation script is `scripts/issue-create.sh`.
10. `fixer` under `github.issues: true` offers saving its diagnosis through a bug template, and a created issue's URL becomes its `Issue:` line.
11. `pr-facts.sh` resolves the work entry from an open run's `branch:`, else from one matching name pattern, else lists candidates, and stops on each refusal reason.
12. `pr-facts.sh` picks the entry template, then the default template, reports `CLOSES=yes` only for a target equal to the default branch, and lists the issues the commits reference.
13. `pr-create.sh` pushes the branch with its upstream set and creates the pull request, as a draft on request, printing its URL.
14. `/viber:create-pr`, user-only, previews title and body, asks create, draft or cancel, and fills nothing a run file, commit or the conversation does not state.
15. `implementor`'s final summary suggests `/viber:create-pr` on a run branch with a different target.
16. `BRANCHING.md` and the help page carry the template convention and a feature and a hotfix pull request template example.

## Scope

### File map

- modify - viber/skills/setup/templates/viber.yml - the grouped layout, `schema: 1`, the two title patterns
- modify - viber/skills/setup/scripts/bootstrap.sh - migration of legacy flat keys, child restore for the three groups, schema line
- modify - tests/viber/bootstrap.test.ts - migration, restore, schema cases and the schema key-list binding
- modify - viber/skills/setup/assets/help.html - grouped key entries and links, skill cards and cheat sheet rows for both new skills, fixer card, pull request template convention and examples
- modify - viber/skills/setup/assets/viber-flow-en.svg, viber/skills/setup/assets/viber-flow-pl.svg - switch labels by group
- modify - viber/README.md - switch table by group, two new skills, push wording
- modify - viber/scripts/config.sh - grouped switch reads, title pattern reads, dotted block
- modify - tests/viber/config.test.ts - grouped layout cases
- modify - viber/scripts/switch-text.sh - dotted key allowlist
- modify - tests/viber/switch-text.test.ts, tests/portability.test.ts - dotted keys
- modify - viber/skills/triage/SKILL.md, viber/skills/prototype/SKILL.md, viber/skills/intent/SKILL.md, viber/skills/planner/SKILL.md, viber/skills/implementor/SKILL.md, viber/skills/fixer/SKILL.md - dotted preload keys; intent the renamed script; fixer the save step; implementor the summary line
- modify - viber/skills/implementor/fragments/final-review.true.md, viber/skills/planner/fragments/qa-e2e.false.md, viber/skills/planner/references/adr-tasks.md - prose naming a switch by its group
- modify - viber/hooks/scripts/plan-gate.sh, viber/hooks/scripts/plan-hints.sh, tests/viber/plan-gate.test.ts - `planning.plain-plan-review`
- modify - viber/hooks/scripts/session-start.sh, tests/viber/session-start.test.ts - schema comparison banner
- modify - viber/hooks/hooks.json - description naming `planning.plain-plan-review` and the schema note
- modify - viber/references/plan-rules.md - the Memory-owned rule naming `build.memory`
- modify - viber/scripts/issue-templates.sh, tests/viber/issue-templates.test.ts - `TITLE_PATTERN=` line
- add - viber/references/issue-save.md - the shared issue save steps
- modify - viber/skills/intent/references/issue.md - `## Comment` only
- modify - viber/skills/intent/fragments/issues-done.true.md - the shared save steps
- delete - viber/scripts/create-issue.sh, tests/viber/create-issue.test.ts; add - viber/scripts/issue-create.sh, tests/viber/issue-create.test.ts - the rename
- add - viber/skills/create-issue/SKILL.md - the issue skill
- modify - viber/.claude-plugin/plugin.json - both new skills
- add - viber/skills/fixer/fragments/issues-save.true.md; modify - viber/skills/fixer/fragments/issues-diagnosis.true.md - fixer's save offer
- add - viber/scripts/pr-facts.sh, tests/viber/pr-facts.test.ts - pull request facts
- add - viber/scripts/pr-create.sh, tests/viber/pr-create.test.ts - push and create
- add - viber/skills/create-pr/SKILL.md - the pull request skill
- modify - viber/BRANCHING.md - `github.issues`, pull request creation, template convention, examples

### Out of scope

- Handling pull request review threads: a separate change.
- Merging, pushing during a build, writing `.github/`, release branches.
- This repository's own `.claude/viber.yml`: the installed viber reads flat keys during this very build, so it is migrated by `/viber:setup` after the release is installed.
- `CLAUDE.md` nodes, `viber/CLAUDE.*.md` sections and `.claude/rules/`: the build's close updates them.
- New nodes in the flow diagrams: both new skills stand outside the chain, like `commit`.
- Legacy markdown issue templates (`.github/ISSUE_TEMPLATE/*.md`).
- The agents' `memory:` input label (`planner-review`, `final-reviewer`): a dispatch label, not a config key.

## Constraints

- Every script runs on Windows Git Bash and macOS (bash 3.2, BSD userland); gh-calling scripts are `#!/bin/sh` with no bashism and no awk `function`; no heredoc anywhere.
- A new script enters the index at 100755 through `git update-index --add --chmod=+x`; every preload and runtime call is the literal `"${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" <args>` line with a matching `allowed-tools` pattern.
- The help page keeps every `lang="en"`/`lang="pl"` pair, every internal link resolving, and no en or em dash anywhere; `tests/viber/help.test.ts` stays green after each task touching it.
- `plugin.json` keeps pipeline order: `create-issue` after `triage`, `create-pr` after `e2e`, `help`, `handoff`, `commit` last.
- `/viber:create-issue`'s description stays under 25 words: it sits in every session's context.
