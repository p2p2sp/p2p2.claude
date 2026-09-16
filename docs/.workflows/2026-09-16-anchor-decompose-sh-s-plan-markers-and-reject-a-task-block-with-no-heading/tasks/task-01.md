
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


### Covered criteria
1. Whole-line markers - each of the four block markers opens or closes a block only when it is the
   entire line, trailing whitespace allowed; a marker quoted inside a longer line is ordinary content.
2. Task count intact - a plan whose task body quotes the TASK open and close markers in prose
   decomposes into exactly as many `tasks/task-NN.md` files and index rows as it has real task
   blocks, with the quoted line preserved verbatim inside the task file.
