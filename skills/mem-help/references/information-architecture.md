# Information Architecture

How to organize a help site so readers can find what they need without thinking about it. This
is about the *shape* of the documentation set — pages, sections, and their relationships — not
about any particular tool's file format.

## Table of contents

- [Mental model: match the reader's tasks](#mental-model-match-the-readers-tasks)
- [Page hierarchy](#page-hierarchy)
- [Grouping into sections](#grouping-into-sections)
- [Ordering](#ordering)
- [Navigation depth](#navigation-depth)
- [Document granularity: what becomes its own page](#document-granularity-what-becomes-its-own-page)
- [Naming pages and labels](#naming-pages-and-labels)
- [Entry points](#entry-points)

## Mental model: match the reader's tasks

Organize around what readers are trying to *do*, not around how the product is built
internally. A navigation tree that mirrors your database schema or your team's org chart will
feel alien to users. A tree that mirrors their goals ("set up", "everyday tasks", "reports",
"troubleshooting") feels obvious.

Before structuring, list the top tasks readers come for. That list is the backbone of your
hierarchy.

## Page hierarchy

Think of the documentation as a shallow tree:

- **Top level** — the major areas of the product or the major goals of the reader. These are
  the things someone should be able to spot in a sidebar at a glance.
- **Second level** — the tasks and topics within each area.
- **Third level** — details, variants, or sub-tasks, used sparingly.

Keep the tree shallow. Every extra level is another decision the reader has to make to find a
page. If you find yourself nesting four or five levels deep, that's a signal to either flatten
or split into separate top-level areas.

Each area usually has an **index/overview page** — a short landing page that orients the reader
and links to the pages beneath it. The overview answers "what's in this area and where do I go
next?", not "everything about this area".

## Grouping into sections

Within a level, related pages often benefit from a visible group header (e.g. "Getting
started", "Daily tasks", "Administration"). Grouping:

- helps readers scan a long list by chunking it,
- signals which pages belong together,
- is purely an aid to navigation — it doesn't change what any page contains.

Group only when it clarifies. A handful of pages rarely needs headers; a long list almost
always does.

## Ordering

Order pages by the sequence in which a reader is likely to need them, not alphabetically:

- Getting-started and overview pages first.
- Then everyday tasks, roughly in the order people encounter them.
- Then advanced, occasional, or administrative topics.
- Troubleshooting and reference material last.

When the publishing tool uses numeric ordering, leave gaps between values (10, 20, 30…) so you
can insert pages later without renumbering everything. Use the same relative order across all
language versions.

## Navigation depth

Aim for **breadth over depth**. Readers tolerate a moderately long list at one level far better
than a deep chain of clicks. Practical guidance:

- Prefer two or three levels; reserve a fourth only for genuinely large areas.
- If a section has only one child, you probably don't need the section — promote the child.
- If a section has more than ~7–9 children, consider splitting it or adding group headers.

## Document granularity: what becomes its own page

Give a topic its own page when:

- it answers a distinct question or covers a distinct task,
- a reader would plausibly land on it directly (from search or a link),
- combining it with its neighbors would make a page that's hard to scan.

Keep things together when:

- they're always read as a sequence and make no sense apart,
- splitting would create stubs too thin to stand alone.

The test: can you give the page a clear, specific title that promises one thing? If the only
honest title is "Miscellaneous" or "Everything about X", it should probably be split.

## Naming pages and labels

- **Be specific and descriptive.** "Reset your password" beats "Password". A label should tell
  the reader what they'll get before they click.
- **Front-load the keyword.** Readers scan the first word or two of each label.
- **Stay consistent and parallel.** If sibling pages are tasks, phrase them all as tasks
  ("Create…", "Edit…", "Delete…"). Mixed grammatical forms make a list harder to scan.
- **Keep labels short** — a few words. Save the fuller explanation for the page itself.
- A page's navigation label and its main heading should match or closely align, so the reader
  knows they arrived in the right place.

## Entry points

Most readers don't start at your homepage and read in order — they arrive from search or a deep
link, mid-tree. Design for that:

- Every page should make sense on its own: a clear title, a one-line statement of what it
  covers, and links to its parent area and related pages.
- Provide a few deliberate landing pages (a home/overview, area overviews, a getting-started
  page) for readers who do start at the top.
- Cross-link related tasks so a reader who lands on one can discover the next.
