# Intent file - template and content rules

Loaded by the `intent` skill only at write time - right before the `Write` (or overwrite) of `<run-dir>/intent.md`. Not needed during exploration, the gap questions or the interview.

## Content rules
- Write the file in the interview's language, in the exact structure below - one `###` block per decision, carrying the question as it was asked and the confirmed answer, nothing else.
- NEVER record a rejected option, nor why it lost, nor the reasoning behind the winning one. Alternatives belong to the live interview; in the file they only crowd the context and the judgement of every downstream reader (spec, plan, build, changelog). `## Out of scope` is not a loophole for them: it lists non-goals - areas this change deliberately does not touch - never the losing alternative to a decision under `## Decisions`.
- `## ADR` is present only when the `adr` skill returned at least one accepted block, and carries those blocks copied verbatim, in the order it returned them. It is the single exception to the no-rationale rule above and covers the ADR text alone - nothing else in the file gains a justification or an alternative. On an overwrite it is carried over unchanged unless the `adr` skill re-judged its decision.
- Step 1 answers are input, not decisions: fold each into `## Request` (the sharpened goal), `## Constraints` (limits, existing state, stated preferences), or `## Out of scope` (a boundary the user drew). Every Step 1 answer that shapes the solution MUST land in one of those three; one that shapes nothing is dropped. `## Decisions` carries interview rulings only.
- Use repo-relative paths when referencing files, never absolute paths.

## Template

```markdown
# Intent: <title>
Date: <YYYY-MM-DD>

## Request
<the ask in one short paragraph, the user's own framing>

## Decisions
### <n>. <the question, worded as it was put to the user>
<the confirmed answer, one or two sentences>

## Constraints
- <...>

## Out of scope
- <non-goal: an area this change deliberately does not touch - never a rejected alternative to a decision above>

## ADR
<optional - the `## ADR` section the `adr` skill returned, its `### <slug>` blocks copied verbatim; omit the whole section when that skill returned `ADR: none` or was never invoked>

## History
- <changelog entry or ADR consulted - upheld | changed, why> (or `none`)
```
