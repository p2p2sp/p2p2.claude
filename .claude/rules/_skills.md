---
paths:
  - "**/skills/**"
  - "**/agents/**"
---

## LLM is your audience

Remember, you're writing a skill or agent for an LLM, not a human. An LLM needs short, on-point instructions, highly preferable bullet points - it should probably be more like code instructions than plain prose. An LLM doesn't need long sentences (prose) surrounded by context. Too much information means chaos and misleading decisions.

## Write for Retrieval, Not for Completeness

The instinct when writing skill or agent documentation is to be thorough. Cover every parameter. Note every edge case. Document every default behavior. Resist this. LLM doesn’t need a manual. It needs the delta — the things that differ from sensible defaults. If the right behavior is what a competent developer would do anyway, you don’t need to document it.

## Use Clear Structure and Headings

Content at the top of a file and under clear headings gets more reliable attention than content buried in the middle of dense paragraphs. Structure your skill or agent files so that the most critical, most frequently relevant instructions are first and clearly marked.

Use short, declarative sentences. EXTREMELY IMPORTANT is to avoid prose explanations where a bullet point will do. The LLM doesn’t need narrative context — it needs short, clear, parseable, bulletproof instructions.

## Audit for Contradictions and Redundancy

Set a recurring reminder to review your skill or agent files the same way you’d review any codebase. Look for:

- Instructions that contradict each other
- Guidance that was added for a specific situation but was never scoped to that situation
- Documentation for tools or patterns your project no longer uses
- Repeated information across multiple files

Remove mercilessly. Everything in a skill file has a cost.

## Use Scripts

If You can automate something and instead of LLM reasoning replace by deterministic script - do it without any doubt. Especialy for tasks requiring determinism like parsing JSON, sorting data, compiling code, determistic searching, API calls, or math calculations.

Why You SHOULD use deterministic scripts:
- Repeatable Output: Code runs the same way every time, eliminating unpredictable decision-making branches.
- Speed & Cost: Executing code is significantly cheaper and faster than generating tokens for agent reasoning.

## Gotchas
- Shortening the text cannot mean less precise instructions.
- Agent also can have references and LLM can just read it - even if the documentation says nothing about it.