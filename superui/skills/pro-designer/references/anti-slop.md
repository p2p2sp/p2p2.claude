# AI-slop tells - recognize and remove

Loaded first on any UI job, before any other design reasoning - not fetched on demand once a draft exists. It stays active through layout, color, type, copy, demo data and review alike.

These are the statistical defaults of generated UI - the patterns a model reaches for when no one decides otherwise. Each is legitimate when the brief explicitly asks for it; as an unexamined default it fingerprints the design as generated. The brief always wins (SKILL.md "Scope discipline"). Anti-patterns matter as much as rules: they are the model's own failure modes, so they never surface without being named.

Entropy meta-rule: any concrete recommendation repeated at scale becomes the next default. This file forces a subject-justified decision, never a swap of one ready-made look for another. Treat "safe escape" looks as second-generation tells, not as safety - emerald instead of purple, navy plus glow instead of a mesh gradient, cream plus serif plus terracotta instead of Inter-and-gradient. Cloning one recognizable product wholesale is the same move with a better reference, and the four current clone looks read as generated the moment they arrive unbriefed: near-black plus subtle grain plus 1px low-contrast borders plus gray body text plus small radius; pure black-and-white with monospace micro-labels and hairline grid lines; brutalist-lite (thick black borders, hard offset shadows, one acid yellow); glassy bento tiles on dark. Picking the alternative everyone else now also picks is the same failure one layer down.

## Layout tells

- The canonical section SEQUENCE is a tell in itself, even when every individual section passes every ban below: centered hero -> cards -> numbered steps -> feature grid -> centered CTA. A page that runs this order end to end reproduces the generic skeleton no matter how the sections are dressed. Minimums: at least one fully asymmetric or full-bleed section; at least one section of visibly different density or temperature than its neighbors; never two adjacent sections in the same card-on-slab language.
- Centered hero + two CTAs over a dark mesh gradient - the single most common generated opening.
- Three equal cards in a row as the feature section. Use a 2-column zig-zag, an asymmetric grid (e.g. 2fr 1fr 1fr), or a horizontal scroll instead.
- The count reflex: 3 features, 3 steps, 3 tiers, 3 testimonials, 4 KPI tiles, all on one page. Item counts come from the content - when every section lands on the same number, nobody chose it. Break at least one group off the house count (2, 5, 7 items), or merge and cut until the count is the true one.
- The centered section header stacked above every section: eyebrow, centered H2, centered 1-2 line subtitle. At most 2 centered section headers per page - elsewhere set the heading left, or fold it into the content instead of announcing the section.
- The same left-text / right-image split repeated down the page. Never twice in a row; cap alternating zig-zag runs at 2; a layout family (3-col cards, full-width quote, split text+image) appears at most once per page, and an 8-section page needs at least 4 different families.
- Uniform section rhythm: every section the same density, alignment, and scale. Vary density, image-to-text ratio, alignment, and tempo deliberately - calmer sections between denser ones, so the page reads as paced, not as repeated slabs. Constant section padding is its own tell: vertical rhythm changes deliberately too - a tight section right after a spacious one reads as paced, uniform padding down the whole page reads as templated.
- Cardocalypse: at most ~50% of page content lives inside cards. The single most important feature gets a unique, non-card treatment - not the same rounded-rect-with-shadow as everything else. The rest can be a plain list or an editorial layout instead of another card grid. Icon-in-a-rounded-square sitting above a title is itself a named tell, independent of the card question.
- Box-in-box-in-box: cards inside cards inside a giant rounded section container. One primary framing move per section (containment rules -> layout-spacing.md).
- Bento grids with dead cells: N items = N cells, spans interlock, no blank filler tile and no empty corner. 3-5 intentional cells beat 8 messy ones.

## Visual tells

- The purple-blue "AI gradient", neon glows and glowing edges, floating blobs, mesh-blob backgrounds.
- Glassmorphism stacked on everything; gradient text on large headings as a shortcut for "premium".
- Inter + near-black + one bright accent as the automatic everything-look. Inter is fine for neutral product UI; it fails only as the unexamined answer to every brief (typeface voice -> distinctiveness.md).
- Untouched framework defaults: stock Tailwind slate/zinc neutrals with indigo-600 or violet-600 as the accent, or shadcn/ui components exactly as scaffolded (default card header stack, default button variants, stock Lucide set, default radius). The tell is not the library, it is that nothing was chosen - retune neutrals, accent, radius and density before shipping.
- Custom cursors; micro-animations scattered on everything (motion rules -> components-states.md).
- Emoji as UI icons; mixed icon sets or mixed stroke weights - one icon family, one stroke weight, everywhere.
- Icons picked by keyword match: rocket for launch, lightning for fast, shield for secure, brain or sparkles for anything AI. Sparkles in particular - as an icon, as a gradient "AI" badge, on an "Ask AI" button - is the current universal AI signifier and reads as generated on sight. Draw the icon from the product's own world, or ship the label alone.
- Fade-up-on-scroll applied to every section - a reveal budget exists for a reason (-> motion.md).
- Content invisible without JS: initial `opacity: 0` (or equivalent) on real content is a hard defect, not a motion choice - it breaks a static screenshot and a no-JS render alike (-> motion.md).
- A colored 3-4px bar on a card edge as the default way to signal "this one matters."
- A single serif-italic word dropped inside an otherwise sans-serif H1.
- Permanent dark mode adopted as a reflex, with no brief reason a dark-only surface serves the product.
- Emerald or green reached for as the safe escape from purple - still a reflex, just a newer one.

