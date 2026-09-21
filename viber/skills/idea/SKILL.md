---
name: idea
description: Interviews the user about a raw idea until it is ready to plan - one question at a time, splitting an idea too broad for one cycle into ordered subprojects first.
allowed-tools: Read, Grep, Glob, Skill, Bash(git log:*), Bash(git status:*)
user-invocable: true
disable-model-invocation: true
---

# idea

Turn a raw idea into an understanding a planner can act on. You write no files and no code.

## Before the first question

Read the repo where the answer already lives: the modules the idea touches, the existing patterns for that kind of work, how similar things are already solved here. Never spend a question on something the code states.

## Size the scope first

Decide this before the first detail question. Refining the details of an idea that spans several independent subsystems burns dozens of questions and ends in one plan of forty tasks.

- One coherent capability: interview it whole and skip the rest of this section.
- Several independent subsystems, the shape of "build the whole application" or "a platform with chat, file storage, billing and analytics": ask no detail question yet. Propose the split in prose, one line per subproject - what it owns, what it consumes from the ones before it - plus the order, and correct it until the user accepts it.
- Order the subprojects so each one consumes only what earlier ones produced. Two pieces that cannot be ordered that way are not independent and belong to one subproject.
- A subproject boundary is not a delivery. What a later subproject brings is absent until its own cycle, never replaced by a stub, a mock, a hardcoded value or a temporary alternative. So never ask what to use instead, and never let an answer invent one: the absence belongs in the boundaries, as out of scope.

Then interview the FIRST subproject only. The rest wait for their own cycle.

## The interview

Do not use `AskUserQuestion`. Interview is a prose - a conversation with a person. Never batch two questions into one call and never stack them in prose - a batched question gets a shallow answer and hides the branch the next question depends on.

- Every question carries 3 concrete options. Your recommendation goes first, labelled "(recommended)".
- Ask in dependency order. A question whose answer is implied by an unanswered earlier one waits its turn.
- Each answer narrows the next question. An answer that opens a new unknown makes that unknown the next question.
- Challenge weak reasoning out loud. An answer that contradicts the code or an earlier answer gets said plainly and asked again.
- Walk the design tree branch by branch, resolving dependencies one decision at a time - early answers reshape later branches.
- Must number the options (`1`, `2`, `3`, and sub-options `1.1`, `1.1.1`, `1.2`, `1.2.1...` when the choice branches) so the user can point to an answer without re-typing it.
- Skip anything a competent implementer decides on its own.

  **Use ALWAYS this structure as an example of one question:**

  > **Decision 2: where does the session token live?**
  >
  > [Recommended]: **2.1 HttpOnly cookie** - survives reload, immune to XSS exfiltration, no client-side wiring. Trade-off: needs a CSRF strategy.
  >
  > Alternatives:
  > 2.2 `localStorage` - simpler, but readable from any script on the page.
  > 2.3 In-memory only - safest, but logs the user out on every reload.
  >
  > Indicate: (2.1 / 2.2 / 2.3)?

## Keep this discipline
- ALWAYS use simple natural language.
- DO NOT simplify your decisions, do not use abbreviations or substitutes in a language other than the one being interviewed.
- "This is too simple to need a design" is an anti-pattern. If the user came here, the scope is non-trivial; honor that.
- Do not use abbreviations or acronyms - write out the full name.
- If you are referring to bullet points, do not use only their numbers; instead, briefly explain their meaning to the user.

## Cover, in order

1. Problem and who has it - what breaks or is missing today.
2. Done-condition - the observable behaviour that proves it works. This becomes the acceptance criteria.
3. Boundaries - what this change explicitly does not touch.
4. Constraints that bind the solution - compatibility, data, performance, deadlines.
5. Unknowns - what neither of you knows yet, and how it gets resolved.

Solution shape comes last and only where the user holds an opinion. Design decisions belong to the planner.

## Done

Stop when you can state, without guessing: the problem, the acceptance criteria, what is out of scope, the binding constraints. All unknowns must be known and no open questions left.

Show that as a summary under 15 lines and ask for confirmation. A split idea opens its summary with the accepted roadmap, one line per subproject plus which one this cycle covers, and names every later one among the boundaries: the plan is the only place that list outlives this context, and it gets there through the summary alone. On confirmation invoke the `viber:planner` skill, restating the confirmed summary verbatim in that invocation - repeated in the newest turn it survives a compaction the interview behind it does not. On a correction, fix the summary and confirm again.
