
## Task 10 - Add stats-record.sh, the one-call event append
- TDD: none
- Model: opus
- Effort: high
- Covers: `Zdarzenie jednym wywołaniem` (#18)

### Dependencies
- none

### Files
- add - superdev/scripts/stats-record.sh
- add - tests/superdev/stats-record.test.ts

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- bash -n superdev/scripts/stats-record.sh - exits 0
- test -x superdev/scripts/stats-record.sh - exits 0

### Task Tests
- tests/superdev/stats-record.test.ts - node --test tests/superdev/stats-record.test.ts

### Approach
1. Write `superdev/scripts/stats-record.sh` with `#!/usr/bin/env bash`, `set -euo pipefail`, the exec bit set, and a header carrying its whole I/O contract, modelled on `record-decision.sh`: usage `stats-record.sh <workdir> <kind> <label> [model] [effort] [tokens] [tool_uses] [duration_ms] [verdict] [note]`, the first three required, every optional argument defaulting to `-` when absent or empty.
2. Derive the run id from `<workdir>`: normalise a trailing `/` and a leading `./` away, take the path tail after the last `docs/.workflows/` segment and join its remaining segments with `-`, so a phase directory gets its own id; a workdir with no such segment falls back to its basename. Append the event to `.temp/superdev/stats/<run>.events`, creating the directory and the file as needed, and writing a leading newline first when the existing file does not end in one.
3. Write one tab-separated line whose first field is the script's own `date +%s` stamp, followed by kind, label, model, effort, tokens, tool_uses, duration_ms, verdict and note, in that order; strip every tab, carriage return and newline out of each argument first, so one event is always exactly one line and the file stays parseable.
4. Print the single machine line `stats: <path> -> <kind> <label>` on stdout and exit 0.
5. Write `tests/superdev/stats-record.test.ts` in the repo's convention - `runScript` and `withTempDir` from `tests/harness/`, `slash()` for every path comparison, no `chmod` - covering: a minimal three-argument call writing one line with `-` in every optional field and creating the directory; a full ten-argument call; two calls appending two lines; an existing file with no trailing newline; a run id derived from a phase workdir; a run id derived from a workdir outside `docs/.workflows/`; an argument carrying a tab or a newline flattened into one line; a missing required argument exiting 1 with usage on stderr.

### Failure modes
- when `<workdir>`, `<kind>` or `<label>` is missing or empty -> response print `error: missing required parameter` plus the usage line on stderr and exit 1 writing nothing, log nothing, test the missing-argument case in `stats-record.test.ts`
- when `<workdir>` carries no `docs/.workflows/` segment -> response use its basename as the run id and write the event as usual, log nothing, test the outside-workflows case in `stats-record.test.ts`
- when an argument carries a tab, a carriage return or a newline -> response strip those characters before writing, so the event stays one parseable line, log nothing, test the control-character case in `stats-record.test.ts`
- when the stats directory cannot be created -> response let `set -e` abort with the shell's own message on stderr and a non-zero exit, log nothing, test none - the caller escalates a failed script call like any other

### Contracts
- `.temp/superdev/stats/<run>.events`: one tab-separated line per event, fields `<epoch seconds>`, `kind`, `label`, `model`, `effort`, `tokens`, `tool_uses`, `duration_ms`, `verdict`, `note`, an absent optional field written as `-`; the run id is the workdir tail after the last `docs/.workflows/` joined with `-`, falling back to the workdir's basename when it carries no such segment; consumed by `Add stats-report.sh and its fixed report template` (Task 11), `Retune superbuild for review strength, fix strength and stats events` (Task 12), `Retune simplebuild for fix strength and stats events` (Task 13).

### DoD
`stats-record.sh` exists, is executable, appends one well-formed line per call under `.temp/superdev/stats/`, prints its one machine line, rejects a missing required argument with exit 1, and its test file plus the whole suite is green.


### Covered criteria
18. Zdarzenie jednym wywołaniem - `superdev/scripts/stats-record.sh` dopisuje jedną linię TSV ze znacznikiem czasu nadanym przez skrypt do `.temp/superdev/stats/<run>.events` (tworząc katalog i plik), przyjmuje rodzaj i etykietę oraz opcjonalnie model, effort, tokeny, tool_uses, duration_ms, werdykt i notkę, wypisuje jedną linię `stats: <path> -> <kind> <label>` i ma test w `tests/superdev/`; oba orkiestratory przy `stats: true` wołają go raz ze zdarzeniem `start` po dekompozycji (lub `resume` przy wznowieniu), raz po każdym powiadomieniu o zakończeniu dispatchu `Agent` (implementator, per-task reviewer, writer) z wartościami przepisanymi z powiadomienia, raz po każdym forku `Skill` tylko z rodzajem, etykietą i werdyktem, raz po każdym `commit-task.sh` i raz po każdej eskalacji z notką; przy `stats: false` nie wołają go wcale.
