---
source: C:/Projects/p2p2.claude/docs/_specs/2026-09-30-12-41-11_github-issue-and-pull-request-skills-grouped-viber-yml-with/plan.md
---

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

## Tasks

<!-- TASK -->
### T1 - Regroup the viber.yml template and migrate flat configs in setup
- TDD: required
- Covers: #4, #5, #6
- Uses: C1, C4
- Depends-on: none
- Files: viber/skills/setup/templates/viber.yml, viber/skills/setup/scripts/bootstrap.sh, tests/viber/bootstrap.test.ts, viber/skills/setup/assets/help.html, viber/skills/setup/assets/viber-flow-en.svg, viber/skills/setup/assets/viber-flow-pl.svg, viber/README.md
- Delivers: the template in the grouped layout with `schema: 1` and the two title patterns; `bootstrap.sh` migrating legacy flat keys into their groups with their values, restoring a missing child of `planning`, `build` and `github`, writing the schema line and reporting the migration; a test binding the template key list to its schema number; the help page's key reference, every `#key-` link, the switch summary, the README switch table and both flow diagrams' switch labels naming each key by its group.
- Verification: `node --test tests/viber/bootstrap.test.ts tests/viber/help.test.ts` -> all pass; `grep -n "^schema: 1" viber/skills/setup/templates/viber.yml; grep -c 'id="key-build-memory"' viber/skills/setup/assets/help.html; grep -nE '<code>(adr|memory|rules|qa|cleanup|final-review|plain-plan-review|issues|fast-path|baseline-tests): (true|false)</code>|href="#key-(adr|memory|rules|qa|cleanup|final-review|plain-plan-review|issues|fast-path|baseline-tests)"' viber/skills/setup/assets/help.html; grep -nE '`(adr|memory|rules|qa|cleanup|final-review|plain-plan-review|issues|fast-path|baseline-tests)(: (true|false)|` (on|off))' viber/README.md` -> one template line, count 1, no flat switch in either document
- DoD: a seeded fresh config equals the template; a flat config with `memory: false` and `adr: false` ends with both values inside `build:` and `planning:`, no flat switch line left and the C4 migration line printed; a flat `memory: true` beside a grouped `memory: false` ends with `build:` holding `memory: false` and no flat line; every bootstrap case asserts the written file, none the output of `config.sh`; a config missing `build:`'s `qa` child gets it restored at its default; a second run prints `already present and complete` and leaves the file byte-identical; a config at a higher schema keeps its number; the key-list binding test fails when a template key is added without changing `schema:`; the help page carries an entry for every template key and no `#key-` link to a removed id; no help page or README text names a switch by its flat key, instructions included

<!-- /TASK -->

<!-- TASK -->
### T2 - Read switches and title patterns from their groups
- TDD: required
- Covers: #1, #2
- Uses: C1, C2
- Depends-on: T1
- Files: viber/scripts/config.sh, tests/viber/config.test.ts, tests/viber/bootstrap.test.ts
- Delivers: `config.sh` resolving each switch only inside its group and printing the C2 block, with both title patterns read whole from `github:`.
- Verification: `node --test tests/viber/config.test.ts tests/viber/bootstrap.test.ts` -> all pass
- DoD: `build.memory: false` inside `build:` prints `build.memory: false`; a flat `memory: true` alone prints `build.memory: false`; the shipped template resolves to its own defaults; an absent file prints every switch false and both title defaults; `pr-title: '{type}: {summary} #x'` prints `github.pr-title: {type}: {summary} #x`; an unquoted title keeps its inner spaces and drops a trailing ` # comment`; `directories.*`, `tiers.*`, `branching.mode` and `--branching` print as before; a flat config migrated by `bootstrap.sh` resolves through `config.sh` to the flat file's own values as dotted lines

<!-- /TASK -->

<!-- TASK -->
### T3 - Key every fragment preload by its group
- TDD: required
- Covers: #3
- Uses: C2, C3
- Depends-on: T2
- Files: viber/scripts/switch-text.sh, tests/viber/switch-text.test.ts, tests/portability.test.ts, viber/skills/triage/SKILL.md, viber/skills/prototype/SKILL.md, viber/skills/intent/SKILL.md, viber/skills/planner/SKILL.md, viber/skills/implementor/SKILL.md, viber/skills/fixer/SKILL.md, viber/skills/implementor/fragments/final-review.true.md, viber/skills/planner/fragments/qa-e2e.false.md, viber/skills/planner/references/adr-tasks.md, viber/references/plan-rules.md
- Delivers: `switch-text.sh` accepting the C3 key set; every `switch-text.sh` preload calling its switch by the dotted key; the portability sweep's key map matching; the planner's `memory:` dispatch value, the final review's `memory:` value, the e2e hand-off line and the ADR reference naming the grouped key.
- Verification: `node --test tests/viber/switch-text.test.ts tests/portability.test.ts` -> all pass; `grep -rnE 'switch-text.sh" (adr|memory|rules|qa|cleanup|final-review|issues|fast-path|baseline-tests) ' viber/skills; grep -n "build.memory" viber/skills/planner/SKILL.md viber/scripts/config.sh` -> no flat call, at least one line in each file
- DoD: `switch-text.sh build.memory <dir> memory` prints `memory.true.md` under `build: memory: true`; a flat key argument prints nothing; the portability fragment sweep passes over every skill; the planner, final review, e2e hand-off and ADR texts name `build.memory`, `build.qa` and `planning.adr`; the ADR reference names `build.rules` wherever it reads the rules switch; the `argument-hint` and description texts of `fixer`, `intent` and `prototype` name `github.issues`; `plan-rules.md`'s Memory-owned rule names `build.memory`

<!-- /TASK -->

<!-- TASK -->
### T4 - Gate plain plans on planning.plain-plan-review
- TDD: required
- Covers: #3
- Uses: C2
- Depends-on: T2
- Files: viber/hooks/scripts/plan-gate.sh, viber/hooks/scripts/plan-hints.sh, tests/viber/plan-gate.test.ts, viber/hooks/hooks.json
- Delivers: the plan gate arming the plain-plan review from `planning.plain-plan-review: true` and naming that key in its deny reason and in the hooks description.
- Verification: `node --test tests/viber/plan-gate.test.ts tests/viber/plan-hints.test.ts` -> all pass
- DoD: a config with `planning:` holding `plain-plan-review: true` arms the gate; a flat `plain-plan-review: true` alone leaves it unarmed; the deny reason names `planning.plain-plan-review in .claude/viber.yml`; the `hooks.json` description names `planning.plain-plan-review`

<!-- /TASK -->

<!-- TASK -->
### T5 - Warn at session start when viber.yml lags the schema
- TDD: required
- Covers: #7
- Uses: C1, C5
- Depends-on: T4
- Files: viber/hooks/scripts/session-start.sh, tests/viber/session-start.test.ts, viber/hooks/hooks.json
- Delivers: the session start hook reading the payload's `cwd`, comparing the project's `schema:` with the plugin template's and extending the banner per C5.
- Verification: `node --test tests/viber/session-start.test.ts` -> all pass
- DoD: a project file without `schema:` gets the run-setup note naming 0 and the template's number; a `schema:` value that is not a number gets the run-setup note naming 0; a file at a lower number gets the run-setup note; a higher number gets the update-plugin note; an equal number, no file, no `cwd` or an unreadable template keep the plain banner; the manifest output is unchanged in every case; the `hooks.json` description names the schema note beside the banner

<!-- /TASK -->

<!-- TASK -->
### T6 - Print the issue title pattern with the templates
- TDD: required
- Covers: #8, #9
- Uses: C2, C6
- Depends-on: T2
- Files: viber/scripts/issue-templates.sh, tests/viber/issue-templates.test.ts
- Delivers: `issue-templates.sh` adding the C6 `TITLE_PATTERN=` line on `STATUS=ready`.
- Verification: `node --test tests/viber/issue-templates.test.ts` -> all pass
- DoD: a ready run prints `TITLE_PATTERN=` right after `REPO=` carrying the config's `github.issue-title`; with no config it carries `{template-title}{summary}`; every other line keeps its text and order; `STATUS=skip` prints no `TITLE_PATTERN=`

<!-- /TASK -->

<!-- TASK -->
### T7 - Share the issue save steps and rename the creation script
- TDD: none
- Covers: #9
- Uses: C6, C7, C8
- Depends-on: T3, T6
- Files: viber/references/issue-save.md, viber/skills/intent/references/issue.md, viber/skills/intent/fragments/issues-done.true.md, viber/skills/intent/SKILL.md, viber/scripts/create-issue.sh, viber/scripts/issue-create.sh, tests/viber/create-issue.test.ts, tests/viber/issue-create.test.ts
- Delivers: the save steps as the shared C8 reference with the title built from `TITLE_PATTERN`; `intent` saving through it with non-bug templates under `.temp/viber/intent/`; the creation script and its test under their C7 names, the script at 100755.
- Verification: `node --test tests/viber/issue-create.test.ts tests/portability.test.ts` -> all pass; `git ls-files -s viber/scripts/issue-create.sh; grep -rln --exclude="CLAUDE*.md" "create-issue.sh" viber/skills viber/references viber/scripts; grep -n "TITLE_PATTERN" viber/references/issue-save.md viber/scripts/issue-templates.sh` -> mode 100755, no file listed, a line in each file
- DoD: `issue-create.sh` passes the renamed test unchanged in behaviour; `intent/references/issue.md` holds only `## Comment`; `issues-done.true.md` sends a save through `issue-save.md` naming non-bug templates and `intent`'s directory; `intent`'s `allowed-tools` names `issue-create.sh`; `issue-save.md` builds the title from `TITLE_PATTERN` with the three C8 placeholders; `issue-save.md` ends with one line and no issue when no template of the eligible kind exists

<!-- /TASK -->

<!-- TASK -->
### T8 - Add the create-issue skill
- TDD: none
- Covers: #8
- Uses: C6, C7, C8, C11
- Depends-on: T7
- Files: viber/skills/create-issue/SKILL.md, viber/.claude-plugin/plugin.json, viber/skills/setup/assets/help.html, viber/README.md
- Delivers: `/viber:create-issue` per C11, preloading `issue-templates.sh`, stopping with the reason on `STATUS=skip`, and otherwise running the shared save steps over any template from its argument and the conversation; its plugin entry, help card and cheat sheet row, and README row.
- Verification: `node --test tests/viber/help.test.ts tests/portability.test.ts` -> all pass; `grep -n "issue-save.md" viber/skills/create-issue/SKILL.md; grep -n '"./skills/create-issue/"' viber/.claude-plugin/plugin.json` -> one line each
- DoD: the skill's frontmatter matches C11 with no switch preload; its body sends the save through `issue-save.md` with any template eligible under `.temp/viber/create-issue/`; `plugin.json` lists it right after `triage`; the help page carries `id="skill-create-issue"` and a cheat sheet row; the README quick start carries its row

<!-- /TASK -->

<!-- TASK -->
### T9 - Offer the fixer diagnosis as a bug issue
- TDD: none
- Covers: #10
- Uses: C3, C6, C7, C8
- Depends-on: T8
- Files: viber/skills/fixer/SKILL.md, viber/skills/fixer/fragments/issues-save.true.md, viber/skills/fixer/fragments/issues-diagnosis.true.md, viber/skills/setup/assets/help.html
- Delivers: under `github.issues: true`, `fixer` offering after its diagnosis, when the report was not read through `issue-facts.sh`, to save it through the shared steps with bug templates only; the created `ISSUE_URL=` becoming the diagnosis's `Issue:` line; the fixer help card naming the save.
- Verification: `node --test tests/portability.test.ts tests/viber/help.test.ts` -> all pass; `grep -n "issues-save" viber/skills/fixer/SKILL.md; grep -n "ISSUE_URL" viber/skills/fixer/fragments/issues-diagnosis.true.md viber/scripts/issue-create.sh` -> one call line, a line in each file
- DoD: `fixer/SKILL.md` preloads `switch-text.sh github.issues` for `issues-save` before its hand-off; the fragment runs `issue-templates.sh`, handles `STATUS=skip` in one line and saves through `issue-save.md` with bug templates under `.temp/viber/fixer/`; `fixer`'s `allowed-tools` names `issue-templates.sh` and `issue-create.sh`; the diagnosis's `Issue:` line accepts `ISSUE_URL=`; the fixer card names the save

<!-- /TASK -->

<!-- TASK -->
### T10 - Resolve the pull request facts for the current branch
- TDD: required
- Covers: #11, #12
- Uses: C2, C9
- Depends-on: T2
- Files: viber/scripts/pr-facts.sh, tests/viber/pr-facts.test.ts
- Delivers: `pr-facts.sh` per C9, at 100755.
- Verification: `node --test tests/viber/pr-facts.test.ts` -> all pass; `git ls-files -s viber/scripts/pr-facts.sh` -> 100755
- DoD: an open run whose `plan.md` records the branch gives its `work:` entry, target and spec path; one matching name pattern gives that entry; two matching patterns give their two `CANDIDATE=` lines and an empty `ENTRY=`; no matching pattern gives one `CANDIDATE=` line per entry; a branch whose run is archived gives `SPEC=` naming the archived `spec.md` its commits touch and `ISSUE=` its `issue:` number; `--entry` and `--target` override; `mode: off` gives no entry and no candidate; each C9 stop reason fires on its own condition with `PR_URL=` on `pr-exists`; the template resolves entry file first, then the default file, else empty; `CLOSES=yes` only for a target equal to the default branch; `ISSUE=` lists the `Refs:` numbers of the commits ahead of the target and the plan's issue; `COMMIT=` lines list those commits oldest first; `TYPE=fix` for a plan with `Repro:`; `TITLE_PATTERN=` carries `github.pr-title`; a target unknown locally and at the remote gives no `COMMIT=` line and no stop; a POSIX shell runs it

<!-- /TASK -->

<!-- TASK -->
### T11 - Push the branch and open the pull request
- TDD: required
- Covers: #13
- Uses: C10
- Depends-on: none
- Files: viber/scripts/pr-create.sh, tests/viber/pr-create.test.ts
- Delivers: `pr-create.sh` per C10, at 100755.
- Verification: `node --test tests/viber/pr-create.test.ts` -> all pass; `git ls-files -s viber/scripts/pr-create.sh` -> 100755
- DoD: a branch pushed to a bare remote gets its upstream set and `gh pr create` called with base, head, title and body file; `--draft` reaches `gh`; the printed URL yields `PR_URL=` and `PR_NUMBER=`; a failed push exits 1 before `gh` runs; a `gh` failure exits 1 naming the branch as pushed; a missing body file, title, `--base` or `gh`, an unknown flag or a detached HEAD exits 2 with nothing pushed; a success prints `PUSHED=<remote>/<branch>`; a POSIX shell runs it

<!-- /TASK -->

<!-- TASK -->
### T12 - Add the create-pr skill
- TDD: none
- Covers: #14, #16
- Uses: C9, C10, C12, C13
- Depends-on: T9, T10, T11
- Files: viber/skills/create-pr/SKILL.md, viber/.claude-plugin/plugin.json, viber/skills/setup/assets/help.html, viber/README.md, viber/BRANCHING.md
- Delivers: `/viber:create-pr` per C12 and C13: `pr-facts.sh` as its `!` preload, stop reasons reported, entry or target asked through `AskUserQuestion` and the facts rerun with `--entry` or `--target`, title and closing lines per C12, body from `TEMPLATE=` or the built-in sections filled only from the run files, commits and conversation, preview, create / draft / cancel through `AskUserQuestion`, then `pr-create.sh`; its plugin entry, help card, cheat sheet row, README row, and `BRANCHING.md` and help page sections on pull request creation, the template convention and a feature and a hotfix template example.
- Verification: `node --test tests/viber/help.test.ts tests/portability.test.ts` -> all pass; `grep -n "pr-create.sh" viber/skills/create-pr/SKILL.md; grep -n "PULL_REQUEST_TEMPLATE" viber/BRANCHING.md viber/scripts/pr-facts.sh` -> a line in each
- DoD: the skill's frontmatter matches C13 and its only preload is `pr-facts.sh`; its body handles every C9 stop reason, asks for the entry among the `CANDIDATE=` lines or, under `MODE=off`, for the target with `DEFAULT=` offered first, writes the body to `.temp/viber/create-pr/body.md`, fills an unanswered section with `_No response_` and drops template HTML comments; the body fills the four C12 placeholders and writes one C12 closing line per `ISSUE=`; the preview shows title and body and ends on one `AskUserQuestion` offering create, create as draft and cancel; create runs `pr-create.sh` with `--base` set to the target, draft adds `--draft`, and the reply reports `PR_URL=`; `plugin.json` lists it right after `e2e`; the help page carries `id="skill-create-pr"`, a cheat sheet row and both template examples; `BRANCHING.md` states pull request creation through the skill, the convention and both examples, and its `issues: true` mentions read `github.issues: true`; the README and the help page (English and Polish) no longer say viber never pushes without naming `/viber:create-pr`

<!-- /TASK -->

<!-- TASK -->
### T13 - Suggest create-pr in the build summary
- TDD: none
- Covers: #15
- Uses: none
- Depends-on: T3
- Files: viber/skills/implementor/SKILL.md
- Delivers: `implementor`'s final summary line for a run branch whose `target:` differs from it suggesting `/viber:create-pr`.
- Verification: `grep -n "create-pr" viber/skills/implementor/SKILL.md; grep -n "printf 'target: %s" viber/scripts/plan-path.sh` -> a line in each
- DoD: the summary line names the branch, the `target:` value and `/viber:create-pr`; no line is added when there is no `target:` line or it equals the branch

<!-- /TASK -->

## Contracts

### C1 - viber.yml grouped layout

File: viber/skills/setup/templates/viber.yml

```yaml
schema: 1
planning:
  adr: true
  plain-plan-review: true
  fast-path: true
build:
  baseline-tests: false
  final-review: true
  memory: true
  rules: true
  qa: false
  cleanup: true
github:
  issues: false
  issue-title: '{template-title}{summary}'
  pr-title: '{type}: {summary}'
directories:   # unchanged
tiers:         # unchanged
branching:     # unchanged
```

Legacy flat key -> group: adr, plain-plan-review, fast-path -> planning; baseline-tests, final-review, memory, rules, qa, cleanup -> build; issues -> github.
Schema 1 key list (help page ids, `key-` prefixed): schema, planning, planning-adr, planning-plain-plan-review, planning-fast-path, build, build-baseline-tests, build-final-review, build-memory, build-rules, build-qa, build-cleanup, github, github-issues, github-issue-title, github-pr-title, directories, directories-runs, directories-specifications, tiers, tiers-min, tiers-max, branching, branching-mode, branching-work.

### C2 - resolved config block

File: viber/scripts/config.sh

```
# viber config (resolved)
planning.adr: <true|false>
planning.plain-plan-review: <true|false>
planning.fast-path: <true|false>
build.baseline-tests: <true|false>
build.final-review: <true|false>
build.memory: <true|false>
build.rules: <true|false>
build.qa: <true|false>
build.cleanup: <true|false>
github.issues: <true|false>
github.issue-title: <pattern>
github.pr-title: <pattern>
directories.runs: <name>
directories.specifications: <name>
tiers.min: <tier>
tiers.max: <tier>
branching.mode: <off|allowed|required>
```

A switch is `true` only as a child of its group (`<group>:` at column 0, the child indented under it) whose value is `true` in any letter case; a column-0 key of the same name is ignored. A title value: the first assignment inside `github:`; one surrounding quote pair stripped with everything inside kept; unquoted, cut at ` #` and trailing blanks; CR stripped; empty or absent -> `{template-title}{summary}` / `{type}: {summary}`.

### C3 - switch-text.sh key set

File: viber/scripts/switch-text.sh

```
key: planning.adr | planning.plain-plan-review | planning.fast-path | build.baseline-tests | build.final-review | build.memory | build.rules | build.qa | build.cleanup | github.issues   (value true | false)
     | branching.mode   (value off | allowed | required)
```

Calls spell a grouped key plainly (`switch-text.sh" build.memory ...`); only `branching.""mode` keeps its splice.

### C4 - setup migration report

File: viber/skills/setup/scripts/bootstrap.sh

```
viber.yml: migrated to schema <n>: <legacy key>, <legacy key> moved into their groups (your own values kept)
viber.yml: schema set to <n>
```

The first line when at least one legacy flat key moved (each key's line and the `#` comment block directly above it removed, its value written as the group child); the second when only the `schema:` line was added or raised. Existing lines (`seeded`, `merged from the template: ...`, `already present and complete`) keep their text; `merged from the template: <keys>` still prints beside the migration line for every group appended or child restored at its default. A `schema:` above the template's is left unchanged.

### C5 - session start schema banner

File: viber/hooks/scripts/session-start.sh

```
viber loaded <version> - .claude/viber.yml is at schema <n>, this version expects <m>: run /viber:setup
viber loaded <version> - .claude/viber.yml is at schema <n>, newer than this version's <m>: update the viber plugin
```

`<n>`: the project file's column-0 `schema:` number, 0 when absent or not a number. `<m>`: the `schema:` number of `skills/setup/templates/viber.yml` under `CLAUDE_PLUGIN_ROOT`, else relative to the script. The project file: `.claude/viber.yml` at the git top level of the payload's `cwd`, else under `cwd`. Equal numbers, no file, no `cwd` or no readable template -> `viber loaded <version>` alone.

### C6 - issue-templates.sh title pattern line

File: viber/scripts/issue-templates.sh

```
STATUS=ready
REPO=<repository url>
TITLE_PATTERN=<github.issue-title as config.sh prints it>
--- template <path> ---
...
```

### C7 - issue creation script

File: viber/scripts/issue-create.sh

Arguments, stdout (`ISSUE_URL=`, `ISSUE_NUMBER=`, `TYPE=`, `TYPE_ERROR=`) and exit codes 0/1/2 exactly as `scripts/create-issue.sh` today; only the path and the name in its own messages change.

### C8 - shared issue save steps

File: viber/references/issue-save.md

```
Caller names:  directory: .temp/viber/<skill>/
               eligible: bug | non-bug | any
               content: what fills the body
Title:         TITLE_PATTERN with {template-title} = TITLE, {type} = TYPE, {summary} = one-line statement in the user's language
Result:        ISSUE_URL=<url> reported, or no issue
```

### C9 - pr-facts.sh

File: viber/scripts/pr-facts.sh

```
argv: none | --entry <key> | --target <branch>; anything else -> exit 2, nothing on stdout
stdout, exit 0, lines in this order:
STATUS=ready|stop
REASON=no-gh|no-repo|detached|dirty|on-base|pr-exists|no-commits|unknown-entry   (stop only)
PR_URL=<url>                                  (pr-exists only)
REPO=<repository url>
BRANCH=<current branch>
DEFAULT=<default branch>
MODE=off|allowed|required
ENTRY=<work entry key or empty>
TARGET=<branch or empty>
CANDIDATE=<key> | target: <branch>            (0+, only with ENTRY and TARGET empty and MODE not off)
CLOSES=yes|no|                                (empty while TARGET is empty)
TYPE=feat|fix
ISSUE=<n>                                     (0+, ascending, unique)
TEMPLATE=<repo-relative path or empty>
SPEC=<repo-relative path or empty>
TITLE_PATTERN=<github.pr-title>
COMMIT=<short sha> <subject>                  (0+, TARGET..HEAD oldest first)
```

Stop checks in order: no-gh, no-repo, detached, dirty (tracked changes), on-base (BRANCH equals DEFAULT or any entry base or target), unknown-entry (`--entry` naming no entry), pr-exists (an open pull request with head BRANCH), no-commits (TARGET resolvable locally or at the remote and nothing ahead). A stop prints only `STATUS=stop`, `REASON=` and, on `pr-exists`, `PR_URL=`. Entry, never under `MODE=off` (ENTRY and CANDIDATE stay empty there): `--entry`, else the `work:` key of the `docs/<directories.runs>/*/plan.md` whose frontmatter `branch:` equals BRANCH, else the single entry whose `name` pattern matches BRANCH (`{type}` = fix|feature, `{slug}` = `[a-z0-9-]+`, `{issue-number}` = digits); two or more matching entries list those as `CANDIDATE=`, no matching entry lists every entry; `--target` sets TARGET with ENTRY empty. The run: that open run, else the archived run whose `docs/<directories.specifications>/<key>/spec.md` a listed commit touches (the newest such). TYPE: fix when the open run's plan has a `Repro:` line, a matched `{type}` is fix, or BRANCH starts with `fix/` or `hotfix/`; feat otherwise. ISSUE: `Refs: #<n>` footers of the listed commits, the run's `issue:` frontmatter number, a matched `{issue-number}`. TEMPLATE: first existing of `.github/PULL_REQUEST_TEMPLATE/<ENTRY>.md` (only with ENTRY set), `.github/pull_request_template.md`; else empty. SPEC: the run's `spec.md`, else the open run's `plan.md`; empty with no run. CLOSES: yes when TARGET equals DEFAULT.

### C10 - pr-create.sh

File: viber/scripts/pr-create.sh

```
argv: <body file> <title> --base <branch> [--draft]
stdout, exit 0:
PR_URL=https://<host>/<owner>/<repo>/pull/<n>
PR_NUMBER=<n>
PUSHED=<remote>/<branch>
exit 1: one ERROR line on stderr - push failed (nothing created), or gh pr create failed or printed no pull request URL (the branch named as pushed)
exit 2: one ERROR line on stderr - missing body file or title, body file not found, no --base, unknown flag, detached HEAD, gh missing; nothing pushed
```

Remote: `branch.<branch>.remote`, else `origin`. Push: `git push -u <remote> <branch>`. Create: `gh pr create --base <base> --head <branch> --title <title> --body-file <file>` plus `--draft`.

### C11 - create-issue skill frontmatter

File: viber/skills/create-issue/SKILL.md

```
name: create-issue
description: Creates a GitHub issue from the project's issue form templates. Use when the user asks to open an issue, not to fix a bug.
argument-hint: "[what the issue is about]"
allowed-tools: Read, Edit(./.temp/viber/create-issue/**), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/issue-templates.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/issue-create.sh:*)
```

### C12 - pull request title and closing lines

File: viber/skills/create-pr/SKILL.md

```
{type}          TYPE= value (feat | fix)
{summary}       one line stating the change, in the language of the run's specification, else of the conversation
{issue-number}  the first ISSUE= value, empty when none
{entry}         ENTRY= value, empty when none
```

After substitution, runs of blanks collapse to one and the title is trimmed. Closing lines, one per `ISSUE=`, at the end of the body: `Closes #<n>` when `CLOSES=yes`, `Refs #<n>` otherwise.

### C13 - create-pr skill frontmatter

File: viber/skills/create-pr/SKILL.md

```
name: create-pr
description: Opens a pull request for the current branch per the project's branching - title from github.pr-title, body from the work entry's pull request template, after a preview.
allowed-tools: Read, Edit(./.temp/viber/create-pr/**), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/pr-facts.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/pr-create.sh:*)
user-invocable: true
disable-model-invocation: true
```