## Decoration tells - banned by default

- Numbered section eyebrows ("01 / INDEX", "SECTION 02") on content that is not a sequence. Ration eyebrows to at most 1 per 3 sections - and prefer deleting them; the headline is enough.
- Version labels in a hero ("V0.6", "BETA", "EARLY ACCESS") outside a genuine launch; version footers ("v1.4.2", "Build 0048") on marketing pages.
- Decorative status dots and pulsing "live" indicators with no real state behind them - only for real semantic state, at most one per section.
- Middle-dot spam: at most one "·" per metadata line, never the default everything-separator.
- Mono-caps decoration strips ("DESIGN · BUILD · SHIP"), vertical rotated text, decorative crosshairs and hairline grids that encode nothing.
- Fake photo credits ("Field study no. 12"), weather/locale/time strips ("LIS 14:23 · 18°C"), mock-poetic section labels ("From the field", "On our desks").
- Scroll cues of any kind ("Scroll to explore", bouncing chevrons, numbered scroll markers) - the bottom of the viewport does not need a label.
- Fake div-built product screenshots (fake terminals, fake task lists, fake dashboards) - use a real screenshot, a real working mini component, or nothing.
- Logo walls built from styled text wordmarks, category labels under logos, unreadable micro-logo tickers. Real logos, sized to read, or no logo wall.

## Hero discipline

- The H1 never exceeds 2-3 lines. A 4-line hero headline is a container-width or font-size error, not a copy problem: widen the heading container and clamp() the size down until the count holds - or cut words.
- The hero stack holds at most 4 text elements: (eyebrow OR brand strip OR neither) + headline + subtext of at most ~20 words + CTAs (1 primary, at most 1 quiet secondary). If the value proposition needs more than 20 words, the proposition is unclear, not the limit too tight.
- Banned inside the hero: pill tags, fake stats, badges, trust micro-strips, pricing teasers, feature bullets, avatar rows. All of it moves below; a logo wall goes under the hero, never in it.
- The eyebrow pill with a leading status dot above the H1 ("dot + Now available", "dot + New") is itself a named default - not a neutral container choice.
- First-viewport test on a small laptop: headline, supporting text, one visible CTA, one focal point - without exposing the whole product in one crowded view.

## App and AI-surface tells

- The canonical dashboard skeleton: icon sidebar left, top bar with search + bell + avatar, a row of 4 KPI cards with trend arrow and sparkline, then one chart, then one table. Same failure as the canonical section sequence - reproduce it and the app reads as scaffolded regardless of styling. Open with the surface's real primary job (the queue, the document, the map, the one number that decides something) and let the rest follow from it.
- Chat and AI surfaces: the centered "How can I help you today?" with four suggestion cards under it, a typewriter effect on the headline, a floating chat bubble parked bottom-right. Suggestions ship only when they come from real context or real history; a static four-card grid of invented prompts is decoration.

## Copy and demo-content tells

- Banned filler vocabulary: Elevate, Seamless, Unleash, Next-Gen, Revolutionize, Transformative, Game-changer, Delve, Empower, Supercharge, Effortless, Streamline, Cutting-edge, Robust, Leverage, Harness, "unlock your potential", "powered by AI", "in seconds", "10x", "say goodbye to". Concrete verbs; specific beats clever (voice rules -> distinctiveness.md).
- Banned cadences: the "It's not just X, it's Y" construction in any variant; adjective triads ("fast, simple, secure") as the default way to summarize a value proposition.
- Banned headline formulas: "<Verb> your <noun> with AI", "The <adjective> way to <verb>", "Everything you need to <verb>", "Meet <Product>", "The future of <noun>", "<Noun>, reimagined", "Built for the modern <noun>", and paired two-word imperatives with full stops ("Ship faster. Scale smarter."). A headline says what the product does and for whom, in the subject's own vocabulary.
- Banned fake brands and people: Acme, Nexus, Flowbit, Quantumly, NovaCore, SmartFlow; John Doe, Jane Smith. Invent contextual, realistic, locale-appropriate names; every person gets a distinct avatar, never an egg placeholder.
- Round fake numbers read as fake: 50%, 99.99%, $100.00, 1234567. Use organic data: 47.2%, $99.40, +1 (312) 847-1928, non-uniform dates. Never Lorem Ipsum - write real draft copy.
- One CTA label per intent per page: "Get in touch", "Contact us" and "Let's talk" are the same intent - pick one label and reuse it in nav, hero, and footer. CTA labels fit one line, at most ~3 words.
- The default CTA tail: "Ready to get started?" or "Start building today" as the closing-section headline, with "No credit card required" under the button. Write the closing line from the actual next step the reader takes, and keep the reassurance only when it is a true fact about the offer.
- Testimonials: at most ~3 lines of quote, attribution = name + role (+ company), never a bare name; real typographic quotes or none.
- Stat rows and charts only where the domain logically needs them - no three identical stat columns ("99% satisfaction / 10x faster / infinite scale"). Otherwise keep proof human: quotes, real-workflow screenshots, timelines.
- Before shipping, re-read every visible string: cute-but-wrong wordplay, unclear referents, and mock-poetic micro-copy are worse than boring copy.
