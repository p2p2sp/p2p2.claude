---
name: help-writer
description: "Authoring layer for the END-USER help / product documentation of the application being built — the human-facing knowledge that ships to the app's users, stored under `.superdev/help/`. Covers information architecture and page hierarchy, task-oriented structure, plain-language writing, when to use steps / callouts / tabs / diagrams, multilingual translation discipline, and a pre-publication checklist. Use this skill WHENEVER the user wants to write, plan, review, restructure, or generate user-facing documentation, help articles, onboarding / getting-started guides, knowledge-base content, a help-site navigation tree, or \"docs for the users\" of the product — even if they don't say \"best practices\" or \"help\". Output is written under `.superdev/help/` (default Markdown); the craft itself is platform-agnostic, so pair it with a generator/platform skill for the exact file syntax. Do NOT use for agent-facing project memory."
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion, Skill
model: opus
user-invocable: true
---

# help-writer — the end-user help layer

This skill is superdev's **end-user documentation layer**: it authors and maintains the help that ships to the *people who use the application being built* — written by the agent as it builds the product, for that product's human users. It is **not** memory for the agent.

The skill captures the *craft* of help that people can actually use: documentation that answers a real
question fast, reads cleanly, and reflects the product truthfully. The craft is deliberately
**platform-agnostic** — no file formats, no frontmatter fields, no construct syntax. Those belong to whatever
generator or platform you publish with. Here we only care about what to say, how to structure it, and how to
say it well.

## Where the output goes

Write the help under **`.superdev/help/`** in the host project — the canonical store for the product's
end-user documentation, a sibling of `.superdev/adr/` and `.superdev/layout/`. Default to **Markdown** for
the file mechanics, and mirror the information architecture you design (see below) directly in the directory
layout under `.superdev/help/` so the folder tree *is* the navigation tree.

When you publish through a specific documentation generator, pair this skill with that generator's skill: it
answers *how to lay the files out* for the target platform; this one answers *what good content looks like*.
This skill never invents platform syntax — if a target's exact construct syntax matters, get it from that
platform, not from here.

## Core principles (apply to everything you write)

These six principles do the heavy lifting. The reference files expand each one with patterns
and examples — read them when you need depth.

1. **Accuracy over guessing.** Document only what you can confirm. If you don't know a name, a
   navigation path, or what an action actually does, find out or ask — never invent. A page
   that is confidently wrong is worse than no page: it erodes trust and generates support
   tickets. When you genuinely cannot confirm a detail, ask the user rather than filling the
   gap with a plausible guess.

2. **Substance over the obvious.** Explain what an action *causes* and *why it matters*, not
   what a label already says. The reader can see the **Save** button; they opened the help to
   learn what saving does, what it validates, and what happens next. Rule of thumb: if a
   sentence reads like a button caption, delete it and write something the reader cannot see on
   screen.

3. **User-centered and task-oriented.** Write from the reader's goal — "how do I do X?" — not
   from the product's feature list. Lead with the outcome the user wants, then show the path to
   it.

4. **Inverted pyramid.** Put the most important information first: the result, then the steps,
   then options and edge cases, then background. People scan documentation; the key content has
   to be visible immediately.

5. **One topic per document.** Each page should answer one question or walk through one task.
   "Everything about X" pages are hard to scan and hard to maintain. Split by task instead.

6. **Plain, economical language.** Short sentences, active voice, imperative mood, present
   tense. Remove every word that does not add meaning. Prefer the word your reader already
   uses over the internal/technical term.

## Workflow

### 1. Understand the source

Identify what you're documenting and pin down the facts before writing:
- Use the **exact** names of buttons, fields, menus, and screens as they appear in the product
  — do not paraphrase or rename them.
- If the source is a screenshot or partial view, note what you can and cannot see. Anything
  off-screen or ambiguous is something to confirm, not assume.
- Establish who the reader is and what they're trying to accomplish.

### 2. Place it in the hierarchy

- Before drafting, decide where the page lives under `.superdev/help/` and how it relates to its neighbors.
- Good information architecture makes a help set navigable; realize that structure as the directory layout.
- See `references/information-architecture.md`.

### 3. Draft the content

Write the page following the core principles above, saving it to its place under `.superdev/help/`. The
patterns for procedures, audience adaptation, onboarding pages, and the pre-publication checklist are in
`references/writing-principles.md` — read it before writing substantial content.

### 4. Structure and format for scanning

- Apply formatting deliberately: clear heading hierarchy, lists where they help, richer constructs (callouts, steps, tabs, diagrams) only where they earn their place. Overusing emphasis destroys it.
- The exact syntax for these constructs depends on your publishing platform, not this skill.
- See `references/formatting.md` for when each construct fits.

### 5. Handle multiple languages (if applicable)

- Designate **one source language**; treat every other language as a faithful translation of it — same structure, same information, nothing added or dropped.
- Translate UI element names to match the product's UI in that language, and use correct orthography for each language.
- Details in `references/formatting.md` ("Multilingual content").

### 6. Review before publishing

Run the page through the pre-publication checklist in `references/writing-principles.md`. Test
every procedure step by step — instructions that were never followed end to end are where
errors hide.

## References

Read these as needed; each goes deeper than the summary above.

- `references/writing-principles.md` — **read first for any writing task.** Voice, clarity,
  accuracy, audience adaptation, step-by-step instruction patterns, onboarding pages, and the
  pre-publication checklist.
- `references/information-architecture.md` — page hierarchy, sectioning and grouping, ordering,
  navigation depth, document granularity, and how to decide what becomes its own page.
- `references/formatting.md` — heading hierarchy, lists vs. numbered steps, callouts used
  sparingly, the conceptual role of cards/tabs/columns/diagrams/screenshots, and multilingual
  discipline. Concepts only — no platform-specific syntax.
