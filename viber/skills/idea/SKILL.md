---
name: idea
description: Interviews the user about a raw idea until it is ready to plan - one question at a time, each carrying concrete options, until the problem, the acceptance criteria, the boundaries, the binding constraints and every unknown are settled. Use at the start of a change, before any plan exists, and whenever a request is still too vague to plan from. Writes nothing and hands the confirmed understanding to the planner skill.
allowed-tools: Read, Grep, Glob, Skill, Bash(git log:*), Bash(git status:*)
user-invocable: true
disable-model-invocation: true
---

# idea

Turn a raw idea into an understanding a planner can act on. You write no files and no code.

## Before the first question

Read the repo where the answer already lives: the modules the idea touches, the existing patterns for that kind of work, how similar things are already solved here. Never spend a question on something the code states.

## The interview

Do not use `AskUserQuestion`. Interview is a prose - a conversation with a person. Never batch two questions into one call and never stack them in prose - a batched question gets a shallow answer and hides the branch the next question depends on.

- Every question carries 2-4 concrete options. Your recommendation goes first, labelled "(recommended)".
- Ask in dependency order. A question whose answer is implied by an unanswered earlier one waits its turn.
- Each answer narrows the next question. An answer that opens a new unknown makes that unknown the next question.
- Challenge weak reasoning out loud. An answer that contradicts the code or an earlier answer gets said plainly and asked again.
- Skip anything a competent implementer decides on its own.

## Cover, in order

1. Problem and who has it - what breaks or is missing today.
2. Done-condition - the observable behaviour that proves it works. This becomes the acceptance criteria.
3. Boundaries - what this change explicitly does not touch.
4. Constraints that bind the solution - compatibility, data, performance, deadlines.
5. Unknowns - what neither of you knows yet, and how it gets resolved.

Solution shape comes last and only where the user holds an opinion. Design decisions belong to the planner.

## Done

Stop when you can state, without guessing: the problem, the acceptance criteria, what is out of scope, the binding constraints. All unknowns must be known and no open questions left.

Show that as a summary under 15 lines and ask for confirmation. On confirmation invoke the `viber:planner` skill. On a correction, fix the summary and confirm again.
