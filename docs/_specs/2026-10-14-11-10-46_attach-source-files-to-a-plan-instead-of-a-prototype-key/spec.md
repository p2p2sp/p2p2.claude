To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Attach source files to a plan instead of a prototype key

## Goal

A plan carries a general list of attachments instead of a single prototype key, so every file under `.temp/` a plan is built from - a prototype mockup, a code-auditor `findings.md` - is copied into the run directory when the plan lands and reaches the archive beside `outcome.md`. Each task that needs one of those files names it itself, so no coder reads a file its task does not need.

## Problem

Today a plan keeps only the accepted prototype mockup (`prototype:` landed as `prototype.html`). A code-auditor `findings.md` that a plan is built from has no route into the plan at all: it stays under `.temp/`, which is scratch space, so the run and its archive lose the source the work answered. The prototype is also handed to every task file, whether the task touches the screen or not.

## Current behaviour

- `viber:prototype` hands off a `Prototype: <path>` line; `viber:intent` carries it to the planner, which writes the frontmatter `prototype:` key.
- `plan-path.sh --land` copies that one file to `<run>/prototype.html`; a draft round without the key removes it.
- `plan-index.sh --split` closes every task file with a `## Prototype` section and commits `prototype.html` with the decomposition.
- `task-coder` and `task-reviewer` read the mockup through that `## Prototype` section.
- `archive-run.sh` drops only `plan.md`, `status.md`, `tasks/` and `work/`, so every other file of the run reaches the archive.
- `code-auditor` ends on the path of `findings.md` and a summary; nothing points onward.
- Plain plan mode has no run directory and no landing.

### Must not change

- A plan with no `attachments:` key lands, splits and archives as it does today, with no `attachments/` directory.
- `plan-path.sh` keeps its answers (`new`, `existing`, `draft`), its exit codes 2 to 6 and its run branch step.
- `archive-run.sh` drops the same scaffolding and moves everything else.

## Behaviour

### S1 - A plan built from a mockup and a findings file lands both [CHANGED - was: only the mockup landed, as prototype.html]

Given an approved plan whose frontmatter names two attachments, a mockup and a findings file under `.temp/`
When the build lands the plan
Then the run directory holds `attachments/` with both files under the names the plan gave them, and the plan lands as before

### S2 - A broken attachment list stops the landing [NEW]

Given a plan whose attachment list repeats a name, or names a file with a slash or a leading dot
When the build lands the plan
Then nothing lands, no run directory is created, and the error names the bad entry

### S3 - The specification lists the attachments, tasks name their own [CHANGED - was: every task file carried the mockup]

Given a landed run holding two attachments
When the plan is split into the specification and task files
Then `spec.md` ends with a list of both files, no task file lists them, and a task whose done condition names `attachments/<name>` reads that file from the run directory

### S4 - The archive keeps the attachments [CHANGED - was: prototype.html was kept]

Given a finished run holding `attachments/` and `outcome.md`
When the run is archived
Then the archive holds `attachments/` beside `outcome.md`

### S5 - Producers hand off attachments [CHANGED - was: only the prototype handed off a Prototype line]

Given a prototype accepted, or `/viber:intent` or `/viber:fixer` started with a path under `.temp/`, or a code audit that confirmed a finding
When the skill hands off or ends
Then the prototype writes an `Attachment:` line, intent and fixer add one per `.temp/` path in their input, and the code audit ends on `/viber:intent <findings path>`

### S6 - Plain plan mode names its source file [NEW]

Given a plan written in Claude Code's own plan mode that rests on a file under `.temp/`
When the plan is written and reviewed
Then the hint asks the plan to name that file's path, the plain plan review checks the file exists, and nothing is copied

### S7 - The planner turns attachment lines into the plan [CHANGED - was: only a Prototype line became a prototype key]

Given a confirmed interview carrying two `Attachment:` lines
When the planner writes the plan and the plan review checks it
Then the plan lists both files under unique names, a task needing one names it in its done condition, and the review blocks a missing entry, a repeated name or a reference to no entry

### Edge cases

