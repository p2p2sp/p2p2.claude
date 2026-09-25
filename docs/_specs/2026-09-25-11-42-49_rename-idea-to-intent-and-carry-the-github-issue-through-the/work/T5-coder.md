# T5 coder notes

- `templates/spec-lite.md` and `templates/spec-full.md` are the PLAN frontmatter template (per
  viber/CLAUDE.md, `plan.md` was replaced by these two plus `tasks.md`), not the archived spec's
  frontmatter - the `issue:` line was added next to `source:`/`into:` there, matching their style.
- `plan-index.sh`'s `--split` awk scans the frontmatter block once for an `issue:` key while
  finding the closing `---`; a non-empty value is written as spec.md's own leading three-line
  frontmatter + blank line, ahead of the existing frontmatter-stripping loop, which is otherwise
  untouched (`source`/`into` still never leave plan.md).
- Other tasks of this same run (T1-T4) were already mid-flight in the tree when I started; I only
  touched my own Files list, confirmed via `git diff --stat` scoped to exactly those four paths.
- Full `tests/viber/plan-index.test.ts` run: 50/50 green, including the two new tests (issue:
  present -> three-line frontmatter; issue: absent/empty -> byte-identical to the no-frontmatter
  baseline).
