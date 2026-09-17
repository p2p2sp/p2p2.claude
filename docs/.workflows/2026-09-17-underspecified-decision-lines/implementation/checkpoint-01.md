# checkpoint review

## Gates

- Build - none - the plan moves markdown and one bash script; nothing compiles
- Tests - pass - 36s

## Findings

### Critical

- C1 - Answered stop re-raised at the task gate - superdev/agents/superbuild-task-reviewer.md:40 - the per-task reviewer treats any `DECISION:` line in the notes as Important on its own, but `superdev/references/review-contract.md:405` (`## Implementor stop`) keeps those lines in the notes file across the re-dispatch ("a notes file appended to across re-dispatches keeps the earlier stop's lines, and those are closed") and marks them in no way, while `superdev/skills/superbuild/SKILL.md:107` dispatches this reviewer with `plan-header`, `task`, `notes` and `report` only - it has no `decisions` label and no way to tell an open stop from a closed one - why it matters: on the Super track every task that uses the build's own new stop path is guaranteed a false Important at its gate after the user has already answered, which burns a fix dispatch on a non-issue, can exhaust the 3-round cap and escalates to the user; the implementor recorded this in `task-05-notes.md` as a `CARRY:` - how to fix: give the closed line a closure marker the reviewer can see (the orchestrator or the implementor rewriting an answered `DECISION:` line), or add a `decisions` label to `superbuild-task-reviewer.md`'s `## Input` and to the step-3 dispatch in `superbuild/SKILL.md`, and scope the rule to a `DECISION:` line no decisions-file line answers.

### Important

- I1 - Delegated copy still a plan defect - superdev/agents/superbuild-task-reviewer.md:38 - step (c) makes any `UNDERSPECIFIED:` line over "text a person reads (B19)" a `NOTE: plan defect`, but B19 as written in `superdev/references/plan-review-checklist.md:109` is cleared by a `copy: implementor, after <existing key or file>` line under `### Contracts`, which is exactly the planner's sanctioned way to hand that text to the implementor; the plan declares that delegation line under Task 4's `### Contracts` as `consumed by ... (Task 5)` and Task 5's text never mentions it - why it matters: a plan that delegates copy correctly still collects a plan-defect note on every task that writes text, which trains the reader to ignore the one channel this build added for real plan defects - how to fix: add the exception to step (c): text covered by a `copy:` line under the task's `### Contracts` is a deliberate delegation and raises nothing.

## Debt

- M1 - Naming missing the fix pointer - `## Naming` (superdev/references/review-contract.md:66) enumerates `decision 3`, `phase 01`, `Task 3`, `criterion 3`, `C2`, `B3` and `#3`, while the same file now writes `` `<title>` (fix 02) `` at line 323 and `` `<fix title>` (fix <NN>) `` at line 422, and both orchestrators point at `## Naming` as the owner of that form. The `D<n>` class added to `## Finding IDs` is likewise absent from the enumeration.
- M2 - Integration placeholder not widened - superdev/skills/superplan/templates/plan.md:19 and superdev/skills/simpleplan/templates/plan.md:38 still read `<command that runs the host's integration or end-to-end suite over that scope>`, while the block's own intro paragraph and checklist class B21 now send a whole-repository build or a full unit suite to that same subsection.
- M3 - Corrupted sentence in simpleplan - superdev/skills/simpleplan/SKILL.md:23 reads "is in your king context". It arrived in the delta through commit 03669f1 (`chore: minor updates`), not through a plan task, but it ships in a skill prompt.

## Notes

NOTE: the same chore commit 03669f1 narrows `.claude/rules/_research.md` from `paths: "**/*.*"` to `"super*/*.*"`, which matches only files sitting directly in a `super*/` directory, not the `superdev/skills/**` and `superdev/agents/**` files this plan actually moves. Outside every task's `### Files`; flagged because it lands in this delta and looks unintended.
NOTE: `docs/notes.md` was committed as part of Task 1 (20a2275) although task-01-notes.md declares no `touched:` line for it - a user edit swept into a task commit, not an implementor change.

## Assessment

The contract, both implementors, both orchestrators, the per-task gate and the planner rules land as one coherent mechanism, but the stop path closes on itself: an answered `DECISION:` line stays in the notes and the per-task reviewer, which is given no way to see that it was answered, is told to raise it as Important.

VERDICT: FAIL
