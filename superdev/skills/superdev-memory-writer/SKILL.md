---
name: superdev-memory-writer
description: Invoked only by superdev-memory, superbuild or simplebuild skill.
context: fork
background: false
model: sonnet
effort: medium
user-invocable: false
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/resolve-input.sh:*)
---

# SuperDev Memory Writer

Folds the facts in `## capture` into the project's CLAUDE.md memory cascade. Input is fully resolved - never ask the user; on ambiguity prefer updating an existing node over creating one.

## Input

!`"${CLAUDE_PLUGIN_ROOT}/scripts/resolve-input.sh" "$ARGUMENTS" capture '?spec' 2>&1`

`## capture` is one of two shapes - read it before acting:
- a capture document - has `## Nodes` (directive: `<dir> - <purpose>` per line, `.` = project root node; paths relative to project root) and `## Facts` (per-area knowledge under `### <dir>` headings). Create or update exactly the listed nodes; fold each area's facts into its node.
- change material (e.g. a build plan with tasks) - no `## Nodes`. Map the described changes onto EXISTING nodes (Glob `**/CLAUDE.md`) and update only those affected; create nothing new. Nothing affected -> `VERDICT: PASS` with `NODES: none`.

`## spec` (when present) - the approved What & Why behind the change material, which carries only the How. Durability is judged from the spec: its scope, contracts and constraints are what a node records.

Notes dir: !`printf '%s' "$ARGUMENTS" | tr -d '\r' | sed -n 's/^[[:space:]]*notes:[[:space:]]*//p' | head -n1`
When set, Read its `*-notes.md` files - the recorded plan->code deviations. Where a note marks a deviation, the code state PLUS its recorded why is the durable fact - never fold in the intent the note overrode (record "X deliberately not migrated", not the plan's X). A deviation with no recorded why is not design - keep it out of memory.

Qualification filter for change material - apply BEFORE touching any node. A capture document never passes through this filter: its facts are interview-resolved, and an invariant or pitfall the code cannot show is exactly what it exists to record.

Change material states INTENT; the code is TRUTH. Confirm every described change against the actual code (Read/Grep the named files and symbols) - a change the code does not show did not happen; ignore it.

Beyond that, a change qualifies only when it alters DURABLE knowledge of an area a node records:
- folds in: a shifted responsibility/scope, a new or broken contract/invariant, a changed entry point or command, a pattern/anti-pattern the change establishes or invalidates.
- never folds in: task-level implementation steps, feature-specific details, workarounds, transient state, or coding-style conventions (that is .claude/rules material, not memory).
- When in doubt -> not memory. `NODES: none` is a normal verdict for small builds.
- An area the change establishes that no node covers -> a `GAP:` line, never a new node.

## Write rules

- Exactly ONE root CLAUDE.md. Root Memory Layer section per the root template, child nodes per the child template - `references/templates.md`.
- Update = fold in new facts, drop contradicted ones; preserve unrelated content verbatim.
- Commands: discovered from host project config only, placed at the node owning the toolchain; never invented.
- No nodes for dot-directories, test folders, or simple utilities.

## Validate (every touched node)

- One root; root carries the READ-FIRST directive (Memory Layer section).
- < 4k tokens per node (bytes/4 via `wc -c`).
- Downlinks use relative paths; no duplication with ancestor nodes.

## Output format

Return exactly this - your only output channel (no prose, no diffs):
- line 1: `VERDICT: PASS` or `VERDICT: FAIL`
- on PASS: one `NODE: <path> (created|updated)` line per touched node, or `NODES: none`
- on PASS, change material only: one `GAP: <dir> - <area no node covers>` line per area the change established that no node records; omit entirely when none
- on FAIL only, line 2: `REASON: <one line>`
