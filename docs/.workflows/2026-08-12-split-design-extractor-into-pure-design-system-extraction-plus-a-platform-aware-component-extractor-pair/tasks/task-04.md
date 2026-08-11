
## Task 4 - feat(superui): add per-platform reference files for component extraction
- Covers: criterion #4
- TDD: none

### Dependencies
- none

### Files
- add - superui/skills/component-extractor/references/web-app.md
- add - superui/skills/component-extractor/references/mobile.md
- add - superui/skills/component-extractor/references/website.md

### Test Commands
*Build*
- none (no build step in this repo)

*Tests*
- `node --test "tests/**/*.test.ts"` (regression only - no script touched)

### Approach
1. Write the three files with an identical section skeleton so agents can consume any of them uniformly: `# <Platform> reference`, `## Interaction states` (web-app: hover/focus-visible/active/disabled/error...; mobile: pressed/long-press/focused/disabled/swipe states...; website: hover/focus/visited/scroll-triggered...), `## Unit mapping` (from reference px @1x: web 1:1 px, mobile pt/dp with density note, website 1:1 px), `## Component taxonomy` (atomic/composite examples in platform vocabulary - e.g. mobile: nav bar, tab bar, sheet, list row; website: hero, nav header, footer, CTA block), `## Expected components checklist` (the minimal set a shippable app of that platform needs, one line each with a one-clause why), `## Spec guidance` (platform-specific spec deltas: e.g. mobile touch-target floor, website above-the-fold hero rules).
2. Keep each file lean per `.claude/rules/_skills.md` (deltas only, no tables, no italics); checklists stay flat slug-like names so `component-scout` can diff them against its inventory.

### Edge cases
- none (static reference content)

### Contracts
- The shared section skeleton above is the contract `component-scout`, `spec-writer`, `component-synthesizer` and `bundle-reviewer` read; heading names are pinned.

### DoD
Three files exist with the pinned skeleton; regression suite green.


### Covered criteria
4. Three platform reference files exist under `superui/skills/component-extractor/references/` (`web-app.md`, `mobile.md`, `website.md`), each carrying: interaction-state vocabulary, unit mapping from reference px, surface/component taxonomy with atomic/composite examples, and an expected-components checklist.
