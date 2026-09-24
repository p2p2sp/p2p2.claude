# Review Contract

Rules only: no rationale, no history - the reason a rule exists belongs in CLAUDE.md.

Shared vocabulary of the build review loop, owned by this file alone: every consumer applies these rules instead of restating them, and none carries a copy of any section. The per-task gate (`agents/superbuild-task-reviewer.md`)
is bound by a subset - `## Labels` (`refs`, `range`, `prior`, `decisions`, `report`), `## Naming`, `## Finding IDs`, `## Report skeleton`, `## Verdict rules` for the one BLOCKED condition of `## Per-task gate` and for the
working-directory exclusion, `## Decisions file`, `## Notes line formats`. Every rule refers only to the plan template's own sections (`## Gate commands`, `### Files`, `### Task Checks`, `### Contracts`,
`### Failure modes`, `### DoD`), to the run's working directory and to `git` - never to a specific ecosystem's tools, never to a heuristic for recognising a test file. `<workdir>` is the run's working directory
`docs/.workflows/<run>/`, holding the plan, the tasks and the `implementation/` reports.

## Labels

Input lines the orchestrator passes to an agent, beside `plan:`, `spec:`, `plan-header:`, `task:`, `notes:`, `report:`. One label per line; a value is always a path or a short token (a SHA, a stage name, an ID list), never a
body of text. Required: `stage`, `since`, `gates` on every build reviewer call; `refs` on every build reviewer and per-task reviewer call; `range` on every per-task reviewer call in a build with git.

- `stage: checkpoint|final|re-review` - the round; selects the rules of `## Verdict rules`.
- `since: <SHA>` - the change under review is `git diff <since>..HEAD`; the first round takes the decompose index's `base:`; `none` is a build without git, its review unbounded over the working tree.
- `range: <SHA>..<SHA>` - repeatable, one line per commit range the reviewed task owns; exception: an index printing `base: none` passes no `range:` line, that reviewer judging the working tree against HEAD.
- `prior: <path>` - this reviewer's previous report; required for `stage: re-review` and any round after an earlier report, omitted only in the first round. On the per-task gate: this task's previous round report
  (`task-NN-review-<R-1>.md`), from its second round on, read only for its finding numbering and the title of a still-open finding (never re-raised under a new ID), with no verdict table and no re-review mandate. A round
  closed with no reviewer dispatch wrote no report: `prior` stays on the last report there was, or - no report yet in this build - carries that round's gate block, the round reading it omitting the prior findings table.
- `decisions: <path>` - optional, the run's decisions file (`## Decisions file`). `refs: <absolute path>` - the plugin's references directory, read as `<refs>/review-contract.md` before acting. `gates: <path>` - the gate
  block this round's gate run wrote (`## Gates`), read in place of running the stage's set.
- `more: <path>` - fix mode only, optional, repeatable: one further findings report, same dispatch. `minor: <ID>[, <ID>]` - fix mode only, optional: the only `## Debt` IDs that dispatch may touch; neither build
  orchestrator ever sends it.
- input errors, before any work: a build reviewer call missing `stage`, `since` or `gates`, a `gates:` file that does not exist or cannot be read, or `stage: re-review` with no `prior` -> line 1 `VERDICT: FAIL`, line 2
  `REASON: missing input <label>`, no report written.

## Naming

Every item a human is pointed at carries a title next to its number; the number stays the pointer agents and scripts key on. Title source: decision - its `### <n>. <question>` heading; phase - `### NN. <title>`; plan task -
`## Task <N> - <title>`; criterion - the `<short name>` of `<n>. <short name> - <condition>`; finding - the `<title>` of its report bullet; checklist class or rule - the name after its `B<n> -` or `R<n> -` prefix.

- reference form, identical in chat and in files: `` `<title>` (<pointer>) ``, the pointer `decision 3`, `phase 01`, `Task 3`, `criterion 3`, `C2`, `B3`, or `#3` inside a `Covers:` line. A heading keeps its own form and is
  never rewritten into it.
- a bare pointer never appears in anything a human reads: not in narration, an `AskUserQuestion` label, an escalation, a report, a `Covers:`, `Depends on:`, `consumed by` or `## Impact on decisions` line.
- a title is a few words, no `#`, no backticks inside, unchanged for the item's life, assigned once with the number and travelling with it.
- legacy fallback: an item written before this contract is cited by the first clause of its own text, verbatim - for a finding bullet its "what is wrong" clause, never its `file:line`. A title an item does not have is never
  invented.
