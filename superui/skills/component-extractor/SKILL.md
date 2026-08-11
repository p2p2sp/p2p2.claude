---
name: component-extractor
description: Build the platform component/pattern bundle (DESIGN.components.md, DESIGN.patterns.md, screens/) for one platform (web-app, mobile, or website) from an existing DESIGN.md, at docs/design-system/[<target>/]<platform>/. Invoked from the design-extractor ending loop or by the user command, never spontaneously.
allowed-tools: Read, Write, Glob, Bash(sh:*), Bash(mkdir:*), Bash(rm:*), Skill, Agent, AskUserQuestion
user-invocable: true
argument-hint: <screenshots-dir> <platform> [<target>]
---

# Component Extractor - screenshots plus DESIGN.md to a platform bundle

Turn a directory of UI screenshots and an already-extracted `DESIGN.md` into one platform's
component/pattern bundle: `DESIGN.components.md`, `DESIGN.patterns.md`, `screens/`. Runs both
chained and standalone, for any platform, any number of times against the same `DESIGN.md`.

## Ground rules
- Never do a worker's job inline. This skill measures nothing and authors no satellite file -
  the bundle comes from the builder dispatched in the Handoff step below. The only file it writes
  itself is `<run>/intake-answers.md`, transcribing the user's own answers - `AskUserQuestion`
  only runs in the main context, so intake has to happen here.
- Paths: `<run>` = `.temp/component-extractor/<run-slug>-<platform>/` (scratch, disposable),
  `<run-slug>` = the source directory's basename; `<out>` = `docs/design-system/<platform>/`, or
  `docs/design-system/<target>/<platform>/` when a `<target>` argument was given. `<out>` holds
  the shipped, version-controlled satellites - they do NOT nest under `<run>`.
- Every `args` handoff to a fork (Skill or Agent) is a labeled block, one `label: <value>` per
  line. A path value is a path - never paste file content.

## Step 1 - Intake and gate
1. Screenshots directory: the first argument. Platform: the second argument, one of `web-app`,
   `mobile`, `website` - anything else stops here, before creating any run state, naming the
   three legal values. `<target>`: the optional third argument, taken verbatim - never invent
   one, never ask for one.
2. Screenshots directory absent -> ask via `AskUserQuestion` before doing anything else.
3. Resolve `<design>` = `docs/design-system/DESIGN.md`, or `docs/design-system/<target>/DESIGN.md`
   when `<target>` was given. Glob for it - absent -> hard stop here, before creating any run
   state: name the missing path and point at `/superui:design-extractor` to produce it first.
4. Resolve `<out>` = `docs/design-system/<platform>/`, or `docs/design-system/<target>/<platform>/`
   when `<target>` was given. Non-empty -> STOP and ask via `AskUserQuestion` whether to wipe it
   and rebuild, or abort. Only on an explicit wipe answer remove its contents (`rm -rf <out>`);
   abort ends the skill here, having written nothing. This gate touches this one platform's dir
   only - `DESIGN.md` and any other platform subdir under `docs/design-system/[<target>/]` are
   left untouched.
5. Confirm the screenshots directory exists and holds files. Glob `<dir>/*.png` for sources and
   `<dir>/*.jpg`, `<dir>/*.jpeg`, `<dir>/*.webp`, `<dir>/*.avif` for rejected formats.
   - Directory missing, empty, or holding zero PNGs -> stop here, before creating any run state:
     name what the directory actually holds.
   - Any JPEG/WebP/AVIF present -> stop here, before creating any run state: name every offending
     file and why - JPEG's lossy compression corrupts exact pixel sampling, WebP/AVIF have no
     decoder in this pipeline. This gate is extension-based only: an interlaced PNG passes it by
     design and fails later inside the fork at first decode - that step carries the decoder's
     exit-1 message verbatim into its return, and the Final report surfaces it with the file
     named.
6. Compute `<run-slug>` = the source directory's basename, `<run>` =
   `.temp/component-extractor/<run-slug>-<platform>/`. Already exists (a previous run on this
   same source and platform) -> `rm -rf` it wholesale before any write - never merge, never
   patch; every later step assumes an empty scratch tree.
7. Resolve `<platform-ref>` = `${CLAUDE_PLUGIN_ROOT}/skills/component-extractor/references/<platform>.md`.
8. `mkdir -p <run> <out>`.
9. Report the gate result to the user: source dir, PNG count, platform, `<design>` path,
   `<run>` path, `<out>` path, whether a stale `<run>` was removed and whether `<out>` was wiped
   on the user's answer.

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
`<platform-ref>`, `<run>/intake-answers.md` when step 3 wrote one, and `<run>/inventory.md` as the
output path. GATE: `<run>/inventory.md` exists and is non-empty.

List the user every component, every pattern, every `## Gaps` entry and every inconsistency from
`inventory.md`. An objection to an observed entry, or a struck `## Gaps` entry -> re-dispatch
`component-scout` with the same inputs plus the constraint (an entry to drop, merge, or a gap to
strike), cap two rounds - after that, proceed with the inventory as last returned.

## Handoff - build the platform bundle
Invoke `component-extractor-builder` (Skill tool) with a labeled-args block:
```
run: <run>
out: <out>
source: <source dir>
design: <design>
source-map: <run>/source-map.md
inventory: <run>/inventory.md
platform-ref: <platform-ref>
intake: <run>/intake-answers.md
```
Omit the `intake:` line entirely when step 3 wrote no such file. Relay the builder's return
verbatim - do not re-verify or re-derive any of it.

## Final report
Tell the user: the `<out>` path, the observed-versus-invented component/pattern counts from the
builder's return, every `> NEEDS ATTENTION` spec named for review (invented, not observed - not
measured against a real screen), every `MISSING-TOKENS` entry flagged as a design-system gap
("re-run `/superui:design-extractor` or extend `DESIGN.md`, never hand-edit the satellites"),
every `FINDING:` line and every `> NEEDS INPUT` item from the builder's return, then the next
action - commit the platform bundle: it is a version-controlled deliverable, not scratch.

## Ending
This skill is a leaf - it does not chain further. Nothing after the Final report.

## Contracts
Consumes a screenshots directory path, a platform (`web-app` | `mobile` | `website`), and an
optional `<target>` (positional arguments). Requires `docs/design-system/[<target>/]DESIGN.md` to
already exist. Produces `DESIGN.components.md`, `DESIGN.patterns.md` and `screens/` at
`docs/design-system/[<target>/]<platform>/`.
