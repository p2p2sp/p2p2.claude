# The plan format is parsed in five places

The template shape (`<!-- TASK -->` markers, `### T<n> - <title>` headings, task fields, the
`## Contracts` appendix of `### C<n>` blocks opening on `File:`) is read by `plan-index.sh`,
`plan-path.sh` (its comment strip must keep the TASK markers), `commit-task.sh` (subject,
`Files:` staging), `archive-run.sh` and `run-branch.sh`'s `plan_type()` (a task's `Repro:` line,
for `{type}`). A field or marker change touches the templates, `references/plan-rules.md` and
every parser.

- A rule switching its `plan-rules.md` tag, `(script)` or `(review)`, moves its enforcement too.
- The plain `plan-index.sh` call (the planner's) validates any plan file; `--split` exits 2 on
  anything but the run's own `<dir>/plan.md`, so only the landed copy is decomposed.
- A landed plan is frozen, so a run resumed after an upgrade must still validate: a new
  `plan-index.sh` check stays exempt under `--split`. Exempt there alone: the Exclusive-leaf rule,
  the redundant-dependency check (`plan-rules.md`'s Minimal rule - a `Depends-on` entry another
  entry of the same line already reaches), the writer-dependency check below, and an appendix
  where no block carries `File:` (rejected by the plain call; under `--split` the
  Homed/Seen/Consumed-after checks skip such a plan too).
- `plan-index.sh` also refuses a task naming a contract block in `Uses` with no dependency path,
  direct or transitive, to the lower-numbered task holding that block's `File:` path and naming
  it too (the writer-dependency check, `plan-rules.md`'s Consumed-after rule), naming both tasks.
- `--split` cuts a task's `- DoD:` line on `;` into numbered `- DoD.<k>:` lines in `tasks/<id>.md`
  only (the plan keeps its one line). The coder's `DOD: <met>/<total>` line, the reviewer's
  clause-by-clause gate and `implementor`'s short-`DOD:` retry all count those clauses: a change
  to the separator or numbering touches the splitter, `task-coder`, `task-reviewer`, `tdd` step 1
  and `implementor` together.
