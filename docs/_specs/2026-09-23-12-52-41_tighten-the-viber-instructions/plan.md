---
source: C:/Users/dario/.claude-dario/plans/tingly-juggling-storm.md
---

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

## Tasks

<!-- TASK -->
### T1 - Reconcile the TDD discipline with a resumed coder and trim both
- TDD: none
- Covers: #1, #11, #12, #13, #14
- Uses: C1
- Depends-on: none
- Files: viber/skills/tdd/SKILL.md, viber/agents/task-coder.md
- Delivers: the TDD skill carrying the existing-work exception for the three input labels of C1 and nothing that `viber/references/test-strategy.md` already states, with no per-cycle checklist repeating the VERIFY steps, no generic design advice and no all-caps emphasis; the coder's contract with its human-facing rationale cut and every label and output line kept
- Verification: from the repository root, `wc -c viber/skills/tdd/SKILL.md viber/agents/task-coder.md; grep -cP '\x{2013}|\x{2014}' viber/skills/tdd/SKILL.md viber/agents/task-coder.md; grep -cF '`resume`' viber/skills/tdd/SKILL.md viber/agents/task-coder.md; bash "C:/Users/dario/.claude-dario/plugins/cache/p2p2/supercc/0.56.1/skills/skill-designer/scripts/lint_skill.sh" viber/skills/tdd | tail -1; bash "C:/Users/dario/.claude-dario/plugins/cache/p2p2/supercc/0.56.1/skills/skill-designer/scripts/lint_skill.sh" viber/agents/task-coder.md | tail -1` -> the TDD skill at or under 3500 characters and the coder at or under 5800, both dash counts 0, the `resume` label counted at least once in both files, both lint lines `FAIL=0`
- DoD: the TDD skill states that on `resume`, `reason` or `report` the code in the tree is kept, each of its behaviours no existing test covers gets a test seen failing once by breaking its assertion, an existing test is left as it is, and new behaviour goes test-first; no sentence in either file tells a coder holding existing work to delete it; the TDD skill restates no rule of `viber/references/test-strategy.md` and has no checklist repeating VERIFY RED and VERIFY GREEN; the TDD skill has no all-caps sentence; the coder keeps every input label (`task`, `report`, `notes`, `out`, `refs`, `spec`, `reason`, `resume`, `deferred`, `prior`) and every output line (`VERDICT`, `REASON`, `FILES`, `DOD`, `EXTRA`, `DEFERRED`); the coder keeps verbatim "fix every Blocking finding at its stated location, and a Minor one only when the fix is trivial and local."; the TDD skill is at or under 3500 characters and the coder at or under 5800, or the notes name each rule that kept a file over; neither file has an em dash or an en dash; lint reports `FAIL=0` on both
<!-- /TASK -->

