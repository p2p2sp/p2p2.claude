---
source: C:/Projects/p2p2.claude/docs/_specs/2026-09-29-09-37-31_split-intents-that-keep-every-part-s-decisions-in-viber/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# Split intents that keep every part's decisions in viber

## Goal

Make a split planning interview a purely mechanical cut of one specification: `intent` discusses every part up front, the decisions of the later parts survive in a `roadmap.md` a script writes into the run directory, and each finished build names the next part so its interview resumes from those decisions instead of starting over.

## Problem

When a request is too large for one plan, `intent` proposes a split into parts, then interviews only the first one ("The rest wait for their own cycle"). The user wanted to discuss the whole thing; the split exists only so the planner, its reviewer and one build session each handle fewer tasks. What the conversation said about the later parts is lost: the plan keeps one line per part in `## Roadmap`, nothing persists their decisions, nothing reminds the user that a next part exists once the build ends, and `intent` has no way to resume from a roadmap. The user re-explains every later part from memory, or forgets one.

## Current behaviour

`intent` sizes the scope, splits only "several independent subsystems", interviews the first part and closes on a summary opening with a one-line-per-part roadmap. `planner` writes that roadmap into `## Roadmap` (entries marked `(built)` / `(this plan)`) and repeats later entries under `### Out of scope`. `plan-index.sh --split` copies everything above `## Tasks`, the roadmap included, into `spec.md`. The implementor's final summary says nothing about later parts, and `intent` resumes only a draft plan, never a roadmap. The rule that a part boundary is not a delivery (no stub, mock or stand-in) already exists in both skills.

### Must not change

- A plan with no `## Roadmap` section decomposes into exactly today's `spec.md`, task files and index, with no `next:` line and no `roadmap.md`.
- The decomposition commit still names only the paths `--split` writes, never a `work/` trail file.
- The ban on stubs, mocks and temporary stand-ins for what a later part brings.

## Behaviour

### S1 - The interview covers every part [CHANGED - was: only the first part was interviewed]

A request too large for one plan gets a proposed split into ordered parts. Once the user accepts it, the interview walks through every part, not only the first. A question whose answer depends on code an earlier part has not written yet is recorded as an unknown resolved at the start of that part. The summary opens with the roadmap, each later part followed by its settled decisions.

Given a request the user accepts splitting into three parts
When the interview runs
Then it asks about all three parts and the summary lists the decisions of parts 2 and 3 under their entries

### S2 - A part is never a release [CHANGED - was: split justified by independent subsystems]

The split is mechanical: it keeps each plan, its review and one build session small. No part is deployed on its own, so the interview never asks what works between parts, and no plan criterion requires a working application between them.

Given an accepted split
When a later part brings something an earlier part would call
Then the earlier part names it out of scope and nothing substitutes for it

### S3 - The roadmap is written beside the specification [NEW]

Given a landed plan carrying a `## Roadmap` section
When the build decomposes it
Then `roadmap.md` in the run directory holds that section, `spec.md` does not, and both are in the decomposition commit

### S4 - The build names the next part [NEW]

Given a plan whose roadmap has a part after the one marked `(this plan)`
When the build finishes without abort
Then its final summary names `/viber:intent <path>/roadmap.md`, the path being the archive when the run was archived, else the run directory

### S5 - The next part resumes from the roadmap [NEW]

Given a `roadmap.md` the user points `/viber:intent` at
When the interview starts
Then the decisions listed under the next part cost no question, and it asks only what the earlier builds changed and the unknowns left for that part

### Edge cases

- The last part of a roadmap -> no `next:` line, no next-part line in the summary.
- A build ending on abort -> no next-part line, even with a `next:` line.
- `cleanup` off, or an archive that did not land -> the path is the run directory.
- A plan with no `## Roadmap` -> no `roadmap.md` appears, and the build decomposes and commits exactly as today.

## Glossary

- part - one piece of a split specification, planned and built in its own run; never a release and never deployed alone.
- `roadmap.md` - the file in the run directory, and later in its archive, holding the ordered parts, which ones are built, which one this run builds, and the settled decisions of the parts still to come.
- next part - the roadmap entry right after the one marked `(this plan)`.

## Acceptance criteria

