
## Task 1 - Give the review contract the executor route, dedup and verdict mapping
- Covers: `Executor route` (#1), `Command dedup` (#2), `Verdict mapping` (#3), `Skip evidence` (#4)
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- none

### Files
- modify - superdev/references/review-contract.md (`## Gates`, `## Report skeleton`)

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- grep -n "superdev:executor" superdev/references/review-contract.md

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below; it owns the editing discipline for skill, agent and reference files.
2. In `superdev/references/review-contract.md`, keep the existing `## Gates` list of what to run and add how it runs: every gate command goes through the `superdev:executor` skill with the Skill tool, one `command:` per invocation with an explicit `timeout:` generous enough for the host's slowest documented suite; raw `Bash` stays for `git` reads and for the reviewer's own probes under `.temp/`. Keep the section stack-agnostic per the contract's own opening clause: no ecosystem's tool names.
3. In the same section, add the collection-and-dedup rule: the gate commands are gathered from the plan before any run, matched by exact string, and each distinct string runs once per stage; a filtered variant of a suite is a distinct command and runs on its own.
4. In the same section, add the verdict mapping: `VERDICT: PASS` is a green gate, `VERDICT: FAIL` is a red one whose failures feed findings as they do today, and `VERDICT: ERROR` or `VERDICT: TIMEOUT` is BLOCKED for any gate command. That means widening the section's existing cannot-start branch, today scoped to the integration or e2e command alone, so it covers every gate command whatever its kind.
5. In the same section, add the evidence rule: the executor's `SUMMARY:` line is carried into the report verbatim, and a non-zero skip count on a run that a criterion's proof depends on sends the reviewer to the `LOG:` path before that criterion may be marked met, alongside the existing rule that a run which did not happen never makes a criterion met. State the rule's own bound: it reads whatever figure the aggregate line carries, and an aggregate line that reports no skips at all leaves the reviewer nothing to infer, so the section's other rules stand unchanged there.
6. In `## Report skeleton`, change the gates bullet from one line per command run to one line per distinct command, each carrying that command's `VERDICT:` and `SUMMARY:` and the plan tasks that declared it, leaving the section's position and the two existing single-sentence cases unchanged.

### Failure modes
- when a gate command returns `VERDICT: ERROR` or `VERDICT: TIMEOUT` from the executor -> response `VERDICT: BLOCKED` with a `### Needs decision` bullet naming that command, never PASS and never a finding against the code, log that command's line in the report's gates section carrying the executor verdict verbatim, test none - contract text, exercised by the reviewer reading the contract at run time.
- when input is invalid (a plan declaring no `Test Commands` and no command documented anywhere) -> response the existing read-only review stands and every criterion needing a run stays not met, log the sentence the section already requires in the report's gates section, test none - contract text, branch unchanged by this task.

### Contracts
- `## Gates` transport rule of `superdev/references/review-contract.md`: gate commands run through `superdev:executor` (Skill tool), raw `Bash` reserved for `git` reads and `.temp/` probes; consumed by `Grant the three build reviewers the executor route` (Task 2).
- `## Gates` verdict mapping: `PASS` green, `FAIL` red, `ERROR` and `TIMEOUT` to `BLOCKED`; consumed by `Grant the three build reviewers the executor route` (Task 2).

### DoD
`## Gates` carries the transport rule, the dedup rule, the verdict mapping and the skip-evidence rule; `## Report skeleton` describes the gates section as one line per distinct command; the grep finds `superdev:executor` in the contract; the test suite is green.


### Covered criteria
1. Executor route - `## Gates` in `superdev/references/review-contract.md` names `superdev:executor` (Skill tool) as the route for every gate command, one command per invocation, and states that raw `Bash` remains for `git` reads and for the reviewer's own probes under `.temp/`.
2. Command dedup - `## Gates` collects the gate commands first and runs each distinct command string exactly once per stage, treating a filtered variant as its own command; `## Report skeleton` describes the report's gates section as one line per distinct command naming the tasks that declared it.
3. Verdict mapping - `## Gates` maps `VERDICT: PASS` to a green gate, `VERDICT: FAIL` to a red one, and `VERDICT: ERROR` or `VERDICT: TIMEOUT` to `VERDICT: BLOCKED` with a `### Needs decision` bullet, never PASS and never a finding against the code, and requires an explicit `timeout:` on every gate invocation.
4. Skip evidence - `## Gates` states that the executor's `SUMMARY:` line is read verbatim and that a non-zero skip count on a run a criterion's proof depends on obliges the reviewer to open the `LOG:` path before marking that criterion met.
