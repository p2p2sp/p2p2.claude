
## Task 5 - feat(superui): add Persuade display-ramp rules to typography.md
- Covers: criteria #7, #10
- TDD: none

### Dependencies
- none - blocks: Task 7

### Files
- modify - superui/skills/pro-designer/references/typography.md (sections: `## Type ramp - fixed roles, never invented sizes`, new `## Persuade surfaces - the display ramp`)

### Test Commands
#### Build
- none (markdown-only plugin source, no build step)

#### Tests
- bash -c 'grep -n "Persuade" superui/skills/pro-designer/references/typography.md' (expect a match)
- bash -c '! grep -nP "\x{2014}|\x{2013}" superui/skills/pro-designer/references/typography.md' (expect exit 0)

### Approach
1. Scope the "Avoid oversized text..." bullet to Operate/Read surfaces (product UI), so it no longer contradicts the new section.
2. Add a short `## Persuade surfaces - the display ramp` section: marketing section headings come from the display scale, not the document scale (headline-vs-body gap of roughly 2x the document ramp's; an h1 at display size followed by 24px h2s reads as documentation, not marketing); extreme weight contrast is a legitimate tool (e.g. 100/900 pairings, not 400/700); when the page has no imagery budget, typography IS the imagery - oversized type as texture and composition; ramp membership stays binding, the display tokens are part of the ramp.

### Edge cases
- none

### Contracts
- none

### DoD
Both edits in place; both grep checks pass.


### Covered criteria
7. `typography.md` scopes the oversized-text warning to Operate/Read surfaces and adds a Persuade-surface display-ramp rule: section headings come from the display scale, extreme weight contrast is allowed, and oversized type serves as imagery when the page has no imagery budget - ramp membership stays binding.
10. No file under `superui/` gained an em dash (U+2014), en dash (U+2013), table, emoji, source URL, or external source name; `superui/.claude-plugin/plugin.json` is unchanged.
