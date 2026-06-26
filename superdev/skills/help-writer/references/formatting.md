# Formatting and Structure

How to structure a page so it's easy to scan and how to choose the right construct for each
job. This file is about **concepts and judgement** — *when* and *why* to use each device. The
**exact syntax** for these constructs depends on your publishing platform; get that from the
platform's own documentation or its dedicated skill, not from here.

## Table of contents

- [Heading hierarchy](#heading-hierarchy)
- [Lists vs. numbered steps](#lists-vs-numbered-steps)
- [Emphasis and UI references](#emphasis-and-ui-references)
- [Callouts / admonitions](#callouts--admonitions)
- [Richer constructs: when each fits](#richer-constructs-when-each-fits)
- [Screenshots](#screenshots)
- [Multilingual content](#multilingual-content)

## Heading hierarchy

Use headings to create a scannable outline, not for visual size:

- One top-level heading per page — the title.
- Major sections one level below it.
- Details one level below that.

Keep to about three levels. If you need more, the page is probably trying to cover too much —
split it (see `information-architecture.md`). Make headings **descriptive** ("What a report
contains" rather than "Overview") so the reader understands the page from the headings alone,
and keep sibling headings grammatically parallel.

## Lists vs. numbered steps

- **Numbered list** when order matters — a procedure the reader follows in sequence.
- **Bulleted list** when order doesn't matter — a set of options, items, or characteristics.

Don't force prose that's really a sequence into a paragraph, and don't number things that have
no order. Each list item should be parallel in structure (all start with a verb, all are noun
phrases, etc.).

## Emphasis and UI references

- Refer to interface elements (buttons, fields, tabs, menu items) by their **exact** label and
  set them in **bold** so they stand out from surrounding prose: "Click **Save**."
- Show navigation paths as a consistent chain, e.g. `Area > Subarea > Page`.
- Use emphasis sparingly. If everything is bold, nothing is.

## Callouts / admonitions

Callouts pull a short, important note out of the flow. Most documentation platforms offer a
small ladder of severities; the concept is universal even where the syntax differs:

| Intent | Use for |
|--------|---------|
| Note | Neutral, supplementary context. |
| Tip | A helpful shortcut or best practice. |
| Important | Key information the reader must not miss. |
| Warning | A possible side effect or limitation. |
| Caution / Danger | An irreversible action or risk of data loss. |

Use callouts **sparingly** — they work by contrast, so a page full of them highlights nothing.
Keep each one short; if it needs a paragraph, it's probably body text. Match the severity to
the actual stakes (don't label a minor tip as a danger).

## Richer constructs: when each fits

Many platforms offer constructs beyond plain Markdown. Use them when they genuinely aid
comprehension, not for decoration. Choose by intent:

| Construct | Reach for it when | Avoid it when |
|-----------|-------------------|---------------|
| **Visual step sequence** (numbered/illustrated steps) | A procedure of several ordered steps benefits from clear visual progression. | The task is one or two trivial steps — a plain list is lighter. |
| **Navigation cards** | Offering the reader a choice of destinations (e.g. sub-topics, paths). | Ordinary in-text links inside a sentence. |
| **Tabs** | Showing variants of the *same* task (by role, platform, method) that the reader picks between. | Sequential content meant to be read as a whole — tabs hide content. |
| **Columns / grids** | Laying out cards or short parallel items side by side. | Body paragraphs — don't chop prose into columns. |
| **Diagrams** | A flow, dependency, state machine, or relationship is clearer drawn than described. | A simple relationship a sentence already conveys. |

The unifying rule: a construct should reduce the reader's effort. If it adds visual complexity
without adding clarity, drop it. When unsure, propose the richer formatting to the user rather
than applying it silently — the simplest form that communicates clearly is usually right.

## Screenshots

- Place an image directly after the text it supports.
- Crop to the relevant region; annotate the key element.
- Always provide descriptive alt text.
- Remember images age — don't screenshot screens that change frequently when text would do.

(See `writing-principles.md` → "Visual elements" for when a screenshot is worth including at
all.)

## Multilingual content

When the same documentation ships in more than one language, keep the languages disciplined so
they don't drift apart:

- **Designate one source language.** Author in it first; treat every other language as a
  translation of that source.
- **Translate faithfully.** Keep the same structure, headings, and order. Don't add information
  to one language that's missing from another, and don't drop any.
- **Match the product's UI language.** Translate button and field names to the labels the
  product actually shows in that language — not a literal word-for-word rendering. If you don't
  know the official translation of a UI label, confirm it rather than guessing.
- **Keep metadata in sync.** Any structural or ordering metadata should be identical across
  language versions; only the human-readable text (titles, summaries, body) is translated.
- **Use correct orthography for each language.** Always include the diacritics and special
  characters a language requires — for example, Polish needs ą ę ó ś ł ż ź ć ń, and writing it
  in plain ASCII is incorrect. The same care applies to accents and special characters in any
  other language.
