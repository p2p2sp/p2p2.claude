
## Task 3 - Add the concurrency column to the decompose index
- TDD: none
- Kind: code
- Model: opus
- Covers: `Sprawdzenie nie wstrzymuje następnego zadania` (#1), `Zadanie zależne czeka na werdykt` (#3)

### Dependencies
- `Write run-gate.sh and its test` (Task 2) - blocks: the scripts-inventory line this task writes names that script

### Files
- modify - superdev/scripts/decompose.sh (index row printing, the awk END block and the per-task capture block)
- modify - tests/superdev/decompose.test.ts
- modify - superdev/CLAUDE.md (`## Scripts inventory (superdev/scripts/)`)

### Task Checks
- tests/superdev/decompose.test.ts - node --test tests/superdev/decompose.test.ts

### Approach
1. In the per-task capture block of `decompose.sh`, collect three further per-task values alongside `model` and `review`: every `(Task <num>)` token appearing under that task's `### Dependencies` section, whether that task carries a `### Dependencies` and a `### Files` section at all, and every path token of its `### Files` lines - the path being the field that follows the ` - ` after the `add | modify | delete` verb, cut before any ` (`.
2. In the awk END block, derive a fifth column `concurrent` per task, reading `no` unless every condition for `yes` holds: the task is not task 1; it carries both a `### Dependencies` and a `### Files` section; its `### Dependencies` does not name the immediately preceding task number; and its `### Files` paths share no entry with the preceding task's. Incomplete task text therefore always yields `no`, per the spec's constraint that a task the plan does not describe completely never qualifies for concurrency.
3. Print the index row as `<task-file>\t<title>\t<model>\t<review>\t<concurrent>` and update the header comment's column description to five columns.
4. Extend `tests/superdev/decompose.test.ts` with cases for the new column: a dependent pair, a file-overlapping pair, an independent pair, task 1, and a task missing one of the two sections.
5. In `superdev/CLAUDE.md`, update the `decompose.sh` inventory line to five columns and add one `run-gate.sh` line describing it as the single runner of a stage's gate set.

### Failure modes
- when a task carries no `### Dependencies` section or no `### Files` section -> response print `no` in the concurrent column, because incomplete task text never qualifies for concurrency, log nothing, test the missing-section case in `tests/superdev/decompose.test.ts`
- when a `### Files` line carries a path that is not literal -> response compare the token as it stands, so a non-literal path only ever makes the column `no`, log nothing, test the non-literal-path case in `tests/superdev/decompose.test.ts`

### Contracts
- decompose index row, five tab-separated columns, the fifth reading exactly `yes` or `no` - consumed by `Pipeline the per-task review and make the checkpoint agent conditional in superbuild` (Task 6), `Hand the gate block to the Simple track reviewer` (Task 7)

### DoD
`decompose.sh` prints a fifth `concurrent` column derived from `### Dependencies` and `### Files`, `superdev/CLAUDE.md` records both the new column and `run-gate.sh`, and `node --test tests/superdev/decompose.test.ts` is green.


### Covered criteria
1. Sprawdzenie nie wstrzymuje następnego zadania - Sprawdzenie ukończonego zadania biegnie
   równocześnie z pracą nad następnym, gdy następne nie korzysta z wyniku sprawdzanego ani nie
   sięga do tych samych plików.
3. Zadanie zależne czeka na werdykt - Zadanie, które korzysta z wyniku poprzedniego albo dzieli
   z nim pliki, rozpoczyna się dopiero po werdykcie sprawdzenia tego poprzedniego.
