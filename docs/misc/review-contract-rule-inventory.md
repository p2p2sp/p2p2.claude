# Review contract rule inventory

A working note beside the repo's other `docs/misc/` records: the rule-by-rule account of what
`superdev/references/review-contract.md` carried before this compression, read by a human editor
and by no dispatch.

Row shape: `- <rule, one clause> - kept | moved -> <destination> | dropped - <reason>`. One bullet
per rule, grouped under the contract section that states it, in file order. The pre-heading title
block is inventoried first, under `## Preamble`, because it carries obligations of its own and
criterion 9 admits no unaccounted rule; the twelve `## ` sections follow.

## Preamble

- this file is the single owner of the loop's vocabulary, so every consumer applies these rules instead of restating them, and no consumer carries a copy of any section - kept
- the opening sentence's own restatement of that ownership (lines 5 to 6) - dropped - repeats the same rule the consumer paragraph states four lines later, and `superdev/CLAUDE.md` already carries the ownership fact for a human editor
- the enumerated consumer list (three build reviewers, the per-task reviewer, the two implementors, the two orchestrators) - moved -> superdev/CLAUDE.md - a runtime reader never needs to know which other agents share the file; an editor changing a section needs exactly that list
- each consumer reads this file, handed in on a `refs:` label - dropped - restated as an obligation by the `refs:` entry of `## Labels`, which is where a consumer looks for it
- the per-task gate is bound by a named subset of sections (`## Labels` for `refs`, `range`, `prior`, `decisions`, `report`, plus `## Naming`, `## Finding IDs`, `## Report skeleton`, the one `## Verdict rules` BLOCKED condition, `## Decisions file`, `## Notes line formats`) - kept - stated nowhere else
- the sections the per-task gate writes and the ones it never writes (`## Gates`, `## Prior findings`, `## Decisions taken`, `## Debt`, a coverage table) - dropped - `## Report skeleton` states the same reduced shape, and it owns what a report carries
- the per-task gate runs no gate command, raises no Minor and verdicts no earlier round - dropped - the reason clause of the row above, and each of the three is an obligation `## Gates`, `## Report skeleton` and `## Verdict rules` already carry
- every rule refers only to the plan template's own sections, to the run's working directory and to `git`, never to an ecosystem's tools and never to a heuristic for recognising a test file - kept - binds the consumer as much as the editor: no reviewer may invent a test-file heuristic
- `<workdir>` is the run's working directory `docs/.workflows/<run>/`, holding the plan, the tasks and the `implementation/` reports - kept

## Labels

- a label is an input line the orchestrator passes to an agent, on top of `plan:`, `spec:`, `plan-header:`, `task:`, `notes:` and `report:` - kept
- one label per line, its value always a path or a short token (a SHA, a stage name, an ID list), never a body of text - kept
- the justification for that (a worker opens what it is pointed at, pasted content crowds out its own reading) - dropped - mechanism rationale behind the rule above
- `stage: checkpoint|final|re-review` is required on every build reviewer call and selects the rules in `## Verdict rules` - kept
- `since: <SHA>` is required on every build reviewer call, and the change under review is `git diff <since>..HEAD` - kept
- for the build's first review round `since` is the `base:` value from the decompose index - kept
- `since: none` means a build without git and an unbounded review over the working tree - kept
- `range: <SHA>..<SHA>` is required on every per-task reviewer call in a build with git, and is repeatable, one line per commit range the reviewed task owns - kept
- a decompose index printing `base: none` is the one exception: no `range:` line is passed and the per-task reviewer judges the working tree against HEAD - kept
- `prior: <path>` is the previous report of this same reviewer, required for `stage: re-review` and for any round following an earlier report, omitted only in the build's first round - kept
- on the per-task gate `prior` is the previous round's report of this same task (`task-NN-review-<R-1>.md`), present from the task's second review round on - kept
- the per-task gate reads `prior` for two things only: the numbering its findings continue from, and the title of a still-open finding, so that one is never re-raised under a new ID - kept
- the per-task `prior` carries no verdict table and no re-review mandate - kept
- a review round closed with no reviewer dispatch wrote no report, and `prior` keeps pointing at the last report there was - kept
- the justification for that (dropping it would restart the finding IDs and re-raise a still-open finding) - dropped - mechanism rationale behind the rule above
- a build that has produced no report yet hands such a round's gate block on `prior` instead, and the round reading it omits the prior findings table because that block carries no finding ID - kept
- `decisions: <path>` is optional and names the run's decisions file - kept
- every line in the decisions file is an answer the user gave and carries the force of the plan - dropped - `## Decisions file` states it for the reviewer and `## Implementor stop` for the implementor, each with its own consequence attached
- `refs: <absolute path>` is the plugin's references directory, and an agent reads `<refs>/review-contract.md` before acting - kept
- `refs` is required on every build reviewer call and on every per-task reviewer call - kept
- `gates: <path>` is the gate block the orchestrator's own gate run wrote for this round, read in place of running the stage's set, and is required on every build reviewer call - kept
- `more: <path>` is implementor fix mode only, optional and repeatable, one additional findings report handled in the same dispatch - kept
- `minor: <ID>[, <ID>]` is implementor fix mode only and optional, naming the only `## Debt` IDs that dispatch may touch - kept
- neither build orchestrator ever sends `minor:` - kept
- why that gap is deliberate and not drift (a round's budget is one fix dispatch, spent on what moves the verdict, which a Minor does not; the label's one producer is a dispatch a human directs) - moved -> superdev/CLAUDE.md - pure rationale at runtime, and the one thing that stops a later editor from "repairing" the missing label in an orchestrator
- an implementor handed no `minor:` line leaves every Minor untouched - dropped - `## Implementor fix-mode input` states the same rule where the implementor reads it
- a build reviewer call with no `stage`, no `since` or no `gates`, one whose `gates:` file does not exist or cannot be read, or one with `stage: re-review` and no `prior`, returns `VERDICT: FAIL` plus `REASON: missing input <label>` and writes no report, checked before any work - kept
- the retired `base:` and `runner:` paragraph (`since` replaces `base:` everywhere; a call still carrying `runner:` is served by `gates:` and logs one `NOTE: plan defect - stale runner label`) - dropped - a retired rule: no live producer emits either label

