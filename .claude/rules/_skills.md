---
paths:
  - "skills/**"
---

## Write for Retrieval, Not for Completeness

The instinct when writing skill documentation is to be thorough. Cover every parameter. Note every edge case. Document every default behavior. Resist this. Agent doesn’t need a manual. It needs the delta — the things that differ from sensible defaults. If the right behavior is what a competent developer would do anyway, you don’t need to document it.

## Use Clear Structure and Headings

Content at the top of a file and under clear headings gets more reliable attention than content buried in the middle of dense paragraphs. Structure your skill files so that the most critical, most frequently relevant instructions are first and clearly marked.

Use short, declarative sentences. Avoid prose explanations where a bullet point will do - this is EXTREMELY IMPORTANT. The model doesn’t need narrative context — it needs clear, parseable instructions.

## Audit for Contradictions and Redundancy

Set a recurring reminder to review your skill files the same way you’d review any codebase. Look for:

- Instructions that contradict each other
- Guidance that was added for a specific situation but was never scoped to that situation
- Documentation for tools or patterns your project no longer uses
- Repeated information across multiple files

Remove mercilessly. Everything in a skill file has a cost.

## Use Scripts

For tasks requiring determinism like parsing JSON, sorting data, compiling code, determistic searching, API calls, or math calculations.

Why You Should Use Deterministic Scripts:
- Repeatable Output: Code runs the same way every time, eliminating unpredictable decision-making branches.
- Speed & Cost: Executing code is significantly cheaper and faster than generating tokens for LLM reasoning.