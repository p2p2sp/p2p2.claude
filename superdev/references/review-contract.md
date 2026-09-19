# Review Contract

Shared vocabulary for the build review loop: the input labels, the finding IDs, the report shape,
the gate procedure, the verdict rules, the run's decisions file, the note lines, the implementor
stop and the strength every dispatch runs at. It has one owner - this file - so every consumer applies the same rules
instead of restating them.

Consumed by the three build reviewers (`agents/superbuild-reviewer-spec.md`,
`agents/superbuild-reviewer-change.md`, `agents/simplebuild-reviewer.md`), the per-task reviewer
(`agents/superbuild-task-reviewer.md`), the two task implementors
(`agents/superbuild-task-implementor.md`, `agents/simplebuild-task-implementor.md`) and the two
orchestrators (`skills/superbuild`, `skills/simplebuild`) - each of them reads this file, handed in
on a `refs:` label. No consumer carries a copy of any section.

The per-task gate (`agents/superbuild-task-reviewer.md`) is bound by a subset, named here once:
`## Labels` (`refs`, `range`, `prior`, `decisions` and `report`), `## Naming`, `## Finding IDs`,
`## Report skeleton` for the sections it writes, `## Verdict rules` for the one BLOCKED condition
of `## Per-task gate`, `## Decisions file` and `## Notes line formats`. It writes `## Findings`
(with `### Needs decision`), `## Notes` and `## Assessment` under the title line `# task review`,
and never `## Gates`, `## Prior findings`, `## Decisions taken`, `## Debt` or a coverage table: it
runs no gate command, raises no Minor and verdicts no earlier round.

Stack-agnostic: every rule below refers only to the plan template's own sections (the header's
`## Gate commands` block, `### Files`, `### Task Checks`, `### Contracts`, `### Failure modes`,
`### DoD`), to the run's working directory, and to `git` - never to a specific ecosystem's tools and
never to a heuristic for recognising a test file.

`<workdir>` throughout is the run's working directory (`docs/.workflows/<run>/`), the directory the
plan, the tasks and the `implementation/` reports live in.

## Labels

Input lines the orchestrator passes to an agent, on top of the existing `plan:`, `spec:`,
`plan-header:`, `task:`, `notes:` and `report:` lines. One label per line; a value is always a path
or a short token (a SHA, a stage name, an ID list), never a body of text - the worker opens what it
is pointed at, so pasted content only duplicates a file it could read and crowds out its own reading.

- `stage: checkpoint|final|re-review` - required on every build reviewer call. Names the round and
  selects the rules in `## Verdict rules`.
- `since: <SHA>` - required on every build reviewer call. The change under review is
  `git diff <since>..HEAD`. For the build's first review round it is the `base:` value from the
  decompose index. The value `none` (a build without git) means the review is unbounded over the
  working tree, stated in the report's gates section.
- `range: <SHA>..<SHA>` - required on every per-task reviewer call in a build with git, and
  repeatable: one line per commit range the reviewed task owns, the review judging the union of
  them (`## Per-task gate`). The one exception is a build whose decompose index printed
  `base: none`: no `range:` line is passed there, and the per-task reviewer judges the working tree
  against HEAD as before.
- `prior: <path>` - the previous report of this same reviewer. Required for `stage: re-review` and
  for any round that follows an earlier report; omitted only in the build's first review round. On
  the per-task gate it is the previous round's report of this same task (`task-NN-review-<R-1>.md`),
  present from the task's second review round on, and read for two things only: the numbering its
  own findings continue from, and the title of a finding still open, so that one is never raised
  again under a new ID. It carries no verdict table and no re-review mandate there. A review round
  closed with no reviewer dispatch at all wrote no report, and leaves this label pointing at the
  last report there was - dropping that one would restart the finding IDs and re-raise a still-open
  finding under a new one. Only a build that has produced no report yet hands such a round's gate
  block here instead, and that block carries no finding ID, so the round reading it omits the prior
  findings table.
- `decisions: <path>` - optional; the run's decisions file (see `## Decisions file`). Every line in
  it is an answer the user gave - a finding, a criterion change, a matter closed at an implementor
  stop - and carries the force of the plan.
- `refs: <absolute path>` - the plugin's references directory, i.e. where this contract lives. An
  agent reads `<refs>/review-contract.md` before acting. Required on every build reviewer call and
  on every per-task reviewer call.
- `gates: <path>` - the gate block the orchestrator's own gate run wrote for this round
  (`## Gates`), read in place of running the stage's set. Required on every build reviewer call.
- `more: <path>` - implementor fix mode only; optional and repeatable. One additional findings
  report handled in the same dispatch.
