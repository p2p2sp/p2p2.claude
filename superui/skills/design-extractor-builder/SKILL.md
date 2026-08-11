---
name: design-extractor-builder
description: Invoked only by the design-extractor skill, never directly.
context: fork
model: sonnet
effort: medium
user-invocable: false
allowed-tools: Read, Write, Glob, Grep, Bash, Bash(sh:*), Bash(node:*), Bash(mkdir:*), Agent
---

# Design Extractor Builder - mechanical tail

Turn a resolved source directory and source map into the finished design-system seed - `DESIGN.md`
alone. Zero user conversation, zero design judgment: every screen and every ambiguity answer
already arrived resolved. Measure nothing yourself - compose, fan out to the measuring agents, and
gate.

## Input contract
A labeled block, one `label: value` per line:
- `run:` run dir - scratch space for fragments and the merged registry.
- `out:` output dir - `DESIGN.md`'s parent, already existing and empty of `DESIGN.md`.
- `source:` source screenshots dir.
- `source-map:` `source-map.md` path.
- Optional `intake:` intake-answers path - authoritative user clarifications.

## Ground rules
- Never do a worker's job inline - no measuring or writing `DESIGN.md` or a fragment yourself.
  Spawn the owning agent (Agent tool, `subagent_type: superui:<agent-name>`) even when the task
  looks small.
- Trust every script's self-verified result - never re-check or retry it.
- One writer per file - each fragment and generated artifact has exactly one producer per
  dispatch.
- Re-dispatch convention, scoped to the two agents this skill owns: `foundation-analyst` for a
  token or value finding, `design-synthesizer` for a missing/malformed proposed fragment or a name
  collision reported by `build_registry.ts`. Spawn the same agent again with its normal inputs plus
  its previous output path and the findings as added constraints; it regenerates its artifact in
  full, never a patch. Cap at two rounds per gate - after that, carry the residue into the final
  message as `> NEEDS INPUT`.
- Fan-out steps run agents in parallel, batched (about 5 concurrent); wait for a batch before
  dispatching the next.

## Steps

### 0 - Env check [you]
Run `sh "${CLAUDE_PLUGIN_ROOT}/scripts/check_node.sh"`. `NODE_MISSING` -> stop now, write
nothing, return the single line `NODE_MISSING - point the user at /superui:setup`. `NODE_OK <cmd>`
-> use `<cmd>` as the runtime command in every step below and in every dispatch that runs a
script. Resolve `${CLAUDE_PLUGIN_ROOT}/scripts/sample_colors.ts` and
`${CLAUDE_PLUGIN_ROOT}/scripts/measure_geometry.ts` to absolute paths now - every dispatch below
passes both paths plus the runtime command.

### 1 - Measure foundations [foundation-analyst, x4 parallel]
`mkdir -p <run>/notes`. Spawn `superui:foundation-analyst` four times in parallel, one per
foundation (`colors`, `typography`, `dimensions`, `effects-motion`), each with: the foundation
name, `source:`, `source-map:`, `intake:` when present, the resolved sampler and geometry paths,
the runtime command, output `<run>/notes/notes-<foundation>.json`.
GATE: all four fragment files exist and are non-empty JSON. A missing or malformed fragment ->
re-dispatch that one analyst per the re-dispatch convention.
Collect every `> NEEDS INPUT:` marker line from each dispatch's final message as a standing
NEEDS-INPUT item.

### 2 - Merge the registry [script]
`<cmd> "${CLAUDE_PLUGIN_ROOT}/scripts/build_registry.ts" <run>/notes <run>/registry.json`
GATE: exit 0.

### 3 - Render DESIGN.md [script]
`<cmd> "${CLAUDE_PLUGIN_ROOT}/scripts/render_design_md.ts" <run>/registry.json <out>/DESIGN.md --source <source>`
GATE: exit 0.

### 4 - Synthesize gaps [design-synthesizer, x1]
Spawn `superui:design-synthesizer` once with: `<run>/registry.json` (the final measured registry, unknowns
and all), `source-map:`, `intake:` when present, output `<run>/notes/notes-proposed.json`. It writes one
`foundation:"proposed"` fragment of best-practice PROPOSED tokens/textStyles plus a `resolved` list of the
unknowns those proposals cover.
GATE: `<run>/notes/notes-proposed.json` exists and is non-empty JSON. A missing or malformed fragment ->
re-dispatch per the re-dispatch convention.
Then repeat step 2 (merge) and step 3 (render) so the proposed values land in `DESIGN.md` and every
`resolved` unknown drops out of the `> NEEDS INPUT` list. A `build_registry.ts` name-collision exit ->
re-dispatch the synthesizer with the collision message as a finding (cap two rounds); an unresolved collision
after that -> skip the proposed fragment (`rm` it), re-run steps 2 and 3 without it, and note it in the
return. Record the proposed-token count and the resolved-versus-standing unknown counts from the
synthesizer's final message.

### 5 - Validate [script]
`<cmd> "${CLAUDE_PLUGIN_ROOT}/scripts/validate_bundle.ts" <out> <run>/registry.json --mode design`
Collect every `FINDING:` line. Exit 1 here is informational, never a stop - `DESIGN.md` still
ships, so the user receives it alongside the findings.

## Return
End with a single message: the `<out>/DESIGN.md` path, the token and text-style counts, the
proposed-value count and resolved-versus-standing unknown counts from step 4 (registry `unknowns`
only - the one namespace `build_registry.ts` can match a `resolved` entry against), every
`FINDING:` line collected in step 5, and every `> NEEDS INPUT` item collected in step 1 - never
subtracted by step 4, since none of these entered registry.json's `unknowns` array for it to
resolve.

## Contracts
Input contract above. Output: the single return message described above; `DESIGN.md` is the only
artifact written under `<out>/` - no other file is written outside `<run>`.