1. On an accepted split, `intent` interviews every part in order; a question depending on code an earlier part writes becomes an unknown resolved at the start of that part; the split summary may run 15 lines plus up to 5 per later part.
2. `intent` splits a scope too large for one plan as a mechanical cut, and both `intent` and `planner` state a part is never a release: no stub, mock or stand-in, no criterion needing a working application between parts, and `intent` never asks what works between parts.
3. `planner` writes every later roadmap entry with its settled decisions as indented lines, in the shape both spec templates carry; a plan continuing a roadmap marks the earlier entries `(built)` and moves its own entry's decisions into its specification.
4. `plan-index.sh --split` writes the plan's `## Roadmap` section into `<dir>/roadmap.md`, leaves it out of `spec.md`, and commits it with the decomposition; a plan with no such section writes no `roadmap.md`.
5. A run directory's `roadmap.md` reaches the archive `archive-run.sh` writes.
6. The `plan-index.sh` index prints `next: part <n> of <N> - <name>` exactly when the roadmap holds an entry after the one marked `(this plan)`, and prints no such line otherwise.
7. `implementor`, on an index carrying `next:` and a build not ended on abort, closes its final summary on `/viber:intent <archive path>/roadmap.md` when the archive landed, else `/viber:intent <dir>/roadmap.md`.
8. `intent` resumes a `roadmap.md` the user points at: the next part's listed decisions are settled, it asks only what earlier builds changed and that part's open unknowns, and its summary carries the `Roadmap:` line naming that file.
9. The help page describes the whole-scope split interview, `roadmap.md` in the run directory and the next-part step, `tests/viber/help.test.ts` stays green, and neither viber's README nor either flow diagram still says only the first part is interviewed.

## Scope

### File map

- modify - viber/skills/planner/templates/spec-full.md - the Roadmap section shape with per-part decisions
- modify - viber/skills/planner/templates/spec-lite.md - the same Roadmap section shape
- modify - viber/scripts/plan-index.sh - cuts the Roadmap into roadmap.md, prints the next: line, header contract
- modify - tests/viber/plan-index.test.ts - template shape, roadmap cut and next: line tests
- modify - tests/viber/archive-run.test.ts - roadmap.md reaches the archive
- modify - viber/skills/planner/SKILL.md - roadmap with decisions, continuing a roadmap, part is no release
- modify - viber/skills/intent/SKILL.md - mechanical split, whole-scope interview, resume from roadmap.md, summary cap
- modify - viber/skills/implementor/SKILL.md - carries next: to the final summary as the next-part command
- modify - viber/skills/setup/assets/help.html - split, run directory and intent card text in both languages
- modify - viber/README.md - the split paragraph
- modify - viber/skills/setup/assets/viber-flow-en.svg - the intent node's split line
- modify - viber/skills/setup/assets/viber-flow-pl.svg - the intent node's split line

### Out of scope

- `closeout`, `archive-run.sh` code and every agent: no `NEXT:` line anywhere.
- `intent` searching the repository for a `roadmap.md` on its own.
- `.temp/` as the roadmap's carrier.
- Any change to `qa`, `final-review` or `e2e` for a run that builds one part.
- `viber/CLAUDE.md` and `viber/CLAUDE.plan-format.md`: the `memory` switch is on, so the build's memory close records the `next:` index line in the "Orchestrator contract" section and `roadmap.md` in "The run directory" section.

## Constraints

- Every script change works under Git Bash on Windows and under macOS's bash 3.2.
- `roadmap.md` is written only by `plan-index.sh`, never by a model.
- The `next:` line and the implementor's reading of it change together.
- Skill text stays short: each rule is extended in its existing sentence rather than added beside it.

## Tasks

<!-- TASK -->
### T1 - Give the Roadmap template section per-part decisions
- TDD: none
- Covers: #3
- Uses: C2
- Depends-on: none
- Files: viber/skills/planner/templates/spec-full.md, viber/skills/planner/templates/spec-lite.md, tests/viber/plan-index.test.ts
- Delivers: both spec templates carry the same Roadmap section in the C2 shape, a guidance comment saying the section is cut into roadmap.md and each later part lists its settled decisions, plus a test asserting both templates hold that shape.
- Verification: node --test --test-name-pattern "Roadmap shape" tests/viber/plan-index.test.ts -> the new test passes, 0 fail
- DoD: spec-full.md and spec-lite.md each hold a numbered entry ending in `(this plan)` and an indented `- ` decision line under a later entry; a test named with "Roadmap shape" in tests/viber/plan-index.test.ts asserts both templates hold that shape and passes
<!-- /TASK -->

