---
paths:
  - "**/skills/**"
  - "**/agents/**"
---

# Hwo to write perfect skills or agents

## LLM is your audience

Remember, you're writing a skill or agent for an LLM, not a human. An LLM needs short, on-point instructions, highly preferable bullet points - it should probably be more like code instructions than plain prose. An LLM doesn't need long sentences (prose) surrounded by context. Too much information means chaos and misleading decisions.

Do not use excesive formating. Do not use italics, tables - clean text, bullets is enough.

## Write for Retrieval, Not for Completeness

The instinct when writing skill or agent documentation is to be thorough. Cover every parameter. Note every edge case. Document every default behavior. Resist this. LLM doesn’t need a manual. It needs the delta — the things that differ from sensible defaults. If the right behavior is what a competent developer would do anyway, you don’t need to document it.

## Use Clear Structure and Headings

Content at the top of a file and under clear headings gets more reliable attention than content buried in the middle of dense paragraphs. Structure your skill or agent files so that the most critical, most frequently relevant instructions are first and clearly marked.

Use short, declarative sentences. EXTREMELY IMPORTANT is to avoid prose explanations where a bullet point will do. The LLM doesn’t need narrative context — it needs short, clear, parseable, bulletproof instructions.

Never ever use emoji.

## Audit for Contradictions and Redundancy

Set a recurring reminder to review your skill or agent files the same way you’d review any codebase. Look for:

- Instructions that contradict each other
- Guidance that was added for a specific situation but was never scoped to that situation
- Documentation for tools or patterns your project no longer uses
- Repeated information across multiple files
- Explanation who is using the skill or agent, especially forked skill.

Remove mercilessly. Everything in a skill file has a cost.

## Use Scripts whenever possible

If skill or agent can automate something and instead of LLM reasoning replace by deterministic script - do it without any doubt. Especialy for tasks requiring determinism like parsing JSON, sorting data, compiling code, determistic searching, API calls, or math calculations.

Advantages of using deterministic scripts:
- Repeatable Output: Code runs the same way every time, eliminating unpredictable decision-making branches.
- Speed & Cost: Executing code is significantly cheaper and faster than generating tokens for agent reasoning.
- Performance: Written script is optimised and tested - run faster than executed one by one Bash command by agent.

## Single or (if impossible) narrow responsibility

- One skill = one responsibility. Push every other responsibility into a separate skill — preferably a fork, out of the main context.
- Carry more than one responsibility ONLY when a split is genuinely impossible — then keep the count as low as possible.
- Excess responsibility -> noise and drift. When a skill grows a second concern, propose the split before adding to it.

### Non-overlapping branches MUST be split

A skill whose body spells out N branches/modes whose instructions do NOT overlap holds N responsibilities. Never leave all branches inline — only the branch actually taken should reach the LLM. Split one of two ways:

- Fork sub-workers — one `context: fork` sub-skill per branch; the entry resolves which branch applies and dispatches only that one via the `Skill` tool. See `skill-fork-dispatch.md`.
- Mode-router script — a deterministic script parses the input parameter and `!`-injects only the chosen branch's playbook; the other branches never enter context. See `_skill-script-routing.md` (mode-router).

Choose the script when a parsable input parameter selects the branch; choose fork sub-workers when each branch is heavy work that also benefits from running out of context.

### Split an interactive skill: question-asker (main) + fork worker

Specific case of the rule above.

A skill that BOTH asks the user (`AskUserQuestion`, interactive preview-then-confirm) AND does heavy work holds two responsibilities. `AskUserQuestion` runs only in the main session — a fork cannot ask the user — so the whole body stays pinned to the main context and burns tokens for the entire session. Split it in two:

- Entry skill on main context — asks every question, resolves all ambiguity, then hands the answers off. Keep it small: this body is what lingers in context.
- Fork worker (`context: fork` + `user-invocable: false`) — gets the resolved inputs and does the heavy work out of context; it never asks the user, because the entry already resolved everything.
- Hand off by the arg convention: short fields inline, large/multiline content as a PATH the fork injects (see `_skill-script-routing.md`).
- Two payoffs: narrow responsibility AND token economy — the heavy body leaves the main context.
- Precedent: `supergh:commit` (resolves WHAT to commit) -> `agent-committer` (reads the staged diff in a fork, authors the message). Fork-invocation mechanics: `skill-fork-dispatch.md`.

## Gotchas
- Shortening the text cannot mean less precise instructions.
- Agent also can have references and LLM can just read it - even if the documentation says nothing about it.
- Use only clean bash - no other additional tools like `jq` or `bc`.
- DO NOT chop paragraphs into multiline text.

## Examples

**BAD**
```
# CSV to JSON Conversion Skill 🟢

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