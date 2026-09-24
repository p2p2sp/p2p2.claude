# T21 - coder notes

- test-strategy.md's unit-test rule now reads "On a host with a test layer, every acceptance
  criterion carrying a decision is proven by unit-level tests...", matching lines 11 (no test
  layer -> TDD: none) and 22 (no decision -> TDD: none) instead of contradicting them.
- plan-rules.md's Title rule dropped "### " and "committed verbatim": commit-task.sh's `subject`
  is literally `heading` with the "### " prefix already stripped by the awk parse, never a
  conventional-commit type prefix.
- Exclusive, Reproduced and Block body each now carry a `(script)` line naming exactly what
  plan-index.sh's validator rejects (Exclusive value, Repro path/TDD pairing, block's `File:`
  line presence) ahead of their existing `(review)` line, which keeps the semantic/completeness
  half.
- Did not touch docs/reviews/2026-09-24_viber-review.md (marking finding #20 WYKONANE) or
  plan-index.sh's own docstring example titles (`chore:`/`feat:`): neither is in this task's
  Files.
