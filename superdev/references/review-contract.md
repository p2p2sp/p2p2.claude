# Review Contract

Shared vocabulary for the build review loop: the input labels, the finding IDs, the report shape,
the gate procedure, the verdict rules, the run's decisions file, the note lines, the implementor
stop and the strength every dispatch runs at. It has one owner - this file - so every consumer applies the same rules
instead of restating them.

Consumed by the three build reviewers (`skills/superbuild-reviewer-spec`,
`skills/superbuild-reviewer-change`, `skills/simplebuild-reviewer`), the two task implementors
(`agents/superbuild-task-implementor.md`, `agents/simplebuild-task-implementor.md`) and the two
orchestrators (`skills/superbuild`, `skills/simplebuild`) - each of them reads this file. The task
reviewer (`agents/superbuild-task-reviewer.md`) is never handed a `refs:` label and never reads it:
it carries its own reduced copy of the report skeleton and the ID scheme inline, for the one report
shape its gate writes, and any change to those two sections here is mirrored there by hand.

Stack-agnostic: every rule below refers only to the plan template's own sections (the header's
`## Gate commands` block, `### Files`, `### Task Checks`, `### Contracts`, `### Failure modes`,
`### DoD`), to the run's working directory, and to `git` - never to a specific ecosystem's tools and
never to a heuristic for recognising a test file.

`<workdir>` throughout is the run's working directory (`docs/.workflows/<run>/`), the directory the
plan, the tasks and the `implementation/` reports live in.

## Labels

Input lines the orchestrator passes to a fork or an agent, on top of the existing `plan:`, `spec:`,
`plan-header:`, `task:`, `notes:` and `report:` lines. One label per line; a value is always a path
or a short token (a SHA, a stage name, an ID list), never a body of text - text breaks the preload.

- `stage: checkpoint|final|re-review` - required on every build reviewer call. Names the round and
  selects the rules in `## Verdict rules`.
- `since: <SHA>` - required on every build reviewer call. The change under review is
  `git diff <since>..HEAD`. For the build's first review round it is the `base:` value from the
  decompose index. The value `none` (a build without git) means the review is unbounded over the
  working tree, stated in the report's gates section.
- `prior: <path>` - the previous report of this same reviewer. Required for `stage: re-review` and
  for any round that follows an earlier report; omitted only in the build's first review round.
- `decisions: <path>` - optional; the run's decisions file (see `## Decisions file`). Every line in
  it is an answer the user gave - a finding, a criterion change, a matter closed at an implementor
  stop - and carries the force of the plan.
- `refs: <absolute path>` - the plugin's references directory, i.e. where this contract lives. An
  agent reads `<refs>/review-contract.md` before acting.
- `more: <path>` - implementor fix mode only; optional and repeatable. One additional findings
  report handled in the same dispatch.
- `minor: <ID>[, <ID>]` - implementor fix mode only; optional. The only Minor IDs from a report's
  `## Debt` section that dispatch may touch (see `## Implementor fix-mode input`).

Input errors, checked before any work: a build reviewer call with no `stage` or no `since`, or with
`stage: re-review` and no `prior`, returns line 1 `VERDICT: FAIL` and line 2
`REASON: missing input <label>`, and writes no report.

The old `base:` label is retired; `since` replaces it everywhere.

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
  them. A subsection whose block reads `none - <reason>` carries that reason in place of the result
  and no wall time, e.g. `Integration - none - <reason>`; a subsection this stage does not run has
  no line at all. One extra line says the review is unbounded over the working tree when `since` is
  `none`. A subsection holding several commands still carries one line: its result is red when any
  of them is red and its wall time is their sum.
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
it, and the review never returns BLOCKED for it. No command is collected from a task section:
`### Task Checks` belongs to the implementor writing that task, no stage collects it, and a command
appearing there and nowhere else runs at no stage of a review.

Run every command of the stage's set before reading any code, and record the result of each in the
report's gates section.

