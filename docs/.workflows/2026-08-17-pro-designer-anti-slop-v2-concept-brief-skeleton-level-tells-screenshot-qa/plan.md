# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Pro-designer anti-slop v2 - concept brief, skeleton-level tells, screenshot QA"

---
<!-- HEADER -->

## Goal
The pro-designer skill source (superui plugin) enforces page-level anti-slop discipline: a mandatory concept brief before any new Persuade/Experience surface (new `references/concepting.md`), skeleton-level and second-generation tells in `anti-slop.md`, verifiable subject-artifact and signature-recurrence rules in `distinctiveness.md`, a Persuade display ramp in `typography.md`, a scroll-reveal budget with a no-JS visibility rule in `motion.md`, a design-system-precedence clarification plus screenshot-based Final QA in `SKILL.md`, and `superui/CLAUDE.md` synced.

## Context
A landing page built with pro-designer passed every individual anti-slop ban yet reproduced the canonical AI-landing skeleton as a whole. Four failure mechanisms were diagnosed: bans operate per-section while slop lives at page-skeleton level; the plan-then-critique pass requires no concept, anti-references, or section-sequence plan; design-system precedence ("that system IS the direction") lets tokens excuse skipping aesthetic direction; and the signature element carries no recurrence obligation. Additionally typography.md warns against oversized text (wrong for Persuade surfaces), motion.md sets no per-page scroll-reveal cap, and Final QA never looks at a render. Fixes P1-P10 land in the plugin source only; they take effect after publish + `/plugin update`, so nothing is testable by invoking the installed skill in-session. All new content is English, LLM-first style (short bullets, deltas only, no tables, no emoji, plain hyphens only, zero source attribution - no URLs, external framework/repo/author names).

