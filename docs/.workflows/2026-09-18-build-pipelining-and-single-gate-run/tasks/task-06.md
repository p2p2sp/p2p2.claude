
## Task 6 - Pipeline the per-task review and make the checkpoint agent conditional in superbuild
- TDD: none
- Kind: text
- Model: opus
- Review: opus
- Covers: `Sprawdzenie nie wstrzymuje następnego zadania` (#1), `Zakres sprawdzania bez zmian` (#2), `Zadanie zależne czeka na werdykt` (#3), `Wada domknięta w granicy jednego zadania` (#4), `Naprawa odróżnialna w historii` (#5), `Ocena checkpointu tylko gdy jest powód` (#7), `Checkpoint zaczyna się z kompletem werdyktów` (#8)

### Dependencies
- `Add the gates and range labels to the review contract and move the gate run to the orchestrator` (Task 1) - blocks: the labels this loop passes
- `Write run-gate.sh and its test` (Task 2) - blocks: the script this step calls and the `RED:` line it branches on
- `Add the concurrency column to the decompose index` (Task 3) - blocks: the fifth column this loop reads
- `Judge a commit range in the per-task reviewer` (Task 4) - blocks: the reviewer that accepts `range:`
- `Read the handed gate block in the three build reviewers` (Task 5) - blocks: the reviewers that accept `gates:`

### Files
- modify - superdev/skills/superbuild/SKILL.md (frontmatter `allowed-tools`, `### Stats`, `## Step 1 - Decompose Plan`, `### Loop`, `### Task gate blocked`, `### Implementor stop`, `### Checkpoint`, `### Fix loop`, `## Step 3 - Final Review`)

### Task Checks
- grep -n 'deferred' superdev/skills/superbuild/SKILL.md
- grep -n 'RED: yes' superdev/skills/superbuild/SKILL.md
- grep -n 'gates:' superdev/skills/superbuild/SKILL.md

### Approach
1. `Model: opus` with `Review: opus` because this task rewrites a concurrency-bearing state machine the whole build runs on, and a wrong ordering here is expensive to undo.
2. Frontmatter: add one `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/run-gate.sh:*)` pattern to `allowed-tools`. In `## Step 1`, reduce the `printf` line to the references directory alone and drop `<runner>` from the tracked values; add `deferred` as a fifth tracked value, empty at the start of the build and on every resume, and note that the index now carries five columns.
3. Rewrite `### Loop` into seven ordered steps per task: (1) `TaskUpdate` start; (2) one single message dispatching this task's implementor plus, when `deferred` is set, that deferred task's reviewer with one `range:` line per commit range that task owns, awaiting both; (3) the implementor's verdict branches as they stand today in substance, except that `VERDICT: PASS` now falls through to the commit rather than to a review; (4) keep the current `head` as this task's `task_since`, then commit the task as today and set `head` from the `commit:` line; (5) `TaskStop` completed; (6) close `deferred` when one came back, then decide this task's own review; (7) the checkpoint trigger exactly as today's step 6 states it, unchanged in substance and last in the order.
4. Write the close step: a deferred `VERDICT: PASS` clears `deferred`; a `VERDICT: BLOCKED` runs `### Task gate blocked`; a `VERDICT: FAIL` dispatches the fix implementor as today, then keeps the current `head` as `fix_since`, commits that fix under its own title with `commit-task.sh` and the task's own notes file, sets `head` from the `commit:` line, and re-dispatches the reviewer with the next `R` carrying its earlier `range:` lines plus one more, `<fix_since>..<the fix commit sha>`, so the review never spans a commit of another task. The three-round budget is unchanged.
5. Write the decide step, keeping today's invalid-column escalation inside it: a `<review>` column whose first token is neither a `Model:` value nor `none` still escalates through `AskUserQuestion` (skip reviewer / abort) and `skip reviewer` still ends the task exactly as `none` does, deferring nothing. This task's `<review>` column reads `none` -> nothing is deferred and nothing is dispatched; a next task exists, this task's number is not a multiple of 5, and the next task's `concurrent` column reads `yes` -> set `deferred` to this task, carrying its `task_since`, its commit SHA and its review round `R`, and move on; in every other case dispatch this task's reviewer alone with its `range:` line, await it, and run the same close step here. State that `deferred` is therefore always empty whenever a checkpoint round actually runs and whenever the last task of the build closes.
6. Rewrite `### Task gate blocked` for the new order. Its opening "No implementor runs first, nothing is committed" no longer holds: the task was committed at step 4 before this gate ever ran, so the sentence says instead that the task is already committed and that no implementor runs before the user answers. Add the commit of the **fix the plan** re-dispatch: after its `VERDICT: PASS`, keep the current `head` as `fix_since`, commit its edits with `commit-task.sh` under the task's own title and notes file, set `head` from the `commit:` line, and hand the reviewer one further `range:` line for it - otherwise those edits sit uncommitted and surface as `undeclared:` on the next task's commit. Then renumber the pointers: today the subsection reads "the reviewer again as step 3 of `### Loop` dispatched it" and "its verdict is read at step 2"; under the new enumeration the reviewer is dispatched at step 2 when it was deferred and at step 6 otherwise, and the implementor's verdict is read at step 3. Check `### Implementor stop` and `### Fix loop` for the same kind of pointer and correct each to the step it now is.
7. Rewrite `### Checkpoint`: run `"${CLAUDE_PLUGIN_ROOT}/scripts/run-gate.sh" <workdir> checkpoint <workdir>/implementation/gates-checkpoint-KK.md` first and read its `RED:` line; dispatch `superbuild-reviewer-change` with `gates:` in place of `runner:` only when `RED: yes`, or when some task of this window returned FAIL or BLOCKED from its per-task review, or when some task of this window ended unreviewed - its `<review>` column read `none`, or the user answered `skip reviewer` to an invalid column value. A FAIL or BLOCKED that the task's own fix rounds later closed to PASS still counts: the condition is that the window held a task reported as defective, not that one is still open. Otherwise close the round with `since` := `head` and `prior` := that gates file through `checkpoint-update.sh`, dispatching nothing.
8. In `## Step 3` and in `### Fix loop`'s re-review step, run `run-gate.sh` once per round before the dispatch and pass its `GATES:` path on `gates:` to every reviewer of that round, replacing each `runner:` line. A final round passes stage `final` and the file `gates-final-01.md`; a re-review passes stage `re-review:<closing stage>` and the file `gates-<closing stage>-reR.md`, so no gate file name ever carries the stage argument's colon. In `### Stats`, extend the concurrent-pair rule so it covers the loop's implementor-plus-reviewer pair as well as the final pair.

### Failure modes
- when `run-gate.sh` exits non-zero -> response `AskUserQuestion` (retry the script / dispatch the reviewer without a gate block / abort), log one `escalation` stats event carrying the exit code and the answer, test none - orchestrator prose
- when the decompose index carries only four columns because the build was resumed against an older run directory -> response treat every task's `concurrent` value as `no`, so the loop runs exactly as it does today, log one line in the Step 5 summary, test none - orchestrator prose
- when the index printed `base: none` -> response defer nothing and pass no `range:` line, since no commit exists to review, log nothing, test none - orchestrator prose
- when a deferred review came back in step 2 while this task's implementor returned FAIL and the user answered skip or abort -> response close the deferred review before acting on that answer, whatever step the loop reached, so no verdict is ever dropped, and only then skip the task or end the loop, log one `escalation` stats event naming both the deferred task and the answer, test none - orchestrator prose
- when the fix commit of a deferred task comes back `undeclared` from `commit-task.sh` -> response the same `AskUserQuestion` the loop's own commit step uses (remove or stash / include named ones / abort) before the re-review is dispatched, log one `commit` stats event with verdict `undeclared`, test none - orchestrator prose

### Contracts
- gate-block path per round: `<workdir>/implementation/gates-<closing stage>-<ordinal>.md`, `<closing stage>` always `checkpoint` or `final` and never the `re-review:` argument form, the ordinal read off disk like every other ordinal of this build - consumed by `Hand the gate block to the Simple track reviewer` (Task 7)

### DoD
`superbuild` commits a task before its review, dispatches that review beside the next task's implementor when the index allows it, closes a deferred FAIL with its own fix commit before the following task starts, runs each round's gate set once through `run-gate.sh`, and dispatches the checkpoint agent only on one of the three stated conditions.


### Covered criteria
1. Sprawdzenie nie wstrzymuje następnego zadania - Sprawdzenie ukończonego zadania biegnie
   równocześnie z pracą nad następnym, gdy następne nie korzysta z wyniku sprawdzanego ani nie
   sięga do tych samych plików.
2. Zakres sprawdzania bez zmian - Każde zadanie dostaje po zmianie dokładnie to sprawdzenie,
   które dostawało przed nią.
3. Zadanie zależne czeka na werdykt - Zadanie, które korzysta z wyniku poprzedniego albo dzieli
   z nim pliki, rozpoczyna się dopiero po werdykcie sprawdzenia tego poprzedniego.
4. Wada domknięta w granicy jednego zadania - Wada zgłoszona przez sprawdzenie, które biegło
   równocześnie z inną pracą, zostaje naprawiona zanim rozpocznie się praca o jedno zadanie
   dalej.
5. Naprawa odróżnialna w historii - Naprawa trafia do historii repozytorium jako osobny commit,
   odróżnialny od commitu zadania, którego dotyczy.
7. Ocena checkpointu tylko gdy jest powód - Ocena checkpointu odbywa się wyłącznie wtedy, gdy
   któraś komenda bramy odbiegła od oczekiwania, któreś zadanie w oknie zostało zgłoszone jako
   wadliwe albo któreś zadanie w oknie nie podlegało sprawdzeniu.
8. Checkpoint zaczyna się z kompletem werdyktów - Checkpoint rozpoczyna się dopiero wtedy, gdy
   każde zadanie w jego oknie ma już werdykt sprawdzenia albo sprawdzeniu nie podlegało.
