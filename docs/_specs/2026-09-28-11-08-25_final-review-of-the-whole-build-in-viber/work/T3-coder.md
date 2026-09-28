# T3 - coder notes

- `--review` slots into the existing `--repair|--chore|--qa|--e2e` dispatch block: it takes the
  plan like `--chore`/`--qa` (no round), reuses the shared staging/closed-status/rollback plumbing
  verbatim, and only adds its own trail glob (`final-review-*.md`, `final-fix-coder.md`) and its
  fixed subject/footer, matching the pattern `--repair` already set for a fix outside the plan's
  file map.
- `trail_paths()` already globs (`shopt -s nullglob`), so `"final-review-*.md"` needed no new
  plumbing - same mechanism `--repair`'s `"review-T1-[0-9]*.md"`-style globs use elsewhere in the
  suite.
- No change to `usage.html`: it documents skills/switches/arguments end users see, and no existing
  `commit-task.sh` form (`--repair`, `--chore`, `--qa`, `--e2e`) is mentioned there either, so
  `--review` follows the same precedent.
