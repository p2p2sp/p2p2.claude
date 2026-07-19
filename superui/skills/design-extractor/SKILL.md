---
name: design-extractor
description: Turn a folder of UI screenshots into a Claude Design handoff bundle (design.md, inventory.md, component and pattern specs, canonical screens, meta.yml, handoff.zip).
allowed-tools: Read, Write, Glob, Bash(sh:*), Bash(mkdir:*), Bash(rm:*), Skill, Agent, AskUserQuestion
user-invocable: true
disable-model-invocation: true
argument-hint: <screenshots-dir>
---

# Design Extractor — screenshots to Claude Design handoff bundle

Turn a directory of UI screenshots into the handoff bundle Claude Design consumes to build live,
inline-styled Design Components: `design.md`, `inventory.md`, `components/<slug>.md`,
`patterns/<slug>.md`, `screens/<file>.png`, `meta.yml`, optional `intake-answers.md`, packed
alongside as `handoff.zip`.

## Ground rules
- Never do a worker's job inline. This skill measures nothing and authors no measured or generated
  artifact — `design.md`, every spec, `inventory.md`, `screens/`, `meta.yml` and the zip all come
  from the builder dispatched in the Handoff step below. The only file it writes itself is
  `<run>/intake-answers.md`, transcribing the user's own answers — `AskUserQuestion` only runs in
  the main context, so intake has to happen here.
- Paths: `<run>` = `.temp/design-extractor/<run-slug>/`, `<run-slug>` = the source directory's
  basename; `<out>` = `<run>/handoff/`.
- Every `args` handoff to a fork (Skill or Agent) is a labeled block, one `label: <value>` per
  line. A path value is a path — never paste file content.

## Step 1 — Intake and gate
1. Screenshots directory: take it from the arguments; if absent, ask via `AskUserQuestion` before
   doing anything else.
2. Confirm the directory exists and holds files. Glob `<dir>/*.png` for sources and
   `<dir>/*.jpg`, `<dir>/*.jpeg`, `<dir>/*.webp`, `<dir>/*.avif` for rejected formats.
   - Directory missing, empty, or holding zero PNGs -> stop here, before creating any run state:
     name what the directory actually holds.
   - Any JPEG/WebP/AVIF present -> stop here, before creating any run state: name every offending
     file and why — JPEG's lossy compression corrupts exact pixel sampling, WebP/AVIF have no
     decoder in this pipeline. This gate is extension-based only: an interlaced PNG passes it by
     design and fails later inside the fork at first decode — that step carries the decoder's
     exit-1 message verbatim into its return, and the Final report surfaces it with the file named.
3. Compute `<run-slug>` = the source directory's basename, `<run>` = `.temp/design-extractor/<run-slug>/`,
   `<out>` = `<run>/handoff/`.
4. `<out>` already exists (a previous run on this same source) -> `rm -rf` it wholesale before any
   write — never merge, never patch; every later step assumes an empty output tree.
5. `mkdir -p <out>` — creates both `<run>` and `<out>` in one call, since `<out>` nests under
   `<run>`.
6. Report the gate result to the user: source dir, PNG count, `<run>` path, whether a stale `<out>`
   was removed.

## Step 2 — Source map
Dispatch `superui:source-scout` (Agent tool) with the source directory and `<run>/source-map.md`
as the output path. GATE: `<run>/source-map.md` exists and is non-empty.

## Step 3 — Resolve ambiguities
Read only `<run>/source-map.md`'s `## Ambiguities` section.
- Empty, or the literal `none` -> skip this step entirely, write no intake-answers file.
- Otherwise -> ask the user those questions in prose via `AskUserQuestion`, then write the answers
  to `<run>/intake-answers.md`.

## Step 4 — Inventory
Dispatch `superui:component-scout` (Agent tool) with the source directory, `<run>/source-map.md`,
`<run>/intake-answers.md` when step 3 wrote one, and `<run>/inventory.md` as the output path.
List the returned inventory to the user in this order — components, then patterns, then flagged
inconsistencies — before any spec gets written.
User objects to the inventory -> re-dispatch `component-scout` with its previous `inventory.md`
path plus the objection as an added constraint, capped at two rounds; past that, carry the
standing objection into the Handoff and Final report as a note instead of looping further.

## Handoff — build the bundle
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
verbatim — do not re-verify or re-derive any of it.

## Final report
Tell the user: the `<out>` bundle path, the `handoff.zip` path, the component and pattern counts,
every finding and every `> NEEDS INPUT` item from the builder's return, then the next action —
hand `handoff.zip` to Claude Design. State plainly that the bundle is one-shot input material:
iterating in Claude Design supersedes it, and a changed source means re-running this skill, never
patching the bundle by hand.

## Contracts
Consumes a screenshots directory path (from the arguments, or asked). Produces
`.temp/design-extractor/<run-slug>/handoff/` and `.temp/design-extractor/<run-slug>/handoff.zip`.
