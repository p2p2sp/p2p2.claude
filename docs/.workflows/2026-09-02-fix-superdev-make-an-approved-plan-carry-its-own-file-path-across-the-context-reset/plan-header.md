Title: "fix(superdev): make an approved plan carry its own file path across the context reset"


## Goal
Every approved plan declares its own file path in its preamble, the `ExitPlanMode` gate refuses to approve a plan that does not, and both build orchestrators resolve the plan file from that declared path after verifying it still holds the same plan. `decompose.sh` leaves no working directory behind when it fails.

## Context
When a plan is approved with "clear context", the harness injects `Implement the following plan:` plus the full plan text and the path of the PREVIOUS transcript - it never passes the plan file's path. Both build orchestrators need a PATH (`decompose.sh <plan-file>`), so after the reset they have no input and start guessing; one real run guessed the spec path and produced a garbage working directory. The plan file itself survives at the plan-mode path, so the fix is to stop losing the path: the plan writes it into its own preamble, the existing `ExitPlanMode` hook enforces that it is there, and the builds read it back. A separate defect rides along: `decompose.sh` creates its working directory before it validates anything, so every failing run orphans a directory tree.

## Acceptance criteria
1. Both plan templates carry a `Plan:` preamble line, and both plan skills instruct filling it with the plan-mode-given path while drafting, before the reviewer runs.
2. `review-plan.sh` denies `ExitPlanMode` when the resolved plan file is readable and carries no `Plan:` line naming that same plan file, and the deny reason tells the author to add the line.
3. `review-plan.sh` keeps its fail-open policy on the new gate: an unresolved, missing, or unreadable plan file still exits 0 with parseable JSON and never denies because of the `Plan:` check.
4. `superdev/hooks/hooks.json` `description` names the plan-path gate alongside the format and reviewer gates.
5. `decompose.sh` removes the working directory on every non-zero exit that occurs before the decomposition commit and that this run created, and never removes a working directory that already existed before the run.
6. `superbuild` and `simplebuild` Step 1 resolve `<plan-file>` from the plan's `Plan:` line, verify the file's `Title:` against the plan in context, and STOP with an explicit message when the file is missing or holds a different plan.
7. `node --test "tests/**/*.test.ts"` passes, including new cases for the plan-path gate (deny plus fail-open) and for `decompose.sh` exit 3 asserting no orphaned working directory.

