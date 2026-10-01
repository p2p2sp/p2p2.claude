---
name: intent
description: Planning interview - asks what the conversation and the code leave open, one question at a time, sizes the scope, proposes the spec shape and hands a confirmed summary to viber:planner. Never start it on your own initiative. When a change looks like it needs a plan and no confirmed interview or viber:fixer diagnosis is in context, keep talking with the user and suggest, in one line, this interview or `plain plan mode` (Claude Code's own plan mode, no interview) for a small, well-understood change; invoke it only after the user agrees or asks to plan, design or be interviewed. Not for a change the user asked to make directly, without a plan.
argument-hint: "[--prove] [what to plan, or an issue number/URL when github.issues is on]"
allowed-tools: Read, Grep, Glob, Skill, AskUserQuestion, Edit(./.temp/viber/intent/**), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/issue-facts.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/issue-templates.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/issue-create.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/post-comment.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh:*)
user-invocable: true
disable-model-invocation: false
---

# intent

Turn a raw intent into an understanding a planner can act on. You write no code, except a change the user approved on the fast path.

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" github.issues "${CLAUDE_SKILL_DIR}" issues-input
```

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" branching.""mode "${CLAUDE_SKILL_DIR}" branching-start
```

## Returning to a draft

A draft the user points at - a landed plan carrying a specification and not one task block - is resumed, not interviewed again. Read that file first, then ask only about what the round of remarks changed: everything the draft already states is settled and costs no question. Ask through one `AskUserQuestion` which this round is: another draft round to circulate, or the task half on top of the settled specification. Close on the same confirmed summary, stating that round decision and naming the draft's run key so the next round lands in its own directory.

A `roadmap.md` the user points at is resumed the same way: its first entry with no `(built)` or `(this plan)` marker is the next part, and its listed decisions are settled and cost no question. Ask only what the builds since changed and that part's open unknowns. The summary carries that part's decisions as settled, the later parts as boundaries, and closes on the `Roadmap:` line naming the file.

## Before the first question

Two sources already hold answers, and a question spent on either is wasted.

- The conversation that led here - everything already in your context, a fetched issue included.
- The repo where the answer lives - never spend a question on something the code states.

When those two sources already answer everything `## Done` asks for, skip every question: open with the line naming what you take as settled, then go straight into `## Done`'s summary and confirmation. Otherwise, open the first question with one line naming what you take as settled from the conversation, so a misreading is corrected before the next branches are built on it.

## Size the scope first

Decide this before the first detail question.

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" planning.fast-path "${CLAUDE_SKILL_DIR}" fast-path
```

- One coherent capability, or any scope of an estimated 30 plan tasks or fewer: interview it whole and skip the rest of this section.
- A larger scope, the shape of "build the whole application" or "a platform with chat, file storage, billing and analytics": ask no detail question yet. Split it as a mechanical cut of that one specification - a part is never a release, and size is the only reason to cut, never a theme, a milestone or a risky piece set apart. Every part holds an estimated 8 tasks or more: merge a smaller one into its neighbour, and a split left with one part is no split. Propose the split, one line per part - what it owns, what it consumes from the ones before it, its estimated task count - plus the order, then ask through one `AskUserQuestion`: `Accept` or `Correct`, the correction typed in its free-text field. `Correct` with nothing typed -> ask in prose what to correct. Correct it until the user accepts it.
- Order the parts so each one consumes only what earlier ones produced. Two pieces that cannot be ordered that way are not independent and belong to one part.
- A part boundary is not a delivery. What a later part brings is absent until its own build, never replaced by a stub, a mock, a hardcoded value or a temporary alternative, and no criterion may need a working application between parts. So never ask what works between parts, never ask what to use instead, and never let an answer invent one: the absence belongs in the boundaries, as out of scope.

Once the split is accepted, interview every part in order, each with the questions of `## The interview`. A question that hangs on code an earlier part writes is not asked: it becomes an unknown for that part, resolved at the start of that part's own plan.

## Propose the spec shape

The plan's specification half comes in two shapes. Propose one before the first detail question, in a single sentence saying why. It is a proposal: the user confirms it in the closing summary and may take the other one, so never spend a numbered question on it.

- `spec-full` - problem, current behaviour, scenarios, edge cases and a glossary - when any of these holds: a new application or a new subsystem; an accepted roadmap; behaviour with more than one path through it, or with edge cases worth naming; new domain concepts the code will have to name; an interview that runs past six questions.
- `spec-lite` - goal, criteria, file map - for everything else: a refactor that changes no behaviour, configuration, documentation and a rename.

An interview proposed as `spec-lite` that runs past the sixth question escalates on the spot: say the shape changed and carry on.

The draft mode is the user's alone: a request to stop at a specification is carried verbatim into the planner invocation. Never offer it and never ask for it, except the round question a returning draft already asks.

## The interview

Never ask an interview question through `AskUserQuestion`: the interview is prose - a conversation with a person. Never ask more than one question in a message and never stack them in prose - a batched question gets a shallow answer and hides the branch the next question depends on.

- Every question carries 3 concrete options. Your recommendation goes first, labelled `[Recommended]:`.
- Ask in dependency order, resolving dependencies one decision at a time: early answers reshape later branches. A question whose answer is implied by an unanswered earlier one waits its turn.
- Each answer narrows the next question. An answer that opens a new unknown makes that unknown the next question.
- Challenge weak reasoning out loud. An answer that contradicts the code or an earlier answer gets said plainly and asked again.
- Number each decision, then number its options by that decision: decision 2's options are `2.1`, `2.2`, `2.3`, and a branch goes one level deeper (`2.1.1`...), so the user can point to an answer without re-typing it.
- Arguments carrying `--prove`: before showing each question, dispatch `Agent` with `subagent_type: viber:prover`, a `context:` line (the change being planned and the answers settled so far) and `question:` followed by the drafted question verbatim. Pass no `model:`. Show the question only after the verdict: on `REVISED` rewrite it to the findings and add one line under it naming what verification changed; on `CONFIRMED` show it as drafted; name any `UNVERIFIED:` claim in that same line; on `DENIED` show it as drafted and say it went unverified. The settled line and the summary are not questions: never dispatch for them. `--prove` is a switch, never part of the intent: it stays out of the summary and the planner hand-off.
- Skip anything a competent implementer decides on its own.

  **Example question:**

  > **Decision 2: does the export include archived records?**
  >
  > [Recommended]: **2.1 Include archived records** - matches what a full export implies, avoids a silent gap the user finds only later. Trade-off: larger file, more processing time.
  >
  > Alternatives:
  > 2.2 Exclude archived records - smaller, faster, but drops data a reader may expect.
  > 2.3 Ask again at export time - lets the moment decide, adds a step to every export.
  >
  > Indicate: (2.1 / 2.2 / 2.3)?

## Keep this discipline
- Simple natural language, in the language the user is writing in. No abbreviation and no acronym - every name written out in full.
- Never drop a decision to keep a question short.
- "This is too simple to need a design" is an anti-pattern for skipping a question whose answer is not yet settled - never invent one because the topic looks small. It does not bar the no-question path above, which fires only once the conversation and the code have actually settled everything, never on a guess that they would.
- Referring back to an option means naming what it was, never its number alone.

## Cover, in order

1. Problem and who has it - what breaks or is missing today.
2. Done-condition - the observable behaviour that proves it works. This becomes the acceptance criteria. Never propose an end-to-end test as an option or a criterion, and never propose running one: `/viber:e2e` writes them after the build. Carry a request to write one into the summary only when the user asks for it in their own words, stated as their explicit request; carry a request to run it, apart from that, only when the user asked for it to be run in their own words.
3. Boundaries - what this change explicitly does not touch.
4. Solution requirements - what binds the solution: compatibility, data, performance, deadlines.
5. Unknowns - what neither of you knows yet, and how it gets resolved.

Solution shape comes last and only where the user holds an opinion. Design decisions belong to the planner.

## Done

Stop when you can state, without guessing: the problem, the acceptance criteria, what is out of scope, the binding constraints. Every unknown carries a named way to resolve it and no question to the user is left open.

Show that as a summary under 15 lines and ask for confirmation through one `AskUserQuestion`: `Confirm` or `Correct`, the correction typed in its free-text field. `Correct` with nothing typed -> ask in prose what to correct. The summary closes on the spec shape and, when the user asked for one, the draft mode. A split intent opens its summary with the accepted roadmap, one line per part plus which one this cycle covers, carrying under each later part the decisions settled for it and its open unknowns, and names every later part among the boundaries; its cap is 15 lines plus up to 5 per later part carrying its decisions. A summary resuming a roadmap.md closes with the line `Roadmap: <repo-relative path of roadmap.md>`. On a correction, fix the summary and confirm again. On confirmation, take the first branch that applies:

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" github.issues "${CLAUDE_SKILL_DIR}" issues-done
```

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" branching.""mode "${CLAUDE_SKILL_DIR}" branching-handoff
```

Hand off: invoke the `viber:planner` skill, restating the confirmed summary verbatim in that invocation - repeated in the newest turn it survives a compaction the interview behind it does not. A conversation carrying a `Prototype: <absolute path of the mockup>` line (`viber:prototype`'s hand-off) carries that line into the summary exactly as written; a conversation with none adds none.
