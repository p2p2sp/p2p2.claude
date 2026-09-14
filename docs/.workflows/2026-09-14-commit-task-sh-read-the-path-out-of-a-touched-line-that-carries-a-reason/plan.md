# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "commit-task.sh: read the path out of a `touched:` line that carries a reason"
Plan: C:\Users\dariu\.claude-dario\plans\typed-juggling-fountain.md

---
<!-- HEADER -->

## Goal
`commit-task.sh --notes` declares the path an implementor wrote on a `touched:` line even when that
line also carries a reason after ` - ` or in ` (...)`, so the file is staged and committed instead of
coming back as `undeclared:`; and when the script does refuse a commit, it prints every declared path
it had to drop, so the operator sees that the line's shape was at fault rather than a missing
declaration.

## Context
During a `superbuild` run on a host repo the commit of task 7 was refused with
`undeclared: src/.dockerignore` for a file the implementor had just declared. The notes line was
`- touched: src/.dockerignore - wiersz \`!backend/.../CatalogItem.cs\` na koncu listy ...`. The
`touched:*` branch of `commit-task.sh` (lines 231-234) passes the whole remainder of the line to
`add_declared`, unlike the task-file branch (line 217) which strips a trailing ` (<symbol>)`;
`normalise_path` (lines 146-164) only trims whitespace, backticks, a `./` prefix and a trailing `/`.
The resulting pseudo-path matches no file, is silently dropped by the `stageable` loop (lines
255-270), and `is_declared` then misses the real path. The script is fail-closed, so nothing was
committed and nothing was lost - but the operator had to re-declare the file by hand. This repo is
the plugins' source: editing bash/markdown IS shipping, there is no build step, and script
regressions live in `tests/superdev/commit-task.test.ts` (14 cases, green today).

## Out of scope
- Rescuing a reason appended with no ` - ` and no ` (` separator (e.g. `touched: a.txt bo tak`).
- A path whose own name contains ` - ` or ` (` is truncated at that separator - accepted trade-off.
- Changing the fail-closed behaviour, the exit codes, or the `undeclared:` output shape.
- The task-file `### Files` parsing branch (line 217) - it already strips its comment.

## Acceptance criteria
1. On a run that refuses the commit (exit 2), every declared path the `stageable` loop dropped is
   printed on stdout as `dropped: <path>`; the `undeclared:` lines and the stderr error are
   unchanged.
2. No run that exits 0 prints a `dropped:` line.
3. A notes line `- touched: sub/extra.txt - <reason>` declares `sub/extra.txt`: the file is staged
   and lands in the commit, exit 0.
4. A notes line `- touched: sub/extra.txt (<comment>)` declares `sub/extra.txt` the same way.
5. A bare `- touched: sub/extra.txt` keeps behaving exactly as it does today, and a path containing
   a space is still declared whole.
6. A `touched:` value that reduces to an empty path after the cut declares nothing - a refused run
   prints no `dropped:` line for it.
7. `commit-task.sh`'s header contract documents both the `dropped:` output and the cut rule.
8. `superdev/agents/superbuild-task-implementor.md`,
   `superdev/agents/simplebuild-task-implementor.md` and `superdev/references/review-contract.md`
   each state that the `touched:` line is machine-read, carries the path alone, and that the reason
   belongs on its own line.
9. `node --test "tests/**/*.test.ts"` is green from the repo root.

<!-- /HEADER -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - fix(superdev): read the path out of a touched line that carries a reason
- Covers: criteria #3, #4, #5, #6, #7
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- Task 1 - blocks: both tasks edit `commit-task.sh`'s header contract block and its test file, and
  this task's empty-value test asserts on the `dropped:` output Task 1 adds

### Files
- modify - superdev/scripts/commit-task.sh (the `touched:*` case arm of the `--notes` loop, and the
  `--notes` paragraph of the header comment)
- modify - tests/superdev/commit-task.test.ts (new cases, using the existing `seedRun`, `write`,
  `run`, `committedFiles` helpers)

### Test Commands
#### Build
- none - this repo ships markdown, JSON and bash with no build step

#### Tests
- `node --test "tests/superdev/commit-task.test.ts"` - expect every case to pass and `fail 0`

