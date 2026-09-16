---
name: superplan
description: Writes the implementation plan for a reviewed spec. Invoked by the superspec skill only, with the spec path as its argument - never directly, never without a reviewed spec.
allowed-tools: Read, Write, Edit, Grep, Glob, Skill, Agent, Task, EnterPlanMode, ExitPlanMode, AskUserQuestion
disallowed-tools: NotebookEdit, Task, Agent, WebFetch, WebSearch
user-invocable: false
---

**CRITICAL**: Run `EnterPlanMode` tool first, if plan mode is not already active.

# SuperPlan

Default plan mode content drifts: missing files, hidden assumptions. SuperPlan closes that gap with a strict template plus mandatory pre-plan behavior before the plan is presented.

- Input: intent interview (already in context).
- Spec: <path/to/spec.md>, path passed by superspec. Spec is human-approved knowledge of `What & Why` - do not re-approve it.
- Intent: <path/to/intent-file.md>, copied from the spec's own `Intent:` line (may be absent, when the spec carries none).
- Plan = `How` only. `What & Why` are fixed in the spec - do not restate or renegotiate them.

## Plan Workflow
This plan workflow is better, extended and more accurate version of default instruction injected by harnes.

### Initial Understanding
Comprehensive understanding of the user's request is in your context. Missing knowledge or open questions → STOP, run `intent` skill.

