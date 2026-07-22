# Typography

Read when choosing font sizes, line-heights, weights, letter-spacing, or font families, or when styling text-heavy UI: headings, paragraphs, forms, cards, KPI/stat displays.

## Type ramp — fixed roles, never invented sizes

- Pick every font-size from a fixed ramp with named roles. Never emit one-off sizes (13px, 15px, 17px, 19px) — snap to the nearest ramp step. Arbitrary px values are the most common tell of a generated UI.
- Default ramp = Material Design 3: 15 tokens, 5 roles x 3 sizes. Values below are px font-size/line-height (large, medium, small):
  - Display: 57/64, 45/52, 36/44 - weight 400
  - Headline: 32/40, 28/36, 24/32 - weight 400
  - Title: 22/28 (weight 400), 16/24 (500), 14/20 (500)
  - Body: 16/24, 14/20, 12/16 - weight 400
  - Label: 14/20, 12/16, 11/16 - weight 500

- Role mapping: display = short hero text/numerals; headline = page-level headings; title = card headers, dialog titles; body = paragraphs; label = buttons, captions, inputs. Ramp membership is binding, role mapping is the default guide - e.g. a full-width 48px CTA may step up from label-large to 16px/600.
- Avoid oversized text — huge fonts make the UI look bloated and unfinished, not premium.

## Body text

- Default body: 16px / line-height 1.5 (16/24). Dense secondary text only: 14px / ~1.43 (14/20).
- Never set running text below 12px; never render any text below 11px (Apple's floor is 11pt).
- Paragraph spacing at least 1.5x the line spacing (body 16/1.5 -> `margin-bottom: ~1em-1.5em`, never 0).
- Left-align; `text-align: justify` is banned for UI copy — creates rivers of space (WCAG 1.4.8).
- Layout must survive 200% text zoom without horizontal scrolling (WCAG 1.4.8).

## Line-height — inverse to font size, never one global value

- Body 12-16px: 1.4-1.6. Sub-headings 20-24px: ~1.3. Large headings 28-36px: 1.15-1.25. Display 45px+: 1.0-1.12.
- Use unitless values per role: `h1 { font-size: 3rem; line-height: 1.1 }` `p { line-height: 1.5 }`.
- Copying body line-height onto headings makes multi-line headings fall apart; large headline text at line-height 1 is fine (Refactoring UI).
- Also scale with measure: narrow columns (<50ch) ~1.5; wide text blocks up to 2.0 — raise leading rather than keep 1.5 on a wide paragraph.

## Measure (line length)

- Put `max-width: 65ch` (or ~34em) on every paragraph container; optimal is 50-75 characters per line (Baymard).
- Never let running text span the full width of a desktop layout; 100+ character lines fatigue readers.
- Hard accessibility ceiling: 80 characters, 40 for CJK (WCAG 1.4.8, AAA).

## Letter-spacing — varies by size, never one global value

- Display 36px+: slightly negative (M3 display-large: -0.25px; up to -0.02em safe).
- Headlines 24-32px: 0. Body: 0 to +0.5px (M3: body-large +0.5px, body-medium +0.25px).
- Small labels/captions 11-14px: positive, +0.1px to +0.5px.
- ALL-CAPS text always gets extra tracking: +0.05em to +0.1em.
- Apple nuance: SF system fonts are variable fonts with continuous optical sizing and per-size tracking applied by the OS — the old "SF Text below 20pt / SF Display at 20pt+" hard switch applies only to the legacy static fonts.

## Hierarchy — size + weight + color, never more typefaces

- Build hierarchy with size, weight, and color together. To emphasize at the same size, step weight up (Apple: Body = 17pt Regular, Headline = 17pt Semibold) — never add a font.
- Weights: 400 for display/headline/body; 500-600 for titles, labels, buttons. Don't bold everything; don't use heavy weights at display sizes.
- One typeface family per UI by default; hard max 2. If pairing: contrast classification (serif headings + sans body), match x-heights; prefer a superfamily (Roboto + Roboto Serif + Roboto Mono, IBM Plex) or one variable family.
- Align a leading icon to the adjacent text's cap-height and size it near that cap- or x-height, so icon and label share one optical line instead of sitting off-center (icon sizes on the grid -> layout-spacing.md).
- Cards need 3-4 explicit hierarchy tiers — full card anatomy in components-states.md.

## Data display

- Mute the label, amplify the value: label small (12-14px, label tokens), regular weight, muted gray; value ~2x label size, bold, maximum contrast. Never invert (big bold "Earnings" over a tiny "$4,981.00" is the classic mistake).
  - Bad: `Earnings` 24px bold, `$4,981.00` 13px. Good: `Earnings` 12px gray, `$4,981.00` 28px bold.
- Bold the number, mute the unit: `1634` bold dark + `sqft` regular gray; `5` bold + `bed.` muted — users compare numbers, units are context.
- Trend deltas stay small (~12px, label-size), semantically colored, immediately beside the value — never competing with it.
- Format numbers: thousands separators, currency, one-decimal percentages, abbreviations where space is tight (`$4,981.00`, `2,121`, `3.2%`, `12.4k`).

## Forms and links

- Reading order top to bottom: 1) goal (heading, e.g. "Sign in") -> 2) inputs -> 3) primary CTA -> 4) alternatives. Secondary actions ("Sign up") become text links, never equal-weight buttons next to the CTA.
- Labels: ALL-CAPS or bold to distinguish from content (caps labels get +0.05-0.1em tracking).
- Placeholders: lower opacity than input text, and never used as the label — a full-opacity placeholder reads as a filled field.
- Links: underline or a clearly distinct color vs static text — users must not guess what is clickable.

## Spacing-tolerant text containers

- Never fix the height of any element containing wrapping text; never `overflow: hidden` on paragraph containers; size text in rem.
- Layout must lose nothing when users override: line-height 1.5x font size, paragraph spacing 2x, letter-spacing 0.12em, word-spacing 0.16em (WCAG 1.4.12, AA). Fixed-height cards with px text are the typical failure.

## Sources

- Material Design 3 Typography — https://m3.material.io/styles/typography
- M3 typescale tokens (material-web v0.192) — https://raw.githubusercontent.com/material-components/material-web/main/tokens/versions/v0_192/_md-sys-typescale.scss
- Apple HIG Typography — https://developer.apple.com/design/human-interface-guidelines/typography
- Baymard Institute: The Optimal Line Length — https://baymard.com/blog/line-length-readability
- Refactoring UI: Line-height is proportional — https://refactoringui.com/previews/line-height-is-proportional
- WCAG 2.2 Understanding SC 1.4.8 Visual Presentation — https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html
- WCAG 2.2 Understanding SC 1.4.12 Text Spacing — https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html
- Google Fonts Knowledge: Pairing typefaces within a family/superfamily — https://fonts.google.com/knowledge/choosing_type/pairing_typefaces_within_a_family_superfamily
