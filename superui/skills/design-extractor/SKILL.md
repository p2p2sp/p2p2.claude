---
name: design-extractor
description: Turn a folder of UI screenshots into a Claude Design seed bundle (DESIGN.md plus the DESIGN.components.md / DESIGN.patterns.md spec satellites and canonical screens) at docs/design-system/.
allowed-tools: Read, Write, Glob, Bash(sh:*), Bash(mkdir:*), Bash(rm:*), Skill, Agent, AskUserQuestion
user-invocable: true
disable-model-invocation: true
argument-hint: <screenshots-dir> [<target>]
---

# Design Extractor - screenshots to Claude Design seed bundle

Turn a directory of UI screenshots into the one-shot seed Claude Design consumes to build live,
inline-styled Design Components: `DESIGN.md` (a lean seed - YAML front-matter tokens plus a prose
body), the two consolidated spec satellites `DESIGN.components.md` and `DESIGN.patterns.md`, and
`screens/<file>.png`.

## Ground rules
- Never do a worker's job inline. This skill measures nothing and authors no measured or generated
  artifact - `DESIGN.md`, the two spec satellites, `inventory.md` and `screens/` all come from the
  builder dispatched in the Handoff step below. The only file it writes itself is
  `<run>/intake-answers.md`, transcribing the user's own answers - `AskUserQuestion` only runs in
  the main context, so intake has to happen here.
- Paths: `<run>` = `.temp/design-extractor/<run-slug>/` (scratch, disposable), `<run-slug>` = the
  source directory's basename; `<out>` = `docs/design-system/`, or
  `docs/design-system/<target>/` when a `<target>` argument was given. `<out>` is the shipped,
  version-controlled deliverable - it does NOT nest under `<run>`.
- Every `args` handoff to a fork (Skill or Agent) is a labeled block, one `label: <value>` per
  line. A path value is a path - never paste file content.

## Step 1 - Intake and gate
1. Screenshots directory: the first argument; if absent, ask via `AskUserQuestion` before doing
   anything else. `<target>`: the optional second argument, taken verbatim - never invent one, never
   ask for one.
2. Confirm the directory exists and holds files. Glob `<dir>/*.png` for sources and
   `<dir>/*.jpg`, `<dir>/*.jpeg`, `<dir>/*.webp`, `<dir>/*.avif` for rejected formats.
   - Directory missing, empty, or holding zero PNGs -> stop here, before creating any run state:
     name what the directory actually holds.
   - Any JPEG/WebP/AVIF present -> stop here, before creating any run state: name every offending
     file and why - JPEG's lossy compression corrupts exact pixel sampling, WebP/AVIF have no
     decoder in this pipeline. This gate is extension-based only: an interlaced PNG passes it by
     design and fails later inside the fork at first decode - that step carries the decoder's
     exit-1 message verbatim into its return, and the Final report surfaces it with the file named.
3. Compute `<run-slug>` = the source directory's basename, `<run>` = `.temp/design-extractor/<run-slug>/`,
   `<out>` = `docs/design-system/` (no `<target>`) or `docs/design-system/<target>/` (with one).
4. `<run>` already exists (a previous run on this same source) -> `rm -rf` it wholesale before any
   write - never merge, never patch; every later step assumes an empty scratch tree.
5. Glob `<out>/**`. Any file -> STOP and ask via `AskUserQuestion` whether to wipe it and
   rebuild, or abort. Only on an explicit wipe answer `rm -rf <out>`; abort ends the skill here,
   having written nothing. A bundle is regenerated whole, never merged or patched - so hand edits
   under `<out>` are lost by a rebuild, and the question is the user's only chance to keep them.
6. `mkdir -p <run> <out>`.
7. Report the gate result to the user: source dir, PNG count, `<run>` path, `<out>` path, whether a
   stale `<run>` was removed and whether `<out>` was wiped on the user's answer.

## Step 2 - Source map
Dispatch `superui:source-scout` (Agent tool) with the source directory and `<run>/source-map.md`
as the output path. GATE: `<run>/source-map.md` exists and is non-empty.

## Step 3 - Resolve ambiguities
Read only `<run>/source-map.md`'s `## Ambiguities` section.
- Empty, or the literal `none` -> skip this step entirely, write no intake-answers file.
- Otherwise -> ask the user those questions in prose via `AskUserQuestion`, then write the answers
  to `<run>/intake-answers.md`.

## Step 4 - Inventory
Dispatch `superui:component-scout` (Agent tool) with the source directory, `<run>/source-map.md`,
`<run>/intake-answers.md` when step 3 wrote one, and `<run>/inventory.md` as the output path.
List the returned inventory to the user in this order - components, then patterns, then flagged
inconsistencies - before any spec gets written.
User objects to the inventory -> re-dispatch `component-scout` with its previous `inventory.md`
path plus the objection as an added constraint, capped at two rounds; past that, carry the
standing objection into the Handoff and Final report as a note instead of looping further.

## Handoff - build the bundle
Invoke `design-extractor-builder` (Skill tool) with a labeled-args block:
```
run: <run>
out: <out>
source: <source dir>
source-map: <run>/source-map.md
inventory: <run>/inventory.md
intake: <run>/intake-answers.md
```
Omit the `intake:` line entirely when step 3 wrote no such file. Relay the builder's return
verbatim - do not re-verify or re-derive any of it.

## Final report
Tell the user: the `<out>` bundle path (holding `DESIGN.md`, `DESIGN.components.md`,
`DESIGN.patterns.md` and `screens/`), the component and pattern counts, the count of proposed
(best-practice, unmeasured) values the synthesizer supplied plus how many gaps it resolved versus
left standing, every finding and every `> NEEDS INPUT` item from the builder's return, then the
next action - hand the `<out>/` folder to Claude Design, and commit it: `<out>` is a
version-controlled deliverable, not scratch. Note that values marked `proposed` in
`DESIGN.md` (front matter or body) were invented to best practice, not measured, and should be
reviewed. State plainly that the seed is one-shot input material: iterating in Claude Design
supersedes it, and a changed source means re-running this skill, never patching the bundle by hand.

## Contracts
Consumes a screenshots directory path (first argument, or asked) and an optional `<target>` (second
argument). Produces the seed bundle (`DESIGN.md`, `DESIGN.components.md`, `DESIGN.patterns.md`,
`screens/`) at `docs/design-system/`, or `docs/design-system/<target>/` when `<target>` was given.
