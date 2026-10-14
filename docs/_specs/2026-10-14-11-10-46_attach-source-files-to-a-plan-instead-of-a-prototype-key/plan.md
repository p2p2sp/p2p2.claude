---
source: C:/Projects/p2p2.claude/docs/_specs/2026-10-14-11-10-46_attach-source-files-to-a-plan-instead-of-a-prototype-key/plan.md
---

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

## Tasks

<!-- TASK -->
### T1 - Define the attachments frontmatter in the planner
- TDD: none
- Covers: #7
- Uses: C1, C2, C4
- Depends-on: none
- Files: viber/skills/planner/templates/spec-full.md, viber/skills/planner/templates/spec-lite.md, viber/skills/planner/SKILL.md, viber/agents/planner-review.md
- Delivers: both spec templates carry the `attachments:` placeholder instead of `prototype:`; the planner fills it from the input's `Attachment:` lines with a unique name per file (the source file name, changed only to avoid a repeat), carries it over a draft round, and has a task needing a file name `attachments/<name>` in its `DoD`; `planner-review`'s Faithful check blocks an `Attachment:` line with no entry, a repeated name and a `DoD` reference to no entry.
- Verification: `grep -n "^attachments:" viber/skills/planner/templates/spec-full.md viber/skills/planner/templates/spec-lite.md; grep -n "attachments/<name>" viber/skills/planner/SKILL.md viber/agents/planner-review.md; grep -n "Attachment:" viber/skills/planner/SKILL.md viber/agents/planner-review.md; grep -c "^prototype:" viber/skills/planner/templates/spec-full.md viber/skills/planner/templates/spec-lite.md; grep -c "Prototype:\|## Prototype\|\`prototype:\`" viber/skills/planner/SKILL.md viber/agents/planner-review.md` -> the first three list hits in every file they name, the last two print 0 for each file
- DoD: both templates hold the `attachments:` block of C1 and no `prototype:` line; `planner/SKILL.md` states the `attachments:` entries come only from `Attachment:` lines, one unique name each ending in the file extension, carried over a draft round; `planner/SKILL.md` states a task needing an attachment names `attachments/<name>` in its `DoD` and no longer names `## Prototype`; `planner/SKILL.md` step 4 reports the stderr reason and stops on a non-zero exit of the draft landing; `planner-review.md` Faithful blocks an `Attachment:` line with no matching entry, a repeated name and an `attachments/<name>` reference to a name the map does not hold
<!-- /TASK -->

<!-- TASK -->
### T2 - Land the plan's attachments into the run directory
- TDD: required
- Covers: #1, #2, #3, #4, #13
- Uses: C1, C5
- Depends-on: T1
- Files: viber/scripts/plan-path.sh, tests/viber/plan-path.test.ts, viber/skills/implementor/SKILL.md
- Delivers: `implementor`'s landing step lists exit 7 among the exits it reports and stops on; `plan-path.sh --land` reads the copy's `attachments:` map, refuses an unusable one with exit 7 before the branch step and before any write, copies each source into `<run>/attachments/<name>` on every copy (new run or draft round), replaces or removes a former round's directory, warns on a missing or failed copy, and ignores a `prototype:` key; the header contract documents all of it.
- Verification: `bash -n viber/scripts/plan-path.sh && node --test --test-name-pattern "attachment|prototype" tests/viber/plan-path.test.ts && grep -n "(2, 4, 5, 7)" viber/skills/implementor/SKILL.md && grep -n "exit 7\|7 - " viber/scripts/plan-path.sh` -> syntax check clean, every matching case passes, none fails, both greps hit
- DoD: a plan naming two attachments lands both under `<run>/attachments/<name>` byte for byte while the landed frontmatter keeps the source values; on Windows a `C:/` and a `C:\` source path land too; a repeated name exits 7 with empty stdout and no run directory created; a name with a slash, a `..`, a leading dot or no file extension (such as `issue`) exits 7 the same way; an entry with no path and an `attachments:` line carrying a value each exit 7 the same way; a missing source prints exactly one `warning:` line, lands the plan and exits 0 with stdout unchanged; an `into:` draft round replaces the former round's attachments with its own; an `into:` draft round with no `attachments:` removes the former `attachments/` directory; landing the same round again answers `existing` and copies nothing; a plan carrying a `prototype:` key lands neither `prototype.html` nor `attachments/`; a plan with no `attachments:` lands only `plan.md`; `implementor/SKILL.md` names 7 beside 2, 4 and 5 as exits that report the stderr reason and stop
<!-- /TASK -->

<!-- TASK -->
### T3 - List the attachments in the specification, not in task files
- TDD: required
- Covers: #5
- Uses: C3
- Depends-on: none
- Files: viber/scripts/plan-index.sh, tests/viber/plan-index.test.ts
- Delivers: `plan-index.sh --split` ends `spec.md` with the `## Attachments` section of C3 when `<run>/attachments/` holds files, writes no attachment or prototype section into task files, and stages `attachments/` in the decomposition commit; the header and the test file header describe that.
- Verification: `bash -n viber/scripts/plan-index.sh && node --test --test-name-pattern "attachment|Attachments|prototype|Prototype" tests/viber/plan-index.test.ts` -> syntax check clean, every matching case passes, none fails
- DoD: the prototype cases of `plan-index.test.ts` are rewritten as attachment cases, the file header describing `## Attachments` in `spec.md` instead of `## Prototype` in task files; `--split` over a run whose `attachments/` holds two files ends `spec.md` with `## Attachments` and both repo-relative paths sorted by name; `--split` over a run with no `attachments/` writes no such section; no task file carries `## Attachments` or `## Prototype`, with or without attachments; the decomposition commit includes every file under `attachments/`
<!-- /TASK -->