- machine contracts are untouched here: a `Covers:` line is still parsed for `#<n>`, and `task: NN`, `tasks/task-NN.md`, `phases/NN-<slug>` and finding-ID stability stay as they are.

## Finding IDs

- every finding carries an ID - `C<n>` Critical, `I<n>` Important, `M<n>` Minor - numbered per class from 1, assigned in the round that raises it, never renumbered, a later round continuing from the highest `<n>` per class
  in `prior`; an ID keeps its class for the life of the build. A title is assigned with it per `## Naming` and kept unchanged: every later mention - prior findings row, `### Needs decision` bullet, `## Debt` bullet,
  orchestrator question - reuses that title.
- `D<n>`, never assigned by a reviewer, identifies an implementor stop, one per `DECISION:` line: its first line takes the number after the highest `D<n>` in the file handed on `decisions:` (`D1` when there is no such file
  or line), further lines continuing in the order the stop wrote them. Unique for the life of the build and never renumbered, carried by the decisions-file line and by the question that asked for it.
- `G<n>`, never assigned by a reviewer either, identifies a gate hole the user accepted at a gate-sourced BLOCKED, one per accepted `### Needs decision` gate bullet: the orchestrator assigns it when recording the answer,
  after the highest `G<n>` in the decisions file (`G1` when none).
- neither `D<n>` nor `G<n>` is a finding: neither appears in `## Findings`, `## Debt` or a prior-findings table, and a `D<n>` never moves a verdict.

## Report skeleton

Every build reviewer writes its report to the `report:` path, on PASS, FAIL and BLOCKED alike; that path is its only output file, any scratch file living under `.temp/` and never in the repo tree. The report carries new
information and nothing else: a section with nothing to say is omitted entirely, and the closing `VERDICT:` line is the only part that always appears. The sections, in this order:

- title line `# <stage> review`, carrying no file name.
- `## Gates` - one line per subsection this stage ran: `<subsection> - <result> - <wall time>`, wall time from `run.sh`'s `DURATION:`, a red result adding the tool's own summary line and the failing run's `LOG:` path; the
  commands are never written out. `none - <reason>` / `absent - <reason>`: that word and reason in place of the result, no wall time. A subsection this stage does not run: no line. Several commands in one subsection: still
  one line, red when any is red, wall time their sum. `since: none`: one extra line saying the review is unbounded over the working tree.
- `## Prior findings` - only when `prior` was given: a table `| ID | Title | Verdict | Evidence |`, one row per ID in `prior`, title carried over, verdict `ADDRESSED`, `NOT ADDRESSED` or `ACCEPTED`, evidence a `file:line` -
  for `ACCEPTED`, the decisions-file line that closed it.
- `## Decisions taken` - at `stage: final` and at the re-review of a final report, by the reviewer owning requirement coverage on its track (`superbuild-reviewer-spec` on Super, `simplebuild-reviewer` on Simple), at no other
  stage, by no other reviewer, never in a checkpoint report: one line per `UNDERSPECIFIED:` line across every `*-notes.md` of the notes directory, in file order, `- <notes file basename> - <value> - <decision>`; repeats no
  finding, never moves the verdict.
- `## Findings` - `### Critical` and `### Important`, one bullet per finding: `- <ID> - <title> - file:line - what is wrong - why it matters - how to fix`; then `### Needs decision`, one bullet per BLOCKED item naming the
  finding as `` `<title>` (<ID>) ``, the criterion or plan task it belongs to in the same reference form, and why no code change can clear it.
- `## Debt` - this round's Minor, one bullet per finding with ID and title; the only home of a Minor, nothing appended elsewhere, no later round copying it forward. `## Notes` - advisory lines only, including
  `NOTE: plan defect - <what>`.
- `## Assessment` - one sentence saying why the verdict is what it is, then the bare line `VERDICT: PASS`, `VERDICT: FAIL` or `VERDICT: BLOCKED`; no criterion, DoD or plan task is restated here, a criterion that needs saying
  something being said in `## Findings`.

A re-review writes this same skeleton with its own `## Gates` lines for its own re-run, one per subsection, never a copy of the prior round's block. No `Strengths` and no `Recommendations` section exists. Two sections are
owned rather than shared: the spec reviewer's coverage table, between the gates and prior findings sections, and the final reviewer's `## Decisions taken`; no consumer adds any other. The per-task gate writes this skeleton
reduced to `# task review`, `## Findings`, `## Notes`, `## Assessment`, `### Needs decision` inside `## Findings` on BLOCKED; it writes a report only on FAIL and on BLOCKED, and on the notes-only PASS path appends a
`## Review notes` section to the task's notes file instead (`## Notes line formats`).

