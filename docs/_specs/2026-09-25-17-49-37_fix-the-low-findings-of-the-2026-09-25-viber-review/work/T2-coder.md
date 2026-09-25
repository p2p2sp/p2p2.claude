## T2 - coder notes

- Bug: `git diff-tree <sha>` (no `-m`) shows an EMPTY diff for a merge commit by
  design, so the old `--landed` check always read a `--no-ff` merge as
  touching none of the task's files, even when it plainly brought them in.
- Fix: diff the landed sha against its own first parent (`git diff --name-only
  "$sha^" "$sha" -- paths`), which is a no-op change for an ordinary
  single-parent commit and, for a merge, is exactly "what changed relative to
  the branch it merged into" - what the task calls "the commit's first
  parent". A root commit (no parent) keeps the old `--root` diff-tree form.
- Test order trap: the harness pins every commit's author/committer date to
  the same instant, so `git log --format=%s` is not reliably reverse-
  chronological across a merge fixture; assert with `.sort()` rather than a
  literal order when a test's fixture makes more than one commit.
- Other modified files seen in `git status` (plan-path.sh, README.md,
  implementor/SKILL.md, usage.html, _common.md, plan-path.test.ts) belong to
  other tasks in this run's parallel dispatch; not touched here.