- An attachment whose source file is missing -> one warning line, the plan lands without it.
- A draft round landed again with a changed list -> the former round's attachments are replaced; a round with no list removes them.
- The same round landed again (`existing`) -> nothing is copied, a source edited since does not reach the run.
- A plan that still names a mockup the former way, as a prototype key -> ignored, nothing lands for it.
- A Windows source path in `C:/` or `C:\` form -> lands like a POSIX one.
- A split run with no `attachments/` directory -> `spec.md` carries no attachment section.
- `/viber:intent` started from a mockup attachment under `.temp/viber/prototype/` -> no "Prototype first" option on a screen change.

## Glossary

- Attachment - a file under the repository's `.temp/` that a plan is built from, copied into the run under a name the plan gives it; never a tracked repository file, never a directory.

## Acceptance criteria

1. A plan whose frontmatter `attachments:` names two files lands both in `<run>/attachments/<name>`, byte for byte, under the names the plan gives, its frontmatter keeping the source values.
2. A plan with a repeated attachment name, a name that is not one safe file name with an extension, or a malformed entry is refused by `plan-path.sh --land` with the bad entry named and nothing landed.
3. A named source file that is missing is one warning line on stderr; the plan still lands with exit 0.
4. A draft round landed through `into:` replaces the former round's attachments, a round with no `attachments:` removes the directory, and an `existing` answer copies nothing.
5. `plan-index.sh --split` ends `spec.md` with `## Attachments` listing each landed file by repo-relative path, commits `attachments/` with the decomposition, and writes no attachment or prototype section into any task file.
6. Archiving a finished run keeps `attachments/` in the archive beside `outcome.md`.
7. The planner writes `attachments:` from the input's `Attachment:` lines with a unique name per file, carries it over a draft round, and a task needing a file names `attachments/<name>` in its `DoD`; `planner-review` blocks an `Attachment:` line with no entry, a duplicate name and a `DoD` reference to no entry.
8. `viber:prototype` hands off `Attachment: <mockup path>`; `viber:intent` and `viber:fixer` add one `Attachment:` line per `.temp/` path in their input; `viber:intent` offers "Prototype first" only when no attachment comes from `.temp/viber/prototype/`.
9. `viber:code-auditor` with at least one confirmed finding ends on the line `/viber:intent <absolute path of findings.md>`.
10. `task-coder` reads, and `task-reviewer` gates against, the file a `DoD` clause names as `attachments/<name>`, resolved in the run directory.
11. In plain plan mode the hint asks the plan to name the path of the `.temp/` file it rests on, and `plain-plan-review` checks that file exists; nothing is copied.
12. `viber/README.md`, `viber/docs/files.md`, `help.html` (English and Polish), both flow SVGs and `docs/viber-functions.html` describe attachments and name no `prototype.html`, `## Prototype` or `Prototype:` line.
13. A plan carrying a `prototype:` key lands no `prototype.html` and no attachment for it.

## Scope

### File map

- modify - viber/skills/planner/templates/spec-full.md - frontmatter `attachments:` placeholder in place of `prototype:`
- modify - viber/skills/planner/templates/spec-lite.md - the same placeholder
- modify - viber/skills/planner/SKILL.md - filling `attachments:` from `Attachment:` lines, naming, draft carry-over, the `DoD` reference form, stopping on a failed draft landing
- modify - viber/agents/planner-review.md - Faithful check on `Attachment:` lines, unique names, `DoD` references
- modify - viber/scripts/plan-path.sh - parse, validate and land `attachments:` (replaces the prototype landing), exit 7, header contract
- modify - tests/viber/plan-path.test.ts - attachment landing cases in place of the prototype cases
- modify - viber/skills/implementor/SKILL.md - exit 7 among the landing exits that report and stop
- modify - viber/scripts/plan-index.sh - `## Attachments` in `spec.md`, no section in task files, `attachments/` in the decomposition commit, header
- modify - tests/viber/plan-index.test.ts - attachment split cases in place of the prototype cases, header comment
- modify - tests/viber/archive-run.test.ts - archive keeps `attachments/` beside `outcome.md`
- modify - viber/skills/prototype/SKILL.md - `Attachment:` line in the conclusions and the hand-off
- modify - viber/skills/intent/SKILL.md - `Attachment:` lines from `.temp/` input paths, carried to the planner; "Prototype first" condition
- modify - viber/skills/fixer/SKILL.md - `Attachment:` lines in the diagnosis
- modify - viber/skills/code-auditor/SKILL.md - closing `/viber:intent <findings path>` line
- modify - viber/agents/task-coder.md - reading `attachments/<name>` in place of `## Prototype`
- modify - viber/agents/task-reviewer.md - gating against `attachments/<name>` in place of `## Prototype`
- modify - viber/hooks/content/plan-hints.md - plain plan names its `.temp/` source path
- modify - viber/agents/plain-plan-review.md - checks a named `.temp/` source exists
- modify - tests/viber/plan-hints.test.ts - the hint's rule line count
- modify - viber/README.md - prototype and code-auditor paragraphs
- modify - viber/docs/files.md - run directory and archive lists
- modify - viber/skills/setup/assets/help.html - every prototype.html / Prototype line passage and the code-auditor card, both languages
- modify - viber/skills/setup/assets/viber-flow-en.svg - hand-off label
- modify - viber/skills/setup/assets/viber-flow-pl.svg - hand-off label
- modify - docs/viber-functions.html - prototype and run directory items

### Out of scope

- `archive-run.sh` itself: it already moves every file but the scaffolding.
- `viber/scripts/open-page.sh`: it opens the mockup during the prototype conversation, unchanged.
- The `CLAUDE.md` nodes naming the hand-off lines and exit codes (`viber/CLAUDE.md`, `viber/skills/CLAUDE.md`, `viber/scripts/CLAUDE.md`, `viber/agents/CLAUDE.md`, `docs/specs/CLAUDE.md`): the build's memory close updates them (`build.memory` on).
- Backward compatibility with `prototype:`: runs landed before keep their own `prototype.html` and task files.
- Dangling report paths in `findings.md`'s `## Further findings`.
- Copying directories as attachments.
- Archived runs under `docs/specs/`.

## Solution requirements

- Every script change works on Windows (Git Bash) and on macOS's own bash, with no heredoc.
- A Windows source path in either drive form lands the same as a POSIX one, as the prototype landing did.
- Every shipped text stays in English, says what holds now and uses no em or en dash.
