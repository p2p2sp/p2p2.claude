# report.json — structure

The top level must be a JSON **object**, and `sections` — if present — must be a **list**. Everything else is optional and degrades cleanly: a report with no `meta` renders with a default title, and every omitted block disappears from both the render and the nav.

One deliberate exception: the **Sources appendix always renders**, even with zero citations, where it states plainly that nothing was cited. That is a fact the reader needs, not an empty block worth hiding.

```jsonc
{
  "meta": {
    "title": "Where the next $100k/mo is actually blocked",   // the H1 — a finding, not a label
    "subject": "Acme Coaching",                              // sidebar + filename
    "kicker": "Citation-backed diagnosis",                    // small sidebar line
    "eyebrow": "Business diagnosis",                          // above the H1
    "lede": "One paragraph. The whole argument in ~40 words.",
    "date": "2026-08-04",
    "mode": "full"
  },

  "verdict": {
    "headline": "One sentence. The call, stated plainly.",
    "summary": ["Paragraph.", "Paragraph."],                  // string or array
    "constraint": "Sales — closer capacity, not lead volume", // the #1, restated
    "confidence": "high"                                      // high | medium | low
  },

  // THE CONSTRAINT BOARD — the first thing the reader sees and clicks.
  // Exactly three, ranked. Each card jumps to the section that analyses it.
  "constraints": [
    {
      "rank": 1,
      "title": "Owner capacity",                  // short — it's a card heading
      "note": "One line on why this is the ceiling.",
      "target": "constraint",                     // id of the section to jump to
      "impact": 90,                               // 0-100, drives the meter
      "metric": "~70 hrs/wk"                      // optional figure on the card
    },
    { "rank": 2, "title": "...", "note": "...", "target": "pricing",   "impact": 65 },
    { "rank": 3, "title": "...", "note": "...", "target": "retention", "impact": 40 }
  ],

  "metrics": [
    { "label": "Demo → close", "value": "56%", "note": "Above Hormozi's 30–40% band." }
  ],

  "snapshot": [
    { "field": "Core offer", "value": "$5k / 6 months", "status": "verified" }
    // status: verified | inferred | missing  → drives the colour badge
  ],

  "sections": [
    {
      "id": "pricing",                    // optional; slugged from title if absent
      "title": "Offer and pricing",
      "summary": "One line under the section heading.",
      "subsections": [
        {
          "id": "pricing-close-rate",
          "title": "Close rate is a pricing signal",
          "plain": "Closing more than 4 in 10 usually means the price is too low.",
          "body": [
            "Paragraph of formal prose.",
            "Another paragraph."
          ],
          "evidence": [
            {
              "quote": "...",              // verbatim from the fetched page
              "source_url": "https://example.com/raising-prices",
              "title": "How to Raise Prices Based on Close Rate",
              "published": "2026-03-12",   // optional
              "source_id": "example-prices" // optional; groups the sources appendix
            }
          ],
          "synthesis": "Your interpretation. Renders in a separate labelled block.",
          "callout": { "type": "action", "text": "..." }   // action | risk | note
        }
      ]
    }
  ],

  "actions": [
    { "priority": 1, "action": "...", "why": "...", "owner": "Owner", "due": "Week 1" }
  ],

  "scorecard": [
    { "metric": "Demo → close", "baseline": "56%", "target": "40–45% at higher price",
      "owner": "Owner", "cadence": "Weekly" }
  ],

  "assumptions": ["Plain statements of what is unverified and what would change if wrong."]
}
```

## Rules the renderer will not enforce for you

- **`quote` must be verbatim** from a page you actually fetched. Never retype, tidy, or reconstruct one, and never quote a search-result snippet you did not open.
- **Trim the quote yourself.** Quotes render at most **480 characters**, then hard-truncate with `…`. Fetched passages routinely run 1,000+, so the default path always truncates — cut to the load-bearing sentence so the cut lands where *you* chose it, not mid-word.
- **`source_url` must be the page you read**, copied whole. The renderer shows its host as the visible link label, so a URL pointing somewhere other than the quote mislabels itself in the reader's eye.
- **Citation URLs must be `https://`.** Anything else — `http:`, `javascript:`, `data:`, a malformed shape — is dropped, the link degrades to plain text, and a rejection warning goes to stderr. A rejected URL almost always means a hallucinated one.
- **`body` vs `synthesis`** is the integrity line of the whole document. What the sources say goes in `body` next to its evidence. Your reasoning goes in `synthesis`. The render styles them differently on purpose.
- **`source_id`** groups the sources appendix when several passages come off one page. Without it the `source_url` groups them, which is usually what you want; set it only when one long page is cited under several distinct URLs (anchors, paginated views).
- **`callout.type` must be one of `action | risk | note`.** Anything else renders as an unstyled grey box — no error, just a silently meaningless signal.
- Paragraphs support `**bold**`, `*italic*`, `` `code` `` — nothing else. HTML in a string is escaped, not rendered. Emphasis markers must hug their text (`**like this**`, not `** like this **`), so a stray asterisk in prose stays literal.
- **Section and subsection `id`s are made unique automatically.** Two sections sharing a title will not collide, and a section titled "Sources" will not hijack the appendix anchor.

## Length

A full report runs 5–8 sections, 2–4 subsections each, 2–4 paragraphs per subsection. Under ~2,000 words it isn't a long-form report; over ~6,000 nobody reads it.