<!-- TASK -->
### T2 - Tag the blocking test rules inline and fix the reviewer's open-decision rule
- TDD: none
- Covers: #4, #8, #11, #12, #13, #14
- Uses: C2
- Depends-on: none
- Files: viber/references/test-strategy.md, viber/agents/task-reviewer.md, .claude/rules/review-findings.md
- Delivers: the test strategy with every rule of its former blocking list tagged per C2 at the place the rule is stated and the separate list removed, the paragraph on the three exempt test shapes kept; the task reviewer raising every tagged rule, applying the open-decision finding only on `TDD: required`, and cut of human-facing rationale; the repository rule's quotations matching the reviewer's and the coder's current wording
- Verification: from the repository root, `wc -c viber/references/test-strategy.md viber/agents/task-reviewer.md; grep -c '^## Blocking findings' viber/references/test-strategy.md; grep -cF '(blocking)' viber/references/test-strategy.md viber/agents/task-reviewer.md; grep -cP '\x{2013}|\x{2014}' viber/references/test-strategy.md viber/agents/task-reviewer.md .claude/rules/review-findings.md; bash "C:/Users/dario/.claude-dario/plugins/cache/p2p2/supercc/0.56.1/skills/skill-designer/scripts/lint_skill.sh" viber/agents/task-reviewer.md | tail -1` -> the strategy at or under 4800 characters and the reviewer at or under 4600, the heading count 0, the tag counted at least 8 times in the strategy and at least once in the reviewer, all dash counts 0, lint `FAIL=0`
- DoD: each of the eight former blocking items is tagged at the rule stating it and the section `## Blocking findings` is gone; the exempt-shapes paragraph survives; the reviewer raises every tagged rule where the work added or changed tests; the reviewer's open-decision finding applies only on `TDD: required` and on `TDD: none` the decision is checked against `DoD` and `Verification`; the reviewer keeps every input label (`task`, `notes`, `out`, `refs`, `report`, `deferred`) and every output line (`VERDICT: PASS`, `VERDICT: FAIL`, `VERDICT: DENIED`, `REVIEW`, `REASON`, `EXTRA`); every sentence `.claude/rules/review-findings.md` quotes from the reviewer or the coder appears verbatim in that file; the strategy is at or under 4800 characters and the reviewer at or under 4600, or the notes name each rule that kept a file over; no file of this task has an em dash or an en dash; lint reports `FAIL=0` on the reviewer
<!-- /TASK -->

<!-- TASK -->
### T3 - Move the plan rules into one reference the planner and its reviewer share
- TDD: none
- Covers: #3, #11, #12, #13, #14
- Uses: C2, C3
- Depends-on: T2
- Files: viber/references/plan-rules.md, viber/skills/planner/SKILL.md, viber/agents/planner-review.md
- Delivers: `viber/references/plan-rules.md` holding every task rule and contract rule the planner carried, the rule that everything above `## Tasks` is WHAT and WHY, and every plan-reviewer check it moves, in the C3 shape, a rule the script checks only in part split into a `(script)` line and a `(review)` line; the planner reading it at the start of step 2, before the specification half and on a draft round as well, restating none of it, showing the written plan's path once, cut of human-facing rationale; the plan reviewer reading it through `refs`, gating every `(review)` rule, keeping only the checks the reference does not carry, and raising every C2-tagged rule of the test strategy
- Verification: from the repository root, `wc -c viber/references/plan-rules.md viber/skills/planner/SKILL.md viber/agents/planner-review.md; grep -cF 'plan-rules.md' viber/skills/planner/SKILL.md viber/agents/planner-review.md; grep -c '(script)$' viber/references/plan-rules.md; grep -cF '(script)' viber/skills/planner/SKILL.md; grep -cF '(blocking)' viber/references/test-strategy.md viber/agents/planner-review.md; grep -cP '\x{2013}|\x{2014}' viber/references/plan-rules.md viber/skills/planner/SKILL.md viber/agents/planner-review.md; bash "C:/Users/dario/.claude-dario/plugins/cache/p2p2/supercc/0.56.1/skills/skill-designer/scripts/lint_skill.sh" viber/skills/planner | tail -1; bash "C:/Users/dario/.claude-dario/plugins/cache/p2p2/supercc/0.56.1/skills/skill-designer/scripts/lint_skill.sh" viber/agents/planner-review.md | tail -1` -> the reference at or under 6500 characters, the planner at or under 7500, the reviewer at or under 3800; the reference named at least once in both readers; 8 rule lines ending in `(script)` in the reference and `(script)` counted 0 in the planner; `(blocking)` counted at least once in both files; all dash counts 0; both lint lines `FAIL=0`
- DoD: every rule of the planner's former task rules and contract rules is in the reference; the reference carries 8 `(script)` rule lines, one per check the planner tags today, its last contract rule split into two (a `File:` path in no task's `Files` and not in the tree; no task holding the file naming the block), and a rule the script checks only in part keeps its judged part as a separate `(review)` line; every current plan-reviewer check is either a `(review)` rule of the reference (Covered, Split right, Supplied, Owned, Ordered, Provable, Reproduced, Layered, every clause of each) or a check the reviewer keeps (Complete, Decomposed, Buildable, Grounded, Sliced right, the big spec shape checks); the planner reads the reference at the start of step 2, before the specification half, on a draft round as well, and carries none of its rules; the planner shows the written plan's path once in step 2 and a draft's landed path once in step 4, with no path display ahead of step 1; the reviewer gates every `(review)` rule and keeps only Complete, Decomposed, Buildable, Grounded, Sliced right, the big spec shape checks, Calibration and Output of its own; the reviewer's `scope: spec` subset names its rules by the names the reference gives them; the reviewer raises every `(blocking)` rule of the test strategy; the planner's `allowed-tools` and the reviewer's `tools` are unchanged; the reviewer's output keeps `VERDICT: PASS`, `VERDICT: FAIL` and `FINDINGS`; the three files are at or under 6500, 7500 and 3800 characters, or the notes name each rule that kept a file over; none has an em dash or an en dash; lint reports `FAIL=0` on the planner and the reviewer
<!-- /TASK -->