<!-- TASK -->
### T2 - Cut the Roadmap into roadmap.md on split
- TDD: required
- Covers: #4
- Uses: C2
- Depends-on: T1
- Files: viber/scripts/plan-index.sh, tests/viber/plan-index.test.ts
- Delivers: --split writes the `## Roadmap` section, HTML comments dropped, into `<dir>/roadmap.md`, leaves it out of spec.md, and adds roadmap.md to the decomposition commit pathspec only when it exists; the header documents the new file.
- Verification: node --test tests/viber/plan-index.test.ts -> all tests pass, 0 fail
- DoD: a plan with a Roadmap section yields roadmap.md holding that section and a spec.md without it; roadmap.md is in the decomposition commit; a plan without the section yields no roadmap.md and the same spec.md as before; the plan-index.sh header names roadmap.md among the --split outputs
<!-- /TASK -->

<!-- TASK -->
### T3 - Print the next part in the plan index
- TDD: required
- Covers: #6
- Uses: C1, C2
- Depends-on: T2
- Files: viber/scripts/plan-index.sh, tests/viber/plan-index.test.ts
- Delivers: the index prints the C1 `next:` line when the roadmap has an entry after the one marked `(this plan)`, and the header's stdout block documents it.
- Verification: node --test tests/viber/plan-index.test.ts -> all tests pass, 0 fail
- DoD: a roadmap with an entry after `(this plan)` prints `next: part <n> of <N> - <name>` with the markers stripped from the name, between the decision lines and the tasks line; a roadmap whose `(this plan)` entry is last prints no next line; a plan with no Roadmap prints no next line; the header stdout block lists the next line
<!-- /TASK -->

<!-- TASK -->
### T4 - Prove roadmap.md reaches the archive
- TDD: none
- Covers: #5
- Uses: none
- Depends-on: none
- Files: tests/viber/archive-run.test.ts
- Delivers: a test seeding a run directory with roadmap.md and asserting the archive holds it after archive-run.sh.
- Verification: node --test tests/viber/archive-run.test.ts -> all tests pass, 0 fail
- DoD: a test in tests/viber/archive-run.test.ts seeds roadmap.md in the run directory and asserts the archive directory lists it after archive-run.sh; that test passes
<!-- /TASK -->

<!-- TASK -->
### T5 - Teach the planner to carry the roadmap decisions forward
- TDD: none
- Covers: #2, #3
- Uses: C2, C3
- Depends-on: T2
- Files: viber/skills/planner/SKILL.md
- Delivers: the roadmap paragraph lists every later entry's settled decisions as indented lines, reads the file an input `Roadmap:` line names, marks earlier entries `(built)`, moves its own entry's decisions into the specification, and states a part is never a release, no criterion needing a working application between parts.
- Verification: grep -c "roadmap.md" viber/skills/planner/SKILL.md viber/scripts/plan-index.sh -> a count of at least 1 for each file
- DoD: planner/SKILL.md names indented decision lines under every later roadmap entry; it still repeats every later entry under `### Out of scope`; it names the input `Roadmap:` line and roadmap.md as the file read on a continuing part; it names marking earlier entries `(built)` and moving its own entry's decisions into the specification; it states no criterion needs a working application between parts
<!-- /TASK -->

<!-- TASK -->
### T6 - Make the intent split mechanical and the interview whole
- TDD: none
- Covers: #1, #2, #8
- Uses: C2, C3
- Depends-on: T2
- Files: viber/skills/intent/SKILL.md
- Delivers: the scope sizing splits a scope too large for one plan as a mechanical cut whose parts are never releases, the interview covers every part with earlier-code questions recorded as unknowns for their part, the split summary cap grows by 5 lines per later part carrying its decisions, and the returning section resumes a pointed roadmap.md, closing on the C3 line.
- Verification: grep -c "roadmap.md" viber/skills/intent/SKILL.md viber/scripts/plan-index.sh -> a count of at least 1 for each file
- DoD: intent/SKILL.md no longer holds "interview the FIRST subproject only"; it states the split is mechanical and a part is never a release, and that it never asks what works between parts; it states every part is interviewed and a question hanging on an earlier part's code becomes an unknown for that part; it states the split summary cap of 15 lines plus up to 5 per later part; its returning section resumes a roadmap.md with the next part's decisions settled and closes on the `Roadmap:` line
<!-- /TASK -->

