---
name: council-this
description: Run a question, idea, or decision with real stakes through a council of five independent advisors, each analyzing it from a fundamentally different angle, synthesized into one verdict with a clear recommendation and a single first step. Use whenever the user wants to pressure-test or stress-test a decision, wants multiple perspectives, is torn between options, or presents a genuine tradeoff. Trigger on "council this", "run the council", "I can't decide", "what would you do in my place", "should I X or Y" when the choice carries real stakes. Do NOT use for questions with one verifiable right answer, factual lookups, creation or processing tasks (write the tweet, summarize the article), or a casual should-I with no meaningful tradeoff.
user-invocable: true
argument-hint: "[<decision or question>]"
allowed-tools: Read, Write, Glob, AskUserQuestion, Skill, Bash(date:*)
---

# Council This

Interactive front: frame the decision and gather the context the council needs, then dispatch the council round to the `council-this-chairman` fork - this skill never convenes the council or writes the verdict itself.

## Run ID

!`date +%Y%m%d%H%M%S`

The line above is `<RUN_ID>` - use it verbatim.

## Workflow

1. Intake. Extract from the user's message and argument: the core decision, the options on the table, what is at stake, and any constraints (budget, time, resources). Frame all of it as one neutral question - no steering toward any option.
2. Context enrichment. Glob/Read at most 2-3 host-repo files that would ground the advice - an existing `docs/business/<slug>/` validation report or plan when the decision concerns that idea, a relevant product doc, or a file the user referenced. List the chosen paths for the capture. Never spend more than a quick pass on this.
3. Clarify. If the decision, the options, or the stakes cannot be framed from what is available, ask ONE clarifying question via AskUserQuestion - exactly one, never a second round - then proceed with what comes back.
4. Slug and language. When the decision concerns an idea already documented under `docs/business/<slug>/`, reuse that slug. Otherwise derive a kebab-case `<decision-slug>` from the decision. Detect the output language from the language the user used.
5. Capture. Write `.temp/superbiz/council/capture-<RUN_ID>.md` in the format below.
6. Dispatch. Invoke `council-this-chairman` (Skill) with a labeled-line args block:
   capture: .temp/superbiz/council/capture-<RUN_ID>.md
7. Relay. The fork returns exactly one line: `COUNCIL: <path> | RECOMMENDATION: <one sentence> | FIRST-STEP: <one concrete action>`. Relay it to the user as a 3-4 sentence summary - the user should not have to open the file to learn the verdict. Do not re-verify or rewrite the verdict yourself.

## Capture file format

```
# Question
<the framed decision: core question, options, stakes>
# Slug
<decision-slug>
# Language
<language the verdict and conversation are in>
# Context files
- <path> - <one-clause why>
(or "none")
# Constraints
<budget, time, resources, or "none">
# Extra context
<anything else the user settled that doesn't fit above>
```

The verdict the fork writes lands at `docs/business/<decision-slug>/rada.md` (`council.md` when the language is English) - written by the fork, never by this skill.
