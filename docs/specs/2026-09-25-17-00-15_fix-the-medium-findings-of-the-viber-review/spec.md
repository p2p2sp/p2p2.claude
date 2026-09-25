# Fix the medium findings of the viber review

Build: skill `implementor`

## Goal

The viber review (`.temp/viber-review/report.md`) found nine medium defects: a fail-open hole in the plan gate, silent loss of contract text on landing, an orchestrator profiling tasks on fields it cannot see, a triage that ignores `issues: false`, broken run branch names, an e2e skill that cannot stop a writer's leftover processes, a setup that leaves no settings file without node, and two documentation claims that contradict the skills. On top of that, the `intent` interview invents questions when the conversation and the code already answer everything. Each defect is fixed on its own, and every script fix is proven by a test. Skill and agent text follows the repo's skill-designer doctrine and grows no more than the fix needs.

## Acceptance criteria

1. With a `planner-review` dispatch that carries a tool-use id and has not returned yet, a later `VERDICT: PASS` belonging to another tool call or agent does not let `ExitPlanMode` through; a dispatch without an id still pairs with the first verdict after it.
2. An HTML comment inside a fenced code block of a plan survives `plan-path.sh --land` and the `spec.md` cut of `plan-index.sh --split`, together with every other line of that block; comments outside fences are still stripped.
3. The `plan-index.sh` index tells the orchestrator, per task, which contract blocks it writes that another task consumes and what its `Verification` command is, and `implementor` decides a task's tier and review from those, never from fields it cannot see.
4. Under `issues: false`, `triage` never fetches or publishes an issue and never names a next step in the `#<N>` form; under `issues: true` its behaviour is unchanged.
5. A `branching.name` pattern whose placeholder expands to nothing never yields a branch name starting or ending with `/`, and a pattern that expands to nothing at all makes the landing refuse the run branch, the way it refuses any other invalid branch name, with a reason naming the empty name.
6. The `e2e` skill answers a writer's "stopped with background work" notice and a reply with no `VERDICT:` line the same way `implementor` does.
7. `merge-settings.sh` with no `node` on PATH and no target file creates the target from the template.
8. `viber/README.md` says viber suggests the interview first, not that it starts it.
9. `usage.html` no longer says the intent and fixer step writes nothing, in either language.
10. When the conversation and the code already answer everything the `intent` summary needs, the interview asks no question and goes straight to the confirmation summary.

## Scope

### File map

- modify - viber/hooks/scripts/plan-gate.sh - dispatch-to-verdict pairing by tool-use id
- modify - tests/viber/plan-gate.test.ts - the foreign PASS while the own review is in flight
- modify - viber/scripts/plan-path.sh - guidance-comment strip on landing, fence aware
- modify - tests/viber/plan-path.test.ts - fence cases of the strip; branch name cases
- modify - viber/scripts/plan-index.sh - `spec.md` comment strip, fence aware; the index's new column and lines
- modify - tests/viber/plan-index.test.ts - fence case of the `spec.md` cut; the new index shape
- modify - viber/skills/implementor/SKILL.md - profiling read from the index's new fields
- modify - viber/skills/triage/SKILL.md - `config.sh` preload and the `issues: false` branch
- modify - viber/scripts/run-branch.sh - branch name expansion and the empty-name refusal
- modify - viber/skills/e2e/SKILL.md - `SendMessage` and the two notice answers
- modify - viber/skills/setup/scripts/merge-settings.sh - missing target created before the node check
- modify - tests/viber/merge-settings.test.ts - no node, no target
- modify - viber/README.md - `issues` row names triage; interview is suggested, not forced
- modify - viber/skills/setup/assets/usage.html - `issues` entry names triage; intent and fixer step wording
- modify - viber/skills/intent/SKILL.md - no-question path straight to the summary

### Out of scope

- Every low finding (L1 to L19) and the informational note of the report.
- The dev-time rules under `.claude/rules/` the report lists as outside the plugin.
- Every `CLAUDE.md` node, `viber/CLAUDE.md` included: the `memory` switch is on, so the build's close records the new index shape, the e2e half of "Stop what you started" and the triage switch handling.
- How `planner` phrases its branch question when the `--branch` report's `new:` name is empty: only the landing refuses an empty name.
- Any other parser of the plan format (`commit-task.sh`, `archive-run.sh`, `run-branch.sh`'s `plan_type()`) and task markers inside fenced blocks.
