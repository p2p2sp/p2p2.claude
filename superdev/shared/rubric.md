# Deliverable-verification rubric

The verification rubric for `agent-plan-auditor`'s whole-plan review gate — applied to EVERY task against
the cumulative `<base>..HEAD` diff. The four stable "How to …" sections (How to read a `## Deliverable`,
How to verify `## Tests` per `## Mode`, Test-quality anti-patterns, How to verify conventions) live in
`shared/rubric-core.md` — **read it first**. Wherever a core rule says "the diff", substitute the cumulative
`<base>..HEAD` range; the core's **CRITICAL / Note** severity vocabulary is used as-is here (this rubric is
2-bucket). Only the severity buckets and PASS/FAIL/BLOCKED mapping below are specific to this rubric.

## Severity buckets

- **CRITICAL** — a missing/mismatched Deliverable, a missing/weak gate test, a documented-convention
  violation, a placeholder marker, a plan inconsistency. Any CRITICAL forces a non-PASS verdict.
- **Note** — stylistic divergence, informational context (e.g. pre-existing modifications outside the
  reviewed diff), anything the caller should know but that does not block. Never forces a non-PASS.

## PASS / FAIL / BLOCKED criteria

A three-way decision:

- **PASS** — the Deliverable is verified, every gate test is verified per the `## Mode` rules, and no
  documented convention is violated.
- **BLOCKED** — allowed **only** when **every** CRITICAL issue cites a path **outside** the reviewed
  diff **AND** the in-diff code mechanically references or depends on the violated invariant (e.g. the
  diff calls into a documented contract whose upstream rule was broken, or a touched file inherits a
  global rule that was violated elsewhere). Mixed (at least one in-diff CRITICAL **and** at least one
  out-of-diff CRITICAL) → **FAIL**, never BLOCKED. `BLOCKED` is narrow on purpose: convention drift in
  a module the diff does not interact with is not raised at all — only read conventions for directories
  the diff touched.
- **FAIL** — every other outcome.

Every issue raised MUST cite a `path:LINE` that appears in the reviewed diff (or, for BLOCKED, the
out-of-diff `path:LINE` plus the named rule/invariant). Never fail a review without naming the exact
Deliverable, test intent/identifier, or convention rule violated.
