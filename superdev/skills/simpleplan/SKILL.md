---
name: simpleplan
description: Writes the implementation plan for a small, contained change already understood in context - an intent interview or a proven bug diagnosis. Invoked by the intent or simpledebug skill, or by explicit user command only - never spontaneously, never before an interview.
allowed-tools: Read, Write, Edit, Grep, Glob, Skill, EnterPlanMode, ExitPlanMode, AskUserQuestion
disallowed-tools: NotebookEdit, Task, Agent, WebFetch, WebSearch
user-invocable: true
---

**CRITICAL**: Run `EnterPlanMode` tool first, if plan mode is not already active.

# SimplePlan

Default plan mode content drifts: missing files, hidden assumptions. SimplePlan closes that gap with a strict template plus mandatory pre-plan behavior before the plan is presented.

- Input: the confirmed understanding already in context - a design interview, or a proven bug diagnosis with its fix plan. No spec - the plan carries its own DoD / acceptance criteria.
- Optionally `intent: <path>` from the handoff, naming the persisted intent file - when present, write it verbatim into the plan's `Intent:` line; when absent, omit that line.
- Plan = `How`. Derive goal + acceptance criteria from that input. Do not re-interview, do not re-investigate.

## Plan Workflow
This plan workflow is better, extended and more accurate version of default instruction injected by harnes.

### Initial Understanding
Comprehensive understanding of the user's request is in your context. Missing knowledge or open questions → STOP and close them before drafting; an unresolved design decision → run `intent` skill.