<!-- TASK -->
### T4 - Prove the archive keeps the attachments
- TDD: none
- Covers: #6
- Uses: none
- Depends-on: none
- Files: tests/viber/archive-run.test.ts
- Delivers: an archive case where a finished run holding `attachments/<name>` and `outcome.md` is archived and both arrive in the archive, committed.
- Verification: `node --test --test-name-pattern "attachments" tests/viber/archive-run.test.ts` -> the new case passes
- DoD: archiving a finished run holding `attachments/<name>` and `outcome.md` leaves both under the archive directory; the archive commit includes the attachment file
<!-- /TASK -->

<!-- TASK -->
### T5 - Hand off attachments from prototype, intent, fixer and code-auditor
- TDD: none
- Covers: #8, #9
- Uses: C2
- Depends-on: T1
- Files: viber/skills/prototype/SKILL.md, viber/skills/intent/SKILL.md, viber/skills/fixer/SKILL.md, viber/skills/code-auditor/SKILL.md
- Delivers: the prototype's conclusions and hand-off carry `Attachment: <mockup path>`; intent adds one `Attachment:` line per `.temp/` path its arguments name and carries every such line into the summary it hands the planner; intent's "Prototype first" option needs no attachment from `.temp/viber/prototype/`; the fixer diagnosis carries one `Attachment:` line per `.temp/` path in its input; code-auditor, with at least one confirmed finding, ends its run on `/viber:intent <absolute path of findings.md>`.
- Verification: `grep -n "Attachment:" viber/skills/prototype/SKILL.md viber/skills/intent/SKILL.md viber/skills/fixer/SKILL.md viber/skills/planner/SKILL.md; grep -n "/viber:intent" viber/skills/code-auditor/SKILL.md; grep -c "Prototype:" viber/skills/prototype/SKILL.md viber/skills/intent/SKILL.md` -> the first lists hits in all four files, the second one hit, the third 0 for both
- DoD: `prototype/SKILL.md` writes and prints `Attachment: <the mockup path>` and no `Prototype:` line; `intent/SKILL.md` adds an `Attachment:` line for each `.temp/` path its arguments name and carries every `Attachment:` line verbatim into the hand-off summary; `intent/SKILL.md` offers "Prototype first" only when no `Attachment:` line names a file under `.temp/viber/prototype/`; `fixer/SKILL.md` lists an `Attachment:` line per `.temp/` path of its input in the diagnosis; `code-auditor/SKILL.md` ends a run with a confirmed finding on `/viber:intent <absolute path of findings.md>`
<!-- /TASK -->

<!-- TASK -->
### T6 - Resolve attachments in the task coder and task reviewer
- TDD: none
- Covers: #10
- Uses: C3, C4
- Depends-on: T3
- Files: viber/agents/task-coder.md, viber/agents/task-reviewer.md
- Delivers: `task-coder` reads the file a `DoD` clause names as `attachments/<name>`, in the run directory that holds its `tasks/` directory (or listed under `## Attachments` of `spec`), and matches it; `task-reviewer` gates such a clause against that file; neither names `## Prototype`.
- Verification: `grep -n "attachments/" viber/agents/task-coder.md viber/agents/task-reviewer.md viber/scripts/plan-index.sh; grep -c "## Prototype" viber/agents/task-coder.md viber/agents/task-reviewer.md` -> the first lists hits in all three files, the second 0 for both
- DoD: `task-coder.md` states a `DoD` clause naming `attachments/<name>` refers to that file in the run directory and the task reads it; `task-reviewer.md` states such a clause is gated against that file; neither file names `## Prototype`
<!-- /TASK -->

