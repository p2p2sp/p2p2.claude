---
paths:
  - "**/skills/**/*.*"
  - "**/agents/**/*.*"
---

# How to write perfect skills or agents

Always use those rules when creating, refactoring, reshaping, optimizing skills or agents.

## LLM is your audience

Remember, you're writing a skill or agent for an LLM, not a human. An LLM needs short, on-point instructions, bullet points and sub-points over prose - closer to code instructions than narrative. Too much information means chaos and misleading decisions.

Content at the top of a file and under clear headings gets more reliable attention than content buried in the middle of dense paragraphs. Structure your skill or agent files so the most critical, most frequently relevant instructions are first and clearly marked.

## Write for Retrieval, Not for Completeness

The instinct when writing skill or agent documentation is to be thorough. Cover every parameter. Note every edge case. Document every default behavior. Resist this. LLM doesn’t need a manual. It needs the delta — the things that differ from sensible defaults. If the right behavior is what a competent developer would do anyway, you don’t need to document it.

## Prevention over correction

Generate correct output on the first pass — bake constraints, profiles, and negative examples into the generation instructions — rather than generating loosely and running a separate fixer/corrector skill afterward. Detecting and correcting bad LLM output with another LLM pass is more expensive than preventing it, and tends toward whack-a-mole.

## A skill does not narrate its caller

Write every skill as `input -> work -> output`. It does NOT need to know WHO invokes it or WHY — a fork least of all. It receives an input, does its job, returns its output. Strip the surrounding-world story from the body.

- Keep the routing guard in frontmatter `description:` only (e.g. "invoked only by X, never directly") — that single line is a real signal that stops the wrong caller. The BODY needs none of it.
- In the body, cut: the caller's name, the caller's surrounding flow ("after every task the superbuild…", "one of six lenses the reviewer fans out…", "you are the terminal gate of the pipeline"), and the rationale for the call. None of it changes what the skill does with its input.
- Keep behaviour the INPUT drives, but frame it on the input, never the caller: "if `Report path:` present -> write the report there", NOT "the superbuild passes `Report path:`, so…".
- Keep a genuine scope boundary even when it names siblings ("you own ONLY dimension X; Y and Z are out of scope") — that is a behavioural constraint, not caller narrative.
- Litmus: would the sentence still be true and useful if a different caller sent the same input? Keep it. Does it only describe the current caller's world? Cut it.

## Audit for Contradictions and Redundancy

Set a recurring reminder to review your skill or agent files the same way you’d review any codebase. Look for:

- Instructions that contradict each other
- Guidance that was added for a specific situation but was never scoped to that situation
- Documentation for tools or patterns your project no longer uses
- Repeated information across multiple files
- Caller narrative in the body — see "A skill does not narrate its caller"; cut it on sight.

Remove mercilessly. Everything in a skill file has a cost.

## Use Scripts whenever possible

If skill or agent can automate something and instead of LLM reasoning replace by deterministic script - do it without any doubt. Especialy for tasks requiring determinism like parsing JSON, sorting data, compiling code, determistic searching, API calls, or math calculations.

Advantages of using deterministic scripts:
- Repeatable Output: Code runs the same way every time, eliminating unpredictable decision-making branches.
- Speed & Cost: Executing code is significantly cheaper and faster than generating tokens for agent reasoning.
- Performance: Written script is optimised and tested - run faster than executed one by one Bash command by agent.

## CRITICAL: Skill must have single or (if impossible) narrow responsibility

- One skill = one responsibility. Push every other responsibility into a separate skill — preferably a fork, out of the main context.
- Carry more than one responsibility ONLY when a split is genuinely impossible — then keep the count as low as possible.
- Excess responsibility -> noise and drift. When a skill grows a second concern, propose the split before adding to it.

### Non-overlapping branches MUST be split

A skill whose body spells out N branches/modes whose instructions do NOT overlap holds N responsibilities. Never leave all branches inline — only the branch actually taken should reach the LLM. Split one of two ways:

- Fork sub-workers — one `context: fork` sub-skill per branch; the entry resolves which branch applies and dispatches only that one via the `Skill` tool.
- Mode-router script — a deterministic script parses the input parameter and `!`-injects only the chosen branch's playbook; the other branches never enter context.

Choose the script when a parsable input parameter selects the branch; choose fork sub-workers when each branch is heavy work that also benefits from running out of context.

**Specific case — interactive skill (question-asker + fork worker).** `AskUserQuestion` only runs in the main session, so a skill that both asks the user AND does heavy work pins its whole body to the main context for the whole session.

- Entry skill (main context) — asks every question, resolves all ambiguity, hands off. Keep it small.
- Fork worker (`context: fork` + `user-invocable: false`) — takes the resolved inputs, does the heavy work out of context, never asks the user.
- Hand off via the arg convention: short fields inline, large/multiline content as a PATH.

### Co-occurring concerns -> independent specialists

The two mechanisms above assume mutually-exclusive branches, resolved by one dispatcher. When concerns can instead co-occur on the same task — e.g. style, consistency, flow, references, links checks over one editing job — do not fold them into one skill with internal per-concern logic, and do not route them through a single dispatcher either.

- Give each concern its own skill with its own CSO `description:` trigger.
- Let several fire independently for the same task rather than one skill juggling all of them.
- Keeps each skill within its own context budget — a monolith big enough to cover every concern eventually loses track of its own instructions.

## Fan-out cheap workers to locate change sites

When the work is "find every place to change, then change it" over an unknown/large set, do NOT scan the whole repo in the main context. Split discovery from action:

- Fan out many cheap-tier forks in parallel, each scoring/locating one file or shard — breadth, not depth. They return a compact tagged line (path + verdict), never raw file dumps into the main context.
- Gate/rank the hits deterministically (script), then dispatch expensive frontier workers only into the located shards.
- Main context keeps the conclusion (the shard list), not the search. Token cost stays flat as the repo grows.

## Gotchas and don'ts
- Shortening the text cannot mean less precise instructions.
- Agent also can have references and LLM can just read it - even if the documentation says nothing about it.
- Use only clean bash - no other additional tools like `jq` or `bc`.
- DO NOT chop paragraphs into multiline text.
- DO NOT put reading CLAUDE.md instruction - harnes will inject it.

## Formatting

Clean text only:
- No italics, no tables.
- Never use emoji.

## Examples

**BAD**
```
# CSV to JSON Conversion Skill 🟢

Read CLAUDE.md first.

This skill helps you convert CSV files into JSON format. CSV (Comma-Separated
Values) is a common format for tabular data, while JSON (JavaScript Object
Notation) is widely used in web apps and APIs.

When a user uploads a CSV, first read the file carefully to understand its
structure. Look at the header row (usually the first line) to determine the
column names. Then go through each row one by one and map every value to its
column, building a JSON object per row. Remember JSON uses double quotes for
keys and string values by default.

You can use `jq` to format the output nicely. If a field looks like a number,
try to detect whether it is an integer or a float. Edge cases such as empty
cells, quoted commas, and trailing newlines should be handled appropriately.
```

**GOOD**
```
# csv-to-json

## When
- User wants a .csv converted to .json.

## Run
- `python scripts/csv2json.py <input.csv> <output.json>`
- Return the output path. Do not parse rows yourself.

## Rules (deltas only)
- Empty cell -> null, not "".
- Numeric-looking values stay strings unless user asks to coerce.
- Duplicate header names -> suffix _2, _3.

## On failure
- Print stderr verbatim. Do not fall back to hand-parsing.
```