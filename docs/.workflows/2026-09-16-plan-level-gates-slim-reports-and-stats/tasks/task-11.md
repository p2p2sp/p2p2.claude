
## Task 11 - Add stats-report.sh and its fixed report template
- TDD: none
- Model: opus
- Effort: xhigh
- Covers: `Raport ze stałego szablonu` (#19), `Anomalie z dwóch źródeł` (#20)

### Dependencies
- `Add stats-record.sh, the one-call event append` (Task 10) - blocks: the event file shape and the run id this report reads

### Files
- add - superdev/references/stats-template.md
- add - superdev/scripts/stats-report.sh
- add - tests/superdev/stats-report.test.ts

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- bash -n superdev/scripts/stats-report.sh - exits 0
- test -x superdev/scripts/stats-report.sh - exits 0
- grep -c '{{ANOMALIES}}' superdev/references/stats-template.md - prints `1`

### Task Tests
- tests/superdev/stats-report.test.ts - node --test tests/superdev/stats-report.test.ts

### Approach
1. Write `superdev/references/stats-template.md`: a fixed markdown skeleton with a title carrying `{{RUN}}`, a per-task table (task, implementor model and effort, review rounds, wall time, tokens) at `{{TASKS_TABLE}}`, a per-dispatch-kind table at `{{KINDS_TABLE}}`, a `## Totals` block at `{{TOTALS}}` (wall time from the `start` event to the last event, total tokens, dispatch count) and a `## Anomalies` section at `{{ANOMALIES}}`; every placeholder appears exactly once and nothing outside them varies.
2. Write `superdev/scripts/stats-report.sh` with `#!/usr/bin/env bash`, `set -euo pipefail`, the exec bit set and a header carrying its I/O contract: usage `stats-report.sh <workdir>`, the run id derived from `<workdir>` exactly as `stats-record.sh` derives it - its basename fallback included, so both scripts always name the same file - input `.temp/superdev/stats/<run>.events`, output `.temp/superdev/stats/<run>.md`, one machine line `stats: <path>` on stdout.
3. Aggregate the events in one awk pass: group by label for the task table and by kind for the kind table; a row's wall time is its own `duration_ms` when the event carries one, and otherwise the gap between the previous event's stamp and its own - the rule that gives a `Skill` fork its time; tokens sum only the numeric fields, a `-` contributing nothing and printing `-` where a row has none.
4. Build `## Anomalies` from two sources: one line per event carrying a note, shaped `<mm:ss offset from start> <kind> <label> - <note>`, and a counter table per task built by counting `UNDERSPECIFIED:`, `CARRY:`, `touched:` and `NOTE: plan defect` lines in `<workdir>/implementation/*.md` plus the task review rounds past the first (the `task-NN-review-R.md` files); neither source yielding anything prints the single line `none`.
5. Render by substituting each placeholder in the template with its built block and writing the result to the output path, then print the `stats:` line. Write `tests/superdev/stats-report.test.ts` in the repo's convention (`runScript`, `withTempDir`, `slash()`, no `chmod`) covering: a run with several events rendering every table and the totals; a fork event timed from the previous stamp; a run with no note and no counter printing `none` under anomalies; counters read out of a fixture `implementation/` directory; a missing events file exiting 1 with a message on stderr; the output being byte-identical in structure to the template's section order.

### Failure modes
- when `<workdir>` is missing or empty -> response print `error: missing required parameter` plus the usage line on stderr and exit 1, log nothing, test the missing-argument case in `stats-report.test.ts`
- when the events file does not exist -> response print `error: no events file: <path>` on stderr and exit 1 without writing a report, log nothing, test the missing-events case in `stats-report.test.ts`
- when `<workdir>/implementation/` does not exist -> response render the report with every counter at zero and no counter table rows, log nothing, test the anomalies-`none` case
- when an event line carries fewer fields than the contract -> response treat every missing field as `-` and keep rendering, log nothing, test none - `stats-record.sh` is the only writer and always writes the full line

### Contracts
- `stats-report.sh <workdir>` renders `.temp/superdev/stats/<run>.md` from `superdev/references/stats-template.md` - whose placeholders `{{RUN}}`, `{{TASKS_TABLE}}`, `{{KINDS_TABLE}}`, `{{TOTALS}}` and `{{ANOMALIES}}` each appear exactly once and are substituted by this same script - and prints the single line `stats: <path>`; consumed by `Retune superbuild for review strength, fix strength and stats events` (Task 12), `Retune simplebuild for fix strength and stats events` (Task 13).

### DoD
The template carries its five placeholders, `stats-report.sh` exists, is executable, renders both tables, the totals and the two-source anomalies section, prints its one machine line, exits 1 on a missing argument or a missing events file, and its test file plus the whole suite is green.


### Covered criteria
19. Raport ze stałego szablonu - `superdev/scripts/stats-report.sh <workdir>` renderuje `.temp/superdev/stats/<run>.md` z `superdev/references/stats-template.md`: tabela per zadanie (implementator, recenzja, rundy, czas, tokeny), tabela per rodzaj dispatchu, sumy całego workflow (czas ściany od zdarzenia `start` do ostatniego zdarzenia, tokeny, liczba dispatchów); dla forków czas to różnica znaczników poprzedniego i bieżącego zdarzenia, a tokeny `-`; skrypt wypisuje jedną linię `stats: <path>` i ma test w `tests/superdev/`.
20. Anomalie z dwóch źródeł - sekcja `## Anomalies` raportu niesie jedną linię na zdarzenie z notką (FAIL z `REASON:`, BLOCKED, eskalacja z wynikiem, ponowny dispatch, niezadeklarowana zmiana, agent bez raportu, limit sesji) oraz tabelę liczników per zadanie zliczonych z `implementation/` (`UNDERSPECIFIED:`, `CARRY:`, `touched:`, `NOTE: plan defect`, rundy recenzji ponad pierwszą), a bez anomalii jedną linię `none`.
