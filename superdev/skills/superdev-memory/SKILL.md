---
name: superdev-memory
description: Use ALWAYS when the user wants to create, initialize, regenerate, bootstrap, or maintain CLAUDE.md project-memory for a repository - set up project memory, add a memory layer, or make Claude understand the codebase. Triggers include "create CLAUDE.md", "initialize project memory", "bootstrap Claude context", "set up CLAUDE.md", "add memory layer". Generates a hierarchical CASCADE of CLAUDE.md files (one general root plus progressively more specific child nodes in genuine architectural units), not a single root file, and offers a maintenance mode to audit existing nodes and find new candidates.
user-invocable: true
allowed-tools: Read, Write, AskUserQuestion, Skill, Agent, Task, Bash, Bash(date:*), Bash(${CLAUDE_PLUGIN_ROOT}/skills/superdev-memory/scripts/detect_state.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/skills/superdev-memory/scripts/analyze_structure.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/skills/superdev-memory/scripts/estimate_tokens.sh:*)
---

# SuperDev Memory

Hierarchical CLAUDE.md infrastructure so CLAUDE navigate codebases like senior engineers. This skill is the interactive front: it measures, asks, and resolves every decision with the user, then hands ONE capture file to the `superdev:memory-writer` agent, which writes the cascade.

## Core Principle

**Keep exactly ONE root context file** (`CLAUDE.md`) at the project root - do not split root-level memory across competing files. Child `CLAUDE.md` files in subdirectories are encouraged for complex subsystems.

**The `superdev:memory-writer` agent writes this skill's output - you never write a node yourself.** The `Agent` tool missing from your tool pool means the harness lost the tool, never that you may stand in for the writer: STOP at once, report exactly these four lines, and end the turn.

```
AGENT TOOL UNAVAILABLE - stopped at <step>.
Nothing was written in its place.
State: .temp/superdev/memory/capture-<RUN_ID>.md, or "no capture written yet".
Fix: exit this session, restart with `claude --resume`, then run `superdev-memory` again.
```

## Run ID

!`date +%Y%m%d-%H%M%S`

The line above is `<RUN_ID>` - use it verbatim. Every run writes a fresh capture file `.temp/superdev/memory/capture-<RUN_ID>.md`; never reuse or overwrite an existing one.

## Workflow

```
0. Preflight
   `Agent` tool present in your tool pool? Absent → STOP and report per `## Core Principle`
   (State: no capture written yet). Do not run the scripts, do not start the interview.

1. Detect state
   "${CLAUDE_PLUGIN_ROOT}/skills/superdev-memory/scripts/detect_state.sh" /path/to/project
   → Returns: none | partial | complete

2. Route
   none/partial → Initial setup (steps 3-5)
   complete     → Maintenance (step 6)

3. Measure [gate - show list first]
   "${CLAUDE_PLUGIN_ROOT}/skills/superdev-memory/scripts/analyze_structure.sh" /path/to/project
   "${CLAUDE_PLUGIN_ROOT}/skills/superdev-memory/scripts/estimate_tokens.sh" /path/to/each/source/dir
   Report per directory, one line each: directory - tokens - threshold - needs node?
   Thresholds:
   - <20k tokens → No node needed
   - 20-64k tokens → 2-3k token node
   - >64k tokens → Split into child nodes

4. Decide
   No root file  → Ask: CLAUDE.md?
   Has root file → Add Memory Layer section + child nodes if needed

5. Capture + hand off
   Ask the Capture Questions per selected area
   Write .temp/superdev/memory/capture-<RUN_ID>.md (format below)
   Run `printf '%s\n' "${CLAUDE_PLUGIN_ROOT}/references"` and keep its output as `<refs>`
   Invoke `Agent` with `subagent_type: superdev:memory-writer` and a labeled-line prompt:
     capture: .temp/superdev/memory/capture-<RUN_ID>.md
     refs: <refs>
   Relay its VERDICT/NODE lines verbatim - do NOT re-verify or rewrite the nodes yourself

6. Maintenance mode (when state=complete)
   Ask user:
   a) Audit nodes     → Use `## Capture Questions` below for SME questions
   b) Find candidates → Re-measure tokens, suggest new nodes
   c) Both
   Resolved changes go through step 5 (capture + writer handoff)
```

## Capture file format

```
# Memory capture
## Nodes
- <dir> - <one-line purpose>     (`.` = project root node; paths relative to project root)
## Facts
### <dir>
- <captured fact / invariant / discovered command / anti-pattern>
```

## When to Create Child Nodes

- >20k tokens in directory → Create CLAUDE.md
- Responsibility shift → Create CLAUDE.md
- Hidden contracts/invariants → Document in nearest ancestor
- Cross-cutting concern → Place at LCA
- Distinct toolchain (own build/test config) → Create CLAUDE.md

Do NOT create for: every directory, simple utilities, test folders (unless complex) and folders which name begin with dot (eg.: .claude).

## Proposing candidates (level 1)

When you offer the level-1 directories (top level under the project root) as answer options - which of them get a CLAUDE.md - ALWAYS include `All projects` as one of the proposed answers, even when some of those directories fall below the token threshold. The threshold only sets which options come pre-selected; it never removes an option. `All projects` means "create a node for every level-1 directory, sub-threshold ones included" and must always be on offer.

## Capture Questions

When documenting existing code, ask:
1. What does this area own? What's out of scope?
2. What invariants must never be violated?
3. What repeatedly confuses new engineers?
4. What patterns should always be followed?
5. How is this area built / tested / run, and where are those commands defined?

## Resources

**Scripts:**
- `${CLAUDE_PLUGIN_ROOT}/skills/superdev-memory/scripts/detect_state.sh` - Check Memory Layer state (none/partial/complete)
- `${CLAUDE_PLUGIN_ROOT}/skills/superdev-memory/scripts/analyze_structure.sh` - Find semantic boundaries
- `${CLAUDE_PLUGIN_ROOT}/skills/superdev-memory/scripts/estimate_tokens.sh` - Measure directory complexity
