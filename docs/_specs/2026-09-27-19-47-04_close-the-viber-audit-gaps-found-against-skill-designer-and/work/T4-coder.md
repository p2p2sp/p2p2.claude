# T4 coder notes

- Extended the existing sign-in bullet and Input line in place (per `.claude/rules/instruction-editing.md`), not new bullets - matches how this repo wants variant requirements folded into an existing sentence.
- `accounts:` needed a literal trailing colon in `e2e-writer.md`'s Input line to satisfy the verification grep and to mirror the labelled-line form the dispatch actually sends; the body's sign-in bullet still says plain `accounts` since there it names the resolved value, not the label.
- The FAIL-before-write behavior lives in the existing Explore section (which already runs before Write), so no new step or reordering was needed - just the added clause on the sign-in bullet.
