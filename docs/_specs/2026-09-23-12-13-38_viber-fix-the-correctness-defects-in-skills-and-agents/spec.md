# viber: fix the correctness defects in skills and agents

Build: skill `implementor`

## Goal

The viber skills, agents and references carry rules that contradict each other or leave a step undefined, so the model either breaks one of them or spends its thinking on the conflict. This change removes the eleven defects listed under "Correctness defects" in `docs/refactor.md`, each with the shortest sentence that settles it and no rationale attached.

## Roadmap

Part 1 of 3 - correctness defects 1 to 11

1. Correctness defects 1 to 11 (this plan)
2. Slimming the text: the five files read on every task (`tdd`, `test-strategy`, `task-coder`, `task-reviewer`, `planner-review`) plus every item of the "Bloat" list in `docs/refactor.md`
3. `effort` and `model` experiment on one real build

## Acceptance criteria

1. `memory-writer` and `rules-writer` may delete an obsolete file with `rm -- <one path>`, only inside their own scope and only after `Glob` confirmed it obsolete, never with `-r` or `-f`; `rules-writer` never deletes a `_` file.
2. The cap of two new rule files per run is stated only in `rule-admission.md` ("keep the two with the strongest evidence"); `rules-writer` keeps only the sentence that a split or a merge never counts; `viber/CLAUDE.md` agrees with both.
3. `task-reviewer` and `planner-review` use two finding levels: Blocking, which produces FAIL, and Minor, which never produces FAIL on its own and is written only into a report a Blocking finding already forces; `task-coder` fixes every Blocking finding and a Minor one only when the fix is trivial and local.
4. On a resumed draft the closing summary of `idea` states the round - another draft round or the task half - and `planner` no longer asks which round it is; the `fixer` handoff carries the spec shape as a seventh part, and `idea` no longer mentions a `fixer` diagnosis.
5. `planner` no longer says the plan answers HOW; every rule `plan-index.sh` fully enforces carries an inline `(script)` tag, and the paragraph running the script says it validates the tagged rules while the untagged ones are the planner's own check.
6. In `tdd`, what the new code reveals about existing code goes to the coder's notes, and the closing refactor covers the task's own code only.
7. In `idea`, the canonical question example asks about a scope boundary, the recommendation label is `[Recommended]:` everywhere, the interview rule says one question per message, the done condition requires every unknown to carry a named way to resolve it with no question to the user left open, and the "everything what's is" sentence is grammatical.
8. In `implementor`, `retry` after two failed review rounds or two failed test rounds re-dispatches the coder one tier up with the last report, the round counter keeps running and two more rounds follow; `abort` in the close goes to the archive step with the knowledge step skipped; the repair coder receives `spec:` with a value and an `out:` line; every bundled-script example quotes each placeholder argument.
9. `qa-writer` answers a build with neither a UI nor an endpoint change with `VERDICT: NONE` and the reason "no UI or endpoint change"; `planner-review` says a contract block is the only way a shape reaches a coder.

## Scope

### File map

- modify - viber/agents/memory-writer.md - deletion allowance of the memory writer
- modify - viber/agents/rules-writer.md - deletion allowance and budget of the rules writer
- modify - viber/references/rule-admission.md - owner of the new-rule cap
- modify - viber/CLAUDE.md - node describing the knowledge-layer cap and deletion
- modify - viber/agents/task-reviewer.md - finding levels of the task gate
- modify - viber/agents/planner-review.md - finding levels of the plan gate, contract wording
- modify - viber/agents/task-coder.md - which findings a repair round fixes
- modify - viber/skills/idea/SKILL.md - interview rules, example, closing summary
- modify - viber/skills/planner/SKILL.md - input decisions, script-enforced rules
- modify - viber/skills/fixer/SKILL.md - handoff payload
- modify - viber/skills/tdd/SKILL.md - closing refactor step
- modify - viber/skills/implementor/SKILL.md - retry, abort, repair dispatch, script examples
- modify - viber/agents/qa-writer.md - verdict when nothing is classified

### Out of scope

- `superdev` and its copies of these agents: the plugin is obsolete.
- Slimming the text (subproject 2): no cut beyond the sentence a defect replaces.
- `effort` and `model` tuning (subproject 3).
- Releasing a version.
