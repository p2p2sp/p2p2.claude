# task review

## Findings

### Critical

- C1 - unresolved-locator branch has no matching Failure mode - superdev/agents/e2e-writer.md:71-73 - the agent adds a new terminal branch ("A value still `unknown` after the snapshot... -> `VERDICT: FAIL`, `REASON: unresolved <field> for <id>`") that is not one of the task's four `### Failure modes` entries (base-url unreachable, playwright test cannot start, still red after 5 rounds, no handoff entry). The implementor's own notes flag it as `UNDERSPECIFIED` and pick a shape unilaterally - matters because an unplanned terminal branch is exactly what the failure pass's point (a) treats as a bug (Critical) when it does not match an entry under the task's Failure modes; the plan never anticipated this exit path or its wording. Fix: add this case to the plan's `### Failure modes` (or fold it into an existing entry) and get it accepted, or drop the branch and let the existing "5 rounds" classification absorb it.
- C2 - playwright-test-timeout-cutoff branch has no matching Failure mode - superdev/agents/e2e-writer.md:99-100 - "The call is cut off at its timeout -> re-run once with a larger timeout; cut off again -> delete the generated file, `VERDICT: FAIL`, `REASON: npx playwright test <file> - cut off at <timeout>`" is a second unplanned terminal branch, distinct from Failure mode 2 (command cannot start) and from Failure mode 3 (red after 5 rounds - this path explicitly says a cutoff is "never classified as red" per the implementor's own notes). Matters for the same reason as C1: point (a) of the failure pass requires every new default-on-error branch to match a Failure modes entry or be flagged. Fix: add the cutoff case to `### Failure modes` and get it accepted, or reconcile it with an existing entry instead of introducing a fourth distinct exit shape.

### Important

- I1 - curl-absent fallback silently skips the reachability check for `api` entries - superdev/agents/e2e-writer.md:55-58,74-75 - step 1's fallback for a missing `curl` is "the first `playwright-cli` open of step 2 stands in for it", but step 2 (the browser open) only runs for `ui` entries; step 3 (`api` entries) never opens a browser. When `curl` is unavailable and the entry is `api`, no reachability check runs at all, and an unreachable application then falls through to "every step executed and the assertion is false", producing exactly the false `blocked` status line the implementor's own notes say this probe exists to prevent. Fix: give the `api` path its own fallback when `curl` is absent (e.g. an unauthenticated `request` call to `base-url`), or make the curl check itself mandatory rather than falling back to step 2.

## Assessment
Two error-handling branches invented beyond the task's four planned Failure modes, plus a reachability fallback that does not actually cover the api path it was added for - each needs a plan decision or a fix before this task is committed.
VERDICT: FAIL