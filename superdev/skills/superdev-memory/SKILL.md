---
name: superdev-memory
description: Use ALWAYS when the user wants to create, initialize, regenerate, bootstrap, or maintain CLAUDE.md project-memory for a repository - set up project memory, add a memory layer, or make Claude understand the codebase. Triggers include "create CLAUDE.md", "initialize project memory", "bootstrap Claude context", "set up CLAUDE.md", "add memory layer". Generates a hierarchical CASCADE of CLAUDE.md files (one general root plus progressively more specific child nodes in genuine architectural units), not a single root file, and offers a maintenance mode to audit existing nodes and find new candidates.
user-invocable: true
allowed-tools: Read, Write, AskUserQuestion, Skill, Bash, Bash(date:*)
---

# SuperDev Memory

Hierarchical CLAUDE.md infrastructure so CLAUDE navigate codebases like senior engineers. This skill is the interactive front: it measures, asks, and resolves every decision with the user, then hands ONE capture file to the `superdev-memory-writer` fork, which writes the cascade.

## Core Principle

**Keep exactly ONE root context file** (`CLAUDE.md`) at the project root - do not split root-level memory across competing files. Child `CLAUDE.md` files in subdirectories are encouraged for complex subsystems.

## Run ID

!`date +%Y%m%d-%H%M%S`

The line above is `<RUN_ID>` - use it verbatim. Every run writes a fresh capture file `.temp/superdev/memory/capture-<RUN_ID>.md`; never reuse or overwrite an existing one.

## Workflow

```
1. Detect state
   scripts/detect_state.sh /path/to/project
   → Returns: none | partial | complete

2. Route
   none/partial → Initial setup (steps 3-5)
   complete     → Maintenance (step 6)

3. Measure [gate - show list first]
   scripts/analyze_structure.sh /path/to/project
   scripts/estimate_tokens.sh /path/to/each/source/dir
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
   Invoke `superdev-memory-writer` (Skill) with a labeled-line args block:
     capture: .temp/superdev/memory/capture-<RUN_ID>.md
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
- `scripts/detect_state.sh` - Check Memory Layer state (none/partial/complete)
- `scripts/analyze_structure.sh` - Find semantic boundaries
- `scripts/estimate_tokens.sh` - Measure directory complexity
