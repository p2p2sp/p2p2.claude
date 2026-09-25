# T7 coder notes

- Root cause: the awk block-list matcher required `^[[:space:]]+-` (at least one leading
  space), so a `- item` line in the key's own column (no indentation) fell through to the
  "blank line ends list" branch and was silently dropped.
- Fix is a one-character regex change: `+` to `*` in that one `match()` call, so zero or more
  leading spaces are accepted before the `-`. No other logic needed to change.
- Followed the tdd skill cycle manually: added the new test, ran it alone to confirm red for
  the right reason (LABELS/ASSIGNEES/TITLE all empty/missing the unindented items), applied the
  fix, then re-ran the whole file (13/13 green) plus tests/portability.test.ts (29/29 green).
