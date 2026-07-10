# Color: 60-30-10 Distribution and Restraint

Read when choosing a palette, assigning colors to UI surfaces, or auditing a screen that feels "loud", chaotic, or unfocused.

## 60-30-10 Distribution

Mental model: a 1000px-wide strip representing all colored surface on screen — 600px neutral, 300px brand, 100px accent.

- 60% Neutral base: white/cream in light schemes, deep darks in dark mode. Its job is breathing room and a quiet backdrop for content.
- 30% Brand/structure: brand color on structural areas — panels, headers, nav. Visually dominant over the base but never the primary action signal.
- 10% Accent/CTA: the ONLY operational signal — "look here", "this is active", "click me". Apply with maximum restraint.
- Keep the 10% scarce — it must scream against the 60/30 sea; if the CTA color covers more surface, it stops working as a signpost and conversion and usability drop.
- Note: 60-30-10 is a heuristic derived from interior design, not part of WCAG/HIG/Material — treat proportions as a target, not a spec.
- Justify every deviation functionally: if breaking the ratio does not improve readability or navigation, revert to 60-30-10.
- Gradients/textures are allowed inside the 30% or 10% buckets only if they introduce no new unrelated hues that compete with the CTA.
- Multiple shades of one hue count inside that hue's bucket (e.g. several blues all live within the 30%).

## Variants

- Dark mode: 60% dark base, 30% lighter shades (subtle gradients OK for depth), 10% bright, near-glowing accent.
- Inverted color-first (strong-identity brands): intense color as the 60% base, 30% lighter hues of the SAME color, 10% still a distinct CTA color.
- Two-color projects: shift to 70-20-10, where 20% = shades/variants of the base hue — rich look from a minimal palette.
- Component level: the ratio nests — e.g. white cards (30%) on a gray page background (60%) builds layering without chaos.
- Images/UGC: exclude photos and user graphics from the math — treat them as neutral/external so their unpredictable colors don't break the system ratio.

## Color Restraint: "Everything on Fire" Anti-Pattern

Amateur tell: one intense brand color on icons, headings, input borders, AND buttons at once — everything screams, so nothing signals. Put out the fire so one element can shine.

- Junior: brand color everywhere ("pink everything"). Senior: brand color reserved for the primary CTA only.
- Junior: brand-colored text on light backgrounds, no black. Senior: black/white/gray as the text default — black text on light background for maximum contrast.
- Junior: color dominates function (branding-first). Senior: color supports function; content speaks for itself.
- Default text to black/white/gray; color in text only for links and semantic states.

## System Colors: Red/Green Are Reserved

- Reserve red strictly for errors and destructive outcomes; green strictly for success states. Never decorative.
- Never style neutral actions (e.g. Logout) in "emergency red" — it signals danger and triggers anxiety for a routine action.

Bad:  [Logout] in red — reads as destructive/error.
Good: [Logout] neutral gray/text link; red kept for "Delete account".

## "Color Through Data" (Dashboards)

- Move saturated color OUT of UI chrome (buttons, icons) and INTO the data: charts and micro-charts are the only carriers of saturated hues.
- Use deep, muted backgrounds (desaturated greens, navies) for analytics chrome — reduces eye fatigue in long sessions and lets anomalies/trends pop.
- Rationale: a restrained chrome palette lets users subconsciously ignore the UI and lock onto the data — the interface is an analytical instrument, not decoration.
- Reject AI-generated "pretty" palettes that prioritize looks over data readability.

## QA Checklist (Per Screen)

- [ ] Base (60%): does the dominant neutral give enough breathing room?
- [ ] Brand (30%): does the brand color support structure WITHOUT masquerading as an action button?
- [ ] Signal uniqueness (10%): does the CTA color appear ONLY where user interaction is required?
- [ ] Squint test: squint at the screen — the 10% CTA must be the single element that clearly pops; if several things pop (or nothing), redistribute.
- [ ] Content integration: are photos/graphics excluded from the color math without disturbing hierarchy?
- [ ] Hue consistency: do all shades of a hue stay within their assigned percentage bucket?
- [ ] Red/green audit: does red/green appear anywhere that is not an error/success or destructive/confirm state?
- [ ] Dashboard screens: is saturated color confined to data visualizations, not chrome?

## Sources

- 60-30-10 rule (origin and status as heuristic): https://en.wikipedia.org/wiki/60-30-10_rule