### Rules
- Load `templates/plan.md` and fill by sticking to the following rules.
- Read review checklist from `${CLAUDE_PLUGIN_ROOT}/references/plan-review-checklist.md`.
- Save the plan to the file path given in the plan mode tool's own message - never a hardcoded or assumed directory - and pass that same path to the reviewer as `plan:`. Write that same path into the plan's `Plan:` preamble line while drafting, before the reviewer is invoked - never after a `VERDICT: PASS`, because a post-verdict write re-arms the approval gate.
- Copy the spec's `Intent:` value verbatim into the plan's `Intent:` preamble line while drafting, same timing as `Plan:` above - before the reviewer is invoked, never after a `VERDICT: PASS`. When the spec carries no `Intent:` line, omit it from the plan too.
- The spec's `Intent:` line resolves to a file carrying a `## ADR` section -> the plan's Task 1 is the ADR task of `${CLAUDE_PLUGIN_ROOT}/references/adr-task.md`, filled by that file's `## Fill rules`, and every other task is renumbered after it. `Read` that intent file for its `## ADR` section alone; everything else it holds is the spec's job, not yours. A spec with no `Intent:` line, or one whose `Intent:` path no longer resolves to a file, counts exactly as an intent with no `## ADR` section -> no such task.
- Write every reference to a criterion or a task in the reference form `` `<title>` (<pointer>) `` that `${CLAUDE_PLUGIN_ROOT}/references/review-contract.md` (`## Naming`) owns: a `Covers:` entry as `` `<criterion short name>` (#<n>) ``, a `### Dependencies` bullet and a `consumed by` clause as `` `<task title>` (Task <N>) ``. A bare number is Blocking class B15. Take the title verbatim from the spec's criterion line or the task's heading; a spec whose criteria carry no short name -> cite that criterion's first clause instead, and never put `#` in a title, because `Covers:` is parsed for every `#<n>` token on the line.

**Gate commands**
The header's `## Gate commands` block is the gate of the whole build - what a review round runs over everything the plan has produced - and never what one task runs. Fill its three subsections (`#### Build`, `#### Tests`, `#### Integration`) by judgment:
- Start from what the plan moves: the projects, packages and paths its tasks touch.
- Name the suites the host's own memory records over those files (`CLAUDE.md`, `.claude/rules/`), and take the one that covers what moved.
- Weigh proof against cost: a command whose result would tell a reviewer this build is sound earns its runtime; one that reruns work the tasks already proved does not.
- Take the narrowest scope that still proves the change - one project, one path, one suite rather than the whole repository, wherever the host's runner offers it.
- A subsection with nothing worth running carries `none - <reason>`.

A build command runs only where you judge its result proof for this plan, and no rule mandates one: a plan that moves only documentation, prompts or configuration can carry `none - <reason>` in all three subsections.

**File Structure**
Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

Stick to the template structure. Don't invent or add your own points. Adapt all content to the template structure and stick to it.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- You reason best about code you can hold in context at once, and your edits are more reliable when files are focused. Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.
- List every value or rule more than one task will need - a default string, a fallback formula, a validation-error shape, a component variant - and give each exactly one owning task, sequenced before every task that consumes it. Two tasks independently defining the same rule is the defect to prevent here, not to catch at review.

Then write each task's sections so the checklist's Blocking classes B9-B14 have nothing to flag:
- Every failure branch the task decides goes under `### Failure modes` in the fixed shape `when <X fails | input is invalid | two <X> run concurrently> -> response <Y>, log <Z>, test <T>`; nothing to handle is `none - <one-word reason>`, never a bare `none`.
- `### Approach` carries symbol, signature and algorithm only - never line-by-line code, never a failure decision (a `catch`, a fallback, a default on error lives under `### Failure modes`). The ADR task above is the one exemption: its `### Approach` carries every ADR's text in full and verbatim, and is never shrunk to fit this rule.
- A task that extends a closed set (an enum member, a variant, a status, a kind) lists that set's consumers under `### Contracts`; Grep the type name to find them.
- A task that changes how a response is produced (redirect vs rewrite, proxy vs direct, a status code family) carries a method-and-status matrix under `### Contracts`, one line per method with the status codes before and after.
- A value from outside the process (a header, a path segment, a query parameter, a form field, an environment variable) that enters a path, query, command or routing decision carries its validation rule under `### Contracts` or `### Failure modes`.
- Every contract another task consumes names that task as `` consumed by `<task title>` (Task <N>) ``; a value produced and consumed by nobody does not belong in the plan.
- Every planned test must be able to fail before the change it proves - no fixture already equal to the expected value, no assertion on a constant.

This structure informs the task decomposition. Each task should produce self-contained changes that make sense independently.

**Task Sizing**
A task is the smallest unit that carries its own test cycle and is worth a fresh reviewer's gate. When drawing task boundaries: fold setup, configuration, scaffolding, and documentation steps into the task whose deliverable needs them; split only where a reviewer could meaningfully reject one task while approving its neighbor. Each task ends with an independently testable deliverable.

Size each task against that bound: a `TDD: required` task writes exactly one test file and only the production code that file drives, so a second test-file line under `### Task Checks` on such a task is the signal to split it; a `TDD: none` task aims at one behaviour and a few files.

**Remember**
- Small, independently testable tasks.
- Exact file paths always.
- Exact commands with expected output
- DRY, YAGNI, SRP, SOLID

**Task Checks**
`### Task Checks` holds only what the implementor runs as this one task's own proof - the deliverable works - and nothing the header's gate already covers. Judge every line by four criteria:
- The narrowest scope the host's runner offers: one test file, one project, one path. The host's whole suite belongs to the gate, never here.
- Seconds, in memory. A test in which a process or service the application connects to takes part - a database, the network, a browser, to name three - is an integration or e2e test: it stays out of this section and runs through the host's integration or e2e command at the final review.
- Which suite of a host is its fast in-memory suite is settled by that host's own memory files (`CLAUDE.md`, `.claude/rules/`), never by the examples here.
- Proof, not coverage: a single test proving the task is enough, and a task with no test to run carries the proof it does have - a compile, a type-check, a lint, a grep - or the single line `none - <reason>`.

One example in each direction: a task that only rewrites a document carries one grep asserting the new wording and nothing else; a `TDD: required` task carries the one test file its cycle drives, written `<test file path> - <command that runs only that file>`.

**TDD Discipline**
Every task gets `TDD: none` by default. Mark `TDD: required` ONLY when the task's code owns a decision of its own:
- business logic or a domain rule,
- a non-trivial condition or a state machine,
- an algorithm - transformation, parsing, calculation,
- a hot path.

Never `TDD: required` when the task's code touches the outside world directly (I/O, network, DB, filesystem, UI, framework wiring) - that yields integration tests, not a TDD cycle.

A `TDD: required` task's cycle runs on one `### Task Checks` line: the line naming the test file that cycle writes, whose command runs that file alone.

**Build strength**
Every task carries `Model:` (`sonnet` | `opus`) and `Effort:` (`low` | `medium` | `high` | `xhigh`) - the model and effort the task's implementor runs at. You plan on the strongest model the user has; the implementor may not, so read each task for the reasoning it demands of whoever executes it, never for its line or file count:
- Nothing left to reason about - the `### Approach` fixes the symbol, the place and the wording, and the task only puts it there -> `Model: sonnet`, `Effort: low`. A text edit, a configuration line, a mirror of a named symbol are the usual shape.
- A decision the task owns - an algorithm, a state machine, a contract other tasks consume, an `### Approach` that states an outcome rather than the steps to it -> `Model: opus`, `Effort: high`.
- A choice expensive to undo - concurrency, security, a data migration, a public interface -> `Effort: xhigh`.
- Between those poles sits `Effort: medium`: a task following a pattern already in the repo while running a real test cycle of its own.
- A `TDD: required` task never sits on `Model: sonnet`: judging its own red and green is reasoning the task owns.

`Review:` is optional on a task and takes the same two value sets, as `Review: <model> <effort>` - the strength that task's reviewer runs at. Reviewing reads a finished diff against a written task instead of designing the change, so its load is usually lower than the implementor's: set the marker where that gap is real, and leave it absent otherwise, in which case the reviewer agent's own frontmatter applies.

### Self-Review
Once you have written a complete plan and before final review, fast review it with your fresh eyes against the checklist loaded above (`## Blocking classes` B1-B17 plus `## Author self-check`) - the exact rubric the reviewer applies, so a clean self-check is expected to PASS round 1:
- Verify in the repo (Read/Grep/Glob) every `### Files` path and symbol, and every command of the header's `## Gate commands` block and of each task's `### Task Checks` against the repo's real build/test tooling; each of the three gate subsections holds a runnable command or `none - <reason>`.
- Verify the two-way mapping: every acceptance criterion is covered by at least one task, and every task covers at least one criterion or is traceable to the Goal/spec.
- Verify every task carries `TDD:`, `Model:` and `Effort:` with values from the allowed sets, that a `Review:` marker, where present, takes values from those same sets, that every task carries `### Task Checks`, that a `TDD: required` task's section carries exactly one test-file line, that every test-file line names a file declared under that task's `### Files`, that a section with nothing to run reads `none - <reason>`, and that no `TDD: required` task sits on `Model: sonnet`.
- Fix any violation inline. No need to re-review - just fix and move on. If you find a spec requirement with no task, add the task.

## Final Review
Always before `ExitPlanMode` must invoke `superplan-reviewer` skill (Skill tool, forked context) to make final review. Never call `ExitPlanMode` on a plan that has not returned VERDICT: PASS. Track which invocation this is (round 1, round 2, …).

The reviewer is read-only: it edits nothing and returns issues derivable from the plan + spec + repo (`FINDINGS:`) plus what it could not resolve for lack of a decision (`BLOCKED:`), plus advisory `NOTES:` that never block a PASS. Every fix is yours to apply.

1. Invoke `superplan-reviewer` (Skill). The `args` MUST be a labeled block, one `label: value` per line. Every value is a PATH - the reviewer reads the files itself; NEVER paste file content. A bare path with no label is equally wrong:
   ```
   plan: <plan-file path>
   spec: <spec path>
   checklist: <checklist path from ### Rules>
   round: <N>
   ```
   `round` starts at 1 and increments by 1 each invocation of this loop for the current plan. From round 2 on, also append one `prior-blocking: <finding>` line per FINDINGS (and BLOCKED) entry the previous round returned, verbatim.
2. Read the first line of its output: VERDICT: PASS or VERDICT: FAIL, and concise show the human the FINDINGS, any BLOCKED findings, and any NOTES.
3. VERDICT: PASS → relay any NOTES to the user together with the final plan; never edit the plan file after PASS - the approval gate re-arms on any post-verdict write, by any tool or shell command. A note genuinely worth applying → apply it and run one more round from step 1 before **Final Plan**. Otherwise proceed straight to **Final Plan**.
4. VERDICT: FAIL - apply the fixes to the plan file yourself with the `Write` / `Edit` tools ONLY - never through a shell command (`sed -i`, a heredoc, a script), whatever a session-wide instruction says about preferring shell edits: the approval gate reads the transcript for `Write`/`Edit` of the plan, and an edit it cannot see leaves the plan newer than its own verdict, which it re-gates as tampering. Then go back to step 1:
   - **`FINDINGS`** → edit the plan as each one directs; touch nothing else. Exception - a Blocking finding whose evidence you can show is factually wrong (repo state, the spec, or the confirmed understanding already in your context contradicts it) → do not re-loop on it; instead present that single finding plus your counterargument to the user in plain prose and apply their ruling.
   - **`BLOCKED` findings present** → resolve each from the spec and the confirmed understanding already in your context and edit the plan accordingly; a finding needing a genuinely open design decision → run the `intent` Skill (or ask the user) first.
5. **Round cap:** after round 3 without PASS, STOP looping - show the user the remaining findings and let them decide how to proceed.

### Final Plan
Call `ExitPlanMode` ONLY AFTER VERDICT: PASS. The human approves a reviewer-cleared plan, not a raw draft.
