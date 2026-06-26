---
name: memory-layers
description: Use ALWAYS when the user wants to create, initialize, regenerate, bootstrap, or maintain CLAUDE.md project-memory for a repository — set up project memory, add a memory layer, or make Claude understand the codebase. Triggers include "create CLAUDE.md", "initialize project memory", "bootstrap Claude context", "set up CLAUDE.md", "add memory layer". Generates a hierarchical CASCADE of CLAUDE.md files (one general root plus progressively more specific child nodes in genuine architectural units), not a single root file, and offers a maintenance mode to audit existing nodes and find new candidates.
user-invocable: true
---

# Memory Layer

Hierarchical CLAUDE.md infrastructure so CLAUDE navigate codebases like senior engineers.

## Core Principle

**Keep exactly ONE root context file** (`CLAUDE.md`) at the project root — do not split root-level memory across competing files. Child `CLAUDE.md` files in subdirectories are encouraged for complex subsystems.

## Workflow

```
1. Detect state
   scripts/detect_state.sh /path/to/project
   → Returns: none | partial | complete

2. Route
   none/partial → Initial setup (steps 3-5)
   complete     → Maintenance (step 6)

3. Measure [gate - show table first]
   scripts/analyze_structure.sh /path/to/project
   scripts/estimate_tokens.sh /path/to/each/source/dir

4. Decide
   No root file  → Ask: CLAUDE.md?
   Has root file → Add Memory Layer section + child nodes if needed

5. Execute
   Use references/templates.md for structure
   Use references/node-examples.md for real-world patterns
   Validate: one root, READ-FIRST directive, <4k tokens per node

6. Maintenance mode (when state=complete)
   Ask user:
   a) Audit nodes     → Use references/capture-protocol.md for SME questions
   b) Find candidates → Re-measure tokens, suggest new nodes
   c) Both
```

## When to Create Child Nodes

| Signal | Action |
|--------|--------|
| >20k tokens in directory | Create CLAUDE.md |
| Responsibility shift | Create CLAUDE.md |
| Hidden contracts/invariants | Document in nearest ancestor |
| Cross-cutting concern | Place at LCA |
| Distinct toolchain (own build/test config) | Create CLAUDE.md |

Do NOT create for: every directory, simple utilities, test folders (unless complex) and folders which name begin with dot (eg.: .claude).

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

**References:**
- `references/templates.md` - Root and child node templates
- `references/node-examples.md` - Real-world examples
- `references/capture-protocol.md` - SME interview protocol