### Approach
1. In the `touched:*` arm of the `--notes` reading loop, bind the raw remainder to a local `value`
   (`value="${entry#touched:}"`) - before any `trim`, so a value that is nothing but a separator and
   a reason reduces to empty rather than to the reason.
2. Cut the reason off `value` with `value="${value%% - *}"` and `value="${value%% (*}"`, then pass
   `"$(trim "$value")"` to `add_declared`. `%%` strips the longest matching suffix, so each expansion
   cuts at the first occurrence of its own separator and applying both leaves the text before
   whichever separator came first, in either order. `add_declared` keeps handling the empty case,
   `.temp/`, `.` and backtick stripping via `normalise_path`.
3. Update the header comment: the `--notes` parameter paragraph (currently `every "touched: <path>"
   line in it joins the declared set`) states that the path ends at the first ` - ` or ` (`, so a
   reason appended to the line does not corrupt the declaration.
4. Add to `tests/superdev/commit-task.test.ts`: a case for a ` - ` reason, a case for a ` (comment)`
   suffix, a case for a declared path that itself contains a space (a guard for criterion #5 -
   unchanged behaviour, so it holds before the change too), and the empty-value case of the second
   failure-mode bullet. Each writes its notes file with `write(repo.dir, NOTES_REL, ...)`
   after `seedRun` and asserts the committed set with `committedFiles`.

### Failure modes
- when a `touched:` value carries neither ` - ` nor ` (` -> response the whole trimmed value stays
  the path, exactly as today, log none, test the new path-with-a-space case plus the existing
  `a 'touched:' path from --notes joins the declared set and lands in the commit`
- when a `touched:` value cuts to empty (`- touched:  - reason`) -> response `add_declared` returns
  without declaring anything and the script runs on, log none, test a refused run (a foreign change
  forces exit 2) asserting stdout carries `undeclared:` for the foreign file and no `/^dropped:/m`
  line - before this change the junk declaration `- reason` is declared and Task 1 prints it as
  `dropped: - reason`

### Contracts
- `touched:` line grammar consumed by `commit-task.sh --notes`: the declared path is the trimmed text
  between `touched:` and the first ` - ` or ` (`, whichever appears first; backticks around it and a
  `./` prefix are stripped by `normalise_path`; a value reducing to empty declares nothing.
  Consumed by Task 3, which writes this rule into the implementors' notes contract.
- Validation of that external value (it comes from a file an agent wrote): the cut result passes
  through `normalise_path` + `add_declared` unchanged from today - `.temp/` and the empty string are
  dropped there, `.` sets `declare_all`, and a path that is neither tracked nor present on disk is
  dropped by the existing `stageable` loop before it can reach `git add`.

### DoD
A notes file whose `touched:` line carries a reason after ` - ` or in ` (...)` commits that file; the
bare form and a path with a space are unchanged; an empty value declares nothing; the header contract
states the rule; every case in the file is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - docs(superdev): state that the touched line is machine-read
- Covers: criteria #8, #9
- TDD: none
- Model: sonnet
- Effort: low

### Dependencies
- Task 2 - blocks: the wording states the grammar Task 2 implements

### Files
- modify - superdev/agents/superbuild-task-implementor.md (the `touched: <repo-relative path>`
  bullet under `## 3. Record notes`)
- modify - superdev/agents/simplebuild-task-implementor.md (the `touched: <repo-relative path>`
  bullet under `## 4. Record notes`)
- modify - superdev/references/review-contract.md (the `touched: <repo-relative path>` bullet under
  `## Notes line formats`)

### Test Commands
#### Build
- none - this repo ships markdown, JSON and bash with no build step

#### Tests
- `node --test "tests/**/*.test.ts"` - the whole suite, expect `fail 0`

### Approach
1. In each of the three bullets, keep the existing sentence and append one sentence stating that the
   line is read by `commit-task.sh`, carries the path alone - no backticks, no reason - and that the
   reason goes on its own line above it.
2. Keep each file's own voice and line width: the two agent files address the implementor in the
   second person, `review-contract.md` describes the format in the third person.
3. Change nothing else in those bullets - the `CARRY:`, `UNDERSPECIFIED:`, status-line and
   `no deviations` entries stay as they are.

### Failure modes
- none - documentation

### Contracts
- none - consumes the `touched:` grammar contract owned by Task 2

### DoD
All three files state the path-only rule for a `touched:` line; the full suite is green.

<!-- /TASK -->
