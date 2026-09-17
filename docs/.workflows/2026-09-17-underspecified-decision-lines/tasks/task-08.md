
## Task 8 - Count DECISION lines in the stats report
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Statystyki liczą oba rodzaje` (#14)

### Dependencies
- `Define the two decision lines, the implementor stop and the final decisions listing in the review contract` (Task 1) - blocks: the `DECISION:` prefix the counter matches

### Files
- modify - superdev/scripts/stats-report.sh (header comment `ANOMALIES:` paragraph, awk counters, table header and `printf`)
- modify - tests/superdev/stats-report.test.ts (the two Anomalies-table tests)

### Task Checks
- tests/superdev/stats-report.test.ts - node --test tests/superdev/stats-report.test.ts

### Approach
1. In the awk block, add `/^(- )?DECISION:/ { decision[task]++ }` beside the `UNDERSPECIFIED:` counter, include `decision[task]` in the all-zero `continue` test, add the column `DECISION` right after `UNDERSPECIFIED` in the header line and the separator line, and add the matching `%d` and `decision[task] + 0` to the `printf`.
2. Update the header comment's `ANOMALIES:` paragraph to list `"DECISION:"` among the counted prefixes.
3. In the test file, add one `DECISION: the retry cap - two findings contradict each other - none` line to `task-01-notes.md` in the counters test and update both expected tables to the seven-column shape (`| task-01 | 1 | 1 | 1 | 2 | 1 | 1 |` and `| fix-01 | 0 | 0 | 0 | 1 | 0 | 0 |`).

### Failure modes
- none - additive counter, existing all-zero row rule unchanged

### Contracts
- Anomalies table header `| Task | UNDERSPECIFIED | DECISION | CARRY | touched | NOTE: plan defect | Extra review rounds |` - consumed by `Document the decision lines and the implementor stop` (Task 9)

### DoD
The test file passes with the seven-column table; a notes file carrying a `DECISION:` line yields a non-zero `DECISION` cell.


### Covered criteria
14. Statystyki liczą oba rodzaje - Raport statystyk biegu liczy osobno decyzje wykonawcy i zatrzymania w każdym wierszu, który dziś ma (per zadanie i per runda naprawcza).