- `minor: <ID>[, <ID>]` - implementor fix mode only; optional. The only Minor IDs from a report's
  `## Debt` section that dispatch may touch (see `## Implementor fix-mode input`). NEITHER build
  orchestrator ever sends it, and that gap is deliberate, not drift: a round's budget is one fix
  dispatch and it is spent on what moves the verdict, which a Minor by definition does not. The
  label's one producer is a dispatch a HUMAN directs - the user naming debt to clear, in this
  build or a later one - and an implementor handed no `minor:` line leaves every Minor of every
  report untouched, which is the whole of what a build round wants.

Input errors, checked before any work: a build reviewer call with no `stage`, no `since` or no
`gates`, one whose `gates:` names a file that does not exist or cannot be read, or one with
`stage: re-review` and no `prior`, returns line 1 `VERDICT: FAIL` and line 2
`REASON: missing input <label>`, and writes no report.

The old `base:` label is retired; `since` replaces it everywhere. `runner:` is retired too: a call
that still carries one is served by `gates:` all the same, and the round's report logs one
`NOTE: plan defect - stale runner label` line for it.

## Naming

Every item a human is pointed at carries a title next to its number. The number stays the pointer
agents and scripts key on; the title is what a human reads. Where each kind takes its title from:

- decision - the question of its `### <n>. <question>` heading.
- phase - the title of its `### NN. <title>` heading.
- plan task - the title of its `## Task <N> - <title>` heading.
- acceptance criterion - the `<short name>` of `<n>. <short name> - <condition>`.
- finding - the `<title>` of its report bullet (see `## Report skeleton`).
- checklist class or rule - the name that follows its `B<n> -` or `R<n> -` prefix.

The reference form is identical in chat and in files: `` `<title>` (<pointer>) ``, the pointer being
`decision 3`, `phase 01`, `Task 3`, `criterion 3`, `C2`, `B3`, or - inside a `Covers:` line - `#3`.

- A bare pointer never appears in anything a human reads: not in narration, not in an
  `AskUserQuestion` label, not in an escalation, not in a report, not in a `Covers:`,
  `Depends on:`, `consumed by` or `## Impact on decisions` line.
- A heading keeps its own form and is never rewritten into the reference form - the heading is
  where the title comes from.

Title rules: a few words, no `#`, no backticks inside, and unchanged for the item's life. A title is
assigned once, with the number, and travels with it.

Legacy fallback: an item written before this contract carries no title. Cite it by the first clause
of its own text, verbatim - for a finding bullet that is its "what is wrong" clause, never its
`file:line`. Never invent a title the item does not have.

Machine contracts are untouched by this section: a `Covers:` line is still parsed for its `#<n>`
tokens, and `task: NN`, `tasks/task-NN.md`, `phases/NN-<slug>` and finding-ID stability stay exactly
as they are.

## Finding IDs

Every finding carries an ID: `C<n>` for Critical, `I<n>` for Important, `M<n>` for Minor, numbered
per class from 1. An ID is assigned in the round that raises the finding and is never renumbered; a
later round continues numbering from the highest `<n>` per class found in `prior`. An ID keeps its
class for the life of the build - a finding raised as `M<n>` never comes back as `I<n>` or `C<n>`.

A title is assigned with the ID, per `## Naming`, and is kept across rounds unchanged: every later
mention of that finding - a prior findings row, a `### Needs decision` bullet, a `## Debt` bullet,
an orchestrator's question to the user - reuses the same title.

`D<n>` is the one ID class no reviewer ever assigns: it identifies an implementor stop
(`## Implementor stop`), one per `DECISION:` line. The stop's first line takes the number after the
highest `D<n>` in the decisions file handed in on `decisions:` - `D1` when there is no such file or
no such line in it - and the stop's further lines continue from there, in the order the stop wrote
them. Nothing carries the ID as a field: implementor and orchestrator both read it off those same
two facts. A `D<n>` is unique for the life of the build and is never renumbered - the decisions-file
line recording the user's answer and the question that asked for it carry that same ID. It is not a
finding: it never appears in `## Findings`, in `## Debt` or in a prior-findings table, and it never
moves a review verdict.

`G<n>` is the second ID class no reviewer ever assigns: it identifies a gate hole the user
accepted at a gate-sourced BLOCKED (`## Gates` case 1, and the `absent - <reason>` subsection), one
per accepted `### Needs decision` gate bullet. The orchestrator assigns it when it records the
answer, taking the number after the highest `G<n>` in the decisions file - `G1` when there is no
such file or no such line in it. Like `D<n>` it is not a finding: it never appears in `## Findings`,
in `## Debt` or in a prior-findings table, and the bullet it closes carried no ID of its own, which
is exactly what tells the orchestrator's fix loop the two bullet shapes apart.