<!-- TASK -->
### T7 - Name the source file in a plain plan
- TDD: none
- Covers: #11
- Uses: none
- Depends-on: none
- Files: viber/hooks/content/plan-hints.md, viber/agents/plain-plan-review.md, tests/viber/plan-hints.test.ts
- Delivers: the plain plan mode hint gains a fifth rule line asking the plan to name the absolute path of every `.temp/` file it rests on; `plain-plan-review` treats such a named path that does not exist as a Blocking finding; the hint test expects five rule lines; nothing is copied.
- Verification: `node --test tests/viber/plan-hints.test.ts && grep -n "\.temp/" viber/hooks/content/plan-hints.md viber/agents/plain-plan-review.md` -> every case passes, the grep hits both files
- DoD: `plan-hints.md` carries a fifth `- ` rule line asking the plan to name the absolute path of each `.temp/` file it rests on, with neither the word `viber` nor `skip` in it; `plain-plan-review.md` raises a named `.temp/` path that does not exist as Blocking; `plan-hints.test.ts` expects exactly five rule lines, names the fifth rule in its header comment and passes
<!-- /TASK -->

<!-- TASK -->
### T8 - Describe attachments in the user documentation
- TDD: none
- Covers: #12
- Uses: none
- Depends-on: T2, T3, T5
- Files: viber/README.md, viber/docs/files.md, viber/skills/setup/assets/help.html, viber/skills/setup/assets/viber-flow-en.svg, viber/skills/setup/assets/viber-flow-pl.svg, docs/viber-functions.html
- Delivers: the guide, the files reference, the help page in both languages, both flow diagrams and the functions page describe attachments (what becomes one, where it lands, `spec.md`'s list, the archive, the code-auditor next step) and no longer name `prototype.html`, `## Prototype` or a `Prototype:` line.
- Verification: `node --test tests/viber/help.unit.test.ts && grep -c "prototype\.html\|## Prototype\|Prototype:" viber/README.md viber/docs/files.md viber/skills/setup/assets/help.html viber/skills/setup/assets/viber-flow-en.svg viber/skills/setup/assets/viber-flow-pl.svg docs/viber-functions.html; grep -n "attachments/" viber/skills/setup/assets/help.html viber/docs/files.md viber/scripts/plan-path.sh; grep -n "## Attachments" viber/skills/setup/assets/help.html viber/scripts/plan-index.sh; grep -n "/viber:intent" viber/skills/code-auditor/SKILL.md` -> the help test passes, every count is 0, each later grep hits every file it names
- DoD: `viber/README.md` says a prototype mockup and a findings file travel with the plan as attachments and that code-auditor names the `/viber:intent` next step; `viber/docs/files.md` lists `attachments/` in the run directory and in the archive; `help.html` describes attachments, `spec.md`'s `## Attachments` list included, in matching English and Polish spans and passes `tests/viber/help.unit.test.ts`; both flow SVGs label the hand-off `Attachment:`; `docs/viber-functions.html` names attachments in place of the `## Prototype` section; none of the six files names `prototype.html`, `## Prototype` or `Prototype:`
<!-- /TASK -->

## Contracts

### C1 - Plan frontmatter attachments map

File: viber/skills/planner/templates/spec-full.md, viber/skills/planner/templates/spec-lite.md

```
attachments:
  <name>: <absolute source path, C:/, C:\ or POSIX form>
```

- `attachments:` stands alone on its frontmatter line, nothing after the colon; the key is absent when the input carries no `Attachment:` line.
- One entry per line, indented by at least one space; the map ends at the first frontmatter line not indented.
- An entry splits at its first `:`; `<name>` matches `^[A-Za-z0-9][A-Za-z0-9_-]*(\.[A-Za-z0-9_-]+)+$` (a file name with an extension, so never a frontmatter key such as `issue`) and is unique within the map; the path after it is non-empty.

### C2 - Attachment hand-off line

File: none

```
Attachment: <absolute path, forward slashes, a Windows drive as C:/>
```

- One line per file, written by `viber:prototype`, `viber:intent` or `viber:fixer`, carried verbatim into the planner's input; only a path under the repository's `.temp/`.

### C3 - Specification attachments section

File: viber/scripts/plan-index.sh

- A heading line `## Attachments`, then one line `<repo-relative run directory>/attachments/<name>` per file present in `<run>/attachments/`, sorted by name.
- It closes `spec.md` as `--split` writes it; absent when that directory is missing or holds no file.

### C4 - Task reference to an attachment

File: none

- `attachments/<name>` inside a `DoD` clause, `<name>` a key of the `attachments:` map; it resolves against the run directory, the parent of the `tasks/` directory holding the task file.

### C5 - Attachment landing outcomes

File: viber/scripts/plan-path.sh

- exit 7: `error: unusable attachments: <reason>` on stderr, `<reason>` one of `duplicate name <name>`, `invalid name <name>`, `entry without a path: <name>`, `attachments: carries a value`; stdout empty, nothing copied, no run directory created, HEAD, index and tree unchanged; checked before the run branch step on every `--land`.
- exit 0 with one stderr line each: `warning: attachment not found, not landed: <path>`, `warning: could not copy attachment <name>`, `warning: could not remove <run>/attachments`.
