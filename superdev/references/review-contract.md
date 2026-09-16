# Review Contract

Shared vocabulary for the build review loop: the input labels, the finding IDs, the report shape,
the gate procedure, the verdict rules, the two run bookkeeping files and the note lines. It has one
owner - this file - so every consumer applies the same rules instead of restating them.

Consumed by the three build reviewers (`skills/superbuild-reviewer-spec`,
`skills/superbuild-reviewer-change`, `skills/simplebuild-reviewer`), the two task implementors
(`agents/superbuild-task-implementor.md`, `agents/simplebuild-task-implementor.md`) and the two
orchestrators (`skills/superbuild`, `skills/simplebuild`) - each of them reads this file. The task
reviewer (`agents/superbuild-task-reviewer.md`) is never handed a `refs:` label and never reads it:
it carries its own reduced copy of the report skeleton and the ID scheme inline, for the one report
shape its gate writes, and any change to those two sections here is mirrored there by hand.

Stack-agnostic: every rule below refers only to the plan template's own sections (`### Files`,
`### Test Commands`, `### Contracts`, `### Failure modes`, `### DoD`), to the run's working
directory, and to `git` - never to a specific ecosystem's tools and never to a heuristic for
recognising a test file.

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
  it is a finding or a criterion change the user accepted and carries the force of the plan.
- `refs: <absolute path>` - the plugin's references directory, i.e. where this contract lives. An
  agent reads `<refs>/review-contract.md` before acting.
- `more: <path>` - implementor fix mode only; optional and repeatable. One additional findings
  report handled in the same dispatch.
- `minor: <ID>[, <ID>]` - implementor fix mode only; optional. The only Minor IDs that dispatch may
  touch (see `## Implementor fix-mode input`).

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
mention of that finding - a prior findings row, a `### Needs decision` bullet, a debt line, an
orchestrator's question to the user - reuses the same title.

A `prior` report written before this contract (bullets with no IDs): treat every bullet under its
Critical and Important sections as one unnumbered prior finding, assign fresh IDs in the verdict
table in order of appearance, and say so in the report's notes section. A prior finding that has an
ID but no title is handled the same way: title it by the legacy fallback of `## Naming` - its
"what is wrong" clause - keep that title like any other, and say so in the report's notes section.

## Report skeleton

Every build reviewer writes its report to the `report:` path - always, on PASS, on FAIL and on
BLOCKED alike. That path is the reviewer's only output file; any scratch file it needs lives under
`.temp/` and never in the repo tree. The report carries exactly these sections, in this order:

- title line `# <stage> review - <report basename>`, e.g. `# checkpoint review - checkpoint-01.md`.
- `## Gates` - one line per distinct gate command (see `## Gates`), carrying that command's
  `VERDICT:` and `SUMMARY:` verbatim and the plan tasks that declared it; the single sentence
  `no e2e or integration suite in this host` when the host documents none; one line saying the
  review is unbounded over the working tree when `since` is `none`.
- `## Prior findings` - only when `prior` was given: a table `| ID | Title | Verdict | Evidence |`
  with one row per ID in `prior`, its title carried over from `prior`, the verdict `ADDRESSED`,
  `NOT ADDRESSED` or `ACCEPTED`, and a `file:line` as evidence - for `ACCEPTED`, the decisions-file
  line that closed it instead.
- `## Findings` - holding `### Critical` and `### Important`, one bullet per finding in the shape
  `- <ID> - <title> - file:line - what is wrong - why it matters - how to fix`, the title a few
  words per `## Naming`; then `### Needs decision`, one bullet per BLOCKED item, naming the finding
  as `` `<title>` (<ID>) ``, the criterion or plan task it belongs to in the same reference form,
  and why no code change can clear it.
- `## Debt` - this round's Minor, one bullet per finding with its ID and title; the same lines are
  appended to the debt file (see `## Debt file`).
- `## Notes` - advisory lines only, including `NOTE: plan defect - <what>`.
- `## Assessment` - one or two sentences, ending with the bare line `VERDICT: PASS`,
  `VERDICT: FAIL` or `VERDICT: BLOCKED`.

No `Strengths` section and no `Recommendations` section exists - praise and polish suggestions are
not part of a report. The spec reviewer adds its own coverage table between the gates section and
the prior findings section; no consumer adds any other section.

## Gates

Collect the gate commands first, run them all before reading any code, and record the result of
each in the report's gates section. The commands:

- the plan's build command or commands (the `#### Build` block of every plan task's
  `### Test Commands`, and the plan's own build block when it has one);
- every `Test Commands` block of the plan;
- the host's integration or e2e command, when the plan or the host's memory files document one.

Two of them are the same command only when their strings match exactly, and each distinct string
runs once per stage however many tasks declared it - a second run of the same string proves nothing
the first did not. A filtered or narrowed variant of a suite is a distinct string: it runs on its
own and never stands in for the full suite.

Transport - every gate command goes through the `superdev:executor` skill with the `Skill` tool:

- one `command:` per invocation, the string verbatim, with `expect:` naming the outcome that run
  must show and an explicit `timeout:` generous enough for the host's slowest documented suite -
  left to a default, a slow suite comes back as a false TIMEOUT.