<!-- TASK -->
### T4 - Give the implementor one answer grammar
- TDD: none
- Covers: #2, #11, #12, #13, #14
- Uses: C1
- Depends-on: none
- Files: viber/skills/implementor/SKILL.md
- Delivers: the implementor with retry, skip, accept and abort defined once, one condition-to-action line per agent return in steps 4 and 5, the denied-call handling, the task-list pairing and the final-summary items each stated once, no task-list entry for the `adr` switch, a coder after a failed review on its task's own tier, and cut of human-facing rationale
- Verification: from the repository root, `wc -c viber/skills/implementor/SKILL.md; for f in --skip --with --defer --unreviewed --repair --chore --qa; do grep -qF -- "$f" viber/scripts/commit-task.sh && grep -qF -- "$f" viber/skills/implementor/SKILL.md || echo "missing $f"; done; grep -cE 'above does|below does' viber/skills/implementor/SKILL.md; grep -cE 'memory.*rules.*qa.*cleanup' viber/skills/implementor/SKILL.md; grep -cF 'one entry per switch' viber/skills/implementor/SKILL.md; grep -cP '\x{2013}|\x{2014}' viber/skills/implementor/SKILL.md; bash "C:/Users/dario/.claude-dario/plugins/cache/p2p2/supercc/0.56.1/skills/skill-designer/scripts/lint_skill.sh" viber/skills/implementor | tail -1` -> at or under 12000 characters, no `missing` line, the cross-reference count 0, the explicit switch list counted at least once, the generic per-switch wording counted 0, the dash count 0, lint `FAIL=0`
- DoD: the four answers are defined once and each return is one condition-to-action line; the task list gets entries only for the tasks, the final test run and the `memory`, `rules`, `qa` and `cleanup` switches reported `true`; a coder dispatched after a reviewer `VERDICT: FAIL` runs on its task's tier and only the retry after two failed rounds raises it; no branch refers to another branch's answer; every abort reads "stop every dispatch, go to step 7"; every dispatch keeps its labelled lines (`task`, `notes`, `out`, `refs`, `deferred`, `prior`, `reason`, `resume`, `report`, `spec`, `run`); every script call and flag the file uses today is still there, as one literal double-quoted line; `allowed-tools` and `disallowed-tools` are unchanged; the file is at or under 12000 characters, or the notes name each rule that kept it over; it has no em dash or en dash; lint reports `FAIL=0`
<!-- /TASK -->