A `prior` report written before this contract (bullets with no IDs): treat every bullet under its
Critical and Important sections as one unnumbered prior finding, assign fresh IDs in the verdict
table in order of appearance, and say so in the report's notes section. A prior finding that has an
ID but no title is handled the same way: title it by the legacy fallback of `## Naming` - its
"what is wrong" clause - keep that title like any other, and say so in the report's notes section.

## Report skeleton

Every build reviewer writes its report to the `report:` path - always, on PASS, on FAIL and on
BLOCKED alike. That path is the reviewer's only output file; any scratch file it needs lives under
`.temp/` and never in the repo tree.

The report carries new information and nothing else. A section with nothing to say is omitted
entirely - an empty heading, a "none" placeholder and a restatement of the plan all cost a reader
the same as a finding and carry none. The closing `VERDICT:` line is the only part that always
appears. The sections, in this order:

- title line `# <stage> review`, e.g. `# checkpoint review`. No file name: the reader opened the
  file.
- `## Gates` - one line per subsection this stage ran (see `## Gates`), shaped
  `<subsection> - <result> - <wall time>`, e.g. `Build - pass - 42s`, the wall time taken from
  `run.sh`'s `DURATION:`. On a red result that same line adds the tool's own summary line and the
  `LOG:` path of the run that failed. The commands themselves are never written out - the plan holds
  them. A subsection whose block reads `none - <reason>` or `absent - <reason>` carries that word
  and reason in place of the result and no wall time, e.g. `Integration - none - <reason>`; a
  subsection this stage does not run has no line at all. One extra line says the review is unbounded
  over the working tree when `since` is `none`. A subsection holding several commands still carries
  one line: its result is red when any of them is red and its wall time is their sum.
- `## Prior findings` - only when `prior` was given: a table `| ID | Title | Verdict | Evidence |`
  with one row per ID in `prior`, its title carried over from `prior`, the verdict `ADDRESSED`,
  `NOT ADDRESSED` or `ACCEPTED`, and a `file:line` as evidence - for `ACCEPTED`, the decisions-file
  line that closed it instead.
- `## Decisions taken` - written at `stage: final`, and at the re-review of a final report, by the
  reviewer that owns requirement coverage on its track (`superbuild-reviewer-spec` on Super,
  `simplebuild-reviewer` on Simple) - at no other stage, by no other reviewer, and never in a
  checkpoint report. One line per `UNDERSPECIFIED:` line found across every `*-notes.md` file of the
  notes directory, in file order, shaped `- <notes file basename> - <value> - <decision>`. The
  section is informational: it is the one place the user sees what the implementors settled
  themselves, it repeats no finding and it never moves the verdict. No such line anywhere in the
  notes directory - the section is omitted, like any other section with nothing to say.
- `## Findings` - holding `### Critical` and `### Important`, one bullet per finding in the shape
  `- <ID> - <title> - file:line - what is wrong - why it matters - how to fix`, the title a few
  words per `## Naming`; then `### Needs decision`, one bullet per BLOCKED item, naming the finding
  as `` `<title>` (<ID>) ``, the criterion or plan task it belongs to in the same reference form,
  and why no code change can clear it.
- `## Debt` - this round's Minor, one bullet per finding with its ID and title. It is the only home
  of a Minor: nothing is appended anywhere else and no later round copies it forward.
- `## Notes` - advisory lines only, including `NOTE: plan defect - <what>`.
- `## Assessment` - one sentence saying why the verdict is what it is, then the bare line
  `VERDICT: PASS`, `VERDICT: FAIL` or `VERDICT: BLOCKED`. No acceptance criterion, DoD or plan task
  is restated here; a criterion that needs saying something is said in `## Findings`.

A re-review writes this same skeleton: its own `## Gates` lines for its own re-run, one per
subsection, never a copy of the prior round's block.

No `Strengths` section and no `Recommendations` section exists - praise and polish suggestions are
not part of a report. Two sections are owned rather than shared: the spec reviewer's coverage table,
which it adds between the gates section and the prior findings section, and the final reviewer's
`## Decisions taken` above. No consumer adds any other section.

The per-task gate writes this same skeleton reduced to the sections it has something to say in -
`# task review`, `## Findings`, `## Notes`, `## Assessment` - with `### Needs decision` inside
`## Findings` on BLOCKED exactly as above. It writes a report only on FAIL and on BLOCKED, and on
the notes-only PASS path it appends a `## Review notes` section to the task's notes file instead
(`## Notes line formats`).

## Gates

