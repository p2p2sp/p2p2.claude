# T1 coder notes

- Byte budget was the binding constraint: after all required additions the file first landed at
  12586 bytes (86 over). Trimmed wording in Owned, Layered and Shared harness until it settled at
  12496, without dropping any DoD-required content.
- Renamed `Integration layer` to `Shared harness` rather than adding a bullet beside it, per
  `.claude/rules/instruction-editing.md` - the task's own wording ("Integration layer widened to
  a shared harness...") frames this as widening the same rule, not a new one.
- `Provable`'s new "any other wording" sentence deliberately stays generic (no id-naming) since
  the literal id-naming case is `Self-proven`/C1, enforced by `plan-index.sh` (T2's file, not
  touched here).
- Other coders' uncommitted changes were present in `tests/viber/plan-index.test.ts`,
  `viber/scripts/plan-index.sh`, `viber/skills/setup/assets/usage.html` at start - untouched,
  outside this task's `Files`.