## Naming

- every item a human is pointed at carries a title next to its number, the number staying the pointer agents and scripts key on - kept
- where each kind takes its title from: decision from its `### <n>. <question>` heading, phase from its `### NN. <title>`, plan task from its `## Task <N> - <title>`, acceptance criterion from the `<short name>` of `<n>. <short name> - <condition>`, finding from its report bullet's `<title>`, checklist class or rule from the name after its `B<n> -` or `R<n> -` prefix - kept
- the reference form is identical in chat and in files, `` `<title>` (<pointer>) ``, the pointer being `decision 3`, `phase 01`, `Task 3`, `criterion 3`, `C2`, `B3`, or `#3` inside a `Covers:` line - kept
- a bare pointer never appears in anything a human reads: not in narration, an `AskUserQuestion` label, an escalation, a report, a `Covers:`, `Depends on:`, `consumed by` or `## Impact on decisions` line - kept
- a heading keeps its own form and is never rewritten into the reference form - kept
- title rules: a few words, no `#`, no backticks inside, unchanged for the item's life, assigned once with the number and travelling with it - kept
- legacy fallback: an item written before this contract is cited by the first clause of its own text, verbatim, for a finding bullet its "what is wrong" clause and never its `file:line`, and no title is ever invented - kept - `plan-review-checklist.md` B15 and both planning skills cite this fallback
- machine contracts are untouched by this section: a `Covers:` line is still parsed for `#<n>`, and `task: NN`, `tasks/task-NN.md`, `phases/NN-<slug>` and finding-ID stability stay as they are - kept

## Finding IDs

