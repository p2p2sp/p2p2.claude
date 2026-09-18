
## Task 1 - Add the gates and range labels to the review contract and move the gate run to the orchestrator
- TDD: none
- Kind: text
- Model: opus
- Covers: `Komenda bramy raz na rundę` (#9), `Wynik bramy w raporcie każdego oceniającego` (#10), `Reguła bramy wspólna dla obu ciężarów biegu` (#11)

### Dependencies
none - this task defines the vocabulary every later task consumes

### Files
- modify - superdev/references/review-contract.md (`## Labels`, `## Gates`, `## Per-task gate`, the per-task subset paragraph at the top)

### Task Checks
- grep -n 'gates: <path>' superdev/references/review-contract.md
- grep -n 'range: <SHA>..<SHA>' superdev/references/review-contract.md
- grep -n 'runs no gate command itself' superdev/references/review-contract.md

### Approach
1. `Model: opus` because this task rewrites the single owner of the build review loop's vocabulary, and every later task of this plan is written against the wording it fixes.
2. In `## Labels`, replace the `runner: <absolute path>` entry with `gates: <path>` - the gates block the orchestrator's own gate run wrote for this round, required on every build reviewer call, read in place of running the set. Keep the entry's shape and its "required on every build reviewer call" wording.
3. In `## Labels`, add `range: <SHA>..<SHA>` - required on every per-task reviewer call in a build with git, and repeatable: one line per commit range the task owns, the review judging the union of them. State the one exception: a build whose decompose index printed `base: none` passes no `range:` line, and the per-task reviewer then judges the working tree against HEAD as before.
4. In `## Labels`, extend the `prior: <path>` entry with one sentence: a review round closed with no reviewer dispatch hands its gate block here, and such a block carries no finding IDs, so the prior findings table is omitted for it.
5. Extend the per-task subset paragraph at the top of the file so it names `range` alongside `refs`, `prior`, `decisions` and `report`.
6. In `## Gates`, replace the transport paragraph's owner: the orchestrator runs the stage's whole set once per round through `scripts/run-gate.sh` and hands the resulting block on `gates:`; a reviewer runs no gate command itself and reads the handed block instead. Keep the three result cases unchanged as the rules a reviewer applies to each entry of that block, keep the `superdev:executor` analysis-mode fork on `RESULT: DEVIATION` and on a skip-carrying `SUCCESS`, and keep the "never open a `LOG:` path with `Read` yourself" rule. Replace the concurrency paragraph's last rule: the two final dimensions no longer run the set at all, so nothing is shared between them and a host whose commands cannot run twice at once needs no special shape.
7. In `## Per-task gate`, state what the gate judges: the union of the `range:` lines it was handed, each one a commit range this task owns - its own commit first, and one further range per fix commit the task's later rounds produced. No range ever spans a commit of another task. Add the orchestrator-side rule that a per-task review may be dispatched in the same message as the next task's implementor, its verdict read and acted on after that task's own commit.

### Failure modes
- when a consumer still passes `runner:` after this change -> response the label is ignored and the reviewer uses `gates:`, log one `NOTE: plan defect - stale runner label` line in the round's report, test none - contract prose
- when `gates:` names a file that does not exist or cannot be read -> response return line 1 `VERDICT: FAIL` and line 2 `REASON: missing input gates`, writing no report, exactly as every other missing required label, log the return line itself, test none - contract prose

### Contracts
- `gates: <path>` - the round's gate block written by the orchestrator, one entry per command with its subsection, `RESULT`, `STATUS`, `EXIT`, `DURATION` and `LOG` lines - consumed by `Read the handed gate block in the three build reviewers` (Task 5), `Pipeline the per-task review and make the checkpoint agent conditional in superbuild` (Task 6), `Hand the gate block to the Simple track reviewer` (Task 7)
- `range: <SHA>..<SHA>` - repeatable; one commit range the reviewed task owns, the review judging their union, and the whole set absent in a build without git - consumed by `Judge a commit range in the per-task reviewer` (Task 4), `Pipeline the per-task review and make the checkpoint agent conditional in superbuild` (Task 6)

### DoD
`review-contract.md` defines `gates:` and `range:`, carries no `runner:` label entry, names the orchestrator as the single runner of a stage's gate set, and states the per-task gate's range and its concurrent dispatch.


### Covered criteria
9. Komenda bramy raz na rundę - Każda komenda bramy danego etapu wykonuje się w tej rundzie
   dokładnie raz, choćby jej wynik czytało wielu oceniających.
10. Wynik bramy w raporcie każdego oceniającego - Wynik tego jednego uruchomienia jest widoczny
    w raporcie każdego oceniającego z tej rundy.
11. Reguła bramy wspólna dla obu ciężarów biegu - Zasada pojedynczego uruchomienia obowiązuje
    w biegu lżejszym tak samo jak w cięższym.
