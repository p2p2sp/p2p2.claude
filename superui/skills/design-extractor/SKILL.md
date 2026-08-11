---
name: design-extractor
description: Turn a folder of UI screenshots into DESIGN.md - the pure, platform-neutral design system (tokens, type, spacing, elevation, motion) - at docs/design-system/, then loop to chain per-platform component extraction.
allowed-tools: Read, Write, Glob, Bash(sh:*), Bash(mkdir:*), Bash(rm:*), Skill, Agent, AskUserQuestion
user-invocable: true
disable-model-invocation: true
argument-hint: <screenshots-dir> [<target>]
---

# Design Extractor - screenshots to the platform-neutral design system

Turn a directory of UI screenshots into `DESIGN.md` - the one-shot, platform-neutral design-system
seed (YAML front-matter tokens plus a prose body: colors, typography, spacing, elevation, shapes,
motion). Components and patterns are a separate, per-platform concern - `/superui:component-extractor`
reads this file and builds them; this skill never touches them.

## Ground rules
- Never do a worker's job inline. This skill measures nothing and authors no measured or generated
  artifact - `DESIGN.md` comes from the builder dispatched in the Handoff step below. The only file
  it writes itself is `<run>/intake-answers.md`, transcribing the user's own answers -
  `AskUserQuestion` only runs in the main context, so intake has to happen here.
- Paths: `<run>` = `.temp/design-extractor/<run-slug>/` (scratch, disposable), `<run-slug>` = the
  source directory's basename; `<out>` = `docs/design-system/`, or
  `docs/design-system/<target>/` when a `<target>` argument was given. `<out>/DESIGN.md` is the
  shipped, version-controlled deliverable - it does NOT nest under `<run>`.
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
5. Glob `<out>/DESIGN.md`. Present -> STOP and ask via `AskUserQuestion` whether to wipe it and
   rebuild, or abort. Only on an explicit wipe answer remove that one file (`rm <out>/DESIGN.md`);
   abort ends the skill here, having written nothing. `DESIGN.md` is regenerated whole, never
   merged or patched. This gate touches `DESIGN.md` ONLY - any platform subdir already under
   `<out>` (e.g. `<out>/web-app/`) is left untouched; say so in the same message and warn that its
   `DESIGN.components.md` / `DESIGN.patterns.md` become stale against the regenerated tokens, so
   re-running `/superui:component-extractor` for that platform afterward is on the user to
   remember.
6. `mkdir -p <run> <out>`.
7. Report the gate result to the user: source dir, PNG count, `<run>` path, `<out>` path, whether a
   stale `<run>` was removed and whether `<out>/DESIGN.md` was wiped on the user's answer.

## Step 2 - Source map
Dispatch `superui:source-scout` (Agent tool) with the source directory and `<run>/source-map.md`
as the output path. GATE: `<run>/source-map.md` exists and is non-empty.

## Step 3 - Resolve ambiguities
Read only `<run>/source-map.md`'s `## Ambiguities` section.
- Empty, or the literal `none` -> skip this step entirely, write no intake-answers file.
- Otherwise -> ask the user those questions in prose via `AskUserQuestion`, then write the answers
  to `<run>/intake-answers.md`.

## Handoff - build DESIGN.md
Invoke `design-extractor-builder` (Skill tool) with a labeled-args block:
```
run: <run>
out: <out>
source: <source dir>
source-map: <run>/source-map.md
intake: <run>/intake-answers.md
```
Omit the `intake:` line entirely when step 3 wrote no such file. Relay the builder's return
verbatim - do not re-verify or re-derive any of it.

## Final report
Tell the user: the `<out>/DESIGN.md` path, the token and text-style counts, the count of proposed
(best-practice, unmeasured) values the synthesizer supplied plus how many unknowns it resolved
versus left standing, every finding and every `> NEEDS INPUT` item from the builder's return, then
the next action - commit `DESIGN.md`: it is a version-controlled deliverable, not scratch. Note
that values marked `proposed` in `DESIGN.md` (front matter or body) were invented to best
practice, not measured, and should be reviewed. State plainly that this is one-shot input
material for the platform component/pattern bundles `/superui:component-extractor` builds next,
and that a changed source means re-running this skill, never patching `DESIGN.md` by hand.

## Ending loop - chain a platform
After the Final report, ask via `AskUserQuestion` (single-select): `web app`, `mobile`, `website`,
`finish`. No answer (the question is aborted) -> treat as `finish`, which ends the skill here.

On a platform choice:
1. Ask a second `AskUserQuestion` confirming the screenshots directory for that platform - default
   to this run's source dir, with an `Other` option to type a different path.
2. Invoke `component-extractor` (Skill tool) with positional args `<screenshots-dir> <platform>
   [<target>]` - `<platform>` is the machine value for the chosen option (`web-app`, `mobile`, or
   `website`), and `<target>` is this run's own `<target>` argument, passed through verbatim when
   one was given.
3. Relay its report verbatim - a chained run's own hard stops (e.g. missing PNGs in the confirmed
   dir) surface through that relay, nothing re-checked here.
4. Re-ask the same single-select question. Loop until `finish`.

## Contracts
Consumes a screenshots directory path (first argument, or asked) and an optional `<target>` (second
argument). Produces `DESIGN.md` at `docs/design-system/`, or `docs/design-system/<target>/` when
`<target>` was given. Chains to `component-extractor` (Skill tool) with `<screenshots-dir>
<platform> [<target>]`.