The gate commands come from the plan's `## Gate commands` block - the one above the first task
block in the run's plan copy, `<workdir>/plan.md`, the file every reviewer is handed on its
`plan:` input line - and from nowhere else; `plan-header.md` does not carry that block. It holds
three subsections, `#### Build`, `#### Tests` and `#### Integration`, each carrying its commands
one per line or the single line `none - <reason>`. Which subsections this stage runs:

- `stage: checkpoint` - `#### Build` and `#### Tests`. `#### Integration` is not run and has no line
  in the report.
- `stage: final` - all three.
- `stage: re-review` - the set of the round it closes, read off the first line of the report on
  `prior`: a `# checkpoint review` -> the two subsections above, a `# final review` -> all three.

A subsection reading `none - <reason>` is not run; that reason is carried into the report's line for
it, and the review never returns BLOCKED for it: the plan decided that subsection has nothing to run
and said why. A subsection the plan's block does not hold AT ALL is the opposite case and comes back
under its own word, `absent - <reason>`: nothing was decided about it, the stage's gate is short a
whole subsection, and no run says anything about the tree there. It is `VERDICT: BLOCKED` with a
`### Needs decision` bullet naming the subsection, at every stage that covers it - the plan is what
has to change, and only the user can say whether it gains a command or a `none - <reason>` line. No
command is collected from a task section:
`### Task Checks` belongs to the implementor writing that task, no stage collects it, and a command
appearing there and nowhere else runs at no stage of a review.

Transport - the orchestrator runs the stage's whole set once per round, through
`scripts/run-gate.sh`, and hands the block that run wrote to every reviewer of the round on its
`gates:` label. A reviewer runs no gate command itself: it reads the handed block before reading any
code and records the result of each entry in the report's gates section. However many reviewers the
round dispatches, each command of the set ran once, and they all read that one result.

The block carries one entry per command of the set, each opening on the `COMMAND: <command>` and
`TIMEOUT: <n>s` lines `run-gate.sh` writes under that command's subsection heading - the command it
ran and the bound it gave that run - and then carrying the lines `run.sh` printed for it: `RESULT`,
`STATUS`, `EXIT`, `DURATION`, `LOG` and `LINES`, plus `TAIL` and `REASON` where the run printed
them. That `COMMAND` line is where case 1 below takes the failing command from, and that `TIMEOUT`
line the seconds it names on a timeout: a subsection may carry several commands and its heading
names none of them, and the bound is not a constant, being what was left of the round's own budget.
A command that budget left no room for carries `COMMAND` plus a `RESULT` / `STATUS` / `REASON`
triple and no `TIMEOUT` - it was never given one - and case 1 settles it like any other
`STATUS: error`. A green entry costs the reviewer the read and nothing else: no call, no fork, no
log.

- `expect:` is not a label of the block. It is the sentence naming the outcome a run must show, and
  it travels only on the `superdev:executor` dispatch below, which is what judges it.
- raw `Bash` stays for `git` reads and for the reviewer's own probes under `.temp/`; a build, test,
  lint or type-check run is never launched from a review at all - the round's one run already
  happened and its block is on `gates:`.

Before any entry is read, the block must cover the stage. A subsection this stage runs that the
block carries NO line for at all - a truncated block, the run killed or the file cut short - is
`VERDICT: BLOCKED` with a `### Needs decision` bullet naming that subsection, on the same terms as
the `absent - <reason>` case above and for the same reason: nothing ran there and nothing says
anything about the tree. The two differ only in where the hole is (the plan's block, or the run's),
and a reviewer tells them apart by which file is short. A `none - <reason>` line is neither: the
plan decided that subsection has nothing to run.

Each entry of that block is its command's result. Read it in this order - the first case that
matches settles the command, and nothing below it is consulted:

1. `STATUS: error` or `STATUS: timeout`, on any gate command whatever its kind -> `VERDICT: BLOCKED`
   with a `### Needs decision` bullet naming that command (its `COMMAND:` line) and `run.sh`'s own
   `REASON:` line, or the timeout and the seconds it was given (its `TIMEOUT:` line). Settled here,
   before any dispatch: nothing is forked and no
   log is read. Never PASS, and never a finding against the code - a command that produced no result
   says nothing about the tree. A documented integration or e2e command that cannot run in this
   environment at all - its runner is not installed, the service it needs is absent - is BLOCKED on
   these same terms: `run.sh` usually reports it as `STATUS: error` and settles it here, and where
   it comes back as a deviation instead, a case-3 `VERDICT: FAIL` whose failures say only that is
   recorded as BLOCKED too, never as a finding against the code.
2. `RESULT: SUCCESS` - the gate is green and that command is done. No fork, no log read: the command
   ran to completion and its exit code satisfied `expect-exit:`, which is the whole question a
   passing gate asks.
