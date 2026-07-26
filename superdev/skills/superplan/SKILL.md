---
name: superplan
description: Invoked by superspec skill only.
allowed-tools: Read, Write, Edit, Grep, Glob, Skill, EnterPlanMode, ExitPlanMode, AskUserQuestion
disallowed-tools: NotebookEdit, Task, Agent, WebFetch, WebSearch
user-invocable: false
---

**CRITICAL**: Run `EnterPlanMode` tool first, if plan mode is not already active.

# SuperPlan

Default plan mode content drifts: missing files, hidden assumptions. SuperPlan closes that gap with a strict template plus mandatory pre-plan behavior before the plan is presented.

- Input: superdev interview (already in context).
- Spec: <path/to/spec.md>, path passed by superspec. Spec is human-approved knowledge of `What & Why` - do not re-approve it.
- Plan = `How` only. `What & Why` are fixed in the spec - do not restate or renegotiate them.

## Plan Workflow
This plan workflow is better, extended and more accurate version of default instruction injected by harnes.

### Initial Understanding
Comprehensive understanding of the user's request is in your context. Missing knowledge or open questions → STOP, run `superdev` skill.

### Rules
- Load `templates/plan.md` and fill by sticking to the following rules.
- Read review checklist from `${CLAUDE_PLUGIN_ROOT}/references/plan-review-checklist.md`.

**File Structure**
Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

Stick to the template structure. Don't invent or add your own points. Adapt all content to the template structure and stick to it.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- You reason best about code you can hold in context at once, and your edits are more reliable when files are focused. Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.

This structure informs the task decomposition. Each task should produce self-contained changes that make sense independently.

**Task Sizing**
A task is the smallest unit that carries its own test cycle and is worth a fresh reviewer's gate. When drawing task boundaries: fold setup, configuration, scaffolding, and documentation steps into the task whose deliverable needs them; split only where a reviewer could meaningfully reject one task while approving its neighbor. Each task ends with an independently testable deliverable.

**Remember**
- Small, independently testable tasks.
- Exact file paths always.
- Exact commands with expected output
- DRY, YAGNI, SRP, SOLID

**TDD Discipline**
Every task gets `TDD: required` marker, unless it changes no runtime behavior (pure config / docs / mechanical rename / scafolding) - then mark it as `TDD: none`.

### Self-Review
Once you have written a complete plan and before final review, fast review it with your fresh eyes against the checklist loaded above (`## Blocking classes` B1-B7 plus `## Author self-check`) - the exact rubric the reviewer applies, so a clean self-check is expected to PASS round 1:
- Verify in the repo (Read/Grep/Glob) every `### Files` path and symbol, and every `### Test Commands` command against the repo's real build/test tooling.
- Verify the two-way mapping: every acceptance criterion is covered by at least one task, and every task covers at least one criterion or is traceable to the Goal/spec.
- When the host repo carries `docs/product/`, verify the plan does not contradict the affected feature's doc. A contradiction is an unresolved design decision - STOP, run `superdev` skill.
- Fix any violation inline. No need to re-review - just fix and move on. If you find a spec requirement with no task, add the task.

## Final Review
Always before `ExitPlanMode` must invoke `superplan-reviewer` skill (Skill tool, forked context) to make final review. Never call `ExitPlanMode` on a plan that has not returned **VERDICT:** PASS. Track which invocation this is (round 1, round 2, …).

The reviewer is read-only: it edits nothing and returns issues derivable from the plan + spec + repo (`FINDINGS:`) plus what it could not resolve for lack of a decision (`BLOCKED:`), plus advisory `NOTES:` that never block a PASS. Every fix is yours to apply.

1. Invoke `superplan-reviewer` (Skill). The `args` MUST be a labeled block, one `label: value` per line. Every value is a PATH - the reviewer reads the files itself; NEVER paste file content. A bare path with no label is equally wrong:
   ```
   plan: <plan-file path>
   spec: <spec path>
   checklist: <checklist path from ### Rules>
   round: <N>
   ```
   `round` starts at 1 and increments by 1 each invocation of this loop for the current plan. From round 2 on, also append one `prior-blocking: <finding>` line per FINDINGS (and BLOCKED) entry the previous round returned, verbatim.
2. Read the first line of its output: **VERDICT:** PASS or **VERDICT:** FAIL, and concise show the human the FINDINGS, any BLOCKED findings, and any NOTES.
3. **VERDICT:** PASS → relay any NOTES to the user together with the final plan; never edit the plan file after PASS - the approval gate re-arms on any post-verdict write. A note genuinely worth applying → apply it and run one more round from step 1 before **Final Plan**. Otherwise proceed straight to **Final Plan**.
4. **VERDICT:** FAIL - apply the fixes to the plan file yourself, then go back to step 1:
   - **`FINDINGS`** → edit the plan as each one directs; touch nothing else. Exception - a Blocking finding whose evidence you can show is factually wrong (repo state, the spec, or the confirmed understanding already in your context contradicts it) → do not re-loop on it; instead present that single finding plus your counterargument to the user in plain prose and apply their ruling.
   - **`BLOCKED` findings present** → resolve each from the spec and the confirmed understanding already in your context and edit the plan accordingly; a finding needing a genuinely open design decision → run the `superdev` Skill (or ask the user) first.
5. **Round cap:** after round 3 without PASS, STOP looping - show the user the remaining findings and let them decide how to proceed.

### Final Plan
Call `ExitPlanMode` ONLY AFTER **VERDICT:** PASS. The human approves a reviewer-cleared plan, not a raw draft.
