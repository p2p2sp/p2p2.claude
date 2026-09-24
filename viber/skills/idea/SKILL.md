---
name: idea
description: Planning interview - asks what the conversation and the code leave open, one question at a time, sizes the scope, proposes the spec shape and hands a confirmed summary to viber:planner. Never start it on your own initiative. When a change looks like it needs a plan and no confirmed interview or viber:fixer diagnosis is in context, keep talking with the user and suggest this interview in one line; invoke it only after the user agrees or asks to plan, design or be interviewed. Not for a change the user asked to make directly, without a plan.
allowed-tools: Read, Grep, Glob, Skill
user-invocable: true
disable-model-invocation: false
---

# idea

Turn a raw idea into an understanding a planner can act on. You write no files and no code.

## Returning to a draft

A draft the user points at - a landed plan carrying a specification and not one task block - is resumed, not interviewed again. Read that file first, then ask only about what the round of remarks changed: everything the draft already states is settled and costs no question. Ask which this round is: another draft round to circulate, or the task half on top of the settled specification. Close on the same confirmed summary, stating that round decision and naming the draft's run key so the next round lands in its own directory.

## Before the first question

Two sources already hold answers, and a question spent on either is wasted.

- The conversation that led here - everything already in your context.
- The repo where the answer lives - never spend a question on something the code states.

Open the first question with one line naming what you take as settled from the conversation, so a misreading is corrected before the next branches are built on it.

## Size the scope first

Decide this before the first detail question.

- One coherent capability: interview it whole and skip the rest of this section.
- Several independent subsystems, the shape of "build the whole application" or "a platform with chat, file storage, billing and analytics": ask no detail question yet. Propose the split in prose, one line per subproject - what it owns, what it consumes from the ones before it - plus the order, and correct it until the user accepts it.
- Order the subprojects so each one consumes only what earlier ones produced. Two pieces that cannot be ordered that way are not independent and belong to one subproject.
- A subproject boundary is not a delivery. What a later subproject brings is absent until its own cycle, never replaced by a stub, a mock, a hardcoded value or a temporary alternative. So never ask what to use instead, and never let an answer invent one: the absence belongs in the boundaries, as out of scope.

Then interview the FIRST subproject only. The rest wait for their own cycle.

## Propose the spec shape

The plan's specification half comes in two shapes. Propose one before the first detail question, in a single sentence saying why. It is a proposal: the user confirms it in the closing summary and may take the other one, so never spend a numbered question on it.

- `spec-full` - problem, current behaviour, scenarios, edge cases and a glossary - when any of these holds: a new application or a new subsystem; an accepted roadmap; behaviour with more than one path through it, or with edge cases worth naming; new domain concepts the code will have to name; an interview that runs past six questions.
- `spec-lite` - goal, criteria, file map - for everything else: a refactor that changes no behaviour, configuration, documentation and a rename.

An interview proposed as `spec-lite` that runs past the sixth question escalates on the spot: say the shape changed and carry on.

The draft mode is the user's alone: a request to stop at a specification is carried verbatim into the planner invocation. Never offer it and never ask for it, except the round question a returning draft already asks.

## The interview

Do not use `AskUserQuestion`. Interview is a prose - a conversation with a person. Never ask more than one question in a message and never stack them in prose - a batched question gets a shallow answer and hides the branch the next question depends on.

- Every question carries 3 concrete options. Your recommendation goes first, labelled `[Recommended]:`.
- Ask in dependency order. A question whose answer is implied by an unanswered earlier one waits its turn.
- Each answer narrows the next question. An answer that opens a new unknown makes that unknown the next question.
- Challenge weak reasoning out loud. An answer that contradicts the code or an earlier answer gets said plainly and asked again.
- Walk the design tree branch by branch, resolving dependencies one decision at a time - early answers reshape later branches.
- Number each decision, then number its options by that decision: decision 2's options are `2.1`, `2.2`, `2.3`, and a branch goes one level deeper (`2.1.1`...), so the user can point to an answer without re-typing it.
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
- "This is too simple to need a design" is an anti-pattern. If the user came here, the scope is non-trivial; honor that.
- Referring back to an option means naming what it was, never its number alone.

## Cover, in order

1. Problem and who has it - what breaks or is missing today.
2. Done-condition - the observable behaviour that proves it works. This becomes the acceptance criteria.
3. Boundaries - what this change explicitly does not touch.
4. Constraints that bind the solution - compatibility, data, performance, deadlines.
5. Unknowns - what neither of you knows yet, and how it gets resolved.

Solution shape comes last and only where the user holds an opinion. Design decisions belong to the planner.

## Done

Stop when you can state, without guessing: the problem, the acceptance criteria, what is out of scope, the binding constraints. Every unknown carries a named way to resolve it and no question to the user is left open.

Show that as a summary under 15 lines and ask for confirmation. It closes on the spec shape and, when the user asked for one, the draft mode. A split idea opens its summary with the accepted roadmap, one line per subproject plus which one this cycle covers, and names every later one among the boundaries. On confirmation invoke the `viber:planner` skill, restating the confirmed summary verbatim in that invocation - repeated in the newest turn it survives a compaction the interview behind it does not. On a correction, fix the summary and confirm again.
