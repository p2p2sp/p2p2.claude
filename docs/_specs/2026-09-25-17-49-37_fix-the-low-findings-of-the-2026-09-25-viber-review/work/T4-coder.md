# T4 - coder notes

- Root cause: the `--split` commit ran `git add -A -- "$dir"`, i.e. the WHOLE run directory,
  so any `docs/<run>/work/*.md` trail file dropped in that dir (a coder's own notes, `viber
  T3-coder.md`-style) rode into the decomposition's `chore(viber): decompose plan ...` commit
  even though no task claims it.
- Fix: narrowed both the `git add -A` and the `git diff --cached`/`git commit` pathspecs to the
  four paths this call itself owns: `"$dir/plan.md" "$dir/spec.md" "$dir/tasks" "$dir/status.md"`.
  `work/` (and anything else future-dropped beside the plan) is simply never named, so it stays
  untracked.
- New test sits right after "the decomposition is committed with the plan..." and reuses its
  shape: writes an untracked `work/T3-notes.md` before `--split`, then asserts it is absent from
  `git show --name-only HEAD` and still shows as `??` in `git status --short` afterward.
- Trap: `git status --short` on a brand-new untracked directory collapses to the directory path
  (`?? docs/.../work/`), not the file inside it - match on the directory, not the file basename.
