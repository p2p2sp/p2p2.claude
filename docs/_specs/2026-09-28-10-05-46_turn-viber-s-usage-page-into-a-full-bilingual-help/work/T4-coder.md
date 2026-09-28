# T4 coder notes

- Part order is now getting-started, cheat-sheet, guides, how-it-works, troubleshooting, glossary, reference: criterion 5 says the reference ends the page, so the glossary sits before it. The TOC gained the three new entries.
- Glossary entries are `<div id="term-<slug>">` inside `dl.glossary` (19 terms). Each term's first prose use, in both languages, links to it with `href="#term-..."`, which gets a dotted underline. Headings and `<summary>` labels ("drafts" at the feature guide's fold) are left unlinked on purpose. A link in a summary would fight the toggle.
- The first use of node and rule is the `CLAUDE.md` / `.claude/rules/` code in step 4 of the first-change walk. The `node` in the install paragraph is Node.js, a different sense.
- The first uses of plan gate, definition of done and tier are in how-it-works. Moving any of those paragraphs moves the term's first use as well.
- Troubleshooting entries are `details#ts-<slug>` in `div.faq`: the question sits in `<summary>`, the answer in an en/pl `p` pair. How-it-works subsections are `h3.sub#hw-<slug>`, and each already has the id T5's self-link rule needs.
- New CSS: `.faq`, `.glossary dt`, `a[href^="#term-"]`, `[id^="term-"]`. T6 restyles them.
- Round 2: the suite runs 3 times with at most 2 repairs between (implementor step "round N of 3"); qa-writer writes `qa.md` only on a UI change and `qa.e2e.md` on a UI or endpoint change. The `guide-e2e` intro was reworded the same way; the `agent-qa-writer` reference line still says only "when qa is on".