<!-- TASK -->
### T5 - Tighten the close agents and report a failed build
- TDD: none
- Covers: #5, #10, #11, #12, #13, #14
- Uses: none
- Depends-on: none
- Files: viber/agents/test-runner.md, viber/agents/qa-writer.md, viber/agents/closeup.md
- Delivers: the test runner returning a failed build as a failure whose report names the build command and its first error line, with the tests not run; the QA writer writing its person-facing document in the specification's language, stated once; the closeup agent at `effort: medium` on `model: opus`, with no mention of the QA writer and no sentence explaining why the archive commit matters
- Verification: from the repository root, `wc -c viber/agents/test-runner.md viber/agents/qa-writer.md viber/agents/closeup.md; grep -cE '^effort: medium$' viber/agents/closeup.md; grep -ciF 'build' viber/agents/test-runner.md; grep -cF 'qa-writer' viber/agents/closeup.md; grep -cP '\x{2013}|\x{2014}' viber/agents/test-runner.md viber/agents/qa-writer.md viber/agents/closeup.md; for a in test-runner qa-writer closeup; do bash "C:/Users/dario/.claude-dario/plugins/cache/p2p2/supercc/0.56.1/skills/skill-designer/scripts/lint_skill.sh" viber/agents/$a.md | tail -1; done` -> the three files at or under 1900, 2800 and 2800 characters, the effort count 1, `build` counted at least twice in the runner, `qa-writer` counted 0 in closeup, all dash counts 0, three lint lines `FAIL=0`
- DoD: a failed build returns `VERDICT: FAIL`, `REPORT` and `FAILED`, the report line naming the build command and its first error, and no test runs after it; the QA writer's language rule is one sentence naming the specification's language; closeup carries `effort: medium` and `model: opus`; closeup names no other agent and keeps its one archive call line verbatim; every output line of the three agents is unchanged apart from the runner's build case; the three files are at or under 1900, 2800 and 2800 characters, or the notes name each rule that kept a file over; none has an em dash or an en dash; lint reports `FAIL=0` on all three
<!-- /TASK -->

<!-- TASK -->
### T6 - Trim the knowledge-layer skills and agents
- TDD: none
- Covers: #6, #10, #11, #12, #13, #14
- Uses: none
- Depends-on: none
- Files: viber/skills/memory/SKILL.md, viber/skills/rules/SKILL.md, viber/agents/memory-auditor.md, viber/agents/rules-auditor.md, viber/agents/memory-writer.md, viber/agents/rules-writer.md
- Delivers: the memory auditor's write scope in one unambiguous sentence (its findings file under `out` is the only file it writes); both auditors at `effort: medium` on `model: opus` with no paragraph explaining the audit line's counters; the memory and rules skills with no explanation of those counters and no sentence explaining why the map and notes lines are passed; both writers keeping their scope boundary without narrating the agent beside them; every other human-facing rationale cut
- Verification: from the repository root, `wc -c viber/skills/memory/SKILL.md viber/skills/rules/SKILL.md viber/agents/memory-auditor.md viber/agents/rules-auditor.md viber/agents/memory-writer.md viber/agents/rules-writer.md; grep -cE '^effort: medium$' viber/agents/memory-auditor.md viber/agents/rules-auditor.md; grep -cF 'running beside you' viber/agents/memory-writer.md viber/agents/rules-writer.md; grep -cF 'AUDIT:' viber/agents/memory-auditor.md viber/skills/memory/SKILL.md; grep -cP '\x{2013}|\x{2014}' viber/skills/memory/SKILL.md viber/skills/rules/SKILL.md viber/agents/memory-auditor.md viber/agents/rules-auditor.md viber/agents/memory-writer.md viber/agents/rules-writer.md; for t in skills/memory skills/rules agents/memory-auditor.md agents/rules-auditor.md agents/memory-writer.md agents/rules-writer.md; do bash "C:/Users/dario/.claude-dario/plugins/cache/p2p2/supercc/0.56.1/skills/skill-designer/scripts/lint_skill.sh" viber/$t | tail -1; done` -> the six files at or under 7000, 8000, 2900, 4100, 3800 and 4300 characters, both effort counts 1, both narration counts 0, `AUDIT:` counted at least once in the auditor and the skill, all dash counts 0, six lint lines `FAIL=0`
- DoD: the memory auditor's write-scope sentence names its findings file under `out` as the only file it writes; neither auditor explains its counters; both auditors carry `effort: medium` and `model: opus`; the memory and rules skills explain neither the counters nor why `map`, `notes` and `refs` are passed; neither writer mentions the agent beside it and each still forbids touching the other layer; every input label, the `AUDIT:` line format, the findings vocabulary, the writers' output lines (`VERDICT: UPDATED`, `FILES`, `OVER`, `MOVE`, `VERDICT: NONE`), the reset calls and every `allowed-tools` and `disallowed-tools` are unchanged; the six files are at or under 7000, 8000, 2900, 4100, 3800 and 4300 characters, or the notes name each rule that kept a file over; none has an em dash or an en dash; lint reports `FAIL=0` on all six
<!-- /TASK -->

