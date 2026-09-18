# re-review review

## Gates
Build - none - the repo ships markdown, JSON and shell sources only; it has no build step
Tests - red - 44s - Tests: 354 passed, 2 failed, 356 total - C:/Projects/p2p2.claude/.temp/superdev/logs/20260918T143739Z-node-test-tests-superdev-.test.ts-1128.log

## Prior findings
| ID | Title | Verdict | Evidence |
|---|---|---|---|
| I1 | Undocumented COMMAND line | ADDRESSED | superdev/references/review-contract.md:224 |
| I2 | Stale blob on a re-review | ADDRESSED | superdev/agents/superbuild-task-reviewer.md:31 |
| M1 | Range required or optional | NOT ADDRESSED | superdev/agents/superbuild-task-reviewer.md:19 |
| M2 | Missing none-entry clause | NOT ADDRESSED | superdev/agents/superbuild-reviewer-spec.md:31 |
| M3 | Timeout seconds not carried | NOT ADDRESSED | superdev/scripts/run-gate.sh:258 |

## Debt
- M4 - Undeclared file in the fix commit - the fix commit 507283f also carries 58 added lines in `docs/notes.md`, a file none of the four `touched:` lines of `fix-01-notes.md` declares. The contract's `## Notes line formats` makes fix mode carry one `touched:` line per file changed at all, and `commit-task.sh --notes` reads that set as the declared one, so the commit's contents and its declared set disagree. The content is user-authored scratch prose outside every task's `### Files`, nothing reads it at runtime, and no delivered behaviour depends on it.

## Notes
The round this re-review closes is the checkpoint round of `checkpoint-01.md`; a later round reading this report on `prior` takes the `#### Build` and `#### Tests` subsection set from that.

The Tests subsection is red on exactly the two failures the prior round recorded and attributed to neither this delta nor the build: `tests/superdev/lib_sha256.test.ts:79` and `tests/superdev/review-plan.test.ts:812`. The counts are unchanged (354 passed, 2 failed, 356 total), the fix commit touches neither `lib_sha256.sh` nor `hooks/scripts/review-plan.sh` nor their tests, and `tests/superdev/run-gate.test.ts`, `tests/superdev/decompose.test.ts`, `tests/portability.test.ts` and `tests/orphan-tags.test.ts` are all green. No finding is raised against this delta for them and the subsection is recorded red as it stands.

M1, M2 and M3 stayed untouched by design: no `minor:` line travelled on the fix dispatch, and per the contract's `## Implementor fix-mode input` a Minor the dispatch does not name is left alone. They never move the verdict and are not re-raised here.

The I1 fix edits the run's plan copy and `tasks/task-01.md` but not the source plan under `.claude-dario/plans/` - correct, because `decompose.sh` compares that source file against its `<plan>.sha256` sidecar and exits 7 on a mismatch, so editing it would break a resume. The source plan's `### Contracts` line therefore still carries the superseded list; nothing in the build reads it after decomposition.

Checked for a stale second copy of the entry-shape list: outside `review-contract.md:226` the only other statements of it are `run-gate.sh`'s own header (lines 65-76, the producer's own contract, already naming `COMMAND` and `LINES`) and the plan/task copies the fix updated. The three build reviewer agents state it as "the lines `run.sh` printed for its command" with no enumeration, so none of them drifted.

## Assessment
Both prior Important findings are closed at their stated owners - the contract's entry-shape sentence now names the `COMMAND` line, pins it to `run-gate.sh` as its writer (which `tests/superdev/run-gate.test.ts:126`, `:207`, `:246`, `:271` assert) and states that case 1 takes the failing command from it, and the per-task reviewer now reads each path of the union exactly once at the newest end commit, with the chronological handed order the contract's `## Per-task gate` itself declares - and the fix introduced no new Critical or Important.

VERDICT: PASS
