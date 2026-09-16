# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Hybrid executor - a deterministic success path without a fork"
Plan: C:\Users\dario\.claude-p2p2\plans\toasty-honking-dewdrop.md

---
<!-- HEADER -->

## Goal
A build, test, lint or type-check gate that passes costs one direct `run.sh` Bash call and no fork at all; `superdev:executor` is dispatched only when that call reports a deviation, and it then reads the already-written log instead of running the command a second time. The two review-layer defects recorded in `docs/handoff.md` that sit on the same lines are closed in the same pass.

## Context
Measured on this machine's session transcripts: the `superdev:executor` fork costs a median of 14.7s per command, of which only 4.4s is the command itself and 10.2s is pure fork overhead (boot plus roughly three haiku round-trips). Across 344 runs in one day that is 113 minutes of wall clock, 78 of them overhead. Of 368 analysed runs, 274 (74%) end in `VERDICT: PASS`, so in three cases out of four the whole fork exists to turn `EXIT: 0` into `PASS`. `run.sh` already writes the full output to a log and prints only a short fixed block, so the deterministic half is in place; what is missing is a machine-readable success signal and an executor mode that analyses an existing log. This is the repo's own "Script vs. fork" invariant applied to a route that currently forks unconditionally. `docs/handoff.md` records two review-layer defects on the very lines this change rewrites, so both are folded in on the user's ruling: defect B by variant B2 (`## Gates` becomes the single owner of gate-command BLOCKED conditions) and defect A by variant A4 (the Simple reviewer's early return on misalignment is removed). Only Task 1 touches executable code; Tasks 2-7 change skill, agent, reference and documentation prose, for which the repo ships no harness, so their `### Test Commands` entry is the existing suite as a regression guard and their proof is the observable file state named in their `### DoD`.

## Out of scope
- The cost of the reviewer forks themselves (191 min/day, medians 281-301s)
- The non-converging plan gate (`superplan-reviewer` fired 11 times in one session)
- Degrading `exit 0` to a deviation by grepping the log for failure markers
- Defect A variants A1-A3 - the early return is removed, not re-engineered
- Any change to `superbuild-task-reviewer`, which runs no gate commands

## Acceptance criteria
1. success without fork - a green gate command whose `TAIL:` shows no skipped cases completes through a direct `run.sh` Bash call, with no `superdev:executor` invocation anywhere in that path.
2. expect-exit honoured - `run.sh` prints `RESULT: SUCCESS` when the command's exit code satisfies `expect-exit:` (default `0`, also `nonzero` and an explicit integer) and `RESULT: DEVIATION` in every other case, including `STATUS: timeout` and `STATUS: error`.
3. tail not summary - `run.sh` prints the log's last non-empty line on a `TAIL:` line, omits that line when the log holds none, and nothing in the repo labels that value `SUMMARY:`.
4. analysis mode - `superdev:executor` accepts `log:` + `exit:` + `duration:` in place of `command:`, runs no command in that mode, and returns the same reply shape it returns today.
5. no self-read - the two task implementors and the three build reviewers are instructed to dispatch `superdev:executor` on a deviation and never to open the `LOG:` path with `Read` themselves.
6. contract documented - `review-contract.md`'s `## Gates` section describes the hybrid route, the `RESULT:` mapping, and what carries success-path evidence in place of `SUMMARY:`.
7. single blocked owner - `## Gates` is the only place that states which gate-command outcomes yield `VERDICT: BLOCKED`; `## Verdict rules` and the three reviewer `## Gates` paragraphs carry a pointer to it instead of their own summary.
8. full simple sweep - `simplebuild-reviewer` runs every axis at every stage and reports a plan misalignment as an ordinary Critical, with no sentence instructing it to return early.
9. docs in sync - the root `CLAUDE.md` and `superdev/README.md` describe the hybrid route rather than an unconditional fork.

