
## Task 2 - reject a task block with no task heading
- Covers: `Heading required` (#3), `Hard error on a missing heading` (#4), `Documented contract` (#5), `Suite green` (#6)
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- `anchor the plan block markers to whole lines` (Task 1) - blocks: the heading check must run on
  blocks a corrected splitter produced, or a phantom block from an unanchored marker surfaces as a
  missing heading instead of as the splitting defect it is.

### Files
- modify - superdev/scripts/decompose.sh (the awk splitter's `intask` and `END` blocks, header comment)
- modify - tests/superdev/decompose.test.ts (file header comment, `taskBlock` fixtures, new error-path tests)

### Test Commands
#### Build
- bash -n superdev/scripts/decompose.sh

#### Tests
- node --test tests/superdev/decompose.test.ts
- node --test "tests/**/*.test.ts"

### Approach
1. In the awk splitter's `intask` action, capture `title[n]` from the block's **first non-empty
   line** only, and only when that line matches
   `^##[[:space:]]+Task[[:space:]]+[0-9]+[[:space:]]*-[[:space:]]*[^[:space:]]`; keep the existing
   `sub(/^##[[:space:]]*/, "", t)` so the index title column stays `Task <N> - <title>`. A per-task
   flag records that the first non-empty line has been seen, so a heading further down never fills
   the slot.
2. In the splitter's `END` block, before the index rows are printed, emit
   `error: task-NN.md has no task heading` to `/dev/stderr` for every task whose `title` is empty,
   then `exit 6` once if any was emitted; `set -e` turns that into the script's exit status, ahead of
   the `Covers:` loop, and the existing `cleanup_on_failure` EXIT trap removes a working directory
   this run created.
3. Document in the header comment that each task block must open with a `## Task <N> - <title>`
   heading (the number is not checked against the file index) and that a block without one exits 6,
   placing it beside the header's existing exit-5 bullet (the `Covers:` criteria one). Write the new
   comment text in English, per the repo's "Always in English: … scripts" convention, even though the
   neighbouring bullets are Polish. Refresh `tests/superdev/decompose.test.ts`'s own file header,
   which today says the script "exits 1/4/5 on its documented error paths", to name exit 6 too.
4. Change the fixture of the existing test `edge: a task title containing a tab breaks the
   tab-separated index row (documented, not fixed)` from `Task 1\tTabbed` to `Task 1 - Tab\tbed`, so
   the tab-in-title case it documents survives under a conforming heading and still yields a fifth
   tab-separated field.
5. Add two tests: a plan whose **two** task blocks both carry `## Notes` instead of a task heading
   exits 6 with one error line per task - the first naming `task-01.md`, the second `task-02.md` -
   prints no `tasks/` index row and leaves no run directory; and a plan whose single block carries a
   conforming heading below a prose line exits 6 the same way.

### Failure modes
- when a task block's first non-empty line is not a `## Task <N> - <title>` heading -> response awk
  prints `error: task-NN.md has no task heading` and exits 6, aborting before the `Covers:` loop, log
  that stderr line, test the new "two `## Notes` blocks -> exit 6" case.
- when several task blocks lack a heading -> response one error line per offending task followed by a
  single `exit 6`, log those stderr lines, test the per-task error-line assertions of that same case.
- when a conforming heading appears in the block but not as its first non-empty line -> response the
  same error and exit 6, since the heading must open the block, log the same stderr line, test the
  new "heading below a prose line -> exit 6" case.
- when the run created the working directory and the heading check fails -> response the existing
  `cleanup_on_failure` EXIT trap removes it, while an adopted or pre-existing directory is left
  untouched, log none beyond the error line, test the run-directory-absent assertion in the new
  "two `## Notes` blocks -> exit 6" case.

### Contracts
- Exit code 6 - "a task block carries no task heading". New member of `decompose.sh`'s exit-code set
  `{1, 3, 4, 5}`. Consumers of that set: the script's own header comment (updated in this task) and
  `tests/superdev/decompose.test.ts`, which asserts each code; `superdev/skills/simplebuild/SKILL.md`
  and `superdev/skills/superbuild/SKILL.md` invoke the script but branch on success/failure only -
  grep for `exit 4` / `exit 5` finds no numeric handling there, so neither needs a change.
- Task heading shape `## Task <N> - <title>` - the one source of a task's title, already the form
  `superdev/references/review-contract.md`'s `## Naming` section names for a plan task. Both the
  stdout index's title column and the `Covers:` loop's `task_title` sed read that same line, and this
  check guarantees neither can see an empty title. No other task consumes it.

### DoD
A task block without a conforming heading exits 6 with its error line and leaves no run directory;
`bash -n` clean and `node --test "tests/**/*.test.ts"` green.


### Covered criteria
3. Heading required - every `tasks/task-NN.md` opens, on its first non-empty line, with a heading of
   the shape `## Task <N> - <title>` and a non-empty title; the number need not equal the file index.
4. Hard error on a missing heading - a task block without that heading aborts the run with
   `error: task-NN.md has no task heading` on stderr and exit 6, prints no task index rows, and
   leaves no working directory this run created.
5. Documented contract - `decompose.sh`'s header comment states the whole-line marker rule, the
   heading requirement and exit 6, beside its existing exit-4 and exit-5 bullets, and
   `tests/superdev/decompose.test.ts`'s own file header names exit 6 among the script's documented
   error paths.
6. Suite green - `node --test "tests/**/*.test.ts"` passes, the existing tab-in-title edge case
   still documented by a heading that satisfies the new shape.
