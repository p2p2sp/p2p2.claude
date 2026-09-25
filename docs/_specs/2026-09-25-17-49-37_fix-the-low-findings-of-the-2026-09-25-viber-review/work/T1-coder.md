# T1 coder notes

- The idempotence gap only lives in the "target already carries a task half but
  nothing decomposed yet" sub-case (`has_tasks "$dest"` true, no `tasks/` dir, no
  `status.md`). The decomposition/status.md refusal stayed unconditional - the
  existing "--into refuses a target that is not a draft" test lands *identical*
  content onto those two cases and still expects exit 4, so content-matching
  must never short-circuit them.
- Comparison ignores only lines starting with `source:` (via `grep -v`), not a
  full frontmatter parse - simplest way to make "identical apart from its
  source: line" true without duplicating `set_source`'s path math on a file
  that isn't actually being landed at `$dest` yet.
- `cmp -s` and `grep -v ... || true` used because this file runs under
  `set -euo pipefail`; a bare `cmd1 && cmd2` where cmd1 can fail would abort
  the script outside an `if`.
- The self-landing special case (src path == dest path) is untouched and still
  bypasses the not-a-draft check entirely, as before - it is a distinct,
  cheaper path (no comparison needed) for the case where the caller re-lands
  the run's own file.
