# Tighten the viber instructions

Build: skill `implementor`

## Goal

The viber skills, agents and references carry a handful of contradictory or ambiguous rules and a large share of prose written for a human reader rather than for the agent executing them. That lengthens deliberation on every dispatch, and the implementor skill sits at the size Claude Code re-attaches after a compaction, so its tail can be lost mid-build. This change fixes the contradictions and cuts the prose to the rules an agent acts on, without dropping a single contract.

## Acceptance criteria

1. A coder that resumes interrupted work, retries its own failed attempt or repairs a review report keeps the code already in the tree: it writes a test for each behaviour of that code no existing test covers and sees each such test fail once by breaking its assertion, while any new behaviour still goes test-first; no line in the TDD discipline or the coder tells such a coder to delete that code.
2. The implementor defines its four answers (retry, skip, accept, abort) once and handles every agent return in one condition-to-action line; it creates no task-list entry for the planner's architecture-decision switch; a coder sent back after a failed review runs on its task's own tier; no branch sends the reader to another branch's answer, and every abort reads the same way.
3. The planner's task rules and contract rules live in one shared plugin reference, each rule tagged either as enforced by the index script or as gated by the plan reviewer; the planner and the plan reviewer both read it and neither restates it; the planner shows the written plan's path once.
4. The task reviewer treats an open decision no test pins down as blocking only on a task that requires TDD; on any other task it checks that decision against the task's done condition and verification alone; the repository rule quoting the reviewer's calibration quotes its current wording.
5. The test runner reports a failed build as a failure with a report, not only failing tests.
6. The memory auditor's write-scope sentence reads one way only; neither auditor nor the memory and rules skills explain the audit line's counters; the knowledge writers keep their scope boundary without narrating the agent beside them.
7. The idea interview's option-numbering rule matches its own example.
8. The test strategy marks each blocking rule where the rule itself is stated, and carries no separate list repeating them.
9. The e2e writer's status-line instruction is one sentence.
10. The closeup agent and both knowledge auditors run at medium effort on their current model.
11. Every changed file is at or under its character ceiling (the implementor and the viber node at 12000, the TDD discipline at 3500, every other file at the ceiling its task names), or the coder's notes name each rule that kept it over.
12. Every contract survives unchanged: input labels, output lines, verdict vocabulary, script invocations, `allowed-tools` and `disallowed-tools`.
13. No rationale written for a human reader and no narrative about the caller remains in a skill or agent body, except a one-clause reason where the agent must generalize from it.
14. The skill-designer lint reports zero FAIL on every changed skill and agent, and no changed file contains an em dash or an en dash.
15. The viber node carries only contracts spanning several files, true against the files this change leaves.

## Scope

### File map

- add - viber/references/plan-rules.md - the planner's task and contract rules, each tagged, read by the planner and the plan reviewer
- modify - viber/skills/tdd/SKILL.md - the Red-Green-Refactor cycle, plus the exception for existing work
- modify - viber/agents/task-coder.md - the coder's contract, trimmed
- modify - viber/references/test-strategy.md - test layering, blocking rules tagged inline
- modify - viber/agents/task-reviewer.md - the task gate, open-decision rule fixed
- modify - .claude/rules/review-findings.md - the repository rule quoting the reviewer's and coder's severity wording
- modify - viber/skills/planner/SKILL.md - the planning workflow, rules moved out
- modify - viber/agents/planner-review.md - the plan gate, reading the shared rules
- modify - viber/skills/implementor/SKILL.md - the build orchestrator, one answer grammar
- modify - viber/agents/test-runner.md - the suite runner, build failure reported
- modify - viber/agents/qa-writer.md - the QA writer, trimmed
- modify - viber/agents/closeup.md - the run closer, effort and narration
- modify - viber/skills/memory/SKILL.md - the memory review command, trimmed
- modify - viber/skills/rules/SKILL.md - the rules review command, trimmed
- modify - viber/agents/memory-auditor.md - the memory auditor, write scope and effort
- modify - viber/agents/rules-auditor.md - the rules auditor, effort
- modify - viber/agents/memory-writer.md - the memory writer, trimmed
- modify - viber/agents/rules-writer.md - the rules writer, trimmed
- modify - viber/skills/e2e/SKILL.md - the e2e command, trimmed
- modify - viber/agents/e2e-writer.md - the e2e writer, status line
- modify - viber/skills/idea/SKILL.md - the interview, numbering rule
- modify - viber/skills/fixer/SKILL.md - the diagnosis skill, trimmed
- modify - viber/CLAUDE.md - the plugin's dev-time node, compacted

### Out of scope

- Every script under `viber/scripts/`, `viber/hooks/` and the skills' `scripts/` directories.
- The plan templates under `viber/skills/planner/templates/` and `viber/skills/planner/references/adr-tasks.md`.
- `viber/README.md` and `viber/skills/setup/assets/usage.md`, unless a fact they state changes.
- The root `CLAUDE.md`, `.claude/rules/agent-frontmatter.md`, `viber/skills/setup/SKILL.md`, `viber/references/qa-format.md`, `viber/references/rule-admission.md`, `viber/.claude-plugin/plugin.json`.
- Every other plugin.
- The `BLOCKED` verdict of the closeup agent and the e2e writer: each is read by a different caller.
