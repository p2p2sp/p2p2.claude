---
name: superdev-docs
description: Use ALWAYS when the user wants to create, initialize, or maintain user-facing product documentation / a product knowledge base for a repository - describe features from the user's perspective, set up docs/product/, keep product docs in sync with the code. Triggers include "create product docs", "document features for users", "init docs/product", "audit product docs", "update the product documentation". Writes one distilled file per feature under docs/product/<feature-slug>.md in the host-project language, plus a maintenance mode that audits existing docs against the code.
user-invocable: true
---

# SuperDev Docs

Discovers the host project's user-facing features and persists a distilled "how it works" description per feature as `docs/product/<feature-slug>.md`. This skill is the interactive front: it detects state, asks, and resolves every decision with the user, then hands ONE capture file to the `superdev-docs-writer` fork, which writes the doc files.

## Core Principle

**One file per feature at `docs/product/<feature-slug>.md`.** Content is the distilled "how the feature works" from the user's perspective - never implementation detail, never a copy of a spec or plan.

**Docs are USER INTENT.** The user may edit these files directly. A doc-vs-code divergence is a requirement to surface and resolve with the user, never text to overwrite silently.

## Run ID

!`date +%Y%m%d-%H%M%S`

The line above is `<RUN_ID>` - use it verbatim. Every run writes a fresh capture file `.superdev/.docs/capture-<RUN_ID>.md`; never reuse or overwrite an existing one.

## Workflow

```
1. Detect state
   Glob docs/product/*.md
   → No matches (dir absent or empty) → Initial setup (steps 2-4)
   → Matches present               → Maintenance (step 5)

2. Inventory (Initial setup)
   Survey the host repo for candidate user-visible features.
   Present the candidate list to the user; confirm - accept / adjust / drop.

3. Language (Initial setup, once)
   Ask the doc language ONCE for the whole run - default to the host
   project's own language (from its CLAUDE.md / docs / commit messages).

4. Capture Questions (Initial setup, per confirmed feature)
   Ask the Capture Questions below, then go to step 6.

5. Maintenance mode (state = present)
   Ask the user:
   a) Audit docs   → Read each doc, check it against the code it describes.
                     A divergence is reported as intent-vs-implementation and
                     resolved WITH the user (fix the code, or - only on the
                     user's explicit choice - update the doc). A retired
                     feature becomes a `delete:` line.
   b) Find gaps    → Survey for user-visible features no doc covers; run the
                     Capture Questions for each.
   c) Both
   Resolved changes go through step 6 (capture + writer handoff).

6. Capture + hand off
   Write .superdev/.docs/capture-<RUN_ID>.md (format below)
   Invoke `superdev-docs-writer` (Skill) with a labeled-line args block:
     capture: .superdev/.docs/capture-<RUN_ID>.md
   Relay its VERDICT/DOC lines verbatim - do NOT re-verify or rewrite the docs yourself
```

## Capture file format

```
# Docs capture
## Language
<language, e.g. polski>
## Docs
- <feature-slug> - <one-line feature scope>
- delete: docs/product/<file>.md - <reason>
## Facts
### <feature-slug>
- <confirmed user-visible behavior>
```

## Capture Questions

Per feature:
1. What does this feature do for the user?
2. How does the user reach or trigger it?
3. What observable behavior and outputs does it have?
4. What limits, states, or edge behaviors should the user know about?

## Resources

None beyond the Run ID preload above - detection is Glob-only.