<!-- TASK -->
### T7 - Trim the e2e skill and writer
- TDD: none
- Covers: #9, #11, #12, #13, #14
- Uses: none
- Depends-on: none
- Files: viber/skills/e2e/SKILL.md, viber/agents/e2e-writer.md
- Delivers: the writer's status-line instruction as one sentence (this ID's line under `## Automation`, replaced or appended through `Edit`, the section created at the end of the file when absent, one line per ID, a `blocked` line naming no path); the writer's rule to leave nothing running without narrating who launched the application; the skill cut of human-facing rationale
- Verification: from the repository root, `wc -c viber/skills/e2e/SKILL.md viber/agents/e2e-writer.md; grep -cF 'skill above you' viber/agents/e2e-writer.md; grep -cF '## Automation' viber/agents/e2e-writer.md viber/references/qa-format.md; grep -cP '\x{2013}|\x{2014}' viber/skills/e2e/SKILL.md viber/agents/e2e-writer.md; bash "C:/Users/dario/.claude-dario/plugins/cache/p2p2/supercc/0.56.1/skills/skill-designer/scripts/lint_skill.sh" viber/skills/e2e | tail -1; bash "C:/Users/dario/.claude-dario/plugins/cache/p2p2/supercc/0.56.1/skills/skill-designer/scripts/lint_skill.sh" viber/agents/e2e-writer.md | tail -1` -> the skill at or under 7200 characters and the writer at or under 5200, the narration count 0, `## Automation` counted at least once in both files, both dash counts 0, both lint lines `FAIL=0`
- DoD: the status-line instruction is one sentence carrying every element listed in `Delivers`; the writer keeps its rule to leave no process running and names no caller; every input label (`handoff`, `id`, `spec-dir`, `base-url`, `refs`), every output line (`VERDICT: PASS`, `VERDICT: BLOCKED`, `VERDICT: FAIL`, `FILE`, `REASON`), every script call and `allowed-tools` and `disallowed-tools` are unchanged; the skill is at or under 7200 characters and the writer at or under 5200, or the notes name each rule that kept a file over; neither has an em dash or an en dash; lint reports `FAIL=0` on both
<!-- /TASK -->