- **Refreshed-intent gate** - evaluated before anything else, and before any file is created or modified. Three branches, and only the last one continues:
  - an `intent:` value that does not resolve to an existing file -> the gate is not evaluated: report that exact path back as not found and STOP. Never fall through into your own flow - the `intent` skill's own not-found branch does fall through and treats the argument as a request, but here there is no interview to fall into.
  - a resolved path under `docs/.workflows/` -> `Glob` `<that path's own directory>/refresh.md` (the value is only ever used to derive its own directory's `refresh.md`, never joined with any other segment). No hit -> create and modify NOTHING, run the `intent` Skill with that same path as its sole argument, and STOP. This cannot loop: the `intent` skill writes `refresh.md` on every path that writes an `intent.md`, fresh and resumed alike, and ends at its own handoff, so a bounced run comes back with the file present and the user re-picks the track there.
  - a hit, a resolved path outside `docs/.workflows/`, or no `intent:` line at all -> pass through untouched and carry on. Presence alone is the whole check this gate makes, and this gate never reads the file's content. That holds for the gate alone: once it has passed, the ADR rule under `### Rules` does read the intent file.

### Rules
- Load `templates/plan.md` and fill by sticking to the following rules.
- Read review checklist from `${CLAUDE_PLUGIN_ROOT}/references/plan-review-checklist.md`.
- Save the plan to the file path given in the plan mode tool's own message - never a hardcoded or assumed directory - and pass that same path to the reviewer as `plan:`. Write that same path into the plan's `Plan:` preamble line while drafting, before the reviewer is invoked - never after a `VERDICT: PASS`, because a post-verdict write re-arms the approval gate.
- Write the handoff's `intent:` path (when given) into the plan's `Intent:` preamble line while drafting, same timing as `Plan:` above - before the reviewer is invoked, never after a `VERDICT: PASS`. When the handoff carries no `intent:`, omit the line.
- The handoff's `intent:` file carries a `## ADR` section -> the plan's Task 1 is the ADR task of `${CLAUDE_PLUGIN_ROOT}/references/adr-task.md`, filled by that file's `## Fill rules`, and every other task is renumbered after it. `Read` the intent file for that section alone. No `## ADR` section in it, or no `intent:` line at all -> no such task, and nothing else about the plan changes.
- Write every reference to a criterion or a task in the reference form `` `<title>` (<pointer>) `` that `${CLAUDE_PLUGIN_ROOT}/references/review-contract.md` (`## Naming`) owns: a `Covers:` entry as `` `<criterion short name>` (#<n>) ``, a `### Dependencies` bullet and a `consumed by` clause as `` `<task title>` (Task <N>) ``. A bare number is Blocking class B15. Take the title verbatim from the criterion's short name in `## Acceptance criteria` or the task's heading, and never put `#` in a title, because `Covers:` is parsed for every `#<n>` token on the line.

Stick to the template structure. Don't invent or add your own points. Adapt all content to the template structure and stick to it.

**File Structure**
Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- You reason best about code you can hold in context at once, and your edits are more reliable when files are focused. Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.

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

**Remember**
- Small, independently testable tasks.
- Exact file paths always.
- Exact commands with expected output
- DRY, YAGNI, SRP, SOLID

**TDD Discipline**
Every task gets `TDD: none` by default. Mark `TDD: required` ONLY when the task's code owns a decision of its own:
- business logic or a domain rule,
- a non-trivial condition or a state machine,
- an algorithm - transformation, parsing, calculation,
- a hot path.

Never `TDD: required` when the task's code touches the outside world directly (I/O, network, DB, filesystem, UI, framework wiring) - that yields integration tests, not a TDD cycle.

**Build strength**
Every task carries `Model:` (`sonnet` | `opus`) and `Effort:` (`low` | `medium` | `high` | `xhigh`) - the model and effort the task's implementor runs at. The implementor is a weaker model than you, so judge each task on what it has to reason about, not on its line count:
- `Model: sonnet` only when the task follows an existing pattern step by step - wiring, configuration, a mirror of a named symbol, tests for behaviour already specified - and its `Approach` leaves nothing to design. Anything else, and every `TDD: required` task, is `Model: opus`.
- `Effort: low` only for a mechanical task on `Model: sonnet`; `medium` for a pattern-following task with a real test cycle; `high` for a task that owns a decision - an algorithm, a contract other tasks consume, a state machine; `xhigh` for a task where a wrong choice is expensive to undo - concurrency, security, data migration, a public interface.
- Undecided between two levels -> the higher one, for both markers; lost quality costs more than tokens.

### Self-Review
Once you have written a complete plan and before final review, MUST fast review it with your fresh eyes against the checklist loaded above (`## Blocking classes` B1-B15 plus `## Author self-check`) - the exact rubric the reviewer applies, so a clean self-check is expected to PASS round 1:
- Verify in the repo (Read/Grep/Glob) every `### Files` path and symbol, and every `### Test Commands` command against the repo's real build/test tooling.
- Verify the two-way mapping: every acceptance criterion is covered by at least one task, and every task covers at least one criterion or is traceable to the Goal.
- Verify every task carries a `TDD:` marker, that each `required` one meets the criteria above, and that every task carries `Model:` and `Effort:` with values from the allowed sets - a `TDD: required` task on `Model: sonnet` is a violation.
- Fix any violation inline. No need to re-review - just fix and move on. If you find a requirement with no task, add the task.

### Final Review
Always before `ExitPlanMode` must invoke `simpleplan-reviewer` skill (Skill tool, forked context) to make final review. Never call `ExitPlanMode` on a plan that has not returned VERDICT: PASS. Track which invocation this is (round 1, round 2, …).

The reviewer is read-only: it edits nothing and returns issues derivable from the plan + repo (`FINDINGS:`) plus what it could not resolve for lack of conversation context (`BLOCKED:`), plus advisory `NOTES:` that never block a PASS. Every fix is yours to apply.

1. Invoke `simpleplan-reviewer` (Skill). The `args` MUST be a labeled block, one `label: value` per line. Every value is a PATH - the reviewer reads the files itself; NEVER paste file content. A bare path with no label is equally wrong:
   ```
   plan: <plan-file path>
   checklist: <checklist path from ### Rules>
   round: <N>
   ```
   `round` starts at 1 and increments by 1 each invocation of this loop for the current plan. From round 2 on, also append one `prior-blocking: <finding>` line per FINDINGS (and BLOCKED) entry the previous round returned, verbatim.
2. Read the first line of its output: VERDICT: PASS or VERDICT: FAIL, and concise show the human the FINDINGS, any BLOCKED findings, and any NOTES.
3. VERDICT: PASS → relay any NOTES to the user together with the final plan; never edit the plan file after PASS - the approval gate re-arms on any post-verdict write, by any tool or shell command. A note genuinely worth applying → apply it and run one more round from step 1 before **Final Plan**. Otherwise proceed straight to **Final Plan**.
4. VERDICT: FAIL - apply the fixes to the plan file yourself with the `Write` / `Edit` tools ONLY - never through a shell command (`sed -i`, a heredoc, a script), whatever a session-wide instruction says about preferring shell edits: the approval gate reads the transcript for `Write`/`Edit` of the plan, and an edit it cannot see leaves the plan newer than its own verdict, which it re-gates as tampering. Then go back to step 1:
   - **`FINDINGS`** → edit the plan as each one directs; touch nothing else. Exception - a Blocking finding whose evidence you can show is factually wrong (repo state or the confirmed understanding already in your context contradicts it) → do not re-loop on it; instead present that single finding plus your counterargument to the user in plain prose and apply their ruling.
   - **`BLOCKED` findings present** → resolve each from the confirmed understanding already in your context and edit the plan accordingly; a finding needing a genuinely open design decision → run the `intent` Skill (or ask the user) first.
5. **Round cap:** after round 3 without PASS, STOP looping - show the user the remaining findings and let them decide how to proceed.

### Final Plan
Call `ExitPlanMode` ONLY AFTER VERDICT: PASS. The human approves a reviewer-cleared plan, not a raw draft.