3. `RESULT: DEVIATION` - the command ran and came back with an exit code that is not the expected
   one. Dispatch `superdev:executor` in analysis mode over the log that run already wrote - `log:`
   from the `LOG:` line, `exit:` from `EXIT:`, `duration:` from `DURATION:`, plus the `expect:`
   sentence - and take its reply as the gate's result: `VERDICT: PASS`, the gate is green;
   `VERDICT: FAIL`, the gate is red and its `FAILURES:` bullets are evidence for findings exactly as
   a failing run's output is. The command is never run a second time to produce a log that already
   exists, and a `VERDICT: ERROR` there is a malformed dispatch rather than a result about the tree:
   correct the labels and dispatch again.

Evidence:

- on `RESULT: SUCCESS` the evidence is the handed entry itself - its `RESULT:`, `EXIT:` and `TAIL:`
  lines, read as they stand. There is no executor reply on that path, and none is manufactured.
- `TAIL:` is the log's last non-empty line, usually the tool's own closing word, and is never
  relabelled `SUMMARY:`: `SUMMARY:` names the aggregate line the fork found by reading the log, and
  the last line of a file is not that. A `TAIL:` carrying no recognisable aggregate line, or absent
  because the log held none, leaves the gate passing on its exit code all the same, and the `LOG:`
  path is recorded unread.
- on a dispatched command the evidence is the fork's reply: its `SUMMARY:` line is the tool's own
  aggregate line, carried verbatim into the report's line for a red subsection, never paraphrased
  and never recomputed.
- reaching the log always goes through the fork. It is dispatched on `RESULT: DEVIATION` and on a
  `SUCCESS` whose `TAIL:` carries a non-zero skip count on a run some criterion's proof depends on -
  the skipped case may be the one that would have proved it, so that criterion stays unmet until
  `superdev:executor` has read the log in analysis mode. No consumer of this contract opens a `LOG:`
  path with `Read` itself.
- that rule reads only the figure `TAIL:` carries. A `TAIL:` reporting no skips at all, or carrying
  no skip figure, leaves nothing to infer, and the rules below stand unchanged there.

Rules:

- This section is the sole owner of the gate-command BLOCKED conditions: the mapping above is the
  whole list, and `## Verdict rules` and every consumer's own gates paragraph point here instead of
  carrying a summary of their own.
- A gate-sourced BLOCKED bullet carries NO finding ID and no criterion pointer: it names the
  command (its `COMMAND:` line) or the subsection, and it is raised against the PLAN, never against
  the code. Nothing in it is an implementor's to fix, so the orchestrator's fix loop answers it
  under its own branch - retry the set, accept the hole against a `G<n>`, or abort - and never
  through the finding branch, whose `record-decision.sh` call has no ID to take here. A decisions
  line naming a gate command or a subsection closes that entry for every later round exactly as a
  criterion line does: the reviewer reads it as plan text and does not return BLOCKED for it again,
  while the block itself stays as it was written - it is the round's evidence, not its verdict.
- Every command of the stage's set runs in the round that needs it, a re-review included: the
  orchestrator's run happens once per round and a result carried over from the prior round proves
  nothing about the fixed tree.
- A criterion or behaviour that needs a run to be confirmed and got none is never marked met; the
  report says which run is missing.
- `since: none` -> the review is unbounded over the working tree; the gates section says so.
- At `stage: final` on the Super track the two dimensions are dispatched concurrently, and neither
  runs the set: the orchestrator's single run precedes both dispatches and both are handed its
  block on `gates:`, each recording it in its own report. Nothing is shared between the two
  dimensions, so a host whose gate commands cannot run twice at once needs no special shape in the
  plan's `## Gate commands` block for them.

## Verdict rules

Per stage:

- `checkpoint` - read the whole `git diff <since>..HEAD`. A new Critical or Important is allowed for
  any defect in that delta.
- `final` - the same full read of `git diff <since>..HEAD`, plus the integration mandate over the
  whole build: every `### Contracts` entry another task consumes, every `CARRY:` line in the notes
  directory, and every failure branch that crosses tasks. For such a seam a Critical or Important is
  allowed even in code older than `since`.
- `re-review` - verdict every `prior` ID first, in the prior findings table, then read only
  `git diff <since>..HEAD`. A new Critical or Important only for a defect the fix itself introduced.
  An ID that was `M<n>` in `prior` never returns as `I<n>` or `C<n>`. The verdict is FAIL only when
  a Critical or Important from `prior` is `NOT ADDRESSED` or when the fix introduced a new Critical
  or Important; anything else is PASS, unless a BLOCKED condition below holds.

