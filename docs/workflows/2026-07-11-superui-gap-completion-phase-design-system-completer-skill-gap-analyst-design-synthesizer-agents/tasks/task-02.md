
## Task 2 - feat(superui): add gap-analyst agent
- Covers: criteria #3 (gap-analyst half)

### Dependencies
- Task 1 - blocks: consumes the facts-file contract

### Files
- add - superui/agents/gap-analyst.md
- modify - superui/.claude-plugin/plugin.json (agents[] gains "./agents/gap-analyst.md")

### Test Commands
*Build*
- `python3 -c "import json; json.load(open('superui/.claude-plugin/plugin.json'))"` - exit 0

*Tests*
- `grep -c "design-system-gap\|gap-analyst" superui/agents/gap-analyst.md` - frontmatter name present; manual read-through against the checklist below

### Approach
1. Frontmatter per repo pattern: `name: gap-analyst`, folded `description: >-` carrying the routing/scope guard ("Judgment stage of a design-system completion run - turns completeness FACTS into judged gaps; names WHAT is missing, never a fill value. Spawn exactly one."), `tools: Read, Write, Glob, Grep`.
2. Body input -> work -> output, no caller narrative: inputs = facts-file path, design-system dir, checklist reference paths (extractor's `references/design-system-foundations.md` and `references/component-spec.md`, pro-designer's `references/components-states.md`), output gap-report path, optional `completions.md` path (re-apply mode).
3. Work: judge each fact against the checklists - Hover/Focus-visible/Active rows are gaps only for interactive components (judge interactivity from the spec's own Definition/Anatomy); loading/empty/error trio applies at pattern level; a used primitive with no semantic role token is a tier gap; missing dark on color tokens is a gap only when the system carries any dark extension. Filter script false-positives instead of forwarding them.
4. Re-apply mode: classify every ledger entry as `still-missing` | `now-measured` (the re-extracted system now covers it) | `obsolete`, in a dedicated report section.
5. Output: gap report grouped by category (`## States`, `## Token tiers`, `## Dark coverage`, `## Re-apply` when applicable) with a leading `## Summary` count line; entry format per Contracts. Hard rules: read-only towards `.superui/design-system/`; never propose a fill value; never talk to the user.

### Edge cases
- Zero gaps → report is `## Summary` + "no gaps" (a valid, complete run).
- Facts file reports "no dark theme detected" → dark absence is reported as a NOTE for the user, not a per-token gap list.

### Contracts
- Gap entry line: `- [G<n>] <state|tier|dark> · <component-slug or token.path> · <what is missing> · basis: <checklist source or fact line>` - `[G<n>]` ids are what the user approves and what design-synthesizer receives.

### DoD
Agent file present per repo agent pattern, plugin.json valid and listing it, report/entry contract matches Task 5's dispatch text.


### Covered criteria
3. `superui/agents/gap-analyst.md` and `superui/agents/design-synthesizer.md` exist with frontmatter per repo pattern (`name`, `description` with routing/scope guard, `tools`) and both are listed in `plugin.json` `agents[]` (and in no `skills[]`).
