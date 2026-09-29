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
