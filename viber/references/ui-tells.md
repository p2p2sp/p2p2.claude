# UI tells

Defaults of generated UI. Each is fine when the brief asks for it; unexamined, it marks the work as generated. Avoid them.

## Layout tells

- The sequence centered hero, cards, numbered steps, feature grid, centered CTA. Keep one asymmetric or full-bleed section and vary density between neighbors.
- Three equal feature cards in a row; every group at the same count (3 features, 3 steps, 3 tiers). Counts come from the content.
- A centered eyebrow, H2 and subtitle above every section; the same text-left, image-right split repeated; uniform section padding.
- Cards for most content, icon-in-rounded-square above a title, cards inside cards inside a rounded container. One framing move per section.
- Bento grids with blank filler cells.

## Visual tells

- Purple-blue gradient, neon glows, floating blobs, mesh backgrounds, gradient text on headings, grain over a gradient.
- Glassmorphism on everything; translucency is for one floating layer only.
- Inter plus near-black plus one bright accent; Space Grotesk plus italic Instrument Serif; one serif-italic word in a sans H1.
- Unchanged Tailwind slate or zinc with indigo, or shadcn components as scaffolded. Retune neutrals, accent, radius and density.
- Emoji as icons or in headings; mixed icon sets or stroke weights; icons picked by keyword (rocket, shield, sparkles for AI).
- A colored bar on a card edge, a tinted border on every card, a different accent hue per card.
- Dark mode with no reason; gray-on-gray dark mode with layers inside one luminance band; emerald as the safe escape from purple.

## Interaction and motion tells

- Fade-up on every section; content at `opacity: 0` without JS.
- Custom cursors and pointer effects: trailing glow, spotlight, tilt cards, magnetic buttons.
- `transition: all`, micro-animations everywhere, buttons that only fade on hover, every card lifting on hover.

## Craft tells - the execution giveaways

- Spacing off a scale (`mt-[13px]`, unequal gaps between parallel elements); padding that ignores its neighbors.
- `rounded-2xl` plus `shadow-lg` as the only depth idea; type sizes off the ramp.
- Optical misalignment: icon off its label, CTAs at different heights across cards.

## Decoration tells - banned by default

- Numbered eyebrows ("01 / INDEX"), version labels in a hero, pulsing "live" dots with no real state, middle-dot spam.
- Mono-caps strips, rotated text, crosshairs, fake photo credits, weather or time strips, mock-poetic labels.
- Scroll cues; div-built fake screenshots; logo walls of text wordmarks.

## Hero discipline

- H1 over 3 lines; more than 4 text elements; subtext over about 20 words; more than one primary CTA.
- Pill tags, status-dot badges, fake stats, trust strips, pricing teasers, feature bullets or avatar rows inside the hero.

## App and AI-surface tells

- The dashboard skeleton: icon sidebar, search and bell top bar, four KPI cards with sparklines, one chart, one table. Open with the surface's real primary job.
- Centered "How can I help you today?" with four invented suggestion cards, a typewriter headline, a floating chat bubble.

## Copy and demo-content tells

- Filler words: Elevate, Seamless, Unleash, Next-Gen, Empower, Supercharge, Effortless, Streamline, Robust, Leverage, "in seconds", "10x".
- "It's not just X, it's Y"; adjective triads; formula headlines ("Everything you need to...", "Meet <Product>", "<Noun>, reimagined", "Ship faster. Scale smarter."); bold-label bullets.
- Em and en dashes in visible interface copy (headlines, captions, tooltips, empty states, errors). Use a hyphen, comma, colon or two sentences. This binds interface copy only.
- Acme, John Doe, Lorem Ipsum, round numbers (50%, 99.99%, $100.00). Use realistic names and organic data.
- Several CTA labels for one intent; closers like "Ready to get started?" or "No credit card required" that are not true.
- Three identical stat columns; testimonials with a bare name.
