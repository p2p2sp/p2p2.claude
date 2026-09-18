# fix 01 notes

## Runs
- grep -n 'gates: <path>' superdev/references/review-contract.md -> exit 0
- grep -n 'range: <SHA>..<SHA>' superdev/references/review-contract.md -> exit 0
- grep -n 'runs no gate command itself' superdev/references/review-contract.md -> exit 0
- grep -n 'range' superdev/agents/superbuild-task-reviewer.md -> exit 0
- grep -n 'git diff --name-only' superdev/agents/superbuild-task-reviewer.md -> exit 0

I1: fixed - no test: both halves are prose. The producer half is already pinned - `tests/superdev/run-gate.test.ts:126`, `:207`, `:246`, `:271` assert the `COMMAND: ` line of each entry - and the repo has no tooling that asserts reference prose, so a test over the contract sentence itself would be new machinery, not a regression guard.
I2: fixed - no test: `superbuild-task-reviewer.md` is agent instruction prose with no runtime artifact a test can drive.

I1 - entry-shape sentence (review-contract.md `## Gates`) now names `COMMAND` as the entry's opening line, written by `run-gate.sh` rather than by `run.sh`, adds `LINES` to the `run.sh` set, and states that case 1 takes the failing command from that line because a subsection may hold several commands.
touched: superdev/references/review-contract.md
I1 - same list in Task 1's `### Contracts` `gates:` entry, plan copy.
touched: docs/.workflows/2026-09-18-build-pipelining-and-single-gate-run/plan.md
I1 - the same entry's dispatched copy; left unedited it would state the superseded line list.
touched: docs/.workflows/2026-09-18-build-pipelining-and-single-gate-run/tasks/task-01.md
I2 - `## Prerequisites` now reads each path of the union once, at the newest end commit among the ranges naming it, with the handed order declared chronological (task commit first, one range per later fix commit) so the newest is resolvable without a further git call.
touched: superdev/agents/superbuild-task-reviewer.md

M1, M2, M3 untouched - no `minor:` line in the dispatch.
