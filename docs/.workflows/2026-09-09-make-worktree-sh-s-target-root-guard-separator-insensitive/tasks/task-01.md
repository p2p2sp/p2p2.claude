
## Task 1 - fix(superfix): compare the worktree path against the target root separator-insensitively
- Covers: criteria #1, #2, #3, #4, #5, #6, #7
- TDD: none

### Dependencies
- none

### Files
- modify - superfix/skills/code-auditor/scripts/worktree.sh (new `norm_path` helper; the
  `worktree path must not be the target root` guard; the `IN :` block of the header comment)

### Test Commands
#### Build
- none - this repo has no build step and no lint (markdown + JSON + shell only, per root `CLAUDE.md`)

#### Tests
- `node --test "tests/superfix/worktree.test.ts"` - `fail 0`; in particular "the target root itself
  as the worktree path is rejected" passes
- `node --test "tests/**/*.test.ts"` - `fail 0` (on this Windows machine `tests 605`, `pass 601`,
  `skipped 4`; the skip count varies by platform, `fail 0` does not)
- `grep -c 'fail "worktree path must not be the target root' superfix/skills/code-auditor/scripts/worktree.sh`
  - `1` (matches the guard's `fail` call specifically, so the header line step 4 adds cannot inflate
  the count)
- `grep -n '\${[A-Za-z_][A-Za-z_0-9]*//' superfix/skills/code-auditor/scripts/worktree.sh` - no
  output, exit 1 (no bash-only pattern substitution crept in)
- The regions criterion #5 protects are still present verbatim, checked by content rather than by
  git state (a diff goes empty once `commit-task.sh` sweeps the change in, and would then assert
  nothing): in `superfix/skills/code-auditor/scripts/worktree.sh`,
  `grep -c 'clear_path'` - `2`; `grep -c 'refusing to operate on a filesystem root'` - `1`;
  `grep -c 'worktree path must be absolute'` - `1`; `grep -c 'WORKTREE_READY'` - `2`;
  `grep -c 'WORKTREE_REMOVED'` - `2`
- `grep -c 'must not be the target root' tests/superfix/worktree.test.ts` - `1` (the RED-evidence
  assertion is still there; this is a content check, not a git-state check, so it holds whether or
  not the working-tree change has already been swept into a commit)
- `grep -c 'the target root must survive a rejected remove' tests/superfix/worktree.test.ts` - `1`

### Approach
1. Add a `norm_path` helper next to `fail`, above the argument guards. It takes one path, writes the
   comparison form to stdout: rewrite every backslash to `/`, then strip trailing `/` characters.
   Use `tr` and `sed` (POSIX), never `${var//…}` - the script is `#!/bin/sh`. Spell the backslash
   unambiguously for `tr` (an octal class such as `'\134'`) rather than `'\\'`, which some `tr`
   builds warn about as non-portable.
2. Replace the guard line `[ "$wt" != "$root" ] || fail "worktree path must not be the target root:
   $wt"` with the same check over `$(norm_path "$wt")` and `$(norm_path "$root")`. Keep the message
   text and the original unnormalised `$wt` in it, so criterion #1's grep and the test's
   `assert.match(/must not be the target root/)` both still hold.
3. Do NOT canonicalise via `cd … && pwd`: for `add` the worktree path does not exist yet, so the
   guard must decide on the string alone. `norm_path` is applied to both sides, so it only has to be
   a consistent function - it does not have to produce a filesystem-truthful path.
4. Extend the header comment's `IN :` block with one line under `<worktree-path>` stating that it
   MUST NOT be the target root and that the two are compared with separators and a trailing
   separator normalised away. Use the uppercase `MUST NOT`, matching the block's existing
   "MUST be absolute" style. Change nothing else in the header - the `OUT:` contract is unchanged.
5. Leave `tests/superfix/worktree.test.ts` alone. It is already modified in the working tree and RED;
   `commit-task.sh` sweeps it into this task's commit, which is where the regression guard belongs.

### Edge cases
- `$root` given as a filesystem root: stripping trailing slashes turns `/` into the empty string and
  `C:/` into `C:`. That is not a filesystem-truthful path, but both sides go through the same
  function so the equality test stays correct, and a `$wt` at a filesystem root is already rejected
  by the earlier guard and never reaches here.
- Trailing separator on either argument (`C:/r/` vs `C:\r`) - normalised away, compares equal,
  rejected.
- A genuinely different path that merely shares a prefix (`C:\r` root vs `C:/r/wt-verify`) still
  compares unequal and is accepted - the guard tests identity, not containment, and the existing
  `add` tests cover that.
- Empty `$root` or `$wt` never reach the guard - the usage check above rejects them first.

### Contracts
- `norm_path <path>` -> stdout: the same path with `\` rewritten to `/` and trailing `/` stripped.
  Internal to the script; no caller sees it.
- `worktree.sh add|remove <target-root> <worktree-path>` is unchanged: one stdout line
  (`WORKTREE_READY` / `WORKTREE_REMOVED` / `WORKTREE_FAILED`), exit 0 on the first two, 1 on the
  third.

### DoD
The identity guard fires for every spelling of the target root, the target root survives a rejected
`remove`, the reproduction test is GREEN without having been edited, the full suite reports `fail 0`,
and every test command above passes.


### Covered criteria
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
