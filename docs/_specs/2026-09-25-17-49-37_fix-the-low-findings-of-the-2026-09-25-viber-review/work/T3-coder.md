# T3 - coder notes

- Root cause: `hastasks` was a whole-document flag set the moment `## Tasks` appeared anywhere,
  so a `<!-- TASK -->` block opened earlier in the file (e.g. under `## Goal`) still parsed as a
  real task, got listed in the index, but was swept into `spec.md` by `--split`'s cut (which is
  the `## Tasks` heading) - `tasks/` would never carry a file for it.
- Fix: record `early[n] = (hastasks ? 0 : 1)` at the moment each `<!-- TASK -->` marker opens,
  then in `END` fail every task with `early[i]` set, naming it by id - same `fail()`/`err`
  mechanism as every other exit-4 case, so it shares the exit path and stdout stays empty.
- New test lives right before the existing "no `## Tasks` heading at all" test in
  `tests/viber/plan-index.test.ts`, and reuses the same misplacement pattern the file's other
  "task above/around a heading" tests already use (`.replace("## Goal\n", ...)`).
- Ran the working tree's other in-flight, uncommitted parallel-task diffs untouched; only
  `viber/scripts/plan-index.sh` and `tests/viber/plan-index.test.ts` were edited for T3.
