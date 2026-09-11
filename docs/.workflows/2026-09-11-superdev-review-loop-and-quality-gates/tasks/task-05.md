
## Task 5 - feat(scripts): add record-decision.sh and checkpoint-update.sh run bookkeeping
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: criteria #7, #22

### Dependencies
- 1 - blocks: 11, 12

### Files
- add - superdev/scripts/record-decision.sh (`record-decision.sh <workdir> <id> <subject> <accepted-text>`)
- add - superdev/scripts/checkpoint-update.sh (`checkpoint-update.sh <workdir> <since-sha> <prior-report>`)
- add - tests/superdev/record-decision.test.ts
- add - tests/superdev/checkpoint-update.test.ts

### Test Commands
#### Build
- `bash -n superdev/scripts/record-decision.sh && bash -n superdev/scripts/checkpoint-update.sh` - expected: no output, exit 0

#### Tests
- `node --test "tests/superdev/record-decision.test.ts"` - expected: all tests pass
- `node --test "tests/superdev/checkpoint-update.test.ts"` - expected: all tests pass
- `node --test "tests/**/*.test.ts"` - expected: all tests pass

### Approach
1. Write both scripts in the style of `superdev/scripts/status-update.sh` (English header with usage, parameters, behaviour; `set -euo pipefail`; `#!/usr/bin/env bash`; mode 100755 via `git update-index --chmod=+x` after staging).
2. `record-decision.sh`: validate four arguments (missing -> usage on stderr, exit 1); `mkdir -p "<workdir>/implementation"`; append one line in the shape from Task 1 `## Decisions file` (`- <id> - <subject> - accepted: <accepted-text> - <date +%F>`) to `<workdir>/implementation/decisions.md`; print `decision: <workdir>/implementation/decisions.md -> <id>` on stdout; exit 0.
3. `checkpoint-update.sh`: validate three arguments; overwrite `<workdir>/checkpoint.md` with exactly two lines `since: <since-sha>` and `prior: <prior-report>`; print `checkpoint: <workdir>/checkpoint.md -> <since-sha>` on stdout; exit 0. `decompose.sh` already preserves any file in an existing run dir other than `tasks/`, so the file survives a resume.
4. Tests for record-decision: happy path creates the file with exactly one line in the documented shape; a second call appends (two lines, first unchanged); missing argument -> exit 1 with usage on stderr; an accepted text containing a colon and a non-ASCII character round-trips verbatim. Tests for checkpoint-update: first call creates the two-line file; a second call overwrites both lines; missing argument -> exit 1 with usage on stderr.

### Edge cases
- `<workdir>` given with a trailing `/` or a leading `./`: normalise like `cleanup-run.sh` does before printing.
- Existing `decisions.md` without a trailing newline: append starts on a fresh line.

### Contracts
- stdout lines `decision: <path> -> <id>` and `checkpoint: <path> -> <sha>` consumed by Task 11's orchestrators; `checkpoint.md` (`since:` / `prior:` lines) read by the orchestrators at resume; decisions line shape owned by Task 1 `## Decisions file`.

### DoD
Both scripts and both test files in place, 100755 in the index, full suite green.


### Covered criteria
7. Build na 5 lub mniej zadań nie ma checkpointu; build na dokładnie 10 zadań ma jeden (po zadaniu 5), a jego recenzja końcowa dostaje `since` równe SHA po zamknięciu ostatniego checkpointu i `prior` równe ostatniemu raportowi tego checkpointu (recenzji albo re-recenzji).
22. Orkiestrator na `BLOCKED` nie dispatchuje implementora, tylko `AskUserQuestion` (zaakceptuj kryterium jako zmienione / napraw / przerwij); zaakceptowane kryterium zostaje zapisane w `<workdir>/implementation/decisions.md` i kolejna runda dostaje ten plik etykietą `decisions:` jako decyzję o mocy planu.
