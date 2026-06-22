# Writing Principles

Condensed, platform-neutral best practices for end-user documentation, distilled from the
public style guides of major software and documentation teams. Read this before writing
substantial content.

## Table of contents

- [Fundamentals](#fundamentals)
- [Style and language](#style-and-language)
- [Step-by-step instructions](#step-by-step-instructions)
- [Onboarding and getting started](#onboarding-and-getting-started)
- [Writing for different audiences](#writing-for-different-audiences)
- [Visual elements](#visual-elements)
- [Keeping documentation current](#keeping-documentation-current)
- [Pre-publication checklist](#pre-publication-checklist)

## Fundamentals

### User-centered

Documentation exists to help the reader reach their goal as fast as possible. Write from the
reader's perspective, answering "how do I do this?" rather than "what does this do?". Focus on
tasks, not features.

- **Feature-first (weak):** "The reporting module offers advanced aggregation with a
  configurable pipeline."
- **Task-first (strong):** "Build a monthly summary report in a few minutes."

### Inverted pyramid

Lead with what matters most, because readers scan rather than read top to bottom:

1. **Result** — what the reader will achieve.
2. **Steps** — how to do it.
3. **Details** — options and variants.
4. **Background** — context, the "why", anything optional.

### One topic per document

Each article should answer one question or cover one task. Split broad "complete guide" pages
into focused ones — they are easier to find, scan, and keep up to date.

- Instead of: "Reports — Complete Guide"
- Prefer: "Create a report", "Schedule a recurring report", "Export a report to CSV"

## Style and language

### Make every word matter

Remove any word that doesn't add value. Keep sentences short (aim under ~25 words), one idea
per sentence, and avoid double negatives.

- **Before:** "In order to make a change to a record, you must first ensure that you have the
  appropriate permissions for editing in the system."
- **After:** "To edit a record, you need edit permissions."

### Active voice and imperative mood

| Weak (passive) | Strong (active / imperative) |
|----------------|------------------------------|
| The form will be submitted for approval | Submit the form for approval |
| The report can be generated | Generate the report |
| Data is saved automatically | The system saves your data automatically |

### Present tense

Describe what happens, not what will happen.

| Avoid | Prefer |
|-------|--------|
| The system will display a message | The system displays a message |
| You will be redirected | You are redirected |

### Plain language

Use the words your readers use. Reserve internal or technical vocabulary for cases where the
reader genuinely needs it.

| Jargon | Plain |
|--------|-------|
| initialization | startup |
| validation | check / verification |
| utilize | use |
| terminate | stop / end |

**Exception:** keep domain terms your readers already know. Translating a familiar term into
something "simpler" can confuse more than it helps.

## Step-by-step instructions

### Pattern for a procedure

```
## [Task name — verb + noun, e.g. "Create a report"]

[One sentence: what the reader will achieve.]

Prerequisites (only if there are any):
- [Requirement]

Steps:
1. [Action + where to perform it]
2. [Action + what to choose or enter]
3. [Action + the result]

[Optional: one tip, only if it adds real value.]
```

### Rules for writing steps

1. **One step = one action.** Split "Click New and fill in the form" into two steps.
2. **Start with a verb.** "Click **Save**", not "The Save button should be clicked".
3. **Say where the element is** when it isn't obvious. "Click **Export** in the top-right
   corner."
4. **Describe the result** when it isn't obvious. "Click **Approve**. The system shows a
   confirmation."

### Handling variants

When a procedure branches, make the branch explicit instead of writing two near-identical
pages:

```
1. Open the list.
2. Find the item to edit:
   - If you know its number: type it in the search box.
   - If you don't: filter by date and owner.
3. Click **Edit**.
```

## Onboarding and getting started

For new users, fast "time to value" matters most — the moment they first feel the product
working for them. A getting-started page should contain:

1. **Goal** — what the reader will be able to do afterward.
2. **Time** — a rough estimate ("about 5 minutes").
3. **Steps** — the minimum to reach the first success, nothing more.
4. **Next steps** — links to go deeper once they've succeeded.

Keep it ruthlessly short. The goal is one quick win, not full coverage.

## Writing for different audiences

Match depth and tone to who's reading. A useful generic segmentation:

| Reader | Needs | Style |
|--------|-------|-------|
| Everyday end user | Finish a routine task quickly | Short, direct, minimal context |
| Team lead / approver | Manage others, make decisions | More context and best practices |
| Specialist / power user | Configure, report, comply | Detailed and complete |
| Administrator | Set up and maintain the system | Technical, with full options |

Adjust the level of detail to the reader. The same step can be one terse line for an everyday
user and a fuller paragraph (with what the system checks and why) for a specialist.

## Visual elements

### When a screenshot helps

Use one when the interface is complex, an element's location isn't obvious, or you're showing a
final result. Skip it for simple actions, for screens that change often (hard to keep current),
or when text already describes the process clearly.

### Screenshot guidelines

- **Crop** to the relevant area.
- **Annotate** key elements with arrows or highlights.
- **Don't duplicate** — the image illustrates, the text explains.
- **Write descriptive alt text** for accessibility.

## Keeping documentation current

Out-of-date documentation is worse than none — it actively misleads.

- Tie documentation to product changes; update it when the product changes.
- Remove outdated content rather than burying it.
- Re-test instructions after each significant change.
- Watch for signals of gaps: repeated support questions, searches that return nothing.

## Pre-publication checklist

- [ ] The title states the topic clearly.
- [ ] The first sentence answers "what's in this for me?".
- [ ] Every procedure was tested step by step.
- [ ] No jargon (or it's explained where it's unavoidable).
- [ ] Headings are descriptive and scannable.
- [ ] Callouts are used sparingly.
- [ ] Screenshots (if any) are current and annotated.
- [ ] Related topics are linked.
- [ ] No guesses or unconfirmed claims remain.
- [ ] No typos or grammatical errors.
