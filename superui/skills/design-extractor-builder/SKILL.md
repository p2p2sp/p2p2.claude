---
name: design-extractor-builder
description: Invoked only by the design-extractor skill, never directly.
context: fork
model: sonnet
effort: medium
user-invocable: false
allowed-tools: Read, Write, Glob, Grep, Bash, Bash(sh:*), Bash(node:*), Bash(mkdir:*), Agent
---

# Design Extractor Builder — mechanical tail

Turn a resolved source directory, source map and component/pattern inventory into the finished
handoff bundle — `design.md`, `inventory.md`, `components/<slug>.md`, `patterns/<slug>.md`,
`screens/<file>.png`, `meta.yml`, optional `intake-answers.md` — plus a sibling `handoff.zip`.
Zero user conversation, zero design judgment: every screen, every ambiguity answer and every
inventory entry already arrived resolved. Measure nothing yourself — compose, fan out to the
measuring and writing agents, and gate.

## Input contract
A labeled block, one `label: value` per line:
- `run:` run dir — scratch space for fragments and the merged registry.
- `out:` output dir — the handoff bundle root, already existing and empty.
- `source:` source screenshots dir.
- `source-map:` `source-map.md` path.
- `inventory:` `inventory.md` path, already holding zero or more entries.
- Optional `intake:` intake-answers path — authoritative user clarifications.

## Ground rules
- Never do a worker's job inline — no measuring, no writing a spec, an inventory, `design.md`, or
  a fragment yourself. Spawn the owning agent (Agent tool, `subagent_type: superui:<agent-name>`)
  even when the task looks small.
- Trust every script's self-verified result — never re-check or retry it.
- One writer per file — each fragment, spec and generated artifact has exactly one producer per
  dispatch.
- Re-dispatch convention, scoped to the two agents this skill owns: `foundation-analyst` for a
  token or value finding, `spec-writer` for a spec finding (a missing or malformed output). Spawn
  the same agent again with its normal inputs plus its previous output path and the findings as
  added constraints; it regenerates its artifact in full, never a patch. Cap at two rounds per
  gate — after that, carry the residue into the final message as `> NEEDS INPUT`.
- `bundle-reviewer` findings are never a gate here — `dedup` and `accent-sprawl` trace back to the
  inventory, an input this skill receives rather than authors, so its findings are carried
  verbatim into the return message for the user to act on, never re-dispatched.
- Fan-out steps run agents in parallel, batched (about 5 concurrent); wait for a batch before
  dispatching the next.

## Steps

### 0 — Env check [you]
Run `sh "${CLAUDE_PLUGIN_ROOT}/scripts/check_node.sh"`. `NODE_MISSING` -> stop now, write
nothing, return the single line `NODE_MISSING — point the user at /superui:setup`. `NODE_OK <cmd>`
-> use `<cmd>` as the runtime command in every step below and in every dispatch that runs a
script. Resolve `${CLAUDE_PLUGIN_ROOT}/scripts/sample_colors.ts` and
`${CLAUDE_PLUGIN_ROOT}/scripts/measure_geometry.ts` to absolute paths now — every dispatch below
passes both paths plus the runtime command.

### 1 — Guard the inventory [you]
Read `inventory:`. Zero entries across `## Components` and `## Patterns` -> stop now, write
nothing under `<out>`, return the single line `EMPTY-INVENTORY — <inventory path> lists no
entries`.

### 2 — Measure foundations [foundation-analyst, x4 parallel]
`mkdir -p <run>/notes`. Spawn `superui:foundation-analyst` four times in parallel, one per
foundation (`colors`, `typography`, `dimensions`, `effects-motion`), each with: the foundation
name, `source:`, `source-map:`, `intake:` when present, the resolved sampler and geometry paths,
the runtime command, output `<run>/notes/notes-<foundation>.json`.
GATE: all four fragment files exist and are non-empty JSON. A missing or malformed fragment ->
re-dispatch that one analyst per the re-dispatch convention.

