# Distinctiveness - anti-generic direction

Read when setting the aesthetic direction of a new surface (landing page, hero, marketing or brand-carrying screen), when a brief leaves look-and-feel open, or when reviewing UI that reads generic, templated, or AI-generated.

Scope: direction-setting, not a decoration license. Every choice here still obeys the skill's non-negotiables (contrast, states, spacing scale, type ramp) - the signature risk lives inside the accessibility floor. When the project defines its own design system, that system IS the direction: audit against it, never invent a rival one.

## The AI-default looks - recognize and refuse

Generated UI clusters around a few recognizable looks. Each is legitimate when the brief explicitly asks for it; as an unexamined default it marks the design as generated:

- Warm cream background (near #F4F1EA) + high-contrast serif display + terracotta accent.
- Near-black background + one bright acid-green or vermilion accent.
- Broadsheet look: hairline rules, zero border-radius, dense newspaper-style columns.
- Hero built as big number + small label + supporting stats + gradient accent.
- Numbered section markers (01 / 02 / 03) on content that is not actually a sequence.
- Micro-animations scattered on everything - excess motion is itself a generated-look tell.

Rule: where the brief pins a direction, follow the brief exactly - even into one of these looks. Where the brief leaves an axis free, never spend that freedom on a default.

## Ground the direction in the subject

- If the brief does not pin down the product or subject, pin it before designing: name one concrete subject, its audience, and the page's single job - and state the choice.
- Distinctive choices come from the subject's own world - its materials, instruments, artifacts, vernacular - never from a house style applied to every project.
- Design with the real content throughout; placeholder-content thinking produces template design.

## Direction rules

- The hero is a thesis: open with the most characteristic thing in the subject's world - a headline, an image, an animation, a live demo, an interactive moment - chosen deliberately, not defaulted.
- Typography carries the personality of the page: pair display and body faces deliberately for THIS brief, never the families reached for on every project. Ramp and pairing mechanics stay in typography.md; this file governs the choice of voice.
- Structure is information: numbering, eyebrows, dividers, and labels must encode something true about the content (a real sequence, a real taxonomy) - never decoration.
- Motion is deliberate: one orchestrated moment (a page-load sequence, one scroll reveal) lands harder than scattered effects - and sometimes none is the right call.
- Match complexity to the vision: a maximalist direction needs elaborate execution; a minimal direction needs precision in spacing, type, and detail. Elegance is executing the chosen vision well.

## One signature element

- Spend boldness in ONE place: a single element the page is remembered by, embodying the brief. Everything around it stays quiet and disciplined.
- Cut every decoration that does not serve the brief. Before shipping, remove one accessory.
- Not taking any risk is itself a risk: a surface with no signature reads as template.
- The quality floor ships silently, never announced: responsive to mobile, visible focus, reduced motion respected.

## Plan-then-critique pass

Before building a new surface, write a compact direction plan, then attack it:

1. Plan: palette as 4-6 named hex values; typefaces for 2+ roles (a characterful display face used with restraint, a complementary body face, optional utility face for captions/data); a one-sentence layout concept; the signature element.
2. Critique: for each part ask "would this same choice appear for ANY similar brief?" If yes it is a default, not a decision - revise that part and note why.
3. Build only after the critique, deriving every color and type decision from the revised plan.

## Copy is design material

Templated copy makes a distinctive design read generic. Words exist to make the design easier to understand and use - bring spacing-and-color intentionality to them:

- Write from the user's side of the screen: name things by what people control and recognize ("notifications"), never by system internals ("webhook config").
- Active voice; a control says exactly what happens ("Save changes", not "Submit"); an action keeps one name through the whole flow (button "Publish" -> toast "Published").
- Errors state what went wrong and how to fix it, in the interface's voice - never vague, never apologizing. An empty screen is an invitation to act.
- Register: plain verbs, sentence case, no filler, tone matched to brand and audience. Each element does exactly one job - a label labels, an example demonstrates.
- Being specific beats being clever.

## Sources

- Anthropic frontend-design plugin skill (Apache License 2.0; distilled and adapted here) - https://github.com/anthropics/claude-plugins-public/tree/main/plugins/frontend-design
