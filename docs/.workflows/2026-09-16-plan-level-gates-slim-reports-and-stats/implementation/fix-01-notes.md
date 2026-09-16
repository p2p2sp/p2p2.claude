# fix-01 notes (checkpoint-01)

## Runs
- grep -c '^## Dispatch strength' superdev/references/review-contract.md -> 1

I1: fixed - no test: contract text only and the repo has no test tooling for markdown content, so
the proof is a grep pair run against HEAD and then the worktree - the clause "copied into
plan-header.md" counted 1 -> 0 and "the run's plan copy" inside the `## Gates` section
counted 0 -> 1.
M1: skipped - Minor, no `minor:` line in this dispatch.
M2: skipped - Minor, no `minor:` line in this dispatch.

I1 was fixed by the first of the two options the finding offers: `## Gates` now names the run's
plan copy (`<workdir>/plan.md`, the `plan:` input every build reviewer is preloaded with) as the
gate's only source and says plainly that `plan-header.md` does not carry the block. The second
option, making `decompose.sh` copy the block into `plan-header.md`, stays unwritten - the plan's
only `decompose.sh` task (Task 8) is scoped to the `Review:` index column.

fix for I1
touched: superdev/references/review-contract.md

CARRY: docs/.workflows/2026-09-16-plan-level-gates-slim-reports-and-stats/spec.md - the constraint
"`## Gate commands` siedzi w nagłówku planu, który `decompose.sh` już kopiuje do `plan-header.md`"
(spec.md:89) is still false after this fix; the contract no longer repeats it, but Tasks 7, 12 and
13 must source the gate from the plan copy, not the header, for the build to stay consistent.
