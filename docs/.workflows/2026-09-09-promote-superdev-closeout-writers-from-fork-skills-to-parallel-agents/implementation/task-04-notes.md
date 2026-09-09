## Task 4 notes

- Staged the four skill-directory deletions with `git add -A <dir>` (not spelled out in Approach) - the
  portability test suite (`tests/portability.test.ts`) resolves its SKILL.md/script corpus via
  `git ls-files`, which still lists a deleted-but-unstaged file's old path and then fails on ENOENT when
  reading it. Staging the deletion is required for `node --test` to see the files as gone.
- `node --test "tests/**/*.test.ts"` shows 600 pass / 1 fail / 4 skipped, not fully green. The one failure
  (`tests/superfix/worktree.test.ts` - "the target root itself as the worktree path is rejected") is
  unrelated to this task: verified via a throwaway `git worktree add` against the pre-plan baseline commit
  (032b527, before any task in this build), where it fails identically. Left untouched - superfix's worktree
  script is outside this task's `Files` list and outside this plan's scope entirely.
- No other deviations - deletions, `plugin.json` `skills[]`/`agents[]`, `superdev/README.md`, the five
  `CLAUDE.md` spots, and the four SVG label lines all match the Approach as written.
