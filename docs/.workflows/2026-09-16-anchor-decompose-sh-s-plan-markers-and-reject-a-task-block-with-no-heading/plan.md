# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Anchor decompose.sh's plan markers and reject a task block with no heading"
Plan: C:\Users\dario\.claude-p2p2\plans\whimsical-plotting-mango.md

---
<!-- HEADER -->

## Goal
`decompose.sh` splits a plan into task files only on real block markers, and refuses to build a
working directory out of a task block that carries no task heading: a plan whose prose quotes a
block marker decomposes into exactly its real block count, and a block without a
`## Task <N> - <title>` heading stops the decomposition with a named error and a non-zero exit
instead of a phantom task file with an empty title column.

> Naming note for the implementor: this plan never writes the four HTML-comment block markers
> literally, because the very bug it fixes would make a literal mention open a spurious block during
> its own decomposition. They are named here as **the TASK open marker**, **the TASK close marker**,
> **the HEADER open marker** and **the HEADER close marker** - the four markers already present in
> `superdev/scripts/decompose.sh`'s awk splitter and in both plan templates.

## Context
The awk splitter in `superdev/scripts/decompose.sh` matches its four block markers unanchored, so
any line that merely *contains* the TASK open marker - a plan task about the markers themselves,
even inside backticks - opens a new block. The observed symptom was a phantom `task-09.md` with an
empty title in the stdout index, reported only as a `warning: ... has no 'Covers:' criteria` on
stderr while the script exited 0 and the build proceeded on garbage. Two defects stack here: the
loose match, and the absence of any check that a produced task file actually looks like a task. The
fix anchors the markers to whole lines and makes a heading-less block a hard error with its own exit
code.

## Out of scope
- Requiring the heading's `<N>` to equal the task file's index number.
- Any change to the `Covers:` parsing, the criteria append, or the decomposition commit.
- Rewriting existing plans under `docs/.workflows/` or `.temp/`.

## Acceptance criteria
1. Whole-line markers - each of the four block markers opens or closes a block only when it is the
   entire line, trailing whitespace allowed; a marker quoted inside a longer line is ordinary content.
2. Task count intact - a plan whose task body quotes the TASK open and close markers in prose
   decomposes into exactly as many `tasks/task-NN.md` files and index rows as it has real task
   blocks, with the quoted line preserved verbatim inside the task file.
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

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - anchor the plan block markers to whole lines
- Covers: `Whole-line markers` (#1), `Task count intact` (#2)
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- none - first task of the plan

### Files
- modify - superdev/scripts/decompose.sh (the `awk -v dir=... -v hdr=...` splitter, header comment)
- modify - tests/superdev/decompose.test.ts (new regression test)

### Test Commands
#### Build
- bash -n superdev/scripts/decompose.sh

#### Tests
- node --test tests/superdev/decompose.test.ts

### Approach
1. In the awk splitter of `decompose.sh`, anchor each of the four marker patterns without touching
   their actions or their order: keep the marker text exactly as it stands today, prefix it with `^`
   and suffix it with `[[:space:]]*$` inside the same `/…/` pattern, so the HEADER open, HEADER
   close, TASK open and TASK close rules each match a whole line only.
2. Extend the header comment's description of the split (the `rozdziela taski (sekcje TASK)` bullet)
   with the rule that a marker counts only when it is the whole line.
3. Add a test to `tests/superdev/decompose.test.ts` building a plan of two real task blocks whose
   first block's body carries a prose line quoting the TASK open and close markers inside backticks;
   assert exactly two `tasks/task-*.md` files, exactly two `tasks/` index rows, and that quoted line
   present verbatim in `tasks/task-01.md`.
4. In the same test, give one block's opening marker trailing spaces and assert it still opens the
   block.

### Failure modes
- when a line contains a marker but is not the whole line -> response the line is written into the
  task file as ordinary content and opens nothing, log none - not an error condition, test the new
  "prose quoting the markers decomposes into the real block count" case.
- when a marker line carries trailing whitespace or a CRLF carriage return -> response
  `[[:space:]]*$` absorbs it and the block opens or closes exactly as before, log none - not an
  error condition, test the trailing-space assertion in that same new case.

### Contracts
- The splitter's block grammar: a block boundary is a line equal to one of the four markers modulo
  trailing whitespace. Consumed by `reject a task block with no task heading` (Task 2), whose
  heading check runs on the blocks this grammar produces.

### DoD
A plan quoting the markers in prose decomposes into exactly its real task count; `bash -n` clean and
`node --test tests/superdev/decompose.test.ts` green.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->