## Acceptance criteria
1. `superui/skills/pro-designer/references/concepting.md` exists and specifies a mandatory pre-layout Concept Brief (shown to the user) with exactly these parts: thesis (one sentence of what the page proves), subject world (3-5 physical artifacts/rituals, at least one promoted to the page's main visual device), one narrow out-of-web reference anchor justified by the subject, 3 named anti-references (deliberate taboos), signature element with a recurrence plan (at least 3 placements), and a section sequence listing a layout family per section - plus a skeleton critique ("would this same section sequence ship for any similar product?" - if yes, redesign the outline, not the cosmetics), applying also when the project already has a design system.
2. `SKILL.md` routes to `concepting.md` from both the Design pass (before aesthetic direction, for new Persuade/Experience surfaces) and Reference routing; its Design-system precedence section states that a token set binds palette/type/radius/spacing but is not a composition concept - a new Persuade/Experience surface still requires the full concept brief expressed in the project's tokens.
3. `SKILL.md` Final QA contains a screenshot-based check for new Persuade/Experience surfaces: render full-page desktop + mobile screenshots (host tooling; if rendering is impossible, note it and run the checks on code) and apply on the image: skeleton test, domain-artifact test (point at 3 places showing the product's world), signature-recurrence test (3+ placements), memorability question; squint test runs on the screenshot.
4. `anti-slop.md` names as tells: the canonical section sequence itself (centered hero -> cards -> numbered steps -> feature grid -> centered CTA) with minimum variation requirements (one fully asymmetric or full-bleed section, one section of different density/temperature, never two adjacent sections in the same card-on-slab language); uniform section padding; cardocalypse limits (max ~50% of page content in cards, the most important feature gets unique non-card treatment, icon-in-rounded-square-above-title named as a tell); fade-up-on-scroll on every section plus content invisible without JS (deferring limits to motion.md).
5. `anti-slop.md` opens with an entropy meta-rule (any mass-repeated recommendation becomes the next default; safe escape looks are second-generation tells) and adds these tells: colored 3-4px card edge bar, single serif-italic word in a sans H1, unjustified permanent dark mode, safe emerald/green as a purple escape, eyebrow pill with dot above the H1, "It's not just X, it's Y" cadence, adjective triads. No duplicate of the existing gradient-text tell.
6. `distinctiveness.md`: the design-system scope line no longer says the system IS the direction (tokens bind values; a new Persuade/Experience surface still needs the concept brief); subject grounding is a verifiable rule (products about physical/visual objects must render them as designed graphic elements, line icons only for abstract concepts, with the point-at-3-places test); the signature element requires recurrence in at least 3 points in consistent form (quieter returns allowed, but present); the "Plan-then-critique pass" section is replaced by a one-line pointer to `concepting.md`.
7. `typography.md` scopes the oversized-text warning to Operate/Read surfaces and adds a Persuade-surface display-ramp rule: section headings come from the display scale, extreme weight contrast is allowed, and oversized type serves as imagery when the page has no imagery budget - ramp membership stays binding.
8. `motion.md` adds a scroll-reveal budget (one orchestrated entrance plus at most 1-2 reveal moments per page; all other content renders visible) and a hard rule that content is visible without JS and in full-page screenshots (initial `opacity: 0` on content is a defect; JS adds animation, not visibility), reflected in the "Never ship" list and referenced from the reveal-on-scroll recipe.
9. `superui/CLAUDE.md` describes pro-designer's anti-generic direction as split across three references (concepting.md, distinctiveness.md, anti-slop.md) and mentions the screenshot-based Final QA step.
10. No file under `superui/` gained an em dash (U+2014), en dash (U+2013), table, emoji, source URL, or external source name; `superui/.claude-plugin/plugin.json` is unchanged.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - feat(superui): add pro-designer concepting reference with mandatory concept brief
- Covers: criteria #1, #10
- TDD: none

### Dependencies
- none - blocks: Task 2, Task 3, Task 7

### Files
- add - superui/skills/pro-designer/references/concepting.md (sections: intro "Read when", `## The concept brief`, `## Skeleton critique`)

### Test Commands
#### Build
- none (markdown-only plugin source, no build step)

#### Tests
- bash -c '! grep -rnP "\x{2014}|\x{2013}" superui/skills/pro-designer/references/concepting.md' (expect exit 0 - no em/en dashes)

### Approach
1. Create `concepting.md` opening with a "Read when" line: before building ANY new Persuade or Experience surface, before the layout skeleton - also when the project defines a design system (tokens bind values, not the concept).
2. Write `## The concept brief` as a numbered 6-part artifact (5-10 lines total, written out and shown to the user before any layout work): thesis; subject world (3-5 physical artifacts/rituals from the product's domain, at least one promoted to the page's main visual device); one narrow out-of-web reference anchor justified by the subject and different per brief - never from a stock list; 3 named anti-references (what the page deliberately does NOT do because everyone in the category does); signature element + recurrence plan (at least 3 placements: hero, mid-page, CTA/footer - form named for each); section sequence with a layout family named per section (families -> anti-slop.md).
3. Write `## Skeleton critique`: before building, attack the sequence - "would this same section sequence ship for any similar product?"; if yes, redesign the outline, not the cosmetics; after the critique, derive every build decision from the revised brief.
4. Style: English, short bullets, plain hyphens, no tables/emoji, no source attribution.

### Edge cases
- none

### Contracts
- The brief is a conversational artifact shown to the user, not a file the skill persists in the host repo (pro-designer stays advisory, writes nothing).

### DoD
`concepting.md` exists with the three sections above covering all six brief parts and the skeleton critique; dash grep passes.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - refactor(superui): tighten distinctiveness.md - token scope, subject artifacts, signature recurrence
- Covers: criteria #6, #10
- TDD: none

### Dependencies
- Task 1 - blocks: Task 7

### Files
- modify - superui/skills/pro-designer/references/distinctiveness.md (sections: intro scope paragraph, `## Ground the direction in the subject`, `## One signature element`, `## Plan-then-critique pass`)

### Test Commands
#### Build
- none (markdown-only plugin source, no build step)

#### Tests
- bash -c '! grep -n "Plan-then-critique pass" superui/skills/pro-designer/references/distinctiveness.md' (expect exit 0 - section replaced)
- bash -c '! grep -nP "\x{2014}|\x{2013}" superui/skills/pro-designer/references/distinctiveness.md' (expect exit 0)

### Approach
1. Rewrite the scope sentence "When the project defines its own design system, that system IS the direction...": the project's tokens bind palette, type, radius and spacing and are audited, never rivaled - but a new Persuade/Experience surface still requires the concept brief (concepting.md), expressed in those tokens.
2. In `## Ground the direction in the subject`, add a verifiable rule: when the product concerns physical or visual objects, the page MUST show them as designed graphic elements (their shapes, proportions, layouts from their world); line icons are allowed only for abstract concepts; test - point at 3 places on the render that show the product's world, not the template's.
3. In `## One signature element`, add: a signature element exists only if it recurs in at least 3 points of the page in consistent form; one hero effect followed by neutral cards is decoration, not a signature; returns may be quieter (list marker, chip shape, CTA background) but must exist.
4. Replace the whole `## Plan-then-critique pass` section with a one-line pointer: the mandatory pre-build concept brief and skeleton critique live in concepting.md (mirroring the existing anti-slop.md pointer style).

### Edge cases
- none

### Contracts
- none

### DoD
The four edits are in place, the old plan-then-critique body is gone, both grep checks pass.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - feat(superui): add skeleton-level and second-generation tells to anti-slop.md
- Covers: criteria #4, #5, #10
- TDD: none

### Dependencies
- none - blocks: Task 7

### Files
- modify - superui/skills/pro-designer/references/anti-slop.md (sections: intro paragraph, `## Layout tells`, `## Visual tells`, `## Hero discipline`, `## Copy and demo-content tells`)

### Test Commands
#### Build
- none (markdown-only plugin source, no build step)

#### Tests
- bash -c 'grep -n "second-generation" superui/skills/pro-designer/references/anti-slop.md' (expect a match - entropy meta-rule present)
- bash -c '! grep -nP "\x{2014}|\x{2013}" superui/skills/pro-designer/references/anti-slop.md' (expect exit 0)

### Approach
1. Intro: append the entropy meta-rule - any concrete recommendation repeated at scale becomes the next default; the file forces a subject-justified DECISION, never swaps one ready-made look for another; "safe escape looks" (emerald instead of purple, navy + glow instead of a mesh gradient, cream + serif + terracotta) are second-generation tells.
2. `## Layout tells`: add the top-order tell - the canonical section SEQUENCE (centered hero -> cards -> numbered steps -> feature grid -> centered CTA) is a tell in itself even when every section passes the individual bans; minimums: at least one fully asymmetric or full-bleed section, at least one section of different density/temperature than its neighbors, never two adjacent sections in the same card-on-slab language. Extend the existing uniform-rhythm bullet: constant section padding is a tell - vertical rhythm changes deliberately (a tight section after a spacious one). Add the cardocalypse bullet: max ~50% of page content in cards; the most important feature gets a unique non-card treatment; the rest may be a list or editorial layout; icon-in-a-rounded-square above a title is a named tell.
3. `## Visual tells`: add - fade-up-on-scroll on every section (budget -> motion.md); content invisible without JS / initial `opacity: 0` on content (hard rule -> motion.md); colored 3-4px bar on a card edge; a single serif-italic word inside a sans-serif H1; permanent dark mode as a reflex with no brief justification; safe emerald/green as the escape from purple. Do NOT duplicate the existing gradient-text tell.
4. `## Hero discipline`: add the eyebrow pill with a status dot above the H1 as a named default. `## Copy and demo-content tells`: add the "It's not just X, it's Y" cadence and adjective triads ("fast, simple, secure") as banned cadences.

### Edge cases
- none

### Contracts
- New tells keep the existing bullet style: tell first, then the fix or the reference arrow.

### DoD
All four sections updated with no duplicated tells; both grep checks pass.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - feat(superui): add scroll-reveal budget and no-JS visibility rules to motion.md
- Covers: criteria #8, #10
- TDD: none

### Dependencies
- none - blocks: Task 7

### Files
- modify - superui/skills/pro-designer/references/motion.md (sections: new `## Scroll-reveal budget` after the hunt list, `## clip-path recipes` reveal bullet, `## Never ship`)

### Test Commands
#### Build
- none (markdown-only plugin source, no build step)

#### Tests
- bash -c 'grep -n "Scroll-reveal budget" superui/skills/pro-designer/references/motion.md' (expect a match)
- bash -c '! grep -nP "\x{2014}|\x{2013}" superui/skills/pro-designer/references/motion.md' (expect exit 0)

### Approach
1. Add `## Scroll-reveal budget` after the hunt list: per page - one orchestrated entrance (typically the hero) plus at most 1-2 reveal moments; everything else renders visible; fade-up on every section is a named generated-look tell (anti-slop.md).
2. In the same section, the hard technical rule: content must be visible without JS and in a full-page screenshot - initial `opacity: 0` on content is an accessibility, SEO and share-card defect; progressive enhancement only (a JS-added class enables the animation, never the visibility).
3. In `## clip-path recipes`, append to the reveal-on-scroll bullet: counts against the scroll-reveal budget.
4. In `## Never ship`, add two entries: fade-up on every section -> the scroll-reveal budget; content hidden until a scroll handler runs -> visible by default, JS adds motion only.

### Edge cases
- none

### Contracts
- none

### DoD
New section plus both Never-ship entries present; both grep checks pass.

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - docs(superui): sync superui CLAUDE.md with pro-designer anti-slop v2
- Covers: criteria #9, #10
- TDD: none

### Dependencies
- Task 1, Task 2, Task 3, Task 4, Task 5, Task 6 - blocks: none

### Files
- modify - superui/CLAUDE.md (the `pro-designer` bullet under `## Skills (flat-named, single domain)`)

### Test Commands
#### Build
- none (markdown-only plugin source, no build step)

#### Tests
- bash -c 'grep -n "concepting.md" superui/CLAUDE.md' (expect a match)
- bash -c 'node --test "tests/**/*.test.ts"' (sanity - no plugin script touched, suite stays green)

### Approach
1. Rewrite the pro-designer bullet's anti-slop clause: aesthetic direction split across three references - `references/concepting.md` (mandatory pre-layout concept brief + skeleton critique for new Persuade/Experience surfaces, binding even when the host defines a design system), `references/distinctiveness.md` (defaults refusal, subject grounding with the physical-artifact rule, signature element with 3-point recurrence, consistency locks), `references/anti-slop.md` (forensic tells catalog incl. skeleton-level sequence tells and the entropy meta-rule).
2. Mention the screenshot-based Final QA step (full-page render checks for new Persuade/Experience surfaces) in the same bullet.
3. Verify `superui/.claude-plugin/plugin.json` needs no change (references are not cataloged; no skill/agent added) - do not edit it.

### Edge cases
- none

### Contracts
- none

### DoD
`superui/CLAUDE.md` reflects the three-reference split and screenshot QA; grep matches; `node --test` suite green.

<!-- /TASK -->