<!-- TASK -->
### T7 - Name the next part at the end of a build
- TDD: none
- Covers: #7
- Uses: C1, C2
- Depends-on: T3
- Files: viber/skills/implementor/SKILL.md
- Delivers: the index list of step 2 carries a `next:` line to the end of the build, which adds one line after the final summary, outside its 7: `/viber:intent <archive path>/roadmap.md` or `/viber:intent <dir>/roadmap.md`, and none after an abort.
- Verification: grep -c "next: part" viber/skills/implementor/SKILL.md viber/scripts/plan-index.sh -> a count of at least 1 for each file
- DoD: implementor/SKILL.md step 2 names the `next: part` index line; step 7 adds the next-part line after the final summary, outside its 7 lines; that line names `/viber:intent` with the archive path when the archive landed and `<dir>` otherwise; it names no next-part line after an abort
<!-- /TASK -->

<!-- TASK -->
### T8 - Describe the whole-scope split and roadmap in the user docs
- TDD: none
- Covers: #9
- Uses: C2
- Depends-on: T3
- Files: viber/skills/setup/assets/help.html, viber/README.md, viber/skills/setup/assets/viber-flow-en.svg, viber/skills/setup/assets/viber-flow-pl.svg
- Delivers: the help page's large-requests bullet, run directory section and intent card state, in English and Polish, that every part is interviewed, that `roadmap.md` sits in the run directory and archive, and that a finished build names the next part; the README split paragraph and both flow diagrams' intent line say every part is discussed.
- Verification: node --test tests/viber/help.test.ts && grep -c "roadmap.md" viber/skills/setup/assets/help.html viber/scripts/plan-index.sh && ! grep -n -e "first part only" -e "bierze pierwszą" viber/README.md viber/skills/setup/assets/viber-flow-en.svg viber/skills/setup/assets/viber-flow-pl.svg -> all tests pass, a count of at least 1 for each file, and the last grep prints nothing
- DoD: help.html no longer says only the first part is interviewed, in either language; its run directory section names roadmap.md in both languages; its intent card names the next-part step in both languages; tests/viber/help.test.ts passes; viber/README.md no longer says the interview covers the first part only; viber-flow-en.svg no longer says "first part only"; viber-flow-pl.svg no longer says "bierze pierwszą"
<!-- /TASK -->

## Contracts

### C1 - Index next-part line

File: viber/scripts/plan-index.sh

```
next: part <n> of <N> - <name>
```

- Printed at most once, after the `decision:` lines and before the `tasks:` line.
- `<n>`: 1-based position, among the Roadmap's numbered entries, of the entry right after the one marked `(this plan)`; `<N>`: count of numbered entries; `<name>`: that entry's text with a trailing `(built)` or `(this plan)` marker removed, trimmed.
- Absent when there is no `## Roadmap`, no `(this plan)` entry, or no entry after it.

### C2 - Roadmap section and roadmap.md

File: viber/skills/planner/templates/spec-full.md, viber/skills/planner/templates/spec-lite.md

Under the level-2 heading `Roadmap`:

```
Part <n> of <N> - <this part>

1. <part> (built)
2. <part> (this plan)
3. <part>
   - <decision settled for this part>
```

- Entries: lines matching `^[0-9]+\. `, in build order; marker `(built)` or `(this plan)` at the end of the line.
- Decision lines: indented `- ` lines under a later entry.
- The section runs from its heading to the line before the next `## ` heading.
- `<dir>/roadmap.md`: that section, heading included, HTML comments dropped, written by `plan-index.sh --split`; `spec.md` holds no line of it.

### C3 - Roadmap handoff line

File: none

```
Roadmap: <repo-relative path of roadmap.md>
```

- One line in a confirmed `intent` summary that resumes a roadmap; `planner` reads the named file.