- every finding carries an ID, `C<n>` for Critical, `I<n>` for Important, `M<n>` for Minor, numbered per class from 1 - kept
- an ID is assigned in the round that raises the finding and is never renumbered - kept
- a later round continues numbering from the highest `<n>` per class found in `prior` - kept
- an ID keeps its class for the life of the build - kept
- a title is assigned with the ID per `## Naming` and is kept unchanged across rounds, every later mention (prior findings row, `### Needs decision` bullet, `## Debt` bullet, orchestrator question) reusing it - kept
- `D<n>` is never assigned by a reviewer: it identifies an implementor stop, one per `DECISION:` line - kept
- a stop's first `D<n>` takes the number after the highest `D<n>` in the file handed on `decisions:`, `D1` when there is no such file or line, and the stop's further lines continue from there in the order it wrote them - kept
- nothing carries the `D<n>` as a field, implementor and orchestrator reading it off those two facts - dropped - mechanism rationale: the derivation rule above is the whole obligation
- a `D<n>` is unique for the life of the build and never renumbered, the decisions-file line and the question that asked for it carrying the same ID - kept
- a `D<n>` is not a finding: never in `## Findings`, in `## Debt` or in a prior-findings table, and it never moves a review verdict - kept
- `G<n>` is never assigned by a reviewer: it identifies a gate hole the user accepted at a gate-sourced BLOCKED, one per accepted `### Needs decision` gate bullet - kept
- the orchestrator assigns `G<n>` when it records the answer, taking the number after the highest `G<n>` in the decisions file, `G1` when there is none - kept
- a `G<n>` is not a finding either: never in `## Findings`, in `## Debt` or in a prior-findings table - kept
- the gate bullet a `G<n>` closes carries no ID of its own, which tells the orchestrator's fix loop the two bullet shapes apart - dropped - `## Gates` states the no-ID rule as an obligation and owns the fix-loop branching
- the pre-contract `prior` report handling (bullets with no IDs treated as unnumbered prior findings and given fresh IDs in the verdict table in order of appearance, an ID with no title titled by the legacy fallback, both said so in the report's notes section) - dropped - a retired rule: every report a live round reads was written under this contract

## Report skeleton

- every build reviewer writes its report to the `report:` path, on PASS, on FAIL and on BLOCKED alike - kept
- that path is the reviewer's only output file, any scratch file living under `.temp/` and never in the repo tree - kept
- the report carries new information and nothing else, a section with nothing to say being omitted entirely - kept
- the cost argument for that (an empty heading, a "none" placeholder and a restatement of the plan cost a reader the same as a finding) - dropped - mechanism rationale behind the rule above
- the closing `VERDICT:` line is the only part that always appears - kept
- the sections appear in the order listed - kept
- title line `# <stage> review`, carrying no file name - kept
- the reason for the missing file name (the reader opened the file) - dropped - mechanism rationale
- `## Gates` carries one line per subsection this stage ran, shaped `<subsection> - <result> - <wall time>`, the wall time from `run.sh`'s `DURATION:` - kept
- on a red result that line adds the tool's own summary line and the `LOG:` path of the failing run - kept
- the commands themselves are never written out - kept
- a subsection whose block reads `none - <reason>` or `absent - <reason>` carries that word and reason in place of the result and no wall time - kept
- a subsection this stage does not run has no line at all - kept
- one extra line says the review is unbounded over the working tree when `since` is `none` - kept
- a subsection holding several commands still carries one line, red when any command is red, its wall time their sum - kept
- `## Prior findings` appears only when `prior` was given, as a table `| ID | Title | Verdict | Evidence |`, one row per ID in `prior`, its title carried over - kept
- a prior row's verdict is `ADDRESSED`, `NOT ADDRESSED` or `ACCEPTED`, its evidence a `file:line`, or for `ACCEPTED` the decisions-file line that closed it - kept
- `## Decisions taken` is written at `stage: final` and at the re-review of a final report, by the reviewer that owns requirement coverage on its track (`superbuild-reviewer-spec` on Super, `simplebuild-reviewer` on Simple), at no other stage, by no other reviewer, never in a checkpoint report - kept
- it holds one line per `UNDERSPECIFIED:` line found across every `*-notes.md` of the notes directory, in file order, shaped `- <notes file basename> - <value> - <decision>` - kept
- the section repeats no finding and never moves the verdict - kept
- it is the one place the user sees what the implementors settled themselves - dropped - mechanism rationale for the section's existence
- no such line anywhere in the notes directory omits the section like any other section with nothing to say - dropped - repeats the omit-empty-sections rule stated at the top of this section
- `## Findings` holds `### Critical` and `### Important`, one bullet per finding shaped `- <ID> - <title> - file:line - what is wrong - why it matters - how to fix` - kept
- that bullet's title is a few words per `## Naming` - dropped - the title rules of `## Naming` already bind every title
- `### Needs decision` carries one bullet per BLOCKED item, naming the finding as `` `<title>` (<ID>) ``, the criterion or plan task it belongs to in the same reference form, and why no code change can clear it - kept
- `## Debt` carries this round's Minor, one bullet per finding with its ID and title, and is the only home of a Minor: nothing is appended anywhere else and no later round copies it forward - kept
- `## Notes` carries advisory lines only, including `NOTE: plan defect - <what>` - kept
- `## Assessment` carries one sentence saying why the verdict is what it is, then the bare `VERDICT: PASS`, `VERDICT: FAIL` or `VERDICT: BLOCKED` line - kept
- no acceptance criterion, DoD or plan task is restated in `## Assessment`, a criterion that needs saying something being said in `## Findings` - kept
- a re-review writes this same skeleton with its own `## Gates` lines for its own re-run, one per subsection, never a copy of the prior round's block - kept
- no `Strengths` section and no `Recommendations` section exists, praise and polish suggestions being no part of a report - kept
- two sections are owned rather than shared: the spec reviewer's coverage table between the gates and prior findings sections, and the final reviewer's `## Decisions taken`; no consumer adds any other section - kept
- the per-task gate writes this skeleton reduced to `# task review`, `## Findings`, `## Notes` and `## Assessment`, with `### Needs decision` inside `## Findings` on BLOCKED - kept
- the per-task gate writes a report only on FAIL and on BLOCKED, and on the notes-only PASS path appends a `## Review notes` section to the task's notes file instead - kept

## Gates

- the gate commands come from the `## Gate commands` block above the first task block of the run's plan copy `<workdir>/plan.md`, the file handed on `plan:`, and from nowhere else - kept
- `plan-header.md` does not carry that block - kept
- the block holds `#### Build`, `#### Tests` and `#### Integration`, each carrying its commands one per line or the single line `none - <reason>` - kept
- `stage: checkpoint` runs `#### Build` and `#### Tests`, `#### Integration` being neither run nor lined in the report - kept
- `stage: final` runs all three - kept
- `stage: re-review` runs the set of the round it closes, read off the first line of the report on `prior`: `# checkpoint review` gives the two subsections, `# final review` all three - kept
- a subsection reading `none - <reason>` is not run, its reason is carried into the report's line for it, and the review never returns BLOCKED for it - kept
- a subsection the plan's block does not hold at all comes back as `absent - <reason>` and is `VERDICT: BLOCKED` with a `### Needs decision` bullet naming it, at every stage that covers it - kept
- the reason that case differs (nothing was decided about it, the plan is what has to change, only the user can say whether it gains a command or a `none - <reason>` line) - dropped - mechanism rationale behind the rule above
- no command is collected from a task section: `### Task Checks` belongs to the implementor writing that task, no stage collects it, and a command appearing only there runs at no review stage - kept
- the orchestrator runs the stage's whole set once per round through `scripts/run-gate.sh` and hands the block that run wrote to every reviewer of the round on `gates:` - kept
- a reviewer runs no gate command itself: it reads the handed block before reading any code and records each entry's result in the report's gates section - kept
- however many reviewers the round dispatches, each command ran once and they all read that one result - dropped - mechanism rationale for the transport rule above
- the block carries one entry per command, opening on the `COMMAND:` and `TIMEOUT:` lines `run-gate.sh` writes under that command's subsection heading, then the `RESULT`, `STATUS`, `EXIT`, `DURATION`, `LOG` and `LINES` lines `run.sh` printed, plus `TAIL` and `REASON` where it printed them - kept
- which line case 1 takes the failing command and the seconds from, and why a heading cannot supply either - dropped - repeats case 1, which names both lines itself
- a command the round's budget left no room for carries `COMMAND` plus a `RESULT` / `STATUS` / `REASON` triple and no `TIMEOUT`, and case 1 settles it like any other `STATUS: error` - kept
- a green entry costs the reviewer the read and nothing else - dropped - repeats case 2
- `expect:` is not a label of the block: it is the sentence naming the outcome a run must show and travels only on the `superdev:executor` dispatch - kept
- raw `Bash` stays for `git` reads and the reviewer's own probes under `.temp/`, and a build, test, lint or type-check run is never launched from a review - kept
- before any entry is read the block must cover the stage: a subsection this stage runs that the block carries no line for is `VERDICT: BLOCKED` with a `### Needs decision` bullet naming it - kept
- how that hole differs from the `absent` one (which file is short) and that a `none - <reason>` line is neither - dropped - repeats the two rules above
- the three cases are read in order, the first that matches settling the command and nothing below it being consulted - kept
- case 1: `STATUS: error` or `STATUS: timeout` on any gate command whatever its kind is `VERDICT: BLOCKED` with a `### Needs decision` bullet naming that command's `COMMAND:` line and `run.sh`'s `REASON:` line, or the timeout and the seconds of its `TIMEOUT:` line - kept
- case 1 is settled before any dispatch: nothing is forked, no log is read, it is never PASS and never a finding against the code - kept
- the reason for that (a command that produced no result says nothing about the tree) - dropped - mechanism rationale behind case 1
- a documented integration or e2e command that cannot run in this environment at all is BLOCKED on case 1's terms, and where it comes back as a case-3 `VERDICT: FAIL` whose failures say only that, it is recorded as BLOCKED too, never as a finding against the code - kept
- case 2: `RESULT: SUCCESS` is a green gate and that command is done, with no fork and no log read - kept
- the reason for that (its exit code satisfied `expect-exit:`, the whole question a passing gate asks) - dropped - mechanism rationale behind case 2
- case 3: `RESULT: DEVIATION` dispatches `superdev:executor` in analysis mode over the log that run already wrote, `log:` from `LOG:`, `exit:` from `EXIT:`, `duration:` from `DURATION:`, plus the `expect:` sentence - kept
- the fork's reply is the gate's result: `VERDICT: PASS` is a green gate, `VERDICT: FAIL` a red one whose `FAILURES:` bullets are evidence for findings - kept
- the command is never run a second time to produce a log that already exists - kept
- a `VERDICT: ERROR` from that fork is a malformed dispatch rather than a result about the tree: correct the labels and dispatch again - kept
- on `RESULT: SUCCESS` the evidence is the handed entry itself, its `RESULT:`, `EXIT:` and `TAIL:` lines read as they stand, with no executor reply on that path and none manufactured - kept
- `TAIL:` is the log's last non-empty line and is never relabelled `SUMMARY:` - kept
- the difference between the two labels (`SUMMARY:` names the aggregate line the fork found by reading the log) - dropped - the dispatched-command evidence row states what `SUMMARY:` is
- a `TAIL:` carrying no recognisable aggregate line, or absent because the log held none, leaves the gate passing on its exit code and the `LOG:` path recorded unread - kept
- on a dispatched command the evidence is the fork's reply, its `SUMMARY:` line carried verbatim into the report's line for a red subsection, never paraphrased and never recomputed - kept
- reaching the log always goes through the fork: it is dispatched on `RESULT: DEVIATION` and on a `SUCCESS` whose `TAIL:` carries a non-zero skip count on a run some criterion's proof depends on, and that criterion stays unmet until the fork has read the log - kept
- no consumer of this contract opens a `LOG:` path with `Read` itself - kept
- the skip rule reads only the figure `TAIL:` carries, and a `TAIL:` with no skips or no skip figure leaves nothing to infer - dropped - the rule above already keys on that figure, and no consumer may open the log to find another
- this section is the sole owner of the gate-command BLOCKED conditions, `## Verdict rules` and every consumer's own gates paragraph pointing here instead of carrying a summary - kept
- a gate-sourced BLOCKED bullet carries no finding ID and no criterion pointer: it names the command or the subsection and is raised against the plan, never against the code - kept
- the orchestrator's fix loop answers such a bullet under its own branch (retry the set, accept the hole against a `G<n>`, or abort) and never through the finding branch - kept
- a decisions line naming a gate command or a subsection closes that entry for every later round exactly as a criterion line does, the reviewer never returning BLOCKED for it again, while the block itself stays as it was written - kept
- every command of the stage's set runs in the round that needs it, a re-review included, a result carried over from the prior round proving nothing about the fixed tree - kept
- a criterion or behaviour that needs a run to be confirmed and got none is never marked met, and the report says which run is missing - kept
- `since: none` makes the review unbounded over the working tree and the gates section says so - dropped - stated by the `since` entry of `## Labels` and by the gates line of `## Report skeleton`
- at `stage: final` on the Super track the two dimensions are dispatched concurrently and neither runs the set, the orchestrator's single run preceding both dispatches and both being handed its block on `gates:`, each recording it in its own report - kept
- nothing is shared between the two dimensions, so a host whose gate commands cannot run twice at once needs no special shape in the plan's block - dropped - mechanism rationale, addressed to a plan author rather than to any consumer of this contract

## Verdict rules

- at `checkpoint` the reviewer reads the whole `git diff <since>..HEAD`, and a new Critical or Important is allowed for any defect in that delta - kept
- at `final` the same full read applies plus the integration mandate over the whole build: every `### Contracts` entry another task consumes, every `CARRY:` line in the notes directory, every failure branch that crosses tasks - kept
- for such a seam a Critical or Important is allowed even in code older than `since` - kept
- at `re-review` every `prior` ID is verdicted first in the prior findings table, then only `git diff <since>..HEAD` is read, a new Critical or Important allowed only for a defect the fix itself introduced - kept
- at `re-review` an ID that was `M<n>` in `prior` never returns as `I<n>` or `C<n>` - dropped - `## Finding IDs` states that an ID keeps its class for the life of the build
- a re-review is FAIL only when a Critical or Important from `prior` is `NOT ADDRESSED` or the fix introduced a new Critical or Important, anything else being PASS unless a BLOCKED condition holds - kept
- at `checkpoint` and at `final` the delta bounds where a defect is hunted, never which requirements are verdicted - kept
- a reviewer that owns requirement coverage judges every criterion against the repository state, those whose code landed before `since` included - kept
- the reason for that (after a closed round `since` is that round's SHA, so a criterion left to the delta would go unchecked) - dropped - mechanism rationale behind the rule above
- `VERDICT: BLOCKED` is returned when a criterion or requirement is unmet because of a decision recorded in the plan, in the notes or in the decisions file, not because code is missing - kept
- every other BLOCKED condition comes from a gate command and `## Gates` owns that list in full - dropped - the sole-owner rule is stated in `## Gates`, and a pointer to it is not a rule of its own
- BLOCKED outranks FAIL: with both conditions present the return line is `VERDICT: BLOCKED` and the report still lists its Critical and Important findings - kept
- a behaviour recorded under a task's `### Failure modes` is a decision, and disagreement with it is a `NOTE: plan defect - <what>` line in the notes section, never a Critical and never an Important - kept
- that note line is reserved for a plan defect leaving every criterion the reviewer verdicts met; a defect leaving one unmet is the BLOCKED condition, and where both readings hold BLOCKED wins and no note is written - kept
- a build reviewer handed a `notes:` directory reads every `NOTE: plan defect` line in it, in the `## Review notes` sections of the `*-notes.md` files and the `## Notes` sections of the `task-NN-review-R.md` reports - kept
- it settles each such line under its own build-wide mandate: its own finding or `### Needs decision` bullet where its mandate raises it, one `NOTE: closed plan defect - <what> - <why>` line otherwise, none left unread and none copied forward as it stands - kept
- a prior ID covered by a line in the decisions file is verdicted `ACCEPTED`, is never raised again and never makes the verdict FAIL - kept
- a prior Critical or Important that is `NOT ADDRESSED` with no such line makes the verdict FAIL, at `checkpoint` and at `final` as at `re-review` - kept
- Minor findings never affect the verdict - kept
- the return channel to the orchestrator is line 1 `VERDICT: PASS|FAIL|BLOCKED` and, on FAIL and on BLOCKED, line 2 `REVIEW: <report path>`, the report itself staying on disk - kept

## Per-task gate

- the Super track's per-task reviewer judges one task's change against that task's own text - kept
- the change is the union of the `range:` lines it was handed, its own commit first, then one further range per fix commit the task's later rounds produced - kept
- no range ever spans a commit of another task, so a task reviewed after the next task is committed still sees only its own - dropped - mechanism rationale for how the ranges are cut, an obligation of the orchestrator that builds them
- handed no `range:` line it reads the working tree against HEAD instead - dropped - the `range:` entry of `## Labels` states the same exception where the label is defined
- the orchestrator may dispatch a task's per-task review in the same message as the next task's implementor, the verdict being read and acted on after that task's own commit - kept
- its one BLOCKED condition is a criterion under the task's `### Covered criteria` that stays unmet while the diff matches the task's text (the plan described too little, described the wrong thing, or recorded a behaviour under `### Failure modes` or `### Contracts` making the criterion unreachable) and that no decisions line already covers - kept
- missing or wrong code against text that would have met the criterion is a Critical, never BLOCKED - kept
- the report carries one `### Needs decision` bullet per such criterion in the shape of `## Report skeleton`, the finding as `` `<title>` (<ID>) `` with an ID from the Critical class, the criterion as `` `<title>` (criterion N) ``, and why no code change clears it - kept
- the return is `VERDICT: BLOCKED` plus `REVIEW: <report path>`, and BLOCKED outranks FAIL here as everywhere - dropped - `## Verdict rules` owns both the return channel and the precedence
- step 1: one `AskUserQuestion` per `### Needs decision` bullet, naming the finding and the criterion in the reference form, with three answers, accept as is, fix the plan, abort, and no implementor running first - kept
- step 2: either of the first two answers is recorded through `scripts/record-decision.sh`, `<id>` the bullet's ID, `<subject>` the criterion in the reference form, `<accepted-text>` the words the user gave (what was accepted, or the rule dictated) - kept
- the plan file is never edited: the decisions file is where a plan correction lives, and it binds every later dispatch of the build that reads `decisions:` - kept
- step 3, accept as is on every bullet: the same reviewer call again with the same `report:` path and `decisions:` added, and that re-run is not a review round - kept
- step 3, fix the plan on any bullet: the task's implementor call again with the same `task:`, the same `model:` or absence of one, the same `notes:`, plus `decisions:`, continuing from the working tree as it stands and applying the dictated rule, its `VERDICT: PASS` followed by the reviewer with the next `R` and `decisions:` set - kept
- neither of those dispatches counts toward the task's review rounds - kept
- step 4: a BLOCKED coming back from either re-run is a new matter taking these same steps, and a bullet the decisions file already covers is never asked again - kept

## Decisions file

- the file is `<workdir>/implementation/decisions.md`, one line per answer the user gave - kept
- the answers it records: a finding or criterion change accepted at a BLOCKED verdict of a build round or of the per-task gate, a plan rule the user dictated there, a finding accepted when closing a review round with findings still open, a gate hole accepted at a gate-sourced BLOCKED, and the answer to an implementor stop - kept
- a gate-hole line's `<ID>` is that acceptance's `G<n>` and its `<criterion or task>` is `gate <command>` or `gate subsection <name>` in place of a reference form - kept
- an implementor-stop line's `<ID>` is that stop's `D<n>` - kept
- the line shape is `- <ID> - <criterion or task> - accepted: <what the user accepted> - <date>` - kept
- the line shape is unchanged - dropped - a retired note about a pre-contract state, carrying no obligation
- `<criterion or task>` is written in the reference form of `## Naming`, or `` `<title>` (fix 02) `` for a stop raised in a fix round - kept
- the reason for that (the line names what was accepted without the reader opening the plan) - dropped - mechanism rationale behind the rule above
- the file is written only through `scripts/record-decision.sh`, no orchestrator, fork or agent writing it by hand - kept
- a reviewer handed `decisions:` treats every line in it as plan text: a criterion covered by a line there is neither raised as a Critical nor returned as BLOCKED again - kept

## Notes line formats

- these are the lines and sections written into a task's `*-notes.md` file under `<workdir>/implementation/`, by the implementor that wrote the task and, for `## Review notes`, by the reviewer that read it - kept
- notes never restate the task or a report: an `### Approach` step is cited by its number, a finding by its ID, a file by its path, never by copying the text back - kept
- notes are written LLM to LLM, concrete and unexplained, with no justification of a rule the reader already holds and no summary of what the task asked for, and a note the next reader could reconstruct from the task file is not worth writing - kept
- `## Runs` is written on every PASS above that round's other lines, one line per `### Task Checks` line the implementor ran in its last green pass, in run order, shaped `- <command verbatim> -> <summary line | exit <n>>` - kept
- a `### Task Checks` section reading `none - <reason>` yields that single line in `## Runs` instead - kept
- `## Review notes` is appended by a per-task reviewer that holds the task and raised notes and nothing else: one `NOTE: <what>` line per note, `NOTE: plan defect - <what>` among them, and no report file of its own - kept
- because the writing tool truncates, that reviewer reads the notes file and writes it back with the section appended - kept
- the build reviewers read those lines - dropped - `## Verdict rules` states that obligation for the reader that carries it
- `touched: <repo-relative path>` is written one per file changed outside the task's `### Files`, and in fix mode one per file changed at all - kept
- `touched:` is consumed by `commit-task.sh --notes` as the declared set, is machine-read, and carries the path alone, no backticks and no reason, with the reason on its own line above it - kept
- `CARRY: <path> - <known problem outside this task's Files, left in place>` is written one per known problem the implementor saw outside its `### Files` and did not fix, read by the final review and by the fix implementor when a report points at it - kept
- `no deviations` is the single line written when there is nothing else to report - kept
- one test decides between the two remaining lines: a defensible answer exists, take it, write `UNDERSPECIFIED:` and carry on; none exists, write `DECISION:` and stop - kept
- `UNDERSPECIFIED: <value> - <the decision made>` is written one per value the task's own text, its `### Contracts`, its `### Failure modes` and the plan header all left open and for which the implementor had a defensible answer (a pattern the repo already uses, a criterion under `Covered criteria`, a host convention) and used it - kept
- the build does not stop for an `UNDERSPECIFIED:` line, which is what the value's reader is given instead - kept
- `DECISION: <what> - <why it cannot be settled here> - <options seen, or none>` is written one per matter the implementor cannot settle at all: a contradiction with a decisions line, with the spec or with another section of the plan, or a criterion it cannot meet without changing a recorded decision - kept
- `<options seen, or none>` is written even when it reads `none` - kept
- a `DECISION:` line is identified by a `D<n>` - kept
- a `DECISION:` line is never written on its own: it goes to `notes` together with the `VERDICT: BLOCKED` return - dropped - `## Implementor stop` owns the pairing and states it as the condition of a valid stop
- an answer the implementor could defend is never written as a `DECISION:`, the stop being for matters nobody but the user can close - kept
- fix-mode notes are the `## Runs` section, exactly one status line per finding ID from the reports handed in (`<ID>: fixed`, `<ID>: fixed - no test: <reason>` or `<ID>: skipped - <reason>`), one `touched:` line per file the round changed, and the two decision lines above under the same split rule, with nothing else in them - kept - this section owns the note shapes, so the fix-mode list lives here

## Implementor fix-mode input

- in fix mode the `task:` file, and every `more:` file, is a report in the `## Report skeleton` shape - kept
- the IDs under `### Critical` and `### Important` in every report handed in are the whole work list, and each one is fixed - kept
- an ID under a report's `## Debt` section is touched only when the dispatch lists it explicitly on a `minor:` line, and every Minor the dispatch does not name stays untouched - kept
- that `## Debt` section is the only place a Minor lives - dropped - `## Report skeleton` states it where the section is defined
- the gates, prior findings and notes sections of a report are context, not work items - kept
- every fixed Critical or Important gets a test that fails before the fix and passes after it, written and run before the fix, or, when no test can express it, the status line `<ID>: fixed - no test: <reason>` - kept
- the round's notes carry a `## Runs` section, one status line per ID, one `touched:` line per file changed and an `UNDERSPECIFIED:` or `DECISION:` line wherever the split rule calls for one, in the shapes from `## Notes line formats` - dropped - the fix-mode paragraph of `## Notes line formats` states the same list where the shapes are defined
- a fix round stops exactly as a task does, a matter it cannot settle being a `DECISION:` line and a `VERDICT: BLOCKED` return per `## Implementor stop`, with the fix as the subject of the decisions-file line - kept

## Implementor stop

- the stop is the implementor's third return shape beside `VERDICT: PASS` and `VERDICT: FAIL`: a matter the task or fix cannot settle is handed back to the user unclosed rather than guessed at - kept
- line 1 is `VERDICT: BLOCKED` and line 2 is `REASON: ` followed by the `<what>` of the first `DECISION:` line this stop wrote - kept
- every `DECISION:` line goes to `notes` before the return, the return naming the first and the notes carrying them all, and a return with no such line in `notes` is not a stop at all - kept
- the stop is raised before a single file is edited whenever the matter is visible from the task's own text - kept
- a matter that only surfaces mid-work is raised where it surfaced, with the working tree left exactly as it stands, nothing reverted and nothing committed, the re-dispatch continuing from that state - kept
- step 1: one question to the user per `DECISION:` line in `notes` that the decisions file does not already answer, naming the task or the fix in the reference form of `## Naming` and carrying that line's `<what>`, `<why>` and `<options>` - kept
- a notes file appended to across re-dispatches keeps the earlier stop's lines, and those are closed - kept
- step 2: each answer is recorded through `scripts/record-decision.sh`, `<id>` the line's `D<n>`, `<subject>` `` `<task title>` (Task <N>) `` or `` `<fix title>` (fix <NN>) ``, `<accepted-text>` the user's answer - kept
- no orchestrator, fork or agent writes that file by hand - dropped - `## Decisions file` states the same rule where the file is defined
- step 3: the same implementor call is dispatched again with the labels it already carried plus `decisions: <workdir>/implementation/decisions.md`, that re-dispatch being neither a review round nor a fix round, and a stop coming back from it a new matter taking these same three steps - kept
- a `decisions` file handed to an implementor is plan text exactly as it is for a reviewer: a matter a line there answers is settled for the rest of the build, never raised as a `DECISION:` again, never asked of the user a second time and never reopened as a deviation - kept - the implementor-side twin of the `## Decisions file` rule, and the only statement of the deviation half

## Dispatch strength

- there is one scale, `opus` over `sonnet`, and "highest" means the first of these that appears in the set being compared - kept
- the `Agent` tool takes no `effort` parameter: no `effort` is passed on any dispatch, the plan carries no effort marker, and the dispatched agent's own frontmatter is the only place an effort is set - kept
- a plan task's `Model:` is the whole of what the planner decides about its implementor's strength - kept
- passing no `model` parameter is not a level on the scale: it hands the choice to the dispatched worker's own frontmatter - kept
- `Review:` state one, no marker: the per-task reviewer is dispatched with no `model` parameter at all - kept
- `Review:` state two, `Review: <model>`: the per-task reviewer is dispatched with `model` set to the marker's first token - kept
- a plan written before the effort marker was retired may carry a second token there, never passed and never read - dropped - a retired marker, and the state-two row already binds the dispatch to the first token alone
- `Review:` state three, `Review: none`: the per-task reviewer is not dispatched at all, the task going from the implementor's `VERDICT: PASS` straight to commit with no substitute check standing in for the review - kept
- the notes of a `Review: none` task are handed to the `notes:` label of the next round exactly like any other task's - kept
- a fix dispatch after a per-task review runs at that task's own `Model:` - kept
- a fix dispatch after a checkpoint or a final round runs at the highest `Model:` among the tasks whose `### Files` names a file some finding in that round's report points at - kept
- no such task means the fix dispatches with no `model` parameter at all - kept