## Gates

Source - the `## Gate commands` block above the first task block of `<workdir>/plan.md` (handed on `plan:`), and nowhere else; `plan-header.md` does not carry it. Subsections `#### Build`, `#### Tests`, `#### Integration`,
each holding its commands one per line or the line `none - <reason>`; nothing is collected from a task section, `### Task Checks` being its implementor's and running at no review stage. Stage sets - `checkpoint`: Build and
Tests, Integration neither run nor lined in the report; `final`: all three; `re-review`: the set of the round it closes, read off the first line of the report on `prior` (`# checkpoint review` -> the first two,
`# final review` -> all three). Holes - `none - <reason>`: not run, that reason carried into the report's line for it, never BLOCKED; a subsection the plan's block does not hold AT ALL -> `absent - <reason>` and
`VERDICT: BLOCKED` with a `### Needs decision` bullet naming it, at every stage that covers it, and so is a subsection this stage runs that the handed block carries NO line for, the block having to cover the stage before any
entry is read.

Transport - the orchestrator runs the stage's whole set once per round through `scripts/run-gate.sh`, handing the block it wrote to every reviewer of the round on `gates:`. A reviewer runs no gate command itself: it reads
that block before reading any code and records each entry's result in the report's gates section. Raw `Bash` stays for `git` reads and the reviewer's own probes under `.temp/`; a build, test, lint or type-check run is never
launched from a review. Block shape - per command the `COMMAND:` and `TIMEOUT:` lines `run-gate.sh` writes under that command's subsection heading, then `run.sh`'s `RESULT`, `STATUS`, `EXIT`, `DURATION`, `LOG`, `LINES`, plus
`TAIL` and `REASON` where printed; a command the round's budget left no room for carries `COMMAND` plus a `RESULT` / `STATUS` / `REASON` triple and no `TIMEOUT`, settled by case 1 like any other `STATUS: error`. `expect:` is
not a label of the block: it is the sentence naming the outcome a run must show, travelling only on the `superdev:executor` dispatch. Each entry is its command's result; the first case that matches settles that command,
nothing below it consulted:

1. `STATUS: error` or `STATUS: timeout`, on any gate command whatever its kind -> `VERDICT: BLOCKED` with a `### Needs decision` bullet naming that command (its `COMMAND:` line) and `run.sh`'s `REASON:` line, or the timeout
   and the seconds of its `TIMEOUT:` line. Settled before any dispatch: nothing forked, no log read, never PASS, never a finding against the code. A documented integration or e2e command that cannot run in this environment
   at all is BLOCKED on these terms, as is a case-3 `VERDICT: FAIL` whose failures say only that.
2. `RESULT: SUCCESS` - green, that command done: no fork, no log read.
3. `RESULT: DEVIATION` - dispatch `superdev:executor` in analysis mode over the log that run already wrote (`log:` from `LOG:`, `exit:` from `EXIT:`, `duration:` from `DURATION:`, plus the `expect:` sentence); its reply is
   the gate's result - `VERDICT: PASS` green, `VERDICT: FAIL` red, its `FAILURES:` bullets evidence for findings. The command is never run a second time to produce a log that already exists; `VERDICT: ERROR` is a malformed
   dispatch, not a result about the tree - correct the labels and dispatch again.

Evidence - on `RESULT: SUCCESS` the handed entry itself, its `RESULT:`, `EXIT:` and `TAIL:` lines read as they stand, no executor reply on that path and none manufactured; `TAIL:` is the log's last non-empty line, never
relabelled `SUMMARY:`, and one with no recognisable aggregate line, or absent because the log held none, leaves the gate passing on its exit code with the `LOG:` path recorded unread. On a dispatched command: the fork's
reply, its `SUMMARY:` line the tool's own aggregate line, carried verbatim into the report's line for a red subsection, never paraphrased, never recomputed. Reaching the log always goes through the fork - dispatched on
`RESULT: DEVIATION` and on a `SUCCESS` whose `TAIL:` carries a non-zero skip count on a run some criterion's proof depends on, that criterion staying unmet until the fork has read the log - and no consumer of this contract
opens a `LOG:` path with `Read`.

