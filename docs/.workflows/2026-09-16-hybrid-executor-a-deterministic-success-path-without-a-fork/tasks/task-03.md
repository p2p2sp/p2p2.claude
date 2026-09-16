
## Task 3 - Route the build gate through run.sh in the review contract
- Covers: `success without fork` (#1), `contract documented` (#6), `single blocked owner` (#7)
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- `Give run.sh a deterministic RESULT and TAIL line` (Task 1) - blocks: the mapping is written against that block
- `Give the executor an analysis mode over an existing log` (Task 2) - blocks: the deviation branch names that mode

### Files
- modify - superdev/references/review-contract.md (## Gates, ## Verdict rules, ## Report skeleton)

### Test Commands
#### Build
- none - the repo has no build step (root `CLAUDE.md`)

#### Tests
- `node --test "tests/**/*.test.ts"`

### Approach
1. Rewrite the `Transport` block so a gate command goes out as a direct `Bash` call to `run.sh` carrying `command:` verbatim, `expect-exit:` and an explicit `timeout:`, with raw `Bash` still reserved for `git` reads and `.temp/` probes.
2. Replace the executor-verdict mapping with a two-step mapping in this fixed order: first settle `STATUS: error` and `STATUS: timeout` straight from `run.sh` as `VERDICT: BLOCKED` with a `### Needs decision` bullet, without dispatching anything; then `RESULT: SUCCESS` ends the gate green, and only a remaining `RESULT: DEVIATION` dispatches `superdev:executor` in analysis mode, whose `VERDICT:` distinguishes PASS from FAIL alone.
3. Rewrite the `Evidence` block: on `SUCCESS` the evidence is the `RESULT:`, `EXIT:` and `TAIL:` lines carried verbatim, with `TAIL:` never relabelled `SUMMARY:` because it is the log's last line rather than a parsed aggregate.
4. State the skip-count rule in the exact wording `Route the three build reviewers through the hybrid gate` (Task 5) mirrors: the fork is dispatched on `RESULT: DEVIATION` and on a `SUCCESS` whose `TAIL:` carries a non-zero skip count on a run some criterion's proof depends on; reaching the log always goes through the fork.
5. Rewrite `## Verdict rules`' BLOCKED bullet to keep only the "criterion unmet by a recorded decision, not by missing code" condition plus the BLOCKED-outranks-FAIL rule, and point at `## Gates` for every condition that comes from a gate command.
6. Rewrite `## Report skeleton`'s `## Gates` bullet, which today requires each command's `VERDICT:` and `SUMMARY:` verbatim: on the fork-free success path there is no executor reply to quote, so the line carries `RESULT:`, `EXIT:` and `TAIL:` verbatim there, and the fork's `VERDICT:` and `SUMMARY:` only on a command that was dispatched.

### Failure modes
- when a gate command returns `STATUS: error` or `STATUS: timeout` -> response `VERDICT: BLOCKED` with a `### Needs decision` bullet naming the command and `run.sh`'s own `REASON:` or the timeout, settled before any dispatch, log the `LOG:` path when `run.sh` printed one, test none - the contract is prose and the repo has no harness for reference bodies
- when a criterion's proof depends on a run whose `TAIL:` shows a non-zero skip count -> response that criterion stays unmet until `superdev:executor` has read the log in analysis mode, log that same `LOG:` path, test none - same reason
- when `TAIL:` carries no recognisable aggregate line on a `SUCCESS` -> response the gate still passes and the report quotes `RESULT:` and `EXIT:` instead, log the `LOG:` path is recorded unread, test none - same reason

### Contracts
- The hybrid gate route, its ordered `STATUS:`-then-`RESULT:` mapping and the skip-count wording. Consumed by `Route the three build reviewers through the hybrid gate` (Task 5).
- `TAIL:` as success-path evidence, quoted verbatim and never relabelled `SUMMARY:`. Consumed by `Route the three build reviewers through the hybrid gate` (Task 5).
- `## Gates` becomes the sole owner of gate-command BLOCKED conditions; `## Verdict rules` keeps only the decision-based condition and points here. Consumed by `Route the three build reviewers through the hybrid gate` (Task 5).

### DoD
`## Gates` describes the direct-call success path, the ordered BLOCKED-before-dispatch mapping and the `TAIL:` evidence rule; `## Verdict rules` lists no gate-command condition of its own; `## Report skeleton`'s gates line is quotable on a command that never reached the fork; the suite stays green.


### Covered criteria
1. success without fork - a green gate command whose `TAIL:` shows no skipped cases completes through a direct `run.sh` Bash call, with no `superdev:executor` invocation anywhere in that path.
6. contract documented - `review-contract.md`'s `## Gates` section describes the hybrid route, the `RESULT:` mapping, and what carries success-path evidence in place of `SUMMARY:`.
7. single blocked owner - `## Gates` is the only place that states which gate-command outcomes yield `VERDICT: BLOCKED`; `## Verdict rules` and the three reviewer `## Gates` paragraphs carry a pointer to it instead of their own summary.
