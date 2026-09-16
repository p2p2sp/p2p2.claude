
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


### Covered criteria
1. success without fork - a green gate command whose `TAIL:` shows no skipped cases completes through a direct `run.sh` Bash call, with no `superdev:executor` invocation anywhere in that path.
5. no self-read - the two task implementors and the three build reviewers are instructed to dispatch `superdev:executor` on a deviation and never to open the `LOG:` path with `Read` themselves.