<!-- TASK -->
### T8 - Align the interview numbering and trim the front-door skills
- TDD: none
- Covers: #7, #11, #12, #13, #14
- Uses: none
- Depends-on: none
- Files: viber/skills/idea/SKILL.md, viber/skills/fixer/SKILL.md
- Delivers: the interview's numbering rule stating what its example shows (options numbered by decision, `2.1`, `2.2`, `2.3`, a branch one level deeper); the fixer stating the trace rule once rather than in both its first law and its process steps, with its all-caps sentences in plain case, every law, fix-plan part and the handoff kept
- Verification: from the repository root, `wc -c viber/skills/idea/SKILL.md viber/skills/fixer/SKILL.md; grep -cF '2.1' viber/skills/idea/SKILL.md; grep -cE '^\*\*[0-9]\. [A-Z ]{12,}' viber/skills/fixer/SKILL.md; grep -cF 'viber:planner' viber/skills/idea/SKILL.md viber/skills/fixer/SKILL.md; grep -cP '\x{2013}|\x{2014}' viber/skills/idea/SKILL.md viber/skills/fixer/SKILL.md; bash "C:/Users/dario/.claude-dario/plugins/cache/p2p2/supercc/0.56.1/skills/skill-designer/scripts/lint_skill.sh" viber/skills/idea | tail -1; bash "C:/Users/dario/.claude-dario/plugins/cache/p2p2/supercc/0.56.1/skills/skill-designer/scripts/lint_skill.sh" viber/skills/fixer | tail -1` -> idea at or under 6800 characters and fixer at or under 4200, `2.1` counted at least twice in idea, the all-caps law count 0, `viber:planner` counted at least once in both, both dash counts 0, both lint lines `FAIL=0`
- DoD: the numbering rule and the example in idea use the same scheme; the fixer states the trace rule once; no law of the fixer is written in all caps; the fixer keeps its three laws, its seven fix-plan parts, its reproduction-test rules, its handoff to `viber:planner` and its bypass rule; idea keeps its handoff to `viber:planner`; both frontmatters are unchanged; idea is at or under 6800 characters and fixer at or under 4200, or the notes name each rule that kept a file over; neither has an em dash or an en dash; lint reports `FAIL=0` on both
<!-- /TASK -->

<!-- TASK -->
### T9 - Compact the viber node to its own cap
- TDD: none
- Covers: #11, #14, #15
- Uses: C3
- Depends-on: T1, T2, T3, T4, T5, T6, T7, T8
- Files: viber/CLAUDE.md
- Delivers: the viber node cut to the contracts spanning several files, with no mechanic a script header or a skill body already states, updated to what T1 to T8 left: four plugin-level references with the new one and its two readers, the TDD exception for existing work, the reviewer's open-decision rule, the three agents at medium effort, and effort set by frontmatter alone
- Verification: from the repository root, `wc -c viber/CLAUDE.md; grep -cF 'plan-rules.md' viber/CLAUDE.md viber/agents/planner-review.md; grep -cF 'FOUR plugin-level references' viber/CLAUDE.md; grep -cP '\x{2013}|\x{2014}' viber/CLAUDE.md` -> at or under 12000 characters, `plan-rules.md` counted at least once in both files, the count line counted once, the dash count 0
- DoD: the node is at or under 12000 characters, or the notes name each contract that kept it over; it restates no script header and no skill body; its count line reads four plugin-level references and names the new reference with the planner and the plan reviewer as its readers; it states the TDD exception for existing work, the reviewer's open-decision rule, the three agents at medium effort and that effort is set only by frontmatter; every fact it states is true against the files T1 to T8 left; it has no em dash or en dash
<!-- /TASK -->

## Contracts

### C1 - Coder input labels that mean existing work

File: viber/agents/task-coder.md

`resume: <paths>` - an interrupted session left these paths half-finished.
`reason: <text>` - the coder's own earlier attempt at this task failed for this reason.
`report: <path>` - a review or test report the existing work has to be fixed against.

### C2 - Blocking tag

File: viber/references/test-strategy.md

A rule a reviewer raises as a blocking finding ends with the literal token `(blocking)`, placed at the bullet that states the rule. No other marker and no separate list.

### C3 - Plan rule line

File: viber/references/plan-rules.md

`- <Name>: <rule> (script)` - validated by `viber/scripts/plan-index.sh`.
`- <Name>: <rule> (review)` - gated by the plan reviewer.

Every rule line carries exactly one of the two tags, as its last token. A rule the script checks only in part is two lines, one per tag. `<Name>` is one or two capitalised words, unique in the file, and is how the plan reviewer and its `scope: spec` subset refer to the rule.