### 3 — Merge the registry [script]
`<cmd> "${CLAUDE_PLUGIN_ROOT}/scripts/build_registry.ts" <run>/notes <run>/registry.json`
GATE: exit 0.

### 4 — Render design.md [script]
`<cmd> "${CLAUDE_PLUGIN_ROOT}/scripts/render_design_md.ts" <run>/registry.json <out>/design.md`
GATE: exit 0.

### 5 — Copy inventory and intake [you]
Copy `inventory:` verbatim to `<out>/inventory.md`. When `intake:` is present, copy it verbatim
to `<out>/intake-answers.md`; when absent, skip silently — no such file ships.

### 6 — Write specs [spec-writer, xN batched ~5 concurrent]
For every entry line in `<out>/inventory.md`'s `## Components` and `## Patterns`, split on `·`:
a component entry (`atomic|composite` at index 1) targets `<out>/components/<slug>.md`; a
pattern entry (`composed of:`, no `atomic|composite`) targets `<out>/patterns/<slug>.md`. Spawn
`superui:spec-writer` once per entry with: the entry line, `source:`, `<run>/registry.json`, the
resolved output path, the sampler and geometry paths, the runtime command.
GATE: one spec file per entry, non-empty. A missing spec -> re-dispatch that entry's
`spec-writer` per the re-dispatch convention.
Collect every `MISSING-TOKENS:` block from every dispatch's final message (skip entries
reporting `none`).

### 7 — Resolve missing tokens [foundation-analyst, re-dispatch]
Skip when step 6 collected no `MISSING-TOKENS:` blocks. Otherwise route every collected entry
(proposed name, measured value, evidence) to the analyst owning its group — `color.*` -> colors,
`text.*` -> typography, `spacing.*` / `radius.*` / `border.*` -> dimensions, `shadow.*` /
`motion.*` -> effects-motion — and re-dispatch that foundation's analyst with its previous
fragment path plus the routed entries as findings to honor; the analyst adopts every proposed
name verbatim. Then repeat steps 3 and 4. Cap at two rounds; a still-unresolved entry after that
-> `> NEEDS INPUT: <name> unmeasured`, carried into the final message.

### 8 — Copy canonical screens [you]
Collect every `canonical:` filename from `<out>/inventory.md`'s `## Components` and
`## Patterns` entries, deduplicated. `mkdir -p <out>/screens`. Every source file is PNG by
construction, so no conversion is ever needed — for each filename present in `source:`, copy it
verbatim into `<out>/screens/<filename>`. A filename absent from `source:` is skipped here
without error — `validate_bundle.ts` reports it as a `missing-screen` finding in step 10, this
step never fails on it.

### 9 — Build the index [script]
`<cmd> "${CLAUDE_PLUGIN_ROOT}/scripts/build_meta.ts" <out> <source>`
GATE: exit 0.

### 10 — Validate [script]
`<cmd> "${CLAUDE_PLUGIN_ROOT}/scripts/validate_bundle.ts" <out> <run>/registry.json`
Collect every `FINDING:` line. Exit 1 here is informational, never a stop — the bundle still
gets packed in step 12 so the user receives it alongside the findings.

### 11 — Review [bundle-reviewer, x1]
Spawn `superui:bundle-reviewer` once with `<out>` and `<run>/registry.json`. Collect every
`FINDING:` line, or note `CLEAN`. Never re-dispatched, never a gate — carry the output verbatim
into the final message.

### 12 — Pack [script]
`<cmd> "${CLAUDE_PLUGIN_ROOT}/scripts/pack_bundle.ts" <out> <out>/../handoff.zip`
GATE: exit 0.

## Return
End with a single message: the `<out>` path, the zip path, the component and pattern counts (the
spec files written in step 6), every `FINDING:` line collected in steps 10 and 11, and every
`> NEEDS INPUT` item collected in steps 2, 6 and 7.

## Contracts
Input contract above. Output: the single return message described above; artifacts land only at
`<out>/` and `<out>/../handoff.zip` — no other file is written outside `<run>`.
