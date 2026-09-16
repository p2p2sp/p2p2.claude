
## Task 1 - Give run.sh a deterministic RESULT and TAIL line
- Covers: `expect-exit honoured` (#2), `tail not summary` (#3)
- TDD: required
- Model: opus
- Effort: high

### Dependencies
- none - this task owns the contract every later task consumes

### Files
- modify - superdev/skills/executor/scripts/run.sh (parse_labels, emit_error, main)
- modify - tests/superdev/executor-run.test.ts

### Test Commands
#### Build
- none - the repo has no build step (root `CLAUDE.md`: "there is no build step and no lint at any level")

#### Tests
- `node --test tests/superdev/executor-run.test.ts`

### Approach
1. Extend `parse_labels()`'s label pattern to `^(command|cwd|timeout|expect-exit):` and add `label_expect_exit` / `seen_expect_exit`, first occurrence winning and the same trailing-whitespace strip the other labels use.
2. Validate `expect-exit` in `main()` directly after the existing `timeout` validation, against `^(nonzero|0|[1-9][0-9]*)$`.
3. Add `resolve_result()` mapping `status`, `exit_code` and the expectation onto `SUCCESS` or `DEVIATION`.
4. Print `RESULT:` as the first line of both `emit_error()` and `main()`'s block; compute the tail as the log's last non-empty line and print `TAIL:` after `LINES:` only when that value is non-empty.
5. Rewrite the script header's `INPUT`, `OUTPUT` and `FAILURE MODES` sections, `emit_error()`'s own inline comment (which still says "two lines on stdout"), and the test file's header comment to match the new block.

### Failure modes
- when `expect-exit:` is present and does not match `^(nonzero|0|[1-9][0-9]*)$` -> response `RESULT: DEVIATION`, `STATUS: error`, `REASON: invalid expect-exit: <value>`, exit 2, log none - the command never launched, test `rejects an unparsable expect-exit` in `tests/superdev/executor-run.test.ts`
- when the command's log holds no non-empty line -> response the `TAIL:` line is omitted and `LINES: 0` carries the fact, log the empty log file still exists at the `LOG:` path, test `a silent command prints RESULT, LINES: 0 and no TAIL:` in the same file, asserting the whole printed block so it fails today on the missing `RESULT:` line rather than on an absence that already holds
- when a pre-launch error fires (missing `command:`, missing `cwd:`, unwritable log) -> response `RESULT: DEVIATION` prints first, then `STATUS:` and `REASON:`, with no `EXIT:`/`DURATION:`/`LOG:`/`LINES:`/`TAIL:`, log none - nothing ran, test the existing pre-launch cases in the same file, each extended to assert the `RESULT:` line

### Contracts
- The stdout block, in this order: `RESULT: SUCCESS | DEVIATION` (always, first), `STATUS:`, `EXIT:`, `DURATION:`, `LOG:`, `LINES:`, `TAIL:` (omitted when the log holds no non-empty line), `REASON:` (error only, last). Consumed by `Give the executor an analysis mode over an existing log` (Task 2), `Route the build gate through run.sh in the review contract` (Task 3), `Route both task implementors through the hybrid gate` (Task 4) and `Route the three build reviewers through the hybrid gate` (Task 5).
- `expect-exit:` is an optional input label whose value enters the SUCCESS/DEVIATION decision; it is accepted only when it matches `^(nonzero|0|[1-9][0-9]*)$` and defaults to `0` when absent. Consumed by `Route both task implementors through the hybrid gate` (Task 4).
- `RESULT:` mapping: `STATUS: ok` with an exit code satisfying `expect-exit:` -> `SUCCESS`; every other case, `STATUS: timeout` and `STATUS: error` included -> `DEVIATION`. Consumed by `Route the build gate through run.sh in the review contract` (Task 3).
- The script's own exit codes are unchanged by this task: 0 for `STATUS: ok` and `STATUS: timeout`, 2 for `STATUS: error`. Only the printed block gains lines and a new first line; the command's own exit code stays data on `EXIT:`.

### DoD
`run.sh` prints `RESULT:` on every path and `TAIL:` whenever the log has content, `expect-exit:` is honoured and validated, and `node --test tests/superdev/executor-run.test.ts` is green with the new cases.


### Covered criteria
2. expect-exit honoured - `run.sh` prints `RESULT: SUCCESS` when the command's exit code satisfies `expect-exit:` (default `0`, also `nonzero` and an explicit integer) and `RESULT: DEVIATION` in every other case, including `STATUS: timeout` and `STATUS: error`.
3. tail not summary - `run.sh` prints the log's last non-empty line on a `TAIL:` line, omits that line when the log holds none, and nothing in the repo labels that value `SUMMARY:`.
