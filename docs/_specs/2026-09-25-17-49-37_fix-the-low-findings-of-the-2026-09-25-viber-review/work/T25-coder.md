# T25 coder notes

- Both script headers now document that they keep one temp file from mktemp in system temp, cleaned by EXIT trap. issue-templates also documents the fallback to $TMPDIR or /tmp when mktemp fails.
- Updates followed the header contract pattern in `.claude/rules/shell-script-header.md`: each contract block explicitly spells out the I/O semantics so a caller can trust the header without re-verifying the code.
- Grep verification passes: two header lines name mktemp and its cleanup, two code lines show the actual mktemp calls and their fallbacks.
