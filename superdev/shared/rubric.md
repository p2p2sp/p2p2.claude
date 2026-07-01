# Deliverable-verification rubric

The verification rubric for `superbuild-reviewer-plan`'s whole-plan review gate — applied to EVERY task against
the cumulative `<base>..HEAD` diff. The four stable "How to …" sections (How to read a `## Deliverable`,
How to verify `## Tests` per `## Mode`, Test-quality anti-patterns, How to verify conventions) live in
`shared/rubric-core.md` — **read it first**. Wherever a core rule says "the diff", substitute the cumulative
`<base>..HEAD` range; the core's **CRITICAL / Note** severity vocabulary is used as-is here (this rubric is
2-bucket). Only the severity buckets and PASS/FAIL mapping below are specific to this rubric.

## Severity buckets

- **CRITICAL** — a missing/mismatched Deliverable, a missing/weak gate test, a documented-convention
  violation, a placeholder marker, a plan inconsistency. Any CRITICAL forces a non-PASS verdict.
- **Note** — stylistic divergence, informational context (e.g. pre-existing modifications outside the
  reviewed diff), anything the caller should know but that does not block. Never forces a non-PASS.

## PASS / FAIL criteria

A two-way decision:

- **PASS** — the Deliverable is verified, every gate test is verified per the `## Mode` rules, and no
  documented convention is violated.
- **FAIL** — every other outcome. (Read conventions only for directories the diff touched — drift in a
  module the diff does not interact with is not raised at all.)

Every issue raised MUST cite a `path:LINE` that appears in the reviewed diff. Never fail a review
without naming the exact Deliverable, test intent/identifier, or convention rule violated.