At `checkpoint` and at `final` the delta bounds where a defect is hunted, never which requirements
are verdicted. A reviewer that owns requirement coverage - the spec dimension, one verdict per
acceptance criterion - judges every criterion against the repository state, those whose code landed
before `since` included: after a closed round `since` is that round's SHA, not the build's first
commit, so a criterion left to the delta would go unchecked for the rest of the build.

At every stage:

- `VERDICT: BLOCKED` is returned when a criterion or requirement is unmet because of a decision
  recorded in the plan, in the notes or in the decisions file - not because code is missing. Every
  other BLOCKED condition comes from a gate command, and `## Gates` owns that list in full; this
  section states none of its own. BLOCKED outranks FAIL: with both conditions present the return
  line is `VERDICT: BLOCKED` and the report still lists its Critical and Important findings.
- A behaviour recorded under a task's `### Failure modes` is a decision. Disagreement with it is a
  `NOTE: plan defect - <what>` line in the notes section, never a Critical and never an Important.
  The line is reserved for a plan defect that leaves every criterion the reviewer verdicts met; a
  defect that leaves one unmet is the BLOCKED condition above, and where both readings hold,
  BLOCKED wins and no note is written for it.
- A build reviewer handed a `notes:` directory reads every `NOTE: plan defect` line in it - the
  `## Review notes` sections of the `*-notes.md` files and the `## Notes` sections of the
  `task-NN-review-R.md` reports the per-task gate wrote - and settles each one under its own
  build-wide mandate: it becomes that reviewer's own finding or `### Needs decision` bullet where
  its mandate raises it, or one `NOTE: closed plan defect - <what> - <why>` line in its report
  otherwise. No such line is left unread, and none is copied forward as it stands.
- A prior ID covered by a line in the decisions file is verdicted `ACCEPTED` in the prior findings
  table, is never raised again and never makes the verdict FAIL - the user closed it. A prior
  Critical or Important that is `NOT ADDRESSED` and has no such line makes the verdict FAIL, at
  `checkpoint` and at `final` as at `re-review`.
- Minor findings never affect the verdict.

Return channel to the orchestrator - the only channel, the report itself stays on disk:

- line 1: `VERDICT: PASS`, `VERDICT: FAIL` or `VERDICT: BLOCKED`
- line 2, on FAIL and on BLOCKED: `REVIEW: <report path>`

## Per-task gate

The Super track's per-task reviewer judges one task's change against that task's own text. The
change is the union of the `range:` lines it was handed (`## Labels`), each one a commit range the
task owns: its own commit first, then one further range per fix commit the task's later rounds
produced. No range ever spans a commit of another task, so a task reviewed after the next task is
already committed still sees only its own. Handed no `range:` line - a build without git - it reads
the working tree against HEAD instead.

Because it reads committed ranges and not the working tree, the orchestrator may dispatch a task's
per-task review in the same message as the next task's implementor: the review is in flight while
that task is written, and its verdict is read and acted on after that task's own commit.

Its one BLOCKED condition is the same rule as above, narrowed to what it can see: a criterion
under the task's `### Covered criteria` that stays unmet while the diff matches the task's text - the plan
described too little, described the wrong thing, or recorded a behaviour under `### Failure modes`
or `### Contracts` that makes the criterion unreachable - and that no line in the decisions file
already covers. Missing or wrong code against text that would have met the criterion is a Critical,
never BLOCKED.

The report carries one `### Needs decision` bullet per such criterion, in the shape of
`## Report skeleton`: the finding as `` `<title>` (<ID>) `` with an ID from the Critical class, the
criterion as `` `<title>` (criterion N) ``, and why no code change clears it. The return is
`VERDICT: BLOCKED` plus `REVIEW: <report path>`; BLOCKED outranks FAIL here as everywhere.

What the orchestrator does with it - no implementor runs first:

1. one `AskUserQuestion` per `### Needs decision` bullet, naming the finding and the criterion in
   the reference form, with three answers: **accept as is** - the gap stays and the task goes on;
   **fix the plan** - the user dictates the rule the task follows instead, in their own words;
   **abort**.
2. either of the first two is recorded through `scripts/record-decision.sh`, `<id>` the bullet's
   ID, `<subject>` the criterion in the reference form, `<accepted-text>` the words the user gave -
   for **accept as is** what was accepted, for **fix the plan** the rule dictated. The plan file is
   never edited: the decisions file is where a plan correction lives, and it binds every later
   dispatch of the build that reads `decisions:`.
3. **accept as is** on every bullet -> the same reviewer call again with the same `report:` path
   and `decisions:` added. That re-run is not a review round.
   **fix the plan** on any bullet -> the task's implementor call again - the same `task:`, the same
   `model:` or absence of one, the same `notes:` - with `decisions:` added, exactly as an
   implementor-stop re-dispatch: it continues from the working tree as it stands and applies the
   dictated rule. Its `VERDICT: PASS` is followed by the reviewer with the next `R` and `decisions:`
   set. Neither dispatch counts toward the task's review rounds.
