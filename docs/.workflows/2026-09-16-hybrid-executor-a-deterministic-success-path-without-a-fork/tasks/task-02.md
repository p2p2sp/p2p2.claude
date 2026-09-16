
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


### Covered criteria
4. analysis mode - `superdev:executor` accepts `log:` + `exit:` + `duration:` in place of `command:`, runs no command in that mode, and returns the same reply shape it returns today.
