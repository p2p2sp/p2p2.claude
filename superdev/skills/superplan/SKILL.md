---
name: superplan
description: Writes the implementation plan for a reviewed spec. Invoked by the superspec skill only, with the spec path as its argument - never directly, never without a reviewed spec.
allowed-tools: Read, Write, Edit, Grep, Glob, Skill, EnterPlanMode, ExitPlanMode, AskUserQuestion
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
- `### Approach` carries symbol, signature and algorithm only - never line-by-line code, never a failure decision (a `catch`, a fallback, a default on error lives under `### Failure modes`).
- A task that extends a closed set (an enum member, a variant, a status, a kind) lists that set's consumers under `### Contracts`; Grep the type name to find them.
- A task that changes how a response is produced (redirect vs rewrite, proxy vs direct, a status code family) carries a method-and-status matrix under `### Contracts`, one line per method with the status codes before and after.
- A value from outside the process (a header, a path segment, a query parameter, a form field, an environment variable) that enters a path, query, command or routing decision carries its validation rule under `### Contracts` or `### Failure modes`.
- Every contract another task consumes names that task as `consumed by Task <N>`; a value produced and consumed by nobody does not belong in the plan.
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
Once you have written a complete plan and before final review, fast review it with your fresh eyes against the checklist loaded above (`## Blocking classes` B1-B14 plus `## Author self-check`) - the exact rubric the reviewer applies, so a clean self-check is expected to PASS round 1:
- Verify in the repo (Read/Grep/Glob) every `### Files` path and symbol, and every `### Test Commands` command against the repo's real build/test tooling.
- Verify the two-way mapping: every acceptance criterion is covered by at least one task, and every task covers at least one criterion or is traceable to the Goal/spec.
- Verify every task carries `TDD:`, `Model:` and `Effort:` with values from the allowed sets, that each `TDD: required` meets the criteria above, and that no `TDD: required` task sits on `Model: sonnet`.
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
