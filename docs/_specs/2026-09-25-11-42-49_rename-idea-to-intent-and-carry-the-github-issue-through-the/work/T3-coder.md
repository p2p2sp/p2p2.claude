# T3 coder notes

- `tests/portability.test.ts`'s `bashismViolations` sweep is naive text matching, not
  syntax-aware: an embedded awk `function name(...)` definition and even an incidental `((` from
  nested parens (e.g. `if ((c == "\"" ...`) read as bash-only syntax under a `#!/bin/sh` shebang.
  The YAML parser therefore has no awk user-defined functions at all - quote-stripping and
  list-item logic is duplicated inline three times (scalar, inline/comma list, block list item)
  instead of factored into a helper. Any future edit to `issue-templates.sh`'s awk block must keep
  avoiding both the `function` keyword and any adjacent `((`.
- Repository root is resolved via `git rev-parse --show-toplevel`, falling back to cwd when
  outside a repo (same pattern as `config.sh`), so "cwd anywhere inside the repository" holds
  without a dedicated walk-up.
- `gh repo view --json url --jq .url` is stubbed in tests by a fake `gh` that returns the already
  filtered URL directly (the stub never runs real `--jq`), same convention as
  `post-comment.test.ts`'s `GH_STUB`.
- File-name-order listing goes through a real temp file + `sort -o` + `while read ... < file`
  (never `cmd | while read`), per `.claude/rules/shell-loop-substitution.md`.