- this section is the sole owner of the gate-command BLOCKED conditions: `## Verdict rules` and every consumer's own gates paragraph point here instead of carrying a summary. A gate-sourced BLOCKED bullet carries NO finding
  ID and no criterion pointer: it names the command (its `COMMAND:` line) or the subsection, raised against the PLAN, never the code; the orchestrator's fix loop answers it under its own branch - retry the set, accept the
  hole against a `G<n>`, abort - never through the finding branch.
- a decisions line naming a gate command or a subsection closes that entry for every later round exactly as a criterion line does: no BLOCKED for it again, the block staying as written. Every command of the stage's set runs
  in the round that needs it, a re-review included. A criterion or behaviour that needs a run to be confirmed and got none is never marked met; the report says which run is missing.
- at `stage: final` on the Super track the two dimensions are dispatched concurrently and neither runs the set: the orchestrator's single run precedes both dispatches and both are handed its block on `gates:`, each
  recording it in its own report.

## Verdict rules

- `checkpoint` - read the whole `git diff <since>..HEAD`; a new Critical or Important is allowed for any defect in that delta.
- `final` - that same full read, plus the integration mandate over the whole build: every `### Contracts` entry another task consumes, every `CARRY:` line in the notes directory, every failure branch that crosses tasks; for
  such a seam a Critical or Important is allowed even in code older than `since`.
- `re-review` - verdict every `prior` ID first, in the prior findings table, then read only `git diff <since>..HEAD`; a new Critical or Important only for a defect the fix introduced. FAIL only when a Critical or Important
  from `prior` is `NOT ADDRESSED` or the fix introduced a new one; anything else is PASS unless a BLOCKED condition below holds.
- at `checkpoint` and at `final` the delta bounds where a defect is hunted, never which requirements are verdicted: a reviewer owning requirement coverage judges every criterion against the repository state, those whose code
  landed before `since` included. The rules below hold at every stage.
- everything under the run's own working directory (`<workdir>`, its `implementation/` subdirectory included) is build bookkeeping written by the build's own workers: never part of a task's diff, never scope creep, never a
  changed file mapping to no task's `### Files`, never a finding of any severity, whether or not a plan task lists it.
- `VERDICT: BLOCKED` is returned when a criterion or requirement is unmet because of a decision recorded in the plan, in the notes or in the decisions file - not because code is missing. BLOCKED outranks FAIL: with both
  present the return line is `VERDICT: BLOCKED` and the report still lists its Critical and Important findings.
- a behaviour recorded under a task's `### Failure modes` is a decision; disagreement with it is a `NOTE: plan defect - <what>` line in the notes section, never a Critical and never an Important. That line is reserved for a
  plan defect leaving every criterion the reviewer verdicts met; one leaving a criterion unmet is the BLOCKED condition above, and where both readings hold BLOCKED wins and no note is written.
- a build reviewer handed a `notes:` directory reads every `NOTE: plan defect` line in it - the `## Review notes` sections of the `*-notes.md` files, the `## Notes` sections of the `task-NN-review-R.md` reports - and settles
  each under its own build-wide mandate: its own finding or `### Needs decision` bullet where that mandate raises it, one `NOTE: closed plan defect - <what> - <why>` line otherwise. None is left unread, none copied forward
  as it stands.
- a prior ID covered by a decisions line is verdicted `ACCEPTED`, is never raised again and never makes the verdict FAIL; a prior Critical or Important that is `NOT ADDRESSED` with no such line makes the verdict FAIL, at
  `checkpoint` and at `final` as at `re-review`. Minor findings never affect the verdict.
- return channel to the orchestrator, the report itself staying on disk: line 1 `VERDICT: PASS`, `VERDICT: FAIL` or `VERDICT: BLOCKED`; line 2, on FAIL and on BLOCKED, `REVIEW: <report path>`.

## Per-task gate

The Super track's per-task reviewer judges one task's change against that task's own text. The change is the union of the `range:` lines it was handed: its own commit first, then one further range per fix commit the task's
later rounds produced. The orchestrator may dispatch a task's per-task review in the same message as the next task's implementor - the review is in flight while that task is written, its verdict read and acted on after that
task's own commit. Its one BLOCKED condition: a criterion under the task's `### Covered criteria` that stays unmet while the diff matches the task's text - the plan described too little, described the wrong thing, or
recorded a behaviour under `### Failure modes` or `### Contracts` that makes the criterion unreachable - and that no decisions line already covers. Missing or wrong code against text that would have met the criterion is a
Critical, never BLOCKED. The report carries one `### Needs decision` bullet per such criterion, in the shape of `## Report skeleton`: the finding as `` `<title>` (<ID>) `` with an ID from the Critical class, the criterion as
`` `<title>` (criterion N) ``, and why no code change clears it. What the orchestrator does with it - no implementor runs first:

