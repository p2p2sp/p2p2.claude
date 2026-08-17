
## Task 2 - feat(superui): wire concept brief, token-scope limit and screenshot QA into pro-designer SKILL.md
- Covers: criteria #2, #3, #10
- TDD: none

### Dependencies
- Task 1 - blocks: Task 7

### Files
- modify - superui/skills/pro-designer/SKILL.md (sections: `## Design pass - apply in this order`, `## Design-system precedence`, `## Reference routing`, `## Final QA`)

### Test Commands
#### Build
- none (markdown-only plugin source, no build step)

#### Tests
- bash -c 'grep -c "concepting.md" superui/skills/pro-designer/SKILL.md' (expect >= 2 - Design pass + Reference routing)
- bash -c '! grep -nP "\x{2014}|\x{2013}" superui/skills/pro-designer/SKILL.md' (expect exit 0)

### Approach
1. In `## Design pass`, extend step 1: for a new Persuade/Experience surface, FIRST write the mandatory concept brief and show it to the user -> `references/concepting.md`; this step applies even when a design system exists; then ground the aesthetic direction as currently written. In step 3 add one clause: on Persuade surfaces section headings come from the display scale -> `references/typography.md`.
2. In `## Design-system precedence`, append: a token set binds palette, typography, radii and spacing - it is not a composition concept or art direction; a new Persuade/Experience surface still requires the full concept brief (`references/concepting.md`), expressed in the project's tokens.
3. In `## Reference routing`, add an entry: new Persuade/Experience surface before any layout - concept brief, section sequence, skeleton critique -> `references/concepting.md`.
4. In `## Final QA`, add one bullet (new Persuade/Experience surfaces): render the built page and take full-page desktop + mobile screenshots with whatever the host project offers; no way to render -> note it and run the same checks on the code; on the image check: skeleton test (would this section sequence ship for any similar product?), domain-artifact test (point at 3 places showing the product's world, not the template's), signature recurrence (3+ placements), "would I remember this page tomorrow?"; run the squint test on the screenshot, not rhetorically; a full-page screenshot also exposes content hidden by initial `opacity: 0` (-> `references/motion.md`). Keep it inside the existing bounded-passes discipline.

### Edge cases
- Host repo may offer no render/screenshot tooling - the QA bullet must state the fallback (run checks on code, note the gap), never hard-require a specific tool.

### Contracts
- Routing lines follow the existing `-> references/<file>.md` arrow convention of SKILL.md.

### DoD
All four SKILL.md sections updated; both grep checks pass.


### Covered criteria
2. `SKILL.md` routes to `concepting.md` from both the Design pass (before aesthetic direction, for new Persuade/Experience surfaces) and Reference routing; its Design-system precedence section states that a token set binds palette/type/radius/spacing but is not a composition concept - a new Persuade/Experience surface still requires the full concept brief expressed in the project's tokens.
3. `SKILL.md` Final QA contains a screenshot-based check for new Persuade/Experience surfaces: render full-page desktop + mobile screenshots (host tooling; if rendering is impossible, note it and run the checks on code) and apply on the image: skeleton test, domain-artifact test (point at 3 places showing the product's world), signature-recurrence test (3+ placements), memorability question; squint test runs on the screenshot.
10. No file under `superui/` gained an em dash (U+2014), en dash (U+2013), table, emoji, source URL, or external source name; `superui/.claude-plugin/plugin.json` is unchanged.