4. a BLOCKED coming back from either re-run is a new matter and takes these same steps; a bullet the
   decisions file already covers is never asked again.

## Decisions file

`<workdir>/implementation/decisions.md`. One line per answer the user gave: a finding or criterion
change accepted at a BLOCKED verdict of a build round or of the per-task gate (`## Per-task gate`),
a plan rule the user dictated there, a finding accepted when closing a review round with findings
still open, a gate hole accepted at a gate-sourced BLOCKED, whose `<ID>` is that acceptance's
`G<n>` and whose `<criterion or task>` is `gate <command>` or `gate subsection <name>` in place of
a reference form, or the answer to an implementor stop (`## Implementor stop`), whose `<ID>` is that
stop's `D<n>`:

`- <ID> - <criterion or task> - accepted: <what the user accepted> - <date>`

The line shape is unchanged. `<criterion or task>` is written in the reference form of `## Naming`,
`` `<title>` (criterion 3) ``, `` `<title>` (Task 3) `` or - for a stop raised in a fix round -
`` `<title>` (fix 02) ``, so the line names what was accepted without the reader opening the plan.

Written only through `scripts/record-decision.sh` - no orchestrator, fork or agent writes it by
hand. A reviewer handed `decisions:` treats every line in it as plan text: a criterion covered by a
line there is neither raised as a Critical nor returned as BLOCKED again.

## Notes line formats

Lines and sections written into a task's `*-notes.md` file under `<workdir>/implementation/` - by
the implementor that wrote the task, and for `## Review notes` by the reviewer that read it.

Notes never restate the task or a report. An `### Approach` step is cited by its number, a finding
by its ID, a file by its path - never by copying the text back. They are written LLM to LLM:
concrete, unexplained, no justification of a rule the reader already holds and no summary of what
the task asked for. A note the next reader could reconstruct from the task file is not worth
writing.

- `## Runs` - a section rather than a line, written on every PASS above that round's other lines:
  one line per `### Task Checks` line the implementor ran in its last green pass, in run order, each
  shaped `- <command verbatim> -> <summary line | exit <n>>` - the tool's own summary line, or
  `exit <n>` when it printed none. A `### Task Checks` section reading `none - <reason>` yields the
  single line `none - <reason>` instead.
- `## Review notes` - a section a per-task reviewer appends when it holds the task and raised notes
  and nothing else: one `NOTE: <what>` line per note, `NOTE: plan defect - <what>` among them, and
  no report file of its own. The writing tool truncates, so the reviewer reads the file and writes
  it back with this section appended. The build reviewers read these lines (`## Verdict rules`).
- `touched: <repo-relative path>` - one per file changed outside the task's `### Files`, and in fix
  mode one per file changed at all. Consumed by `commit-task.sh --notes` as the declared set. The
  line is machine-read and carries the path alone - no backticks, no reason - with the reason on
  its own line above it.
- `CARRY: <path> - <known problem outside this task's Files, left in place>` - one per known problem
  the implementor saw outside its `### Files` and did not fix. Read by the final review, which
  closes it under the integration mandate, and by the fix implementor when a report points at it.
- `no deviations` - the single line written when there is nothing else to report.

Two further lines record what the task did not pin down, and one test decides which of them is
written: a defensible answer exists -> take it, write `UNDERSPECIFIED:` and carry on; none exists ->
write `DECISION:` and stop.

- `UNDERSPECIFIED: <value> - <the decision made>` - one per value the task's own text, its
  `### Contracts`, its `### Failure modes` and the plan header all left open, and for which the
  implementor had a defensible answer - a pattern the repo already uses for that kind of value, a
  criterion under `Covered criteria`, a host convention - and used it. The build does not stop for
  it; the line is what the value's reader is given instead.
- `DECISION: <what> - <why it cannot be settled here> - <options seen, or none>` - one per matter the
  implementor cannot settle at all: a contradiction with a line in the decisions file, with the
  spec, with another section of the plan, or a criterion it cannot meet without changing a recorded
  decision. `<options seen, or none>` is written even when it reads `none`. The line is identified by
  a `D<n>` (see `## Finding IDs`) and is never written on its own: it goes to `notes` together with
  the `VERDICT: BLOCKED` return of `## Implementor stop`. An answer the implementor could defend is
  never written as a `DECISION:` - the stop is for the matters nobody but the user can close.