1. one `AskUserQuestion` per `### Needs decision` bullet, naming the finding and the criterion in the reference form, three answers: **accept as is** - the gap stays and the task goes on; **fix the plan** - the user dictates
   the rule the task follows instead, in their own words; **abort**.
2. either of the first two is recorded through `scripts/record-decision.sh`: `<id>` the bullet's ID, `<subject>` the criterion in the reference form, `<accepted-text>` the words the user gave - what was accepted, or the rule
   dictated. The plan file is never edited: a plan correction lives in the decisions file, which binds every later dispatch of the build that reads `decisions:`.
3. **accept as is** on every bullet -> the same reviewer call again, same `report:` path, `decisions:` added. **fix the plan** on any bullet -> the task's implementor call again - same `task:`, same `model:` or absence of
   one, same `notes:` - with `decisions:` added, continuing from the working tree as it stands and applying the dictated rule, its `VERDICT: PASS` followed by the reviewer with the next `R` and `decisions:` set. Neither
   dispatch counts toward the task's review rounds.
4. a BLOCKED coming back from either re-run is a new matter taking these same steps; a bullet the decisions file already covers is never asked again.

## Decisions file

`<workdir>/implementation/decisions.md`, one line per answer the user gave: `- <ID> - <criterion or task> - accepted: <what the user accepted> - <date>`. What it records: a finding or criterion change accepted at a BLOCKED
verdict of a build round or of the per-task gate, a plan rule the user dictated there, a finding accepted when closing a review round with findings still open, a gate hole accepted at a gate-sourced BLOCKED - `<ID>` that
acceptance's `G<n>`, `<criterion or task>` `gate <command>` or `gate subsection <name>` in place of a reference form - or the answer to an implementor stop, `<ID>` that stop's `D<n>`. `<criterion or task>` is otherwise
written in the reference form of `## Naming`, or `` `<title>` (fix 02) `` for a stop raised in a fix round. Written only through `scripts/record-decision.sh` - no orchestrator, fork or agent writes it by hand. A reviewer
handed `decisions:` treats every line in it as plan text: a criterion covered by a line there is neither raised as a Critical nor returned as BLOCKED again.

## Notes line formats

Lines and sections written into a task's `*-notes.md` file under `<workdir>/implementation/` - by the implementor that wrote the task, and for `## Review notes` by the reviewer that read it. Notes never restate the task or a
report: an `### Approach` step is cited by its number, a finding by its ID, a file by its path, never by copying the text back. They are written LLM to LLM - concrete, unexplained, no justification of a rule the reader
already holds, no summary of what the task asked for; a note the next reader could reconstruct from the task file is not worth writing.

- `## Runs` - a section rather than a line, written on every PASS above that round's other lines: one line per `### Task Checks` line the implementor ran in its last green pass, in run order,
  `- <command verbatim> -> <summary line | exit <n>>`; a `### Task Checks` section reading `none - <reason>` yields that single line.
- `## Review notes` - appended by a per-task reviewer holding the task that raised notes and nothing else: one `NOTE: <what>` line per note, `NOTE: plan defect - <what>` among them, and no report file of its own. The writing
  tool truncates, so that reviewer reads the file and writes it back with this section appended.
- `touched: <repo-relative path>` - one per file changed outside the task's `### Files`, in fix mode one per file changed at all; consumed by `commit-task.sh --notes` as the declared set, machine-read, the path alone - no
  backticks, no reason - with the reason on its own line above it.
- `CARRY: <path> - <known problem outside this task's Files, left in place>` - one per known problem the implementor saw outside its `### Files` and did not fix, read by the final review and by the fix implementor when a
  report points at it. `no deviations` - the line written when there is nothing else to report.
- one test decides between the two lines below: a defensible answer exists -> take it, write `UNDERSPECIFIED:` and carry on; none exists -> write `DECISION:` and stop.
- `UNDERSPECIFIED: <value> - <the decision made>` - one per value the task's own text, its `### Contracts`, its `### Failure modes` and the plan header all left open, and for which the implementor had a defensible answer - a
  pattern the repo already uses for that kind of value, a criterion under `Covered criteria`, a host convention - and used it. The build does not stop for it; the line is what the value's reader is given instead.
