# SuperPlan
To build this plan use the `superbuild` skill.

Title: "Pipelining review per task i jedno uruchomienie bramy na rundę"
Spec: docs/.workflows/2026-09-18-build-pipelining-and-single-gate-run/spec.md
Intent: docs/.workflows/2026-09-18-build-pipelining-and-single-gate-run/intent.md
Plan: C:\Users\dario\.claude-dario\plans\mutable-hopping-pixel.md

## Gate commands

#### Build
- none - the repo ships markdown, JSON and shell sources only; it has no build step

#### Tests
- node --test "tests/superdev/*.test.ts"
- node --test tests/portability.test.ts tests/orphan-tags.test.ts

#### Integration
- node --test "tests/**/*.test.ts"

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - Write run-gate.sh and its test
- TDD: none
- Kind: code
- Model: opus
- Covers: `Dowód maszynowy na każdym checkpoincie` (#6), `Komenda bramy raz na rundę` (#9)

### Dependencies
none - the script's own contract is self-contained

### Files
- add - superdev/scripts/run-gate.sh
- add - tests/superdev/run-gate.test.ts

### Task Checks
- tests/superdev/run-gate.test.ts - node --test tests/superdev/run-gate.test.ts

### Approach
1. Write `superdev/scripts/run-gate.sh` with `#!/usr/bin/env bash`, mode `100755`, and a header comment carrying its full I/O contract in English, in the shape `commit-task.sh` uses. Signature: `run-gate.sh <workdir> <stage> <out-file>`, `<stage>` one of `checkpoint`, `final`, `re-review:<closing-stage>`. Leave `set -e` out and argue that in the header the way `run.sh` does: a failing gate command is this script's ordinary result, not its own error, so an exiting shell would destroy the very block it exists to write.
2. Read `<workdir>/plan.md`, take the `## Gate commands` block above the first `<!-- TASK -->` marker, and select subsections by stage: `checkpoint` takes `#### Build` and `#### Tests`, `final` takes all three, `re-review:<closing-stage>` takes the set of the stage it names.
3. Run each selected command through the sibling runner resolved from the script's own location (`skills/executor/scripts/run.sh` under the plugin root), one invocation per command, feeding `command:`, `expect-exit: 0` and `timeout: 1800` on stdin. That timeout is a fixed constant of this script, stated in its header comment as the generous bound a deterministic caller can set without judging a host's suite; the runner's own default of 600 is too short for a slow one.
4. A subsection reading `none - <reason>` is not run and carries that reason.
5. Write `<out-file>` whole: first line `# <closing stage> review` (`checkpoint` or `final`), then a `## Gates` section with one line per subsection in the report skeleton's shape `<subsection> - <result> - <wall time>`, then one `### <subsection>` detail block per command carrying every line the runner printed for it, verbatim and in its order - `RESULT`, `STATUS`, `EXIT`, `DURATION`, `LOG`, `LINES` and, when the runner printed one, `TAIL`; on the runner's pre-launch error path that is the shorter `RESULT`, `STATUS`, `REASON` triple instead. Nothing is filtered: a reviewer's evidence rules read `TAIL` and `LOG` off this block.
6. Print to stdout one `<subsection>: <result>` line per subsection run, then `GATES: <out-file>` and finally `RED: yes` when any command came back anything other than `RESULT: SUCCESS`, `RED: no` otherwise. Exit 0 whatever the commands returned; a command's outcome is data on the `RED:` line, never the script's status.
7. Write `tests/superdev/run-gate.test.ts` against the harness of `tests/CLAUDE.md`: `withTempDir` plus a fixture plan, `runScript` for execution, `slash()` for every printed path. Cover the stage-to-subsection selection, a `none - <reason>` subsection, a green run and a red run.

### Failure modes
- when `<workdir>/plan.md` is absent or holds no `## Gate commands` block -> response print nothing on stdout at all, no `GATES:` and no `RED:` line, and exit 1, so an empty stdout can never be misread as a green round, log the reason on stderr, test the missing-plan case in `tests/superdev/run-gate.test.ts`
- when a required argument is missing -> response print the usage line on stderr and exit 1, log that same line, test the no-argument case in `tests/superdev/run-gate.test.ts`
- when `<stage>` is outside its accepted set -> response print the usage line naming that set on stderr and exit 1, running no command and writing no file, log that same line, test the invalid-stage case in `tests/superdev/run-gate.test.ts`
- when `<out-file>` cannot be written -> response exit 2 with the reason on stderr and no stdout block, log that reason, test the unwritable-directory case in `tests/superdev/run-gate.test.ts`
- when the sibling runner cannot be resolved from the script's own location -> response exit 2 with the resolved path on stderr, log that path, test none - the path is fixed inside the plugin tree and a test would assert a constant
- when the runner itself exits 2 on its pre-launch error path for one command -> response keep going with the remaining commands, carry that command's `RESULT` / `STATUS` / `REASON` triple into the block and count it as red on the `RED:` line, since a command that never launched is a result about the round rather than a fault of this script, log that triple, test the pre-launch-error case in `tests/superdev/run-gate.test.ts`

### Contracts
- `<stage>` accepted set, closed: exactly `checkpoint`, `final`, or `re-review:` followed by `checkpoint` or `final`; every other value exits 1 with the usage line - consumed by `Pipeline the per-task review and make the checkpoint agent conditional in superbuild` (Task 6), `Hand the gate block to the Simple track reviewer` (Task 7)
- `<out-file>` is used verbatim as given and the script derives no name of its own, so a caller passing a `re-review:` stage still names the file itself - consumed by `Pipeline the per-task review and make the checkpoint agent conditional in superbuild` (Task 6), `Hand the gate block to the Simple track reviewer` (Task 7)
- stdout shape, the orchestrator's whole reading: on exit 0, `<subsection>: <result>` lines, then `GATES: <path>`, then `RED: yes|no` as the last line; on any non-zero exit, nothing on stdout at all - consumed by `Pipeline the per-task review and make the checkpoint agent conditional in superbuild` (Task 6), `Hand the gate block to the Simple track reviewer` (Task 7)

### DoD
`run-gate.sh` runs a stage's gate set once, writes the round's gate block and prints `RED:` as its last line; `node --test tests/superdev/run-gate.test.ts` is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - Add the concurrency column to the decompose index
- TDD: none
- Kind: code
- Model: opus
- Covers: `Sprawdzenie nie wstrzymuje następnego zadania` (#1), `Zadanie zależne czeka na werdykt` (#3)

### Dependencies
- `Write run-gate.sh and its test` (Task 2) - blocks: the scripts-inventory line this task writes names that script

### Files
- modify - superdev/scripts/decompose.sh (index row printing, the awk END block and the per-task capture block)
- modify - tests/superdev/decompose.test.ts
- modify - superdev/CLAUDE.md (`## Scripts inventory (superdev/scripts/)`)

### Task Checks
- tests/superdev/decompose.test.ts - node --test tests/superdev/decompose.test.ts

### Approach
1. In the per-task capture block of `decompose.sh`, collect three further per-task values alongside `model` and `review`: every `(Task <num>)` token appearing under that task's `### Dependencies` section, whether that task carries a `### Dependencies` and a `### Files` section at all, and every path token of its `### Files` lines - the path being the field that follows the ` - ` after the `add | modify | delete` verb, cut before any ` (`.
2. In the awk END block, derive a fifth column `concurrent` per task, reading `no` unless every condition for `yes` holds: the task is not task 1; it carries both a `### Dependencies` and a `### Files` section; its `### Dependencies` does not name the immediately preceding task number; and its `### Files` paths share no entry with the preceding task's. Incomplete task text therefore always yields `no`, per the spec's constraint that a task the plan does not describe completely never qualifies for concurrency.
3. Print the index row as `<task-file>\t<title>\t<model>\t<review>\t<concurrent>` and update the header comment's column description to five columns.
4. Extend `tests/superdev/decompose.test.ts` with cases for the new column: a dependent pair, a file-overlapping pair, an independent pair, task 1, and a task missing one of the two sections.
5. In `superdev/CLAUDE.md`, update the `decompose.sh` inventory line to five columns and add one `run-gate.sh` line describing it as the single runner of a stage's gate set.

### Failure modes
- when a task carries no `### Dependencies` section or no `### Files` section -> response print `no` in the concurrent column, because incomplete task text never qualifies for concurrency, log nothing, test the missing-section case in `tests/superdev/decompose.test.ts`
- when a `### Files` line carries a path that is not literal -> response compare the token as it stands, so a non-literal path only ever makes the column `no`, log nothing, test the non-literal-path case in `tests/superdev/decompose.test.ts`

### Contracts
- decompose index row, five tab-separated columns, the fifth reading exactly `yes` or `no` - consumed by `Pipeline the per-task review and make the checkpoint agent conditional in superbuild` (Task 6), `Hand the gate block to the Simple track reviewer` (Task 7)

### DoD
`decompose.sh` prints a fifth `concurrent` column derived from `### Dependencies` and `### Files`, `superdev/CLAUDE.md` records both the new column and `run-gate.sh`, and `node --test tests/superdev/decompose.test.ts` is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - Judge a commit range in the per-task reviewer
- TDD: none
- Kind: text
- Model: opus
- Covers: `Zakres sprawdzania bez zmian` (#2)

### Dependencies
- `Add the gates and range labels to the review contract and move the gate run to the orchestrator` (Task 1) - blocks: the `range:` label this agent reads

### Files
- modify - superdev/agents/superbuild-task-reviewer.md (`## Input`, `## Prerequisites`, `## Scope`, `## Check`)

### Task Checks
- grep -n 'range' superdev/agents/superbuild-task-reviewer.md
- grep -n 'git diff --name-only' superdev/agents/superbuild-task-reviewer.md

### Approach
1. `Model: opus` because this task decides how a two-mode input (a range, or its absence in a build without git) is read without leaving either mode ambiguous.
2. In `## Input`, add the `range` label entry between `refs` and `notes`, describing it as repeatable, each line one commit range this review judges, the review covering their union, and naming the absence of every such line as the no-git mode; update the closing sentence so the label set still reads as the whole of the input.
3. In `## Prerequisites`, replace the `git status --short` step: with `range` set, run one `git diff --name-only <range>` with `Bash` per handed range, then read each named file in full at the range's own end commit through `git show <end sha>:<path>`, never from the working tree, skipping a path the diff reports as deleted because no blob of it exists there; with `range` absent, keep today's `git status --short` reading of the working tree and its `Read` of the changed files.
4. In `## Scope`, restate the judged set as the union of the changes in the `## range` lines rather than the uncommitted work, keeping the no-git sentence beside it and keeping the run-directory exclusion exactly as it stands.
5. In the `Runs recorded` bullet of `## Check`, widen the sentence pinning `Bash` so it names both git reads and nothing else. Add one sentence to `## Scope`: with `range` set, read every file from the handed commits rather than from the working tree, because another task's implementor may be editing that tree while this review runs, and an undeclared touch of a file this task owns would otherwise reach the review as if it were part of it.
6. Add the `Kind` marker to the plan-task shape listed under the `task` label, which today names `TDD` but not `Kind`.

### Failure modes
- when any `range` line names a commit that does not exist -> response return line 1 `VERDICT: FAIL` and line 2 `REASON: missing input range`, writing no report, log that return line, test none - agent prose
- when no `range` line is present in a build that does have git -> response judge the working tree as in the no-git mode, so the review still happens rather than failing, log one `NOTE: <what>` line saying no range was handed in, test none - agent prose

### Contracts
- the per-task review's judged set: the union of `git diff <range>` over every handed range, the working tree against HEAD when none was handed - consumed by `Pipeline the per-task review and make the checkpoint agent conditional in superbuild` (Task 6)

### DoD
`superbuild-task-reviewer.md` reads every `range` line, judges the union of those diffs when at least one is handed, keeps the working-tree reading when none is, and lists `Kind` in the plan-task shape.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - Read the handed gate block in the three build reviewers
- TDD: none
- Kind: text
- Model: opus
- Covers: `Sprawdzenie nie wstrzymuje następnego zadania` (#1), `Ocena checkpointu tylko gdy jest powód` (#7), `Wynik bramy w raporcie każdego oceniającego` (#10), `Reguła bramy wspólna dla obu ciężarów biegu` (#11)

### Dependencies
- `Add the gates and range labels to the review contract and move the gate run to the orchestrator` (Task 1) - blocks: the `gates:` label these agents read

### Files
- modify - superdev/agents/superbuild-reviewer-change.md (frontmatter `description`, `## Input`, `## Contract`, `## Gates`)
- modify - superdev/agents/superbuild-reviewer-spec.md (frontmatter `description`, `## Input`, `## Contract`, `## Gates`)
- modify - superdev/agents/simplebuild-reviewer.md (frontmatter `description`, `## Input`, `## Contract`, `## Gates`)
- modify - superdev/agents/CLAUDE.md (`## Entry points`, `## Contracts & invariants`)
- modify - superdev/README.md (the build reviewers' dispatch label lists, the `executor` row, and every sentence naming who runs the gate block)

### Task Checks
- grep -n 'run no gate command' superdev/agents/superbuild-reviewer-change.md
- grep -n 'run no gate command' superdev/agents/superbuild-reviewer-spec.md
- grep -n 'run no gate command' superdev/agents/simplebuild-reviewer.md
- grep -n 'gates:' superdev/agents/CLAUDE.md superdev/README.md

### Approach
1. `Model: opus` because this task propagates one vocabulary change across five files whose wordings differ, and each restatement has to stay true to the contract Task 1 fixed rather than to the sentence it replaces.
2. In each of the three reviewer agents, replace the `runner` entry of `## Input` with a `gates` entry - required, the block the orchestrator's own gate run wrote for this round - extend the `prior` entry so it covers a round closed with no reviewer dispatch, whose gate block arrives here carrying no finding IDs, and add `gates` to the `## Contract` input-error line that today names `stage`, `since` and `prior`. In each frontmatter `description:`, replace whatever wording that agent uses to claim it runs the plan's gate commands for its stage before reading any code - the three phrase it differently - with the reading of the handed block.
3. In each of the three reviewer agents, rewrite the `## Gates` section's first paragraph: the first working step at every stage is to read the block on `gates`, one entry per command the orchestrator already ran, and to record one line per subsection in the report's gates section; state in each that you run no gate command yourself; the contract's `## Gates` still decides which subsections the stage covers and owns every BLOCKED condition.
4. In each, keep the `superdev:executor` analysis-mode paragraph unchanged in substance but source its input from the handed block's `LOG`, `EXIT` and `DURATION` lines rather than from a run of the reviewer's own, and keep raw `Bash` reserved for git, file inspection and probes under `.temp/`.
5. In `superbuild-reviewer-change.md` and `superbuild-reviewer-spec.md`, replace the concurrency paragraph: neither dimension runs a gate command any more, so both record the same handed block and nothing is shared between their runs.
6. In `simplebuild-reviewer.md`, replace the single-reviewer sentence with the same handed-block wording.
7. In `superdev/agents/CLAUDE.md`, replace the `runner:` half of the label sentence under `## Contracts & invariants` with `gates:`, record in `## Entry points` that the per-task reviewer judges the commit ranges handed on `range:` and is dispatched beside the next task's implementor where the index allows it, restate the code dimension's checkpoint sentence as a round that runs its agent only on one of the three stated conditions, and drop the clause of the final-pair paragraph saying the two dimensions share the working tree their gate commands run against - neither runs one any more.
8. In `superdev/README.md`, replace `runner:` with `gates:` in every build reviewer's dispatch label list, and rewrite every sentence that today says a review round or a reviewer runs the plan's `## Gate commands` block - the `executor` row included - so the catalog page names the orchestrator as the runner and the reviewers as readers, while keeping the `executor` fork on `RESULT: DEVIATION` exactly as it stands. Rewrite two further sentences against the new order: the one saying a task goes from the implementor's `VERDICT: PASS` straight to commit, which now holds for every task rather than only a `Review: none` one, and the `superbuild-reviewer-change` row's description of the checkpoint after every fifth committed task, which now runs its agent conditionally - the `simplebuild-reviewer` row keeps its unconditional wording, because that track's checkpoint stays unconditional.

### Failure modes
- when the handed block carries no entry for a subsection the stage covers -> response record that subsection's line as missing and return `VERDICT: BLOCKED` with a `### Needs decision` bullet naming it, log that bullet, test none - agent prose
- when `gates` is absent or unreadable -> response return line 1 `VERDICT: FAIL` and line 2 `REASON: missing input gates`, writing no report, log that return line, test none - agent prose

### Contracts
none - this task consumes the `gates:` contract Task 1 defines and introduces none of its own

### DoD
All three build reviewers read their round's gate results from `gates` and run no gate command, and `superdev/agents/CLAUDE.md` and `superdev/README.md` both record `gates:` in place of `runner:`.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - Hand the gate block to the Simple track reviewer
- TDD: none
- Kind: text
- Model: sonnet
- Covers: `Reguła bramy wspólna dla obu ciężarów biegu` (#11)

### Dependencies
- `Add the gates and range labels to the review contract and move the gate run to the orchestrator` (Task 1) - blocks: the `gates:` label this orchestrator passes
- `Write run-gate.sh and its test` (Task 2) - blocks: the script this step calls
- `Add the concurrency column to the decompose index` (Task 3) - blocks: the fifth column this skill's index sentence describes
- `Read the handed gate block in the three build reviewers` (Task 5) - blocks: the reviewer that accepts `gates:`
- `Pipeline the per-task review and make the checkpoint agent conditional in superbuild` (Task 6) - blocks: the gate-block path shape and the round wording this task mirrors

### Files
- modify - superdev/skills/simplebuild/SKILL.md (frontmatter `allowed-tools`, `## Step 1 - Decompose Plan`, `### Checkpoint`, `### Fix loop`, `## Step 3 - Final Review`)

### Task Checks
- grep -n 'GATES:' superdev/skills/simplebuild/SKILL.md
- grep -n 'gates:' superdev/skills/simplebuild/SKILL.md

### Approach
1. Frontmatter: add one `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/run-gate.sh:*)` pattern to `allowed-tools`. In `## Step 1`, reduce the `printf` line to the references directory alone, drop `<runner>` from the tracked values, and update the index-row sentence that today describes four columns and tells this track to ignore the fourth: the index now carries five, and this track ignores the fourth and the fifth alike.
2. In `### Checkpoint`, run `run-gate.sh` with stage `checkpoint` before the dispatch, naming the gate file as the gate-block path contract of `Pipeline the per-task review and make the checkpoint agent conditional in superbuild` (Task 6) fixes it, and pass its `GATES:` path on `gates:` in place of `runner:`. State that this track dispatches its reviewer unconditionally, because no task of it carries a per-task review and the checkpoint is therefore its only gate.
3. In `## Step 3` and in `### Fix loop`'s re-review step, run `run-gate.sh` once per round and pass the resulting path on `gates:`, replacing each `runner:` line, naming the stage and the gate file exactly as the gate-block path contract of `Pipeline the per-task review and make the checkpoint agent conditional in superbuild` (Task 6) fixes them.

### Failure modes
- when `run-gate.sh` exits non-zero -> response `AskUserQuestion` (retry the script / dispatch the reviewer without a gate block / abort), log one `escalation` stats event carrying the exit code and the answer, test none - orchestrator prose

### Contracts
none - this task consumes the contracts Tasks 1, 2 and 6 define and introduces none of its own

### DoD
`simplebuild` runs each round's gate set once through `run-gate.sh`, hands the result on `gates:`, carries no `runner:` line, and keeps its checkpoint unconditional.

<!-- /TASK -->
