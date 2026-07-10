---
name: simpleplan
description: Invoked by superdev skill only.
allowed-tools: Read, Write, Edit, Grep, Glob, Agent, Skill, EnterPlanMode, ExitPlanMode
---

**CRITICAL**: Run `EnterPlanMode` tool first, if plan mode is not already active.

# SimplePlan

Default plan mode content drifts: missing files, hidden assumptions. SimplePlan closes that gap with a strict template plus mandatory pre-plan behavior before the plan is presented.

- Input: superdev interview (already in context). No spec — the plan carries its own DoD / acceptance criteria.
- Plan = `How`. Derive goal + acceptance criteria from the interview. Do not re-interview.

## Plan Workflow
This plan workflow is better, extended and more accurate version of default instruction injected by harnes.

### Initial Understanding
Comprehensive understanding of the user's request is in your context. Missing knowledge or open questions → STOP, run `superdev` skill.

### Rules
Load `templates/plan.md` and fill by sticking to the following rules. Write plan file to the disk. Show the full path to the user. Plan file is required for the review.

Stick to the template structure. Don't invent or add your own points. Adapt all content to the template structure and stick to it.

**File Structure**
Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

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

### Self-Review
Once you have written a complete plan and before final review, fast review it with your fresh eyes and check the plan against it. If you find issues, fix them inline. No need to re-review — just fix and move on. If you find a spec requirement with no task, add the task.

### Final Review
Before `ExitPlanMode` invoke the `simpleplan-reviewer` skill (Skill tool, forked context) to make final review. Never call `ExitPlanMode` on a plan that has not returned **VERDICT:** PASS. Track which invocation this is (round 1, round 2, …).

1. Invoke `simpleplan-reviewer` (Skill). The `args` MUST be a labeled block — one `label: value` per line, NOT the bare plan path.
   - **Round 1** — send exactly one line: `plan: <plan-file path>`.
   - **Round 2+, looping back from a fixable-in-draft FAIL** — first save the round context to a sibling file `<plan-file path>.review-<N-1>.md` with exactly:
     ```
     --- Previous review (round <N-1>) ---
     <verbatim previous **VERDICT:** FAIL findings>
     --- Fixes applied since ---
     - <what changed, one line per fix>
     ```
     then pass `plan: <plan-file path>` and `previous-review: <that sibling file path>` on separate lines.
2. Read the first line of its output: **VERDICT:** PASS or **VERDICT:** FAIL, and show the human the Critical/Major findings as a list.
3. **VERDICT:** PASS → proceed to **Final Plan**.
4. **VERDICT:** FAIL:
   - **Fixable-in-draft blockers** → apply the returned corrections to the plan, then go back to step 1 and re-run the reviewer.
   - **Needs-discovery blockers** → STOP looping. Run the `superdev` Skill (or ask the user) to obtain the missing decision, update the plan, then go back to step 1 as a fresh round 1.

### Final Plan
Call `ExitPlanMode` ONLY AFTER **VERDICT:** PASS. The human approves a reviewer-cleared plan, not a raw draft.
