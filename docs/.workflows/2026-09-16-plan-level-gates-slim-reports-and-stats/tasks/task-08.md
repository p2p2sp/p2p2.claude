
## Task 8 - Print the Review marker as a decompose index column
- TDD: none
- Model: opus
- Effort: high
- Covers: `Kolumna Review w indeksie` (#13)

### Dependencies
- `Move the gate into the plan header and rename the per-task section to Task Checks` (Task 1) - blocks: the `Review:` marker this column carries

### Files
- modify - superdev/scripts/decompose.sh (header comment, the awk task splitter)
- modify - tests/superdev/decompose.test.ts (index-row assertions)

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- grep -c 'review\[n\]' superdev/scripts/decompose.sh - prints at least `1`
- bash -n superdev/scripts/decompose.sh - exits 0

### Task Tests
- tests/superdev/decompose.test.ts - node --test tests/superdev/decompose.test.ts

### Approach
1. In `decompose.sh`'s awk program, capture the first `- Review:` line of each task block into a `review` array exactly as `model` and `effort` are captured - value trimmed, passed through verbatim, never validated - and print it as a fifth tab-separated column in the `END` loop, `-` when the marker is absent.
2. Update the script's header comment in English, as the newer paragraphs around it already are: the index row becomes `<task-path><TAB><title><TAB><model><TAB><effort><TAB><review>`, the `review` column comes from the task's own `- Review:` marker on both tracks, and `-` means the consumer passes nothing so the reviewer agent's frontmatter default applies.
3. In `decompose.test.ts`, extend the existing `Model:`/`Effort:` marker test with a task carrying `- Review: sonnet high` and one carrying none, asserting both rows including the new column; then Grep the file for every other index-row assertion - the `deepEqual` row lists and the happy-path `assert.equal` over the whole stdout alike - and add the fifth column to each.
4. Update the tab-in-title edge test: a well-formed row now has five fields, so an embedded tab yields six.

### Failure modes
- when a task carries a `Review:` line with an empty value -> response print `-` in that column, exactly as an absent marker does, log nothing, test the marker test's unmarked row
- when a task carries two `Review:` lines -> response the first wins, as with `Model:` and `Effort:`, log nothing, test none - covered by the shared first-wins capture

### Contracts
- Decompose index row: `<task-file>\t<title>\t<model>\t<effort>\t<review>`, the fifth column `-` when the task carries no `Review:` marker, on both tracks; consumed by `Retune superbuild for review strength, fix strength and stats events` (Task 12), `Retune simplebuild for fix strength and stats events` (Task 13).

### DoD
`decompose.sh` prints five tab-separated columns per task with `Review:` verbatim or `-`, its header documents that row, `decompose.test.ts` covers a marked and an unmarked task, and the whole suite is green.


### Covered criteria
13. Kolumna Review w indeksie - `decompose.sh` wystawia `Review:` jako kolumnę indeksu obok `<model>` i `<effort>` (`-` gdy brak, dla obu torów), jego testy pokrywają obecność i brak markera, a oba orkiestratory opisują indeks z tą kolumną.