- `DECISION: <what> - <why it cannot be settled here> - <options seen, or none>` - one per matter the implementor cannot settle at all: a contradiction with a decisions line, with the spec or with another section of the
  plan, or a criterion it cannot meet without changing a recorded decision. `<options seen, or none>` is written even when it reads `none`. The line is identified by a `D<n>`. An answer the implementor could defend is never
  written as a `DECISION:`.
- fix-mode notes are the `## Runs` section, exactly one status line per finding ID from the reports handed in - `<ID>: fixed`, `<ID>: fixed - no test: <reason>` or `<ID>: skipped - <reason>` - one `touched:` line per file
  the round changed, and the two lines above under that same split rule. Nothing else goes there.

## Implementor fix-mode input

In fix mode the `task:` file, and every `more:` file, is a report in the `## Report skeleton` shape.

- the IDs under `### Critical` and `### Important`, in every report handed in, are the whole work list; each one is fixed. An ID under a report's `## Debt` section is touched only when the dispatch lists it explicitly on a
  `minor: <ID>[, <ID>]` line; every Minor the dispatch does not name stays untouched.
- the gates, prior findings and notes sections are context, not work items.
- every fixed Critical or Important gets a test that fails before the fix and passes after it, written and run before the fix - or, when no test can express it, the status line `<ID>: fixed - no test: <reason>`.
- a fix round stops exactly as a task does: a matter it cannot settle is a `DECISION:` line and a `VERDICT: BLOCKED` return per `## Implementor stop`, with the fix as the subject of the decisions-file line.

## Implementor stop

The implementor's third return shape, beside `VERDICT: PASS` and `VERDICT: FAIL`: the task or fix holds a matter it cannot settle, handed back to the user unclosed rather than guessed at. Line 1 `VERDICT: BLOCKED`; line 2
`REASON: ` followed by the `<what>` of the first `DECISION:` line this stop wrote. Every `DECISION:` line goes to `notes` before the return - the return names the first of them, the notes carry them all, and a return with no
such line in `notes` is not a stop at all. The stop is raised before a single file is edited whenever the matter is visible from the task's own text; a matter that only surfaces mid-work is raised where it surfaced, with the
working tree left exactly as it stands - nothing reverted, nothing committed - and the re-dispatch continuing from that state. What the orchestrator does with a stop:

1. one question to the user per `DECISION:` line in `notes` that the decisions file does not already answer - a notes file appended to across re-dispatches keeps the earlier stop's lines, and those are closed - naming the
   task or the fix in the reference form of `## Naming` and carrying that line's `<what>`, `<why>` and `<options>`.
2. each answer recorded through `scripts/record-decision.sh`: `<id>` the line's `D<n>`, `<subject>` `` `<task title>` (Task <N>) `` - `` `<fix title>` (fix <NN>) `` for a fix round - and `<accepted-text>` the user's answer.
3. the same implementor call dispatched again, with the labels it already carried plus `decisions: <workdir>/implementation/decisions.md`; that re-dispatch is neither a review round nor a fix round, and a stop coming back
   from it is a new matter taking these same three steps.

A `decisions` file handed to an implementor is plan text, exactly as it is for a reviewer: a matter a line there answers is settled for the rest of the build - never raised as a `DECISION:` again, never asked of the user a
second time, never reopened as a deviation.

## Dispatch strength

One scale: `opus` over `sonnet`; "highest" means the first of these that appears in the set being compared. The `Agent` tool takes no `effort` parameter: no `effort` is passed on any dispatch, the plan carries no effort
marker, and the dispatched agent's own frontmatter is the only place an effort is set. A plan task's `Model:` is the whole of what the planner decides about its implementor's strength; passing no `model` parameter is not a
level on the scale either - it hands the choice to the dispatched worker's own frontmatter. Three states of a Super-track task's `Review:` marker:

- no marker - the per-task reviewer is dispatched with no `model` parameter at all. `Review: <model>` - it is dispatched with `model` set to the marker's first token.
- `Review: none` - the per-task reviewer is not dispatched at all: the task goes from the implementor's `VERDICT: PASS` straight to commit, with no substitute check standing in for the review, and its notes are handed to the
  `notes:` label of the next round like any other task's.

Fix dispatch - after a per-task review it runs at that task's own `Model:`; after a checkpoint or a final round, at the highest `Model:` among the tasks whose `### Files` names a file some finding in that round's report
points at, and with no `model` parameter at all when no such task exists.
