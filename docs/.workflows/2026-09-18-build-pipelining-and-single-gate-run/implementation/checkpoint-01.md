# checkpoint review

## Gates
Build - none - the repo ships markdown, JSON and shell sources only; it has no build step
Tests - red - 59s - Tests: 354 passed, 2 failed, 356 total - C:/Projects/p2p2.claude/.temp/superdev/logs/20260918T143130Z-node-test-tests-superdev-.test.ts-1219.log

## Findings

### Important
- I1 - Undocumented COMMAND line - superdev/references/review-contract.md:225 - the contract's description of a gate-block entry lists `RESULT`, `STATUS`, `EXIT`, `DURATION`, `LOG` plus `TAIL`/`REASON`, but not the `COMMAND:` line `run-gate.sh` writes ahead of them (superdev/scripts/run-gate.sh:259), nor `LINES`. Case 1 of that same section (review-contract.md:238) requires the reviewer's `### Needs decision` bullet to name the failing command, and the subsection heading alone cannot do that when a subsection holds several commands - as `#### Tests` does in this very plan. The one line the rule depends on is therefore carried by the producer and promised by nothing; a later edit that trims the script to the documented list silently breaks case 1. Fix: add `COMMAND` (and `LINES`) to that entry-shape sentence, and to the `gates:` entry of Task 1's `### Contracts`, so the producer and the rule that reads it are pinned by the same owner.
- I2 - Stale blob on a re-review - superdev/agents/superbuild-task-reviewer.md:31 - "Read each of those paths in full at the end commit of the range that named it" gives a path named by two ranges two readings: the second and later rounds always hand the task's own commit range plus one range per fix commit (review-contract.md `## Per-task gate`), and the fix almost always touches a file the task commit already touched. The reviewer then reads that file both pre-fix and post-fix with nothing telling it which reading it judges, so the un-fixed blob is in front of it while it verdicts the fix - the shape that produces a Critical re-raised against code already corrected, which the `prior:` ID-continuity rule then keeps alive. Fix: read each path of the union exactly once, at the newest end commit among the ranges that name it, and say so in that sentence.

## Debt
- M1 - Range required or optional - superdev/agents/superbuild-task-reviewer.md:19 marks `range` "(optional, repeatable)" while review-contract.md:44, the owner, makes it required on every per-task call in a build with git. Both describe the same behaviour on absence, so nothing breaks; the label's status reads two ways depending on which file is opened.
- M2 - Missing none-entry clause - superdev/agents/superbuild-reviewer-spec.md:31 drops the "governs an entry reading `none - <reason>`" clause its two siblings carry (superbuild-reviewer-change.md:31, simplebuild-reviewer.md:31) and keeps the new "a subsection with no entry at all -> BLOCKED" rule next to it. `run-gate.sh` writes a `## Gates` line but no `### <subsection>` detail block for a `none` subsection, so on this repo's own plan that agent meets a `Build - none - ...` line with no block; only the contract resolves it.
- M3 - Timeout seconds not carried - superdev/scripts/run-gate.sh:258 feeds `timeout: 1800` to the runner but writes no record of it into the block, while review-contract.md:238 has the reviewer name "the timeout and the seconds it was given" in its BLOCKED bullet. The reviewer can only infer them from `DURATION`.

## Notes
The Tests subsection is red on two failures that predate this delta and belong to neither: `tests/superdev/lib_sha256.test.ts:79` and `tests/superdev/review-plan.test.ts:812`. `git diff --name-only 957cd0f..HEAD` touches only `decompose.sh`, `run-gate.sh` and those two scripts' own test files, and neither `lib_sha256.sh` nor `hooks/scripts/review-plan.sh` nor their tests were changed since before `since`; both failures have the Git-Bash temp-path/tool-availability shape of the pre-existing red Task 3 repaired in `decompose.test.ts`. No finding is raised against this delta for them, and the subsection is recorded red as it stands.

NOTE: plan defect - the fixed `GATE_TIMEOUT=1800` of `Write run-gate.sh and its test` (Task 2), Approach step 3, exceeds by three times the 600 s ceiling of the `Bash` tool the orchestrator calls this script through, so any gate set the constant was meant to protect is killed by the caller first - and because the out-file is truncated by the pre-flight probe (run-gate.sh:216) before the first command runs, such a kill leaves an empty gate block on disk beside no stdout.

`tests/superdev/decompose.test.ts` also carries a repair outside Task 3's stated approach - the exit-7 sidecar case now asserts the two trailing path segments instead of the absolute path. It is recorded in `task-03-notes.md` with the reason (the task check cannot be green on a Git-Bash host otherwise) and the weakened assertion still names the sidecar; it raises nothing.

`superdev/skills/superbuild/SKILL.md` and `superdev/skills/simplebuild/SKILL.md` still pass `runner:` and no `gates:`, so a build dispatched at this commit would fail its first review round on the new input-error rule. That is the plan's own sequencing - Tasks 6 and 7 own those two files - and is not judged here.

## Assessment
The delta is coherent and well tested - `run-gate.sh` carries a true header contract, its 13 cases cover every documented exit path, and the concurrency column is derived conservatively with tests that prove each condition - but two seams between the contract and its new consumers need closing: the block's `COMMAND` line is required by a contract rule that never mentions it, and the per-task reviewer is told to read a twice-named path at two commits.

VERDICT: FAIL
