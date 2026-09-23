---
source: C:\Users\dario\.claude-dario\plans\compiled-churning-hamming.md
---

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

## Tasks

<!-- TASK -->
### T1 - Let the knowledge writers delete files and give the rule cap one owner
- TDD: none
- Covers: #1, #2
- Uses: none
- Depends-on: none
- Files: viber/agents/memory-writer.md, viber/agents/rules-writer.md, viber/references/rule-admission.md, viber/CLAUDE.md
- Delivers: both writers allowed `wc -c` and `rm -- <one path>` for one confirmed-obsolete file in their own scope; the two-new-rules cap stated once, in the admission reference; the plugin node matching both.
- Verification: `grep -c -- 'rm -- ' viber/agents/memory-writer.md viber/agents/rules-writer.md; grep -c 'keep the two with the strongest evidence' viber/references/rule-admission.md; grep -c 'strongest evidence' viber/agents/rules-writer.md; grep -cE 'rule-admission.md.*2 new|2 new.*rule-admission.md' viber/CLAUDE.md; grep -c 'through `rm`' viber/CLAUDE.md` -> each writer at least 1; `rule-admission.md` 1 and `rules-writer.md` 0; `viber/CLAUDE.md` at least 1; at least 1
- DoD: memory-writer's `Bash` sentence allows exactly `wc -c` and `rm -- <one path>`; rules-writer's `Bash` sentence allows exactly the same two; memory-writer deletes only a `CLAUDE.md` node, after a `Glob` confirmation, never with `-r` or `-f`; rules-writer deletes only a `.claude/rules/` file, after a `Glob` confirmation, never with `-r` or `-f`, never a `_` file; rule-admission.md Calibration keeps the two candidates with the strongest evidence and drops the rest; rules-writer.md states no count of new files and keeps the sentence that a split or a merge never counts; viber/CLAUDE.md names rule-admission.md as the owner of the cap on one line with "2 new" (e.g. "at most 2 new files per build, owned by `rule-admission.md`"); viber/CLAUDE.md says both writers delete through `rm`; no added sentence carries a rationale clause
<!-- /TASK -->

<!-- TASK -->
### T2 - Replace the finding severities with Blocking and Minor
- TDD: none
- Covers: #3, #9
- Uses: none
- Depends-on: none
- Files: viber/agents/task-reviewer.md, viber/agents/planner-review.md, viber/agents/task-coder.md
- Delivers: one two-level finding vocabulary across both reviewers and the coder that repairs their reports; the corrected contract-block sentence in the plan reviewer.
- Verification: `grep -cE 'Critical|Important|Major' viber/agents/task-reviewer.md viber/agents/planner-review.md viber/agents/task-coder.md; grep -c 'Blocking' viber/agents/task-reviewer.md viber/agents/planner-review.md viber/agents/task-coder.md; grep -c 'only thing a coder can be handed' viber/agents/planner-review.md` -> 0 for each file; at least 1 for each file; 0
- DoD: no Critical, Important or Major severity remains in the three files; task-reviewer and planner-review each define Blocking (produces FAIL) and Minor (never FAIL on its own) in one line each; a Minor finding is written only into a report a Blocking finding already forces, and a PASS writes no report and returns `FINDINGS: none` in planner-review; the Verification-mismatch, DoD-clause-without-test and note-narrowing-a-DoD rules in task-reviewer say Blocking; the task-reviewer calibration makes style, naming taste and architecture opinion Minor at most; task-reviewer orders its report Blocking then Minor; planner-review calibration makes wording, style and formatting Minor at most; planner-review `FINDINGS:` groups Blocking then Minor; planner-review's Split right check says a contract block is the only way a shape reaches a coder; task-coder fixes every Blocking finding and a Minor one only when the fix is trivial and local
<!-- /TASK -->

<!-- TASK -->
### T3 - Carry the draft round and the spec shape in the planner handoff
- TDD: none
- Covers: #4
- Uses: none
- Depends-on: none
- Files: viber/skills/idea/SKILL.md, viber/skills/planner/SKILL.md, viber/skills/fixer/SKILL.md
- Delivers: an `idea` closing summary naming the round on a resumed draft; a `planner` input paragraph that takes its three decisions as given and asks nothing; a `fixer` fix plan carrying the spec shape.
- Verification: `grep -c 'Spec shape' viber/skills/fixer/SKILL.md; grep -c 'seven parts' viber/skills/fixer/SKILL.md; grep -c 'fixer' viber/skills/idea/SKILL.md; grep -c 'opens by asking the user which round' viber/skills/planner/SKILL.md; grep -c 'another draft round' viber/skills/idea/SKILL.md` -> at least 1; 1; 0; 0; at least 1
- DoD: the fixer fix plan lists a seventh part, `Spec shape: spec-lite`; the fixer handoff restates all seven parts; idea's `spec-lite` line no longer names a fixer diagnosis; idea's closing summary on a resumed draft states either "another draft round" or "the task half"; planner's input paragraph takes the spec shape, the draft decision and the draft run key as given and contains no instruction to ask the user which round it is; idea keeps "never offer it and never ask for it" for the draft mode of a fresh interview
<!-- /TASK -->