Fix-mode notes are the `## Runs` section, exactly one status line per finding ID from the reports
handed in - `<ID>: fixed`, `<ID>: fixed - no test: <reason>` or `<ID>: skipped - <reason>` - one
`touched:` line per file the round changed, and the two decision lines above, under that same split
rule, whenever a report left a value open or two findings ask for contradicting things. Nothing else
goes there.

## Implementor fix-mode input

In fix mode the `task:` file, and every `more:` file, is a report in the `## Report skeleton` shape.

- The IDs under `### Critical` and `### Important`, in every report handed in, are the whole work
  list; each one is fixed.
- An ID under a report's `## Debt` section (a Minor) is touched only when the dispatch lists it
  explicitly on a `minor: <ID>[, <ID>]` line. That section is the only place a Minor lives, and
  every Minor the dispatch does not name stays untouched.
- The gates, prior findings and notes sections are context, not work items.
- Every fixed Critical or Important gets a test that fails before the fix and passes after it -
  written and run before the fix - or, when no test can express it, the status line
  `<ID>: fixed - no test: <reason>`.
- The round's notes carry a `## Runs` section, exactly one status line per ID from the reports, one
  `touched:` line per file the round changed, and an `UNDERSPECIFIED:` or `DECISION:` line wherever
  the split rule calls for one - a value a finding left open, two findings asking for contradicting
  things - all in the shapes from `## Notes line formats`.
- A fix round stops exactly as a task does: a matter it cannot settle is a `DECISION:` line and a
  `VERDICT: BLOCKED` return per `## Implementor stop`, with the fix as the subject of the
  decisions-file line.

## Implementor stop

The implementor's third return shape, beside `VERDICT: PASS` and `VERDICT: FAIL`: the task or fix
holds a matter it cannot settle, so it is handed back to the user unclosed rather than guessed at.

- line 1: `VERDICT: BLOCKED`
- line 2: `REASON: ` followed by the `<what>` of the first `DECISION:` line this stop wrote

Every `DECISION:` line goes to `notes` before the return - the return line names the first of them,
the notes carry them all, and a return with no such line in `notes` is not a stop at all. The stop is
raised before a single file is edited whenever the matter is visible from the task's own text; a
matter that only surfaces mid-work is raised where it surfaced, with the working tree left exactly as
it stands - nothing is reverted, nothing is committed, and the re-dispatch continues from that state.

What the orchestrator does with a stop:

1. one question to the user per `DECISION:` line in `notes` that the decisions file does not already
   answer - a notes file appended to across re-dispatches keeps the earlier stop's lines, and those
   are closed - naming the task or the fix in the reference form of `## Naming` and carrying that
   line's `<what>`, its `<why>` and its `<options>`.
2. each answer recorded through `scripts/record-decision.sh`, with `<id>` the line's `D<n>`,
   `<subject>` `` `<task title>` (Task <N>) `` - `` `<fix title>` (fix <NN>) `` for a fix round -
   and `<accepted-text>` the user's answer. No orchestrator, fork or agent writes that file by hand.
3. the same implementor call dispatched again, with the labels it already carried plus
   `decisions: <workdir>/implementation/decisions.md`. The re-dispatch is neither a review round nor
   a fix round, and a stop coming back from it is a new matter taking these same three steps.

A `decisions` file handed to an implementor is plan text, exactly as it is for a reviewer: a matter
a line there already answers is settled for the rest of the build - never raised as a `DECISION:`
again, never asked of the user a second time, and never reopened as a deviation.

## Dispatch strength

One scale: `opus` over `sonnet`. "Highest" below means the first of these that appears in the set
being compared. The `Agent` tool takes no `effort` parameter: no `effort` parameter is passed on
any dispatch, and the plan carries no effort marker - the dispatched agent's own frontmatter is
the only place an effort is set. A plan task's `Model:` is the whole of what the planner decides
about its implementor's strength. Passing no `model` parameter is not a level on the scale either:
it hands the choice to the dispatched worker's own frontmatter.

Three states of a Super-track task's `Review:` marker:

- no marker - the per-task reviewer is dispatched with no `model` parameter at all.
- `Review: <model>` - the per-task reviewer is dispatched with `model` set to the marker's first
  token. A plan written before the effort marker was retired may carry a second token there; it is
  never passed and never read.
- `Review: none` - the per-task reviewer is not dispatched at all. The task goes from the
  implementor's `VERDICT: PASS` straight to commit, with no substitute check standing in for the
  review, and its notes are handed to the `notes:` label of the next round exactly like any other
  task's.

Fix dispatch rules:

- A fix dispatch after a per-task review runs at that task's own `Model:`.
- A fix dispatch after a checkpoint or a final round runs at the highest `Model:` among the tasks
  whose `### Files` names a file some finding in that round's report points at. No such task - no
  finding names a file any task declared - dispatches with no `model` parameter at all.