- raw `Bash` stays for `git` reads and for the reviewer's own probes under `.temp/`, never for a
  build, test, lint or type-check run: the whole point of the fork is that such a run's full output
  stays out of the review's context.

The executor's reply is the gate's result, mapped:

- `VERDICT: PASS` - the gate is green.
- `VERDICT: FAIL` - the gate is red; its `FAILURES:` bullets are evidence for findings exactly as a
  failing run's output is, and the `LOG:` path carries what they leave out.
- `VERDICT: ERROR` or `VERDICT: TIMEOUT`, on any gate command whatever its kind - `VERDICT: BLOCKED`
  with a `### Needs decision` bullet naming that command and the executor's own reason. Never PASS,
  and never a finding against the code: a command that produced no result says nothing about the
  tree.

Evidence:

- the executor's `SUMMARY:` line is the tool's own aggregate line; it is carried into the report
  verbatim, never paraphrased and never recomputed.
- a non-zero skip count on that line, on a run some criterion's proof depends on, sends the reviewer
  to the `LOG:` path before that criterion may be marked met - the skipped case may be the one that
  would have proved it.
- the rule reads only the figure that aggregate line carries. A line reporting no skips at all
  leaves nothing to infer, and the rules below stand unchanged there.

Rules:

- On `stage: re-review` the integration or e2e command is run again whatever the fix round changed:
  a result carried over from the prior round proves nothing about the fixed tree.
- A host with no integration or e2e command documented gets the single sentence
  `no e2e or integration suite in this host`, and is never BLOCKED for that reason.
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
  recorded in the plan, in the notes or in the decisions file (not because code is missing), or when
  a documented integration or e2e command exists but cannot run in this environment. BLOCKED
  outranks FAIL: with both conditions present the return line is `VERDICT: BLOCKED` and the report
  still lists its Critical and Important findings.
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

## Debt file

`<workdir>/implementation/debt.md`. The reviewer appends to it, never overwrites and never prunes
it, one line per Minor raised in the round:

`- <ID> - <title> - <round report basename> - file:line - <what>`

The title is the one the finding was given when it was raised, per `## Naming`, so the same Minor
reads the same way in the report and in this file.

The writing tool truncates, so the append is done in two steps: Read the file when it exists, then
write back its existing lines followed by this round's, in one write. A round that writes only its
own lines silently deletes every earlier round's - the same loss the append rule exists to prevent.

The fix implementor never reads it: a Minor is worked only when the dispatch names it on a `minor:`
line (see `## Implementor fix-mode input`). The file is run bookkeeping - it lives in the run
directory and disappears with it, so it needs no separate cleanup.

## Decisions file

`<workdir>/implementation/decisions.md`. One line per finding or criterion change the user accepted,
whether at a BLOCKED verdict or when closing a review round with findings still open:

`- <ID> - <criterion or task> - accepted: <what the user accepted> - <date>`

The line shape is unchanged. `<criterion or task>` is written in the reference form of `## Naming`,
`` `<title>` (criterion 3) `` or `` `<title>` (Task 3) ``, so the line names what was accepted
without the reader opening the plan.

Written only through `scripts/record-decision.sh` - no orchestrator, fork or agent writes it by
hand. A reviewer handed `decisions:` treats every line in it as plan text: a criterion covered by a
line there is neither raised as a Critical nor returned as BLOCKED again.

## Notes line formats

Lines the implementors write into their `*-notes.md` file under `<workdir>/implementation/`:

- `touched: <repo-relative path>` - one per file changed outside the task's `### Files`, and in fix
  mode one per file changed at all. Consumed by `commit-task.sh --notes` as the declared set. The
  line is machine-read and carries the path alone - no backticks, no reason - with the reason on
  its own line above it.
- `CARRY: <path> - <known problem outside this task's Files, left in place>` - one per known problem
  the implementor saw outside its `### Files` and did not fix. Read by the final review, which
  closes it under the integration mandate, and by the fix implementor when a report points at it.
- fix mode, one line per finding ID from the reports: `<ID>: fixed`,
  `<ID>: fixed - no test: <reason>` or `<ID>: skipped - <reason>`.
- `UNDERSPECIFIED: <value> - <the decision made>` - unchanged, one per value the task left open.
- `no deviations` - unchanged, the single line written when there is nothing else to report.

## Implementor fix-mode input

In fix mode the `task:` file, and every `more:` file, is a report in the `## Report skeleton` shape.

- The IDs under `### Critical` and `### Important`, in every report handed in, are the whole work
  list; each one is fixed.
- A `## Debt` ID (a Minor) is touched only when the dispatch lists it explicitly on a
  `minor: <ID>[, <ID>]` line. Every other Minor stays untouched.
- The gates, prior findings and notes sections are context, not work items.
- Every fixed Critical or Important gets a test that fails before the fix and passes after it -
  written and run before the fix - or, when no test can express it, the status line
  `<ID>: fixed - no test: <reason>`.
- Every ID from the reports gets exactly one status line, and every file the round changed gets one
  `touched:` line, both in the shapes from `## Notes line formats`.
