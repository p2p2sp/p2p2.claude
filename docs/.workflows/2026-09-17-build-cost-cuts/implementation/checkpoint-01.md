# checkpoint review

## Gates

- Build - none - repo to markdown, JSON i bash; nie ma kroku budowy (root CLAUDE.md: "Editing markdown / JSON IS shipping")
- Tests - pass - 26s

## Findings

### Important

- I1 - `B22 table copied into both planners` - superdev/skills/superplan/SKILL.md:104 (and superdev/skills/simpleplan/SKILL.md:107) - both planners reproduce all five rows of the B22 derivation in prose, byte-identical to each other, and close the sentence with "B22 owns the full table with its exact rows - read it there, never copy it here" - the sentence that copies it. B22 itself states "the planning skills and the task implementors cite it, never copy it", and the plan's Task 3 `### Contracts` makes that the contract; Task 4 `### Approach` step 2(a) asked for three short lines plus a pointer, not the rows. The derivation now lives in three files and has already drifted: both copies drop B22's `-l` qualifier on the content-grep row and its "rows are read top down - the first row matching settles the kind" precedence sentence, so a planner reading only the copy derives a different kind than the reviewer applying B22 - and B22 is a Blocking class, so the drift turns into a blocking finding on a correctly-planned task. Fix: in both files replace the enumeration with the three-line summary the task asked for (test-file line -> `code`, tool command -> `scaffold`, reading -> `text`) followed by the existing pointer to B22, leaving the rows in the checklist alone.
- I2 - `ADR task block lacks Kind` - superdev/references/plan-review-checklist.md:47 - B6 now requires `Kind:` on every task and `## Author self-check` (line 204) repeats it, but `superdev/references/adr-task.md:29-34` - the task block `simpleplan` and `superplan` copy verbatim into every plan whose intent carries an `## ADR` section, as Task 1 - still carries only `Covers:`, `TDD:`, `Model:` and `Effort:`. Every such plan therefore ships a Task 1 that is B6-blocking on the plugin's own boilerplate, and its author self-check fires on a block the author did not write. No remaining task in the plan names `adr-task.md` under its `### Files`, so nothing later in this build closes it. Fix: add `- Kind: scaffold` to the block (its `### Task Checks` line `ls docs/adr/ | grep -q ...` derives `scaffold` from B22's fourth row), next to `Effort:`, and keep the `## Fill rules` marker-order sentence at line 20 consistent with both templates.

## Debt

- M1 - `B22 rows shadow the text row` - superdev/references/plan-review-checklist.md:134-142 - the precedence sentence ("the first row matching any line of the section settles the kind", the implementor's own `UNDERSPECIFIED:` call in task-03-notes.md) meets a fourth row whose leading clause, "a tool command with no test file path", literally matches a content `grep` as well; only the enumeration that follows excludes it, and the fifth row is what actually covers it. A reader applying first-match to the leading clause derives `scaffold` for nearly every text task in this repo. Tightening row 4's cell to "a build, install, validate or generator command, `ls` of a directory, or a `grep` over paths or file names" - dropping the generic opening clause - removes the overlap without changing any outcome.

## Notes

- Task 1's exec-bit change is in the index as a mode-only diff (`100644` -> `100755`) on the three scripts, and `execBitViolations` in `tests/portability.test.ts` fires only on a bare invocation with a non-`100755` mode, so the current `bash "..."` call sites stay green - the delivered state matches the task's Approach step 3.
- The two `UNDERSPECIFIED:` lines in `task-04-notes.md` and `task-05-notes.md` name the same open value (the `Effort:` default for `scaffold` / `text`); the code they produced agrees - both files leave `Effort:` governed by the pre-existing paragraph, with byte-identical wording. No defect.
- Task 3's two `CARRY:` lines (`B1-B21` left in `superplan` / `simpleplan`) are closed by Tasks 4 and 5; no `B1-B21` reference survives anywhere outside `docs/`.
- `decompose.sh` tolerates the new `- Kind:` marker line unchanged: its awk matches `- Model:` / `- Effort:` / `- Review:` by prefix and copies every other line into the task file untouched.

## Assessment

Tasks 1-5 land the change correctly and the Tests gate is green, but the round leaves the B22 derivation duplicated in three files against its own single-owner rule and makes `Kind:` mandatory without updating the one other place in the plugin that emits a task block.

VERDICT: FAIL
