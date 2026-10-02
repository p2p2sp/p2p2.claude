# The plan format is parsed in five places

The template shape (`<!-- TASK -->` markers, `### T<n> - <title>` headings, task fields, the
`## Contracts` appendix of `### C<n>` blocks opening on `File:`) is read by `plan-index.sh`,
`plan-path.sh` (its comment strip must keep the TASK markers), `commit-task.sh` (subject,
`Files:` staging), `archive-run.sh` and `run-branch.sh`'s `plan_type()` (a task's `Repro:` line,
for `{type}`). A field or marker change touches the templates, `references/plan-rules.md` and
every parser.

- Duplicated on purpose, changed together: `issue_ref()` (plan `issue:` URL to `#<N>`) in
  `commit-task.sh`, `plan-index.sh`, and `run-branch.sh`'s `plan_issue()` (the bare number, for
  `{issue-number}`); fence-aware guidance-comment stripping in `plan-path.sh`'s landing strip and
  `plan-index.sh`'s `spec.md` cut.
- The frontmatter `prototype:` key (the `.temp/` mockup path, never rewritten) is read by
  `plan-path.sh` alone, which copies the file into the run as `prototype.html` at landing;
  `plan-index.sh --split` keys on that file, never on the key.
- A fixing task's `Repro:` (the RED reproduction test `fixer` leaves uncommitted) must be one
  path of its own `Files:` with `TDD: none`; it never enters a `dirty:` line, and `task-coder`
  turns it GREEN, never rewriting, weakening or deleting it.
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
- `--split` cuts the `## Roadmap` section (up to the next `## ` heading) into `<dir>/roadmap.md` in
  the same fence- and comment-aware loop as `spec.md`, so the two cannot disagree; it removes a stale
  `roadmap.md` first and adds the file to the commit only when it exists. The `next:` parse runs in
  the validation pass (the bare call prints it too): every `N. ` line in the section is an entry, the
  first `(this plan)` marker wins, and fences are not tracked (the templates hold none). Both
  templates carry the shape: later entries with their settled decisions as indented lines.
- `--split` cuts a task's `- DoD:` line on `;` into numbered `- DoD.<k>:` lines in `tasks/<id>.md`
  only (the plan keeps its one line). The coder's `DOD: <met>/<total>` line, the reviewer's
  clause-by-clause gate and `implementor`'s short-`DOD:` retry all count those clauses: a change
  to the separator or numbering touches the splitter, `task-coder`, `task-reviewer`, `tdd` step 1
  and `implementor` together.
