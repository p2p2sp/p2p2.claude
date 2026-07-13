---
name: superdev-rules
description: Use ALWAYS when the user wants to discover, capture, or maintain project coding conventions as .claude/rules files — learn the codebase's conventions, set up path-scoped rules, teach Claude the project's style. Triggers include "create rules", "set up .claude/rules", "capture coding conventions", "learn our conventions", "add naming/testing/error-handling rules", "audit rules". Discovers dominant patterns from the host code with real examples, confirms each in an interview, and writes MANY SMALL path-scoped rule files (one convention area per file, YAML paths: gating) instead of a monolith, plus a maintenance mode to audit existing rules against the actual code and find new candidates.
user-invocable: true
---

# SuperDev Rules

Discovers the host project's coding conventions (naming, testing, error-handling, imports, ...) and persists them as `.claude/rules/*.md`. This skill is the interactive front: it scans, asks, and resolves every decision with the user, then hands ONE capture file to the `superdev-rules-writer` fork, which writes the rule files.

## Core Principle

**Many SMALL files, one convention area per file**, each gated by a narrow frontmatter `paths:` glob list — the harness loads a rule only when Claude reads a matching file. No monolith; no global rule where a narrow glob suffices. Record only the DELTA from what a competent developer would do anyway.

**Frozen `_` convention.** A basename with a leading underscore (`_{topic}.md`) is frozen: the native loader still loads it, but this skill never reads, scores, audits, or proposes it — reserved for hand-authored or bootstrap meta-rules that must stay immutable. Never emit a capture slug starting with `_`.

## Workflow

```
1. Detect state
   scripts/detect_state.sh /path/to/project
   → Returns: none | partial | complete

2. Route
   none/partial → Discovery (steps 3-5)
   complete     → Maintenance (step 6)

3. Scan [gate - show findings first]
   scripts/scan_conventions.sh /path/to/project
   Then Read 2-3 representative files per candidate area — a convention is
   proposable only with a dominant pattern + a real example; never invent one.
   Show: | Area | Discovered convention (real example) | Proposed paths: |

4. Interview
   Confirm every candidate with the user — accept / adjust / drop, plus the
   Capture Questions. Only confirmed conventions reach the capture.

5. Capture + hand off
   Write .superdev/.rules/capture.md (format below)
   Invoke `superdev-rules-writer` (Skill) with a labeled-line args block:
     capture: .superdev/.rules/capture.md
   Relay its VERDICT/RULE lines verbatim — do NOT re-verify or rewrite the rule files yourself

6. Maintenance mode (when state=complete)
   Ask user:
   a) Audit rules     → Read each rule, check it against the code its globs gate:
                        contradictions between rules, dead rules (globs match
                        nothing / convention gone), drift from the dominant pattern
   b) Find candidates → Re-scan (step 3) for areas no existing rule covers
   c) Both
   Resolved changes go through step 5 (same capture file + writer handoff);
   a dead rule becomes a `delete:` line.
```

## Capture file format

```
# Rules capture
## Rules
- <file-slug> — paths: <glob>[, <glob>] — <one-line scope>
- delete: <existing rule path> — <one-line reason>
## Facts
### <file-slug>
- <confirmed convention — imperative, carrying the real example from code>
```

Globs narrow (a directory or an extension in every glob); `paths: global` only when the convention is truly repo-wide.

## Capture Questions

Per candidate area:
1. Is this pattern intentional, or an accident of history?
2. Should new code follow it, or is a different target convention desired?
3. Which paths does it apply to — and where does it NOT apply?
4. Any exceptions worth recording?

## Resources

**Scripts:**
- `scripts/detect_state.sh` - Check .claude/rules state (none/partial/complete, per-file paths: presence)
- `scripts/scan_conventions.sh` - Deterministic convention signals (languages, naming styles, test patterns, tool configs, layout)
