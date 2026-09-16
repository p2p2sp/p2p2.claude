---
name: adr
description: Judges an intent interview's confirmed decisions against the three ADR criteria (hard to reverse, surprising without context, the result of a real trade-off) and offers the user a one-paragraph architecture decision record for each decision passing all three, returning the accepted drafts as a ready `## ADR` section. Invoked by the `intent` skill only, at its two ADR points: no argument on a fresh run, once the synthesis is confirmed and before the intent file is written; or a single `decision:` line on a resume, naming the one reopened decision. Fires nowhere else - never directly, never by the user, never mid-interview, never from a spec, plan, build or review, never when the `adr:` config line is anything but `true`.
user-invocable: false
allowed-tools: Read, Glob
---

# ADR judge

Decide which confirmed decisions of the interview deserve an architecture decision record, offer the user a finished draft of each one, and return what was accepted as a ready `## ADR` section. Zero offers is the ordinary outcome, not a failure.

# Input

`$ARGUMENTS` sets the scope:
- empty -> judge every confirmed decision of the interview.
- one line `decision: <n>` -> judge that decision alone and ignore every other one.

The material is the conversation itself: the decisions, the alternatives weighed against them, and the reasons the user gave for the winner. None of it sits in a file - the intent template keeps rationale out on purpose - so reconstruct nothing from disk.

The single file access is the supersede check, and only for a decision that already passed `# Judge`: `Glob docs/adr/*.md`, then `Read` a match whose subject is that same decision. No file, no match, or no `docs/adr/` at all -> skip the check and write no `Supersedes:` line.

# Judge

All three criteria hold, or there is no offer. One of them missing -> drop the decision silently: no message to the user, no block, no mention in the output.

1. Hard to reverse - undoing it later costs real work: a data migration, a rewritten boundary, a change coordinated across every caller. A choice that is a one-line edit next month fails this.
2. Surprising without context - a competent reader meeting the result cold asks why it was done this way. A choice that lands on the obvious default fails this.
3. The result of a real trade-off - genuine alternatives were on the table and one won for reasons the user stated. A choice with nothing to weigh against it fails this, however important it feels.

Calibration: most runs end with zero ADRs, and one is already a lot. Several offers in a single run means the bar slipped - judge again and keep only what a reader would still ask about a year from now. Feature behaviour, naming, validation rules, wiring and anything re-derivable from the code never qualify, whatever the effort behind them.

# Offer

One decision at a time, one plain-prose message each - `AskUserQuestion` turns a judgement call into a form and is never used here. Wait for the answer before judging the next decision.

The message carries the filled block from `# Block shape`, then the choice:
1. accept - the block stands as written.
2. rephrase - the user dictates the wording, the whole block is shown again, and the choice is put again.
3. skip - drop the decision.

- Write the offer, the title and the ADR text in the language of the interview.
- Draft the text before showing it. An offer is a finished block the user can accept as it stands, never a question about whether an ADR would be nice to have.
- A skipped, declined or unanswered decision leaves no trace: no block, no placeholder, no note.

# Block shape

One `### <slug>` block per accepted decision, together forming the `## ADR` section:

````text
## ADR
### <slug>
Decision: `<question>` (decision <n>)
Supersedes: <repo-relative path of the earlier ADR under docs/adr/>
```markdown
# <Short title of the decision>

<1-3 sentences: the context, what was decided, why.>
```
````

- `<slug>` - the title lowercased, ASCII letters and digits kept, every other character collapsed to a single `-`, at most 6 words.
- `Decision:` - the reference form `` `<title>` (<pointer>) `` of `superdev/references/review-contract.md` `## Naming`, the question copied verbatim from the decision's own `### <n>.` heading.
- `Supersedes:` - one line, present only when the supersede check found an earlier ADR this decision replaces or overrules; otherwise the line is absent altogether, never empty and never `none`.
- The fenced body is the ADR file itself, byte for byte what gets written later: the `# <Short title of the decision>` heading and 1-3 sentences carrying the context, the decision and the reason. Those two are mandatory and nothing else is.
- YAML frontmatter `status: accepted` opens the fenced body only when the block carries a `Supersedes:` line; without one the body carries no frontmatter at all.
- `## Considered Options` inside the fence only when the interview weighed more than one option the user wants remembered.
- `## Consequences` inside the fence only when the user named a downstream effect worth remembering.
- Nothing else: no date, no status line for the plain case, no link back to the interview, no list of the rejected options the user did not ask to keep.

# Output

This skill writes no file. The reply is the whole deliverable:

- at least one accepted block -> the `## ADR` section, its blocks in the order they were offered, and as the last line `ADR: <k> accepted`, `<k>` being the number of blocks.
- nothing offered, or every offer skipped or declined -> no `## ADR` section at all, and the single line `ADR: none`.