<!-- TASK -->
### T4 - Tag the planner rules the index script enforces
- TDD: none
- Covers: #5
- Uses: none
- Depends-on: T3
- Files: viber/skills/planner/SKILL.md
- Delivers: a planner body without the "plan answers HOW" paragraph, with every fully script-enforced task or contract rule tagged `(script)` and the validation paragraph pointing at the tags.
- Verification: `grep -c 'The plan answers HOW' viber/skills/planner/SKILL.md; grep -c '(script)' viber/skills/planner/SKILL.md; grep -c 'validates every rule above' viber/skills/planner/SKILL.md` -> 0; at least 6; 0
- DoD: the paragraph opening "The plan answers HOW" is gone; a sentence carries `(script)` only when `viber/scripts/plan-index.sh` rejects every violation of it, and a rule mixing enforced and unenforced sentences is split so that only its enforced sentence is tagged; the lower-numbered `Depends-on` sentence, the `Files` format rule, the disjoint-files rule, the every-criterion-covered-by-a-`Covers` sentence, the every-block-named rule and the sentence requiring a contract `File:` path to be held by a task naming the block carry `(script)`; the sentence making `Uses` mandatory carries `(script)`, while the rest of the `Uses` rule does not; the `Delivers`, `Verification`, `DoD` and `TDD` rules carry no tag; the paragraph running `plan-index.sh` says it validates the rules tagged `(script)` and that every untagged rule is the planner's own check
<!-- /TASK -->

<!-- TASK -->
### T5 - Align the idea example and done condition with its own rules
- TDD: none
- Covers: #7
- Uses: none
- Depends-on: T3
- Files: viber/skills/idea/SKILL.md
- Delivers: an interview section whose example asks a scope-boundary question in the same format the rules name, and a done condition that agrees with the unknowns item.
- Verification: `grep -c 'session token' viber/skills/idea/SKILL.md; grep -c '(recommended)' viber/skills/idea/SKILL.md; grep -c 'archived' viber/skills/idea/SKILL.md; grep -c 'into one call' viber/skills/idea/SKILL.md; grep -c "what's is" viber/skills/idea/SKILL.md; grep -c 'All unknowns must be known' viber/skills/idea/SKILL.md` -> 0; 0; at least 1; 0; 0; 0
- DoD: the canonical example asks whether an export includes archived records, with three concrete options, the recommended one first; the options rule and the example both use the label `[Recommended]:`; the interview rule forbids more than one question per message without referring to a tool call; the done condition requires every unknown to carry a named way to resolve it and no question to the user left open; the "Before the first question" bullet about the conversation is grammatical
<!-- /TASK -->

<!-- TASK -->
### T6 - Send what new code reveals to the notes instead of a refactor
- TDD: none
- Covers: #6
- Uses: none
- Depends-on: none
- Files: viber/skills/tdd/SKILL.md
- Delivers: a closing workflow step that refactors only the task's own code and records observations about existing code in the coder's notes.
- Verification: `grep -c 'consider what the new code reveals' viber/skills/tdd/SKILL.md; grep -c 'notes' viber/skills/tdd/SKILL.md` -> 0; at least 1
- DoD: the refactor step limits refactoring to code this task wrote; what the new code reveals about existing code goes to the coder's notes file; no other section of the skill changes
<!-- /TASK -->

<!-- TASK -->
### T7 - Define retry and abort and complete the repair dispatch in the implementor
- TDD: none
- Covers: #8
- Uses: none
- Depends-on: none
- Files: viber/skills/implementor/SKILL.md
- Delivers: a defined `retry` for the review loop and the test loop, a defined `abort` in the close, a complete repair-coder dispatch, and quoted placeholders in every bundled-script example.
- Verification: `grep -c 'out: .temp/viber/repair-' viber/skills/implementor/SKILL.md; grep -cE 'spec: <dir>/spec.md.*repair-<round>-coder.md|repair-<round>-coder.md.*spec: <dir>/spec.md' viber/skills/implementor/SKILL.md; grep -nE '\.sh"[^`]*[ [][<]' viber/skills/implementor/SKILL.md` -> at least 1; at least 1; no output
- DoD: `retry` after two failed review rounds re-dispatches the task's coder one tier up (haiku to sonnet to opus, opus stays) with the last `REVIEW` path as `report:`, the round counter continuing and two more rounds before the next question; `retry` after two failed test rounds re-dispatches the repair coder on `opus` with the last `REPORT` path, the test round continuing and two more rounds before the next question; `abort` in the close stops every dispatch and goes to the archive step with the knowledge step skipped; the repair-coder dispatch carries `spec: <dir>/spec.md` and `out: .temp/viber/repair-<round>/`; every `<placeholder>` argument following a bundled-script path is double-quoted, optional repeats included
<!-- /TASK -->

<!-- TASK -->
### T8 - Give the QA writer a real reason for no scenarios
- TDD: none
- Covers: #9
- Uses: none
- Depends-on: none
- Files: viber/agents/qa-writer.md
- Delivers: a classify rule whose no-change branch returns a fixed reason.
- Verification: `grep -c 'naming which one' viber/agents/qa-writer.md; grep -c 'no UI or endpoint change' viber/agents/qa-writer.md` -> 0; 1
- DoD: neither a UI nor an endpoint change returns `VERDICT: NONE` with `REASON: no UI or endpoint change`; the existing-`qa.md` branch keeps its own `VERDICT: NONE`
<!-- /TASK -->
