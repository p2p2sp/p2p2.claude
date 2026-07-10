# SaaS Dashboards

Read when designing SaaS dashboards, KPI tiles, app navigation/sidebars, billing/pricing pages, or SaaS landing pages.

## Philosophy: Design the Hammer, Not the Poster
- A dashboard is a work tool: users come to read data, not admire branding. Every pixel of chrome competes with data.
- No oversized top bars with logo + greeting ("Welcome back, Anna!") added to "balance" the layout — they detach functionality and shrink the workspace that IS the product.
- Branding yields to data readability: charts need not use brand colors if that hurts interpretation.
- Drop global nav on secondary full-screen views (e.g. a map view) to maximize workspace.

## Containers and Layout
- Do not widgetize everything: never wrap each chart/section in its own frame. Separate with section-header typography and white space instead.
- When cards are needed, go borderless: white card on very light gray page + near-invisible shadow. No heavy borders, no dark shadows.
- Reuse ONE pattern for all section headers and ONE for all chart legends — repeated anatomy makes the interface learnable.
- Keep search and key functions in predictable global positions (top/center), fixed across screens.
- Object/list cards: key metric right-aligned, date centered, actions collapsed into a triple-dot menu — never a row of visible buttons.

## KPI Stat Tiles
- Never show the same metric in two places on one dashboard. One number, one home.
- Use a compact card grid (e.g. two-column KPI layout) so top values compare at a glance.
- Label/value sizing and number formatting -> typography.md "Data display" (label small and muted, value ~2x and bold; never the inverse).
- Trend delta: label-sized, immediately right of the value, semantic color (green + up-arrow when good, red/pink when bad). It must never compete in size with the value.
- Identical anatomy across a tile row: the same element set in the same positions on every tile (e.g. label top-left, icon chip top-right, big value below, sparkline at the bottom). Icon chips and sparklines are optional; cross-tile consistency is not.
- Sparkline color encodes trend semantics: green fill = rising/good, red-pink fill = declining/bad. The chart reads as a health signal before the number is read.
- Offer a toggle-to-split control that breaks aggregate charts into per-object series (per link, per campaign) for direct comparison.
- Add contextual density only where it aids reading: shaded regions on maps, doughnut breakdowns — richness signals a premium tool, on top of neutral chrome, never instead of it.

## Color Through Data
- Chrome stays neutral: black/white/gray, or deep muted greens/navies for dark analytics themes that reduce eye fatigue in long sessions.
- Charts and micro-charts are the ONLY carriers of saturated color. Strip bright accents from buttons and icons — a limited palette lets users ignore chrome and lock onto the anomaly or trend.
- Red/green strictly reserved for system states (error/success) and trend semantics — never decorative.

## Sidebar and Navigation
- Sidebar: left-aligned labels, dense professional spacing, navigation only (e.g. Dashboard, Analytics).
- Low-frequency items — Settings, Billing, Teams, Custom Domains, Logout — never in main nav; consolidate them into the account-card popover or a settings screen.
- Visually separate global navigation from local controls (filters that act only within the current section).

## Account and Identity
- Replace gradient initial-circles (default AI-generator output) with account cards: avatar + name + secondary line.
- Clicking the account card opens a popover holding settings, billing, and logout.

## Icons
- Use a system icon library — Lucide or Phosphor — for consistent stroke width and legibility across scales.
- No emoji as UI icons. Notion's emoji use is a brand-specific exception, not a SaaS standard.
- No icon library available (single-file deliverable, no dependencies)? Inline the SVG paths - never fall back to emoji or unicode glyphs.

## Modals and Forms
- Prefer compact modals over flyouts and loose inline forms.
- Hide advanced options by default behind a collapsed "Advanced" section — clean surface, full configurability retained.

## Billing and Pricing
- Max 3-4 plans; cut low-margin "Hobby" tiers. Name the top tier "Enterprise", not "Business" — high-volume needs signal a large organization wanting corporate features.
- Price is the largest visual element in a plan card; the plan name is secondary.
- Expose the annual discount explicitly.
- Upsell via "What's next": on the current-plan view, list the features unlocked by the next tier.
- Show trust elements: a visible contact email and the saved payment method — removes friction at the decision point.

## Landing Page
- Show the real product: lightly skewed, in-perspective screenshots of actual modules ("skewed graphics") instead of generic flat icons — a polished real interface builds trust no stock icon can.
- This principle is backed by CRO case studies (e.g. StatusCake's landing test replacing an abstract hero with real UI screenshots), but no verified universal uplift numbers exist — never quote specific conversion percentages as fact.
- Communicate benefits, not technical internals: presentation over complexity; perceived visual quality drives perceived product value.

## Sources
- Conversion Rate Experts — StatusCake landing page win report: https://conversion-rate-experts.com/statuscake-landing-page-win-report/
