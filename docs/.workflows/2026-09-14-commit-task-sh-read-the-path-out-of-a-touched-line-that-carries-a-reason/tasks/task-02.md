
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


### Covered criteria
3. A notes line `- touched: sub/extra.txt - <reason>` declares `sub/extra.txt`: the file is staged
   and lands in the commit, exit 0.
4. A notes line `- touched: sub/extra.txt (<comment>)` declares `sub/extra.txt` the same way.
5. A bare `- touched: sub/extra.txt` keeps behaving exactly as it does today, and a path containing
   a space is still declared whole.
6. A `touched:` value that reduces to an empty path after the cut declares nothing - a refused run
   prints no `dropped:` line for it.
7. `commit-task.sh`'s header contract documents both the `dropped:` output and the cut rule.
