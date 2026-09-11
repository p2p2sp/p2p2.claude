
## Task 1 - docs(superdev): add the shared review contract reference
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #11, #12, #14, #15, #16

### Dependencies
- none - blocks: 5, 7, 8, 9, 10, 11, 12

### Files
- add - superdev/references/review-contract.md (`## Labels`, `## Finding IDs`, `## Report skeleton`, `## Gates`, `## Verdict rules`, `## Debt file`, `## Decisions file`, `## Notes line formats`, `## Implementor fix-mode input`)

### Test Commands
#### Build
- `! grep -n $'\r' superdev/references/review-contract.md` - expected: no output, exit 0 (LF endings only)

#### Tests
- `grep -c '^## ' superdev/references/review-contract.md` - expected: `9`
- `grep -n 'stage: checkpoint|final|re-review' superdev/references/review-contract.md` - expected: one hit under `## Labels`
- `grep -n 'VERDICT: BLOCKED' superdev/references/review-contract.md` - expected: at least one hit under `## Verdict rules`
- `! grep -n $'\u2013\|\u2014' superdev/references/review-contract.md` - expected: no output, exit 0

### Approach
1. Write `superdev/references/review-contract.md` in the style of `superdev/references/plan-review-checklist.md` (a stack-agnostic rubric shared by several skills, opening with which files consume it: the three build reviewers, the two task implementors, the task reviewer, the two orchestrators).
2. `## Labels` - the fork/agent input labels the orchestrators pass on top of the existing `plan:` / `spec:` / `plan-header:` / `notes:` / `report:` lines: `stage: checkpoint|final|re-review` (required for every build reviewer call), `since: <SHA>` (required; the diff under review is `git diff <since>..HEAD`; for the build's first review round it equals the `base:` value from the decompose index), `prior: <path to the previous report>` (required for `stage: re-review` and for any round after an earlier report; omitted only in the build's first review round), `decisions: <path to decisions.md>` (optional; each line is a user-accepted criterion change with the force of the plan), `refs: <absolute references dir>` (for agents: where this contract lives), `more: <path>` (implementor fix mode only, optional, repeatable: an additional findings report handled in the same dispatch). State the input errors: missing `stage` or `since`, or missing `prior` on `stage: re-review` -> `VERDICT: FAIL` with `REASON: missing input <label>`, no report written. The old `base:` label is retired; `since` replaces it.
3. `## Finding IDs` - `C<n>` / `I<n>` / `M<n>` per severity, assigned in the round that raises the finding, never renumbered; a later round continues numbering from the highest `<n>` per class found in `prior`. `## Report skeleton` - the exact on-disk report structure every build reviewer writes: title line `# <stage> review - <report basename>`; `## Gates` (one line per build/test/e2e command run with its result, or the single sentence `no e2e or integration suite in this host`); `## Prior findings` (only when `prior` was given: a table `| ID | Verdict | Evidence |` with `ADDRESSED` / `NOT ADDRESSED` and a file:line); `## Findings` with `### Critical` and `### Important` (one bullet per finding: `- <ID> - file:line - what is wrong - why it matters - how to fix`); `### Needs decision` (BLOCKED items: ID, the criterion or plan task, why no code change can clear it); `## Debt` (the round's Minor with IDs, also appended to the debt file); `## Notes` (advisory lines including `NOTE: plan defect - <what>`); `## Assessment` ending with the bare line `VERDICT: PASS`, `VERDICT: FAIL` or `VERDICT: BLOCKED`. No `Strengths`, no `Recommendations` section exists.
4. `## Gates` - run before reading code at every stage: the build, every `Test Commands` block of the plan, and the host's integration/e2e command when the plan or the host's memory files document one; each command and its result goes into the report's `## Gates`; on `re-review` after a fix that touched a non-test file the e2e/integration command is rerun; a documented e2e/integration command that cannot start in this environment -> `VERDICT: BLOCKED` with the reason under `### Needs decision`; a host with no such command documented -> the single skeleton sentence, never BLOCKED; a criterion that needs a run and got none is never marked met. `## Verdict rules` per stage: `checkpoint` and `final` first pass - review the whole `git diff <since>..HEAD`; new Critical/Important allowed for any defect in that delta; `final` additionally judges seams across the whole build (a `### Contracts` entry consumed by another task, `CARRY:` lines from the notes dir, failure branches crossing tasks) and may raise Critical/Important for a seam even in code before `since`; `re-review` - verdict every `prior` ID first, then read only `git diff <since>..HEAD`; a new Critical/Important only for a defect the fix itself introduced; an ID that was `M<n>` in `prior` never returns as `I<n>`; FAIL only on `NOT ADDRESSED` Critical/Important or a new fix-introduced Critical/Important. `BLOCKED` - returned when a criterion is unmet because of a decision recorded in the plan, the notes or the decisions file (not because code is missing), or when a documented e2e/integration command (plan `Test Commands` or host memory) exists but cannot run in this environment; BLOCKED outranks FAIL in the return line, and the `REVIEW:` line is returned on both. A behaviour recorded under a task's `### Failure modes` is a decision: disagreement is a `NOTE: plan defect` line, never a Critical or Important. Minor never affects the verdict. State the return channel: line 1 `VERDICT: PASS|FAIL|BLOCKED`, line 2 `REVIEW: <report path>` on FAIL and BLOCKED.
5. `## Debt file` - `<workdir>/implementation/debt.md`, appended by the reviewer (never overwritten, never read by the fix implementor), one line per Minor: `- <ID> - <round report basename> - file:line - <what>`. `## Decisions file` - `<workdir>/implementation/decisions.md`, one line per accepted criterion change: `- <ID> - <criterion or task> - accepted: <what the user accepted> - <date>`; written only through `scripts/record-decision.sh`; a reviewer given `decisions:` treats every line as plan text. `## Notes line formats` - lines the implementors write into `*-notes.md`: `touched: <repo-relative path>` (one per file changed outside the task's `### Files`, and one per file changed by a fix round), `CARRY: <path> - <known problem outside this task's Files, to close in the final review>`, per-finding status in fix mode `<ID>: fixed` / `<ID>: fixed - no test: <reason>` / `<ID>: skipped - <reason>`, plus the existing `UNDERSPECIFIED:` and `no deviations` lines. `## Implementor fix-mode input` - the `task:` (and each `more:`) file is a report in the skeleton above; only `### Critical` and `### Important` IDs are fixed; `## Debt` IDs are touched only when the dispatch prompt lists them explicitly on a `minor: <ID>[, <ID>]` line; every fixed Critical/Important gets a test that fails before and passes after the fix, or the `no test:` status line.

### Edge cases
- A `prior` report written before this change (no IDs) - the reviewer treats every bullet under Critical/Important as an unnumbered prior finding, assigns fresh IDs in the verdict table, and says so in `## Notes`.
- `since` equal to `none` (build without git) - the review is unbounded over the working tree; the report says so under `## Gates`.

### Contracts
- The whole file is the contract consumed by Tasks 7-12; those tasks reference its `## <section>` names and never restate the rules.

### DoD
`superdev/references/review-contract.md` exists with the nine sections above, portability sweep green, no dash characters, every rule in the spec's stories D, E, F, G, H expressible by pointing at one section of this file.


### Covered criteria
11. Recenzenci buildu (`superbuild-reviewer-spec`, `superbuild-reviewer-change`, `simplebuild-reviewer`) przyjmują etykiety `stage: checkpoint|final|re-review`, `prior: <ścieżka poprzedniego raportu>` i `since: <SHA>`; `stage` i `since` są obowiązkowe zawsze (dla pierwszej rundy builda `since` to SHA bazy), `prior` jest obowiązkowe dla `stage: re-review` i dla każdej rundy po wcześniejszym raporcie, a pomijane tylko w pierwszej rundzie builda; brak `stage` lub `since`, albo brak `prior` przy `stage: re-review`, to błąd wejścia zwracany jako `VERDICT: FAIL` z powodem.
12. Każde znalezisko w raporcie ma stałe ID `C<n>`, `I<n>`, `M<n>` nadane w rundzie, w której powstało, i zachowane w kolejnych; raport nie ma sekcji `Strengths`.
14. Raport `stage: re-review` zaczyna się od tabeli werdyktów per ID z `prior` (`ADDRESSED` / `NOT ADDRESSED` z file:line), a recenzja obejmuje wyłącznie `git diff <since>..HEAD`.
15. W re-recenzji nowe Critical/Important pojawiają się tylko dla defektów wprowadzonych przez poprawkę, a znalezisko, które w `prior` było Minor, nie może wrócić jako Important.
16. Werdykt re-recenzji to FAIL wyłącznie przy `NOT ADDRESSED` dla Critical/Important albo przy nowym Critical/Important wprowadzonym przez poprawkę; wszystko inne daje PASS.
