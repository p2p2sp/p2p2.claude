
## Task 1 - feat(superdev): name the dropped declarations when commit-task refuses a commit
- Covers: criteria #1, #2, #7
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- none - first task

### Files
- modify - superdev/scripts/commit-task.sh (the `stageable` loop and the `undeclared_count` refusal
  block, plus the `Behaviour` paragraph of the header comment)
- modify - tests/superdev/commit-task.test.ts (new cases, using the existing `seedRun`, `write`,
  `run`, `taskBody` helpers)

### Test Commands
#### Build
- none - this repo ships markdown, JSON and bash with no build step

#### Tests
- `node --test "tests/superdev/commit-task.test.ts"` - expect every case to pass and `fail 0`

### Approach
1. Declare `dropped=()` beside `stageable=()` and, in each of the two `continue` branches of the
   `stageable` loop (the path that does not exist, the path `check-ignore` covers), append the path
   to it before continuing.
2. In the `undeclared_count -gt 0` block, after the `undeclared:` lines and before the stderr error
   line, print one `dropped: <path>` line per entry - nowhere else in the script, so a run that
   reaches `git add` stays silent. Iterate with the empty-safe idiom the rest of the script uses
   (`for p in ${dropped[@]+"${dropped[@]}"}`), since `set -u` plus bash 3.2 on the macOS CI leg
   aborts on a bare `"${dropped[@]}"` when the array is empty.
3. Update the header comment's `Behaviour` bullet for exit 2: alongside the `undeclared:` lines it
   now also lists every declared path that was dropped, as `dropped: <path>`, so the reader can tell
   a malformed declaration from a missing one. The `Exit codes` list is unchanged.
4. Add to `tests/superdev/commit-task.test.ts`: one case where the task declares a file that is
   never created and a foreign change forces exit 2, asserting `dropped: <that path>` on stdout
   beside the `undeclared:` line; and one case with the same never-created declaration but no
   foreign change, asserting exit 0 and no `dropped:` line - a guard for criterion #2, whose
   assertion holds before the change too, because it pins an absence.

### Failure modes
- when the commit is refused and no declared path was dropped -> response only the `undeclared:`
  lines are printed, log none, test the existing `a tracked file modified outside the declared set`
  case extended with an assertion that stdout carries no `/^dropped:/m` (a guard for an absence -
  it holds before the change as well)
- when a declared path is dropped on a run that does commit (a planned but never created file) ->
  response nothing is printed and the exit stays 0, log none, test the second new case of step 4

### Contracts
- stdout line `dropped: <path>`, one per declared path the `stageable` loop discarded, emitted only
  inside the exit-2 branch, after the `undeclared:` lines and before the stderr error. Exit codes
  (0 / 1 / 2) and the `undeclared:` and `commit: <sha>` lines are unchanged. Consumed by Task 2,
  whose empty-value test asserts the absence of such a line.

### DoD
A refused commit names both the undeclared changes and the dropped declarations; a successful commit
prints neither; the header contract says so; the new and the existing 14 cases are green.


### Covered criteria
1. On a run that refuses the commit (exit 2), every declared path the `stageable` loop dropped is
   printed on stdout as `dropped: <path>`; the `undeclared:` lines and the stderr error are
   unchanged.
2. No run that exits 0 prints a `dropped:` line.
7. `commit-task.sh`'s header contract documents both the `dropped:` output and the cut rule.