Transport - every gate command goes out as a direct `Bash` call to `run.sh`, the executor skill's
own runner at `skills/executor/scripts/run.sh` under the plugin root (a fork spells that path with
`${CLAUDE_PLUGIN_ROOT}`; an agent uses the absolute path its dispatch handed it). A gate that passes
costs that one call and no fork at all. One command per call, its labels fed in on stdin through a
single-quoted heredoc so the command line travels byte for byte, with no expansion and no quoting
fix-up on the way:

```bash
"<run.sh>" <<'EOF'
command: <the gate command, verbatim>
expect-exit: 0
timeout: <seconds>
EOF
```

- The `EOF` terminator sits at column 0, unindented, or `bash` never closes the heredoc.
- `command:` is the plan's string verbatim - never rewritten, never narrowed. `expect-exit:` is `0`
  on a gate command: a gate is a run that must pass. `timeout:` is always explicit and generous
  enough for the host's slowest documented suite - left to the default, a slow suite comes back as a
  false timeout.
- `expect:` is not a `run.sh` label. It is the sentence naming the outcome a run must show, and it
  travels only on the `superdev:executor` dispatch below, which is what judges it.
- raw `Bash` stays for `git` reads and for the reviewer's own probes under `.temp/`, never for a
  build, test, lint or type-check run outside `run.sh`: the point of the script is that such a run's
  full output goes to a log file instead of into the review's context.

The block `run.sh` prints is the gate's result. Read it in this order - the first case that matches
settles the command, and nothing below it is consulted:

1. `STATUS: error` or `STATUS: timeout`, on any gate command whatever its kind -> `VERDICT: BLOCKED`
   with a `### Needs decision` bullet naming that command and `run.sh`'s own `REASON:` line, or the
   timeout and the seconds it was given. Settled here, before any dispatch: nothing is forked and no
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

- on `RESULT: SUCCESS` the evidence is the printed block itself - its `RESULT:`, `EXIT:` and `TAIL:`
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
- Every command of the stage's set runs in the round that needs it, a re-review included: a result
  carried over from the prior round proves nothing about the fixed tree.
- A criterion or behaviour that needs a run to be confirmed and got none is never marked met; the
  report says which run is missing.
- `since: none` -> the review is unbounded over the working tree; the gates section says so.

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
- A prior ID covered by a line in the decisions file is verdicted `ACCEPTED` in the prior findings
  table, is never raised again and never makes the verdict FAIL - the user closed it. A prior
  Critical or Important that is `NOT ADDRESSED` and has no such line makes the verdict FAIL, at
  `checkpoint` and at `final` as at `re-review`.
- Minor findings never affect the verdict.

Return channel to the orchestrator - the only channel, the report itself stays on disk:

- line 1: `VERDICT: PASS`, `VERDICT: FAIL` or `VERDICT: BLOCKED`
- line 2, on FAIL and on BLOCKED: `REVIEW: <report path>`

## Decisions file

`<workdir>/implementation/decisions.md`. One line per answer the user gave: a finding or criterion
change accepted at a BLOCKED verdict, a finding accepted when closing a review round with findings
still open, or the answer to an implementor stop (`## Implementor stop`), whose `<ID>` is that
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
  and nothing else: one `NOTE: <what>` line per note, and no report file of its own. The writing
  tool truncates, so the reviewer reads the file and writes it back with this section appended.
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

Two ordered scales, strongest first: `opus` over `sonnet`, and `xhigh` over `high` over `medium`
over `low`. "Highest" below means the first of these that appears in the set being compared, and
`Model:` and `Effort:` are picked independently of each other. Passing no parameter is not a level
on either scale: it hands the choice to the dispatched worker's own frontmatter.

- A per-task review runs at that task's `Review:` marker - its first token the `model`, its second
  the `effort`. A task carrying no `Review:` marker is dispatched with no `model` and no `effort`
  parameter at all.
- A fix dispatch after a task review runs at that task's own `Model:` and `Effort:`.
- A fix dispatch after a checkpoint or a final round runs at the highest `Model:` and the highest
  `Effort:` among the tasks whose `### Files` names a file some finding in that round's report
  points at. No such task - no finding names a file any task declared - dispatches with no `model`
  and no `effort` parameter at all.