<!-- /HEADER -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - Give the executor an analysis mode over an existing log
- Covers: `analysis mode` (#4)
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- `Give run.sh a deterministic RESULT and TAIL line` (Task 1) - blocks: the analysis mode maps a verdict from the `exit:` value that block carries

### Files
- modify - superdev/skills/executor/SKILL.md

### Test Commands
#### Build
- none - the repo has no build step (root `CLAUDE.md`)

#### Tests
- `node --test "tests/**/*.test.ts"`

### Approach
1. Split `# Input contract` into two modes: exactly one of `command:` or `log:` is required; analysis mode takes `log:` (a path), `exit:` (an integer), `duration:` (the `DURATION:` value verbatim) plus the existing optional `expect:`.
2. Rewrite the first `# Iron law` bullet to "exactly one `run.sh` call in `command:` mode, zero in `log:` mode".
3. Split `# How to work` step 1 into the two branches and leave steps 3-5 untouched, so log reading, the aggregate line and the `expect:` judgement are shared; in analysis mode the verdict comes from the supplied `exit:` exactly as `STATUS: ok` plus `EXIT:` maps today.
4. State that analysis mode returns only `PASS`, `FAIL` or `ERROR` and never `TIMEOUT`: it receives no status, so a timed-out run is settled by the caller from `run.sh`'s own `STATUS:` line before any dispatch.
5. Extend the frontmatter `description:` so the model can pick the mode, and keep `allowed-tools` as is - `command:` mode still needs `Bash(...run.sh:*)`.

### Failure modes
- when `ARGUMENTS` carries both `command:` and `log:` -> response `VERDICT: ERROR (exit -, -)` with `SUMMARY: command: and log: are mutually exclusive` and no `LOG:` line, log none - nothing ran, test none - the fork's reply is prose and the repo has no harness for skill bodies
- when `log:` names a file that does not exist -> response `VERDICT: ERROR (exit -, -)` with `SUMMARY: log not found: <path>`, log none - nothing ran, test none - same reason
- when `log:` arrives without `exit:`, or with an `exit:` that is not an integer -> response `VERDICT: ERROR (exit -, -)` with `SUMMARY: missing exit:` or `SUMMARY: invalid exit: <value>`, log none - nothing ran, test none - same reason

### Contracts
- Analysis-mode input labels `log:` / `exit:` / `duration:` plus the optional `expect:`. Consumed by `Route both task implementors through the hybrid gate` (Task 4) and `Route the three build reviewers through the hybrid gate` (Task 5).
- The reply shape `VERDICT:` / `EXPECT:` / `SUMMARY:` / `FAILURES:` / `LOG:` is identical in both modes, so no caller has to branch on which mode produced it; `TIMEOUT` is reachable only from `command:` mode. Consumed by `Route the build gate through run.sh in the review contract` (Task 3).

### DoD
`superdev/skills/executor/SKILL.md` specifies both modes with mutually exclusive entry labels, analysis mode runs no command and cannot return `TIMEOUT`, and the reply shape is unchanged; the suite stays green.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - Route both task implementors through the hybrid gate
- Covers: `success without fork` (#1), `no self-read` (#5)
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- `Give run.sh a deterministic RESULT and TAIL line` (Task 1) - blocks: the agents branch on `RESULT:` and pass `expect-exit:`
- `Give the executor an analysis mode over an existing log` (Task 2) - blocks: the deviation branch dispatches that mode

### Files
- modify - superdev/agents/superbuild-task-implementor.md
- modify - superdev/agents/simplebuild-task-implementor.md
- modify - superdev/skills/superbuild/SKILL.md
- modify - superdev/skills/simplebuild/SKILL.md

### Test Commands
#### Build
- none - the repo has no build step (root `CLAUDE.md`)

#### Tests
- `node --test "tests/**/*.test.ts"`

### Approach
1. In both orchestrators, beside the existing line that resolves `<refs>`, resolve `<runner>` the same way with `printf '%s\n' "${CLAUDE_PLUGIN_ROOT}/skills/executor/scripts/run.sh"` and carry it as a required `runner` label on every task-implementor dispatch.
2. Add `runner` to the `## Input` label list of both agents, next to `refs`, with the same absent-label failure line the other required labels use.
3. Rewrite the gate step in each agent - `## 2. Build + Test` step 1 in `superbuild-task-implementor.md`, `## 3. Run Build & Tests` step 1 in `simplebuild-task-implementor.md` - so each `Test Commands` line goes out as a direct `Bash` call to `<runner>` with `command:` copied verbatim, `expect-exit: 0` and an explicit `timeout:`; `RESULT: SUCCESS` ends that command there.
4. Replace the clause "open its `LOG:` path with `Read` only when `FAILURES:` is not enough to act" with the same ordered rule `Route the build gate through run.sh in the review contract` (Task 3) step 2 gives the reviewers: settle `STATUS: error` and `STATUS: timeout` straight from `run.sh` first and return `VERDICT: FAIL` naming that reason without dispatching anything; only a remaining `RESULT: DEVIATION` dispatches `superdev:executor` in analysis mode with `log:` / `exit:` / `duration:` / `expect:`; the log is never opened by the implementor.
5. Rewrite the bullet "Build, test, lint, type-check, formatter and script runs never go through raw `Bash`; raw `Bash` is for `git`, file inspection and other read-only work" in both files, so it names `<runner>` as the transport for every gate command and keeps raw `Bash` for `git` reads and file inspection.
6. Rewrite the `TDD: required` bullet in both files so VERIFY RED and VERIFY GREEN go out through `<runner>` the same way as any other gate command - RED with `expect-exit: nonzero`, GREEN with `expect-exit: 0` - with `superdev:executor` dispatched only on a deviation and `expect:` then naming the prose outcome it judges.

### Failure modes
- when a gate command returns `STATUS: timeout` or `STATUS: error` -> response return `VERDICT: FAIL` naming that command and `run.sh`'s own `REASON:` or the timeout, settled before any dispatch because analysis mode cannot return `TIMEOUT`, log the `LOG:` path when `run.sh` printed one, test none - the agent body is prose and the repo has no harness for agent bodies
- when a gate command returns `RESULT: DEVIATION` with a `LOG:` line and `STATUS: ok` -> response dispatch `superdev:executor` in analysis mode and act on its `VERDICT:` and `FAILURES:`, log the `LOG:` path is handed to the fork and never opened by the implementor, test none - same reason
- when a gate command returns `RESULT: DEVIATION` with no `LOG:` line (a pre-launch error) -> response act on `REASON:` alone, dispatch nothing, and return `VERDICT: FAIL` naming that reason, log none - nothing ran, test none - same reason
- when the `runner` label is absent or names a path that does not exist -> response return `VERDICT: FAIL` with `REASON: missing input runner` and change nothing, log none, test none - same reason
- when the fix loop reaches 5 rounds still red -> response STOP and return `FAIL`, unchanged from today, log the last `LOG:` path is named in the notes, test none - same reason

### Contracts
- `runner` (required) - the absolute path of `run.sh`, an external value that enters a `Bash` command line, so each agent checks it exists before the first gate command and fails on the same line shape the other required labels use. Produced by the two orchestrator files of this task and consumed by the two agent files of this task; no other task reads it.
- Consumes the block from `Give run.sh a deterministic RESULT and TAIL line` (Task 1) and the analysis mode from `Give the executor an analysis mode over an existing log` (Task 2); introduces no other contract.
- No frontmatter change: both agents already carry `Bash` and `Skill` in `tools:`.

### DoD
Both orchestrators pass `runner`, both implementors run every gate command through it directly, settle a timeout or a script error before any dispatch, dispatch the fork only on a remaining deviation that produced a log, and carry an explicit prohibition on reading the log themselves; the suite stays green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - Route the three build reviewers through the hybrid gate
- Covers: `success without fork` (#1), `no self-read` (#5), `single blocked owner` (#7)
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- `Give run.sh a deterministic RESULT and TAIL line` (Task 1) - blocks: the reviewers branch on `RESULT:`
- `Route the build gate through run.sh in the review contract` (Task 3) - blocks: each reviewer paragraph mirrors that contract's `## Gates`

### Files
- modify - superdev/skills/superbuild-reviewer-spec/SKILL.md (## Gates)
- modify - superdev/skills/superbuild-reviewer-change/SKILL.md (## Gates)
- modify - superdev/skills/simplebuild-reviewer/SKILL.md (## Gates)

### Test Commands
#### Build
- none - the repo has no build step (root `CLAUDE.md`)

#### Tests
- `node --test "tests/**/*.test.ts"`

### Approach
1. In each file replace the line "Build, test, lint and type-check runs go through `superdev:executor` (Skill tool) per the contract's `## Gates`…" with the hybrid sentence, worded exactly as `Route the build gate through run.sh in the review contract` (Task 3) states it: such runs go out as a direct `Bash` call to `${CLAUDE_PLUGIN_ROOT}/skills/executor/scripts/run.sh` per the contract's `## Gates`, and `superdev:executor` is invoked in analysis mode on `RESULT: DEVIATION` and on a `SUCCESS` whose `TAIL:` carries a non-zero skip count on a run some criterion's proof depends on.
2. Add to that same line the prohibition on opening the `LOG:` path with `Read`, keeping the existing reservation of raw `Bash` for `git` reads and `.temp/` probes.
3. Strike the clause "`VERDICT: BLOCKED` for a documented integration or e2e suite that cannot start here" from each file's preceding `## Gates` sentence, leaving the pointer at the contract's `## Gates` to carry every gate-command BLOCKED condition.
4. Leave all three frontmatters untouched - bare `Bash` in `allowed-tools` already covers an ordinary `run.sh` call, `${CLAUDE_PLUGIN_ROOT}` resolves inside a SKILL.md body as it already does in `superdev/skills/executor/SKILL.md`, and `Skill` is still needed for the deviation branch.

### Failure modes
- when a gate command returns `RESULT: DEVIATION` -> response dispatch `superdev:executor` in analysis mode and map its `VERDICT:` per the contract, log the `LOG:` path is handed to the fork and never opened by the reviewer, test none - the skill body is prose and the repo has no harness for skill bodies
- when `run.sh` reports `STATUS: error` or `STATUS: timeout` -> response `VERDICT: BLOCKED` per the contract's `## Gates`, settled before any dispatch, never PASS and never a finding against the code, log the `LOG:` path when one was printed, test none - same reason

### Contracts
- Consumes the hybrid gate route, the ordered mapping, the skip-count wording and the single-owner BLOCKED rule from `Route the build gate through run.sh in the review contract` (Task 3); introduces no contract of its own.

### DoD
All three reviewer bodies describe the hybrid route in the contract's own wording, none claims every gate command goes through the fork, none permits reading a log directly, and none carries its own BLOCKED summary; the suite stays green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - Remove the simplebuild reviewer's early return on misalignment
- Covers: `full simple sweep` (#8)
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- `Route the three build reviewers through the hybrid gate` (Task 5) - blocks: both tasks edit `superdev/skills/simplebuild-reviewer/SKILL.md`

### Files
- modify - superdev/skills/simplebuild-reviewer/SKILL.md

### Test Commands
#### Build
- none - the repo has no build step (root `CLAUDE.md`)

#### Tests
- `node --test "tests/**/*.test.ts"`

### Approach
1. Delete the sentence "On any misalignment: STOP. Write the report (misalignment under Critical), emit the verdict line, and return immediately - do not run the checks below. They only apply once the plan is met."
2. Replace it with the rule that a misalignment is recorded as an ordinary Critical finding and the review continues through every remaining axis, so the Simple track matches the Super track, where no reviewer carries an early return.
3. Change nothing else in the file - the gate paragraph is owned by `Route the three build reviewers through the hybrid gate` (Task 5) and the verdict channel stays the two lines it has today.

### Failure modes
- when the delivered change misaligns with the plan -> response record it under Critical and carry on through the code-quality, architecture, test and production-readiness axes plus the stage's own mandate, log the report file named by the `report:` label, test none - the skill body is prose and the repo has no harness for skill bodies
- when a misaligned change makes a later axis unreviewable (the code under review is slated to be thrown away) -> response report that axis as unreviewable in the report's notes rather than returning early, log the same report file, test none - same reason

### Contracts
- none - the reviewer's input labels, output lines and verdict set are unchanged.

### DoD
`superdev/skills/simplebuild-reviewer/SKILL.md` carries no instruction to return before the remaining checks, and a misalignment is specified as an ordinary Critical; the suite stays green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - Sync the executor documentation with the hybrid route
- Covers: `docs in sync` (#9)
- TDD: none
- Model: sonnet
- Effort: low

### Dependencies
- `Route both task implementors through the hybrid gate` (Task 4) - blocks: the docs describe the delivered route
- `Route the three build reviewers through the hybrid gate` (Task 5) - blocks: same

### Files
- modify - CLAUDE.md
- modify - superdev/README.md

### Test Commands
#### Build
- none - the repo has no build step (root `CLAUDE.md`)

#### Tests
- `node --test "tests/**/*.test.ts"`

### Approach
1. Rewrite the root `CLAUDE.md` sentence that says the implementors and the three build reviewers run their commands "only through the `executor` fork skill (haiku)" so it states the hybrid: a direct `run.sh` call, with the fork dispatched only on a deviation.
2. Rewrite the `executor` row of `superdev/README.md`'s skill table to name both modes and the deviation-only dispatch.
3. Change no `plugin.json` - no skill or agent is added, removed or renamed by this plan.

### Failure modes
- none - documentation

### Contracts
- none

### DoD
Neither document claims an unconditional fork; both describe the direct call plus the deviation-only dispatch, and the suite stays green.

<!-- /TASK -->
