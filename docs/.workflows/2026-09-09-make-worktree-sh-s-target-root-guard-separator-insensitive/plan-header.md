Title: "Make worktree.sh's target-root guard separator-insensitive"


## Goal
`worktree.sh` refuses to operate on its own target root no matter which separator spelling the
caller used for either argument, so `remove` can never `rm -rf` the repository it was anchored to.
The already-RED reproduction test in `tests/superfix/worktree.test.ts` turns GREEN untouched and the
whole suite is clean.

## Context
`superfix/skills/code-auditor/scripts/worktree.sh:47` guards the target root with a raw string
compare - `[ "$wt" != "$root" ]`. On Windows the two arguments legitimately arrive in different
spellings (`root` native with backslashes for `git -C`, `wt` in the documented `C:/...` form), so
two spellings of the SAME path compare unequal and the guard does not fire. Traced live: `remove`
then finds `[ -e "$wt" ]` true, `git worktree remove --force` refuses because it is the main
worktree, the `rm -rf "$wt"` fallback deletes the entire target repository, and the script prints
`WORKTREE_REMOVED` and exits 0. On POSIX both spellings are byte-identical so the guard fires - which
is why CI on ubuntu is green and the defect is Windows-only. The adjacent filesystem-root guard
(`case "$wt" in /|//|[A-Za-z]:[\\/])`) already handles both separators; this one guard was missed.

## Acceptance criteria
1. `worktree.sh` rejects the target root spelled with a different separator: given a native-separator
   `<target-root>` and the same path in `/` form as `<worktree-path>`, it prints one
   `WORKTREE_FAILED ... must not be the target root: ...` line and exits 1.
2. That rejection leaves the target root on disk - nothing is deleted.
3. The comparison is insensitive to both separator style and a trailing separator, so `C:\r`, `C:/r`
   and `C:/r/` all count as the same path as the target root `C:\r`.
4. `worktree.sh` stays `#!/bin/sh`-compatible - it contains no bash-only `${var//…}` pattern
   substitution.
5. Only the identity guard changes: the filesystem-root guard, the absolute-path guard, `clear_path`,
   and the whole `add` / `remove` case body are byte-identical to today.
6. The reproduction test `tests/superfix/worktree.test.ts` "the target root itself as the worktree
   path is rejected" passes without being edited - it is already in the working tree, RED, as the
   handoff evidence.
7. `node --test "tests/**/*.test.ts"` reports `fail 0` from the repo root, with one more passing test
   than today and no test lost (on this Windows machine: `tests 605`, `pass 601`, `fail 0`,
   `skipped 4`, against today's `tests 605`, `pass 600`, `fail 1`, `skipped 4`; the skip count is
   platform-dependent, `fail 0` is not).

