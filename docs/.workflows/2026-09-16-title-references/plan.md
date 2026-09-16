# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Refer to every item by title, never by a bare number"
Intent: docs/.workflows/2026-09-16-title-references/intent.md
Plan: C:\Users\dario\.claude-p2p2\plans\async-popping-boole.md

---
<!-- HEADER -->

## Goal
Every item superdev points a human at (a decision, a phase, a plan task, an acceptance criterion, a review finding, a checklist class or rule) carries a title next to its number, and every reference a human reads - chat narration, `AskUserQuestion` gate labels, escalations, reviewer reports, and the `Covers:` / `Depends on:` / `consumed by` / `## Impact on decisions` lines of the run files - is written as `` `<title>` (<pointer>) ``, never as a bare number, id or slug. Numbers stay as the pointer agents and scripts key on.

## Context
Decisions, phases and plan tasks already have titles (`### 5. <question>`, `### 01. <phase title>`, `## Task 3 - <title>`), but every recap, gate and cross-reference speaks in numbers only (`Start phase 01`, `Covers: criteria #3`, `consumed by Task 4`, `decision #3`). Acceptance criteria and review findings (`C1`, `I2`, `B4`, `R2`) have no title anywhere. The rule gets one owner - a `## Naming` section in `superdev/references/review-contract.md` - one sentence in every skill or agent at the spot where a reference is produced, and reviewer enforcement through new blocking classes B15 (plans) and R6 (phases). `phases-status.sh` gains a title column so the phases resume gate can name the phase. Existing documents are never migrated; every parser keeps accepting title-less input. Skill and agent edits are done through the `supercc:skill-designer` skill.

## Out of scope
- Migrating any existing `intent.md`, `phases.md`, `spec.md`, plan or report.
- `superdev/hooks/content/manifest.md`.
- Task file names (`tasks/task-NN.md`), phase dir names (`phases/NN-<slug>`), run dir slugs, `status.md` and finding-ID stability - machine contracts stay as they are.
- The interview's numbered options (`2.1 / 2.2`) and numbered gap questions.

## Acceptance criteria
1. Naming contract - `superdev/references/review-contract.md` has a `## Naming` section that defines the reference form `` `<title>` (<pointer>) ``, where each item kind takes its title from, the title rules (a few words, no `#`, no backticks, stable for the item's life), and the fallback for a legacy item with no title (cite its first clause verbatim).
2. Titled findings - the contract's report skeleton, the task reviewer's inline copy and the debt-file line carry a short title after the finding ID (`- <ID> - <title> - file:line - ...`), the prior-findings table has a `Title` column, and the spec reviewer's coverage line reads `` `<title>` (#N) - met | ... ``.
3. Titled criteria - the spec template and the simpleplan plan template write each acceptance criterion as `<n>. <short name> - <condition>`, and the superspec checklist blocks a criterion with no short name.
4. Titled plan references - both plan templates write `Covers:`, `### Dependencies` and `consumed by` entries as `` `<title>` (#<n>) `` / `` `<title>` (Task <N>) ``, the plan checklist has blocking class B15 for a plan reference with a bare number, and both plan reviewers report a class by its checklist name plus ID.
5. Phase title column - `phases-status.sh` prints `<dir>\t<status>\t<title>` per phase and `next: <dir>\t<title>` (or `next: none`), reading the title from the `### NN. <title>` heading that precedes each `- Dir:` line, `-` when no heading precedes it; the regression suite proves both cases.
6. Titled phases - the phases template writes `Covers:` and `Depends on:` in the reference form, the phases checklist has blocking rule R6 for a bare-number reference, the `phases` skill names phases by title in its proposal, handoff and resume gates and in the `Phase <NN> of` constraint bullet, and `phases-reviewer` reports a rule by its name plus ID.
7. Titled decisions on resume - the `intent` skill asks which decision to reopen by its question, and `## Impact on decisions` lines in `refresh.md` read `` `<question>` (decision <n>) ``.
8. Titled build escalations - `superbuild` and `simplebuild` name a task by `` `<title>` (Task NN) `` in every escalation and in the harness-failure state line, list still-open findings as `` `<title>` (<ID>) `` in the post-re-review question, and pass the criterion or task to `record-decision.sh` in the reference form.
9. Titled decompose messages - `decompose.sh`'s warning and error about `Covers:` name the task by its heading title plus file name, and the regression suite proves it; a plan whose `Covers:` line carries titles still decomposes.
10. Documentation - `superdev/README.md` and the root `CLAUDE.md` describe the titled finding IDs and the three-column `phases-status.sh` output.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - Add the naming contract and titled finding shapes to review-contract
- Covers: `Naming contract` (#1), `Titled findings` (#2)
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- none

### Files
- modify - superdev/references/review-contract.md (`## Finding IDs`, `## Report skeleton`, `## Debt file`, `## Decisions file`, new `## Naming`)
- modify - superdev/agents/superbuild-task-reviewer.md (`## Output format` finding bullet shape)
- modify - superdev/skills/superbuild-reviewer-spec/SKILL.md (`## Report` coverage line, `## Calibration` needs-decision bullet)
- modify - superdev/skills/simplebuild-reviewer/SKILL.md (needs-decision bullet)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-reviewer.md

#### Tests
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild-reviewer-spec
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simplebuild-reviewer
- node --test "tests/**/*.test.ts"

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below; it owns the editing discipline for skill, agent and reference files.
2. In `superdev/references/review-contract.md` add a `## Naming` section after `## Labels`: (a) every item a human is pointed at has a title and a pointer - decision = the question of its `### <n>.` heading, phase = its `### NN.` heading title, task = the title of `## Task <N> - <title>`, acceptance criterion = the `<short name>` of `<n>. <short name> - <condition>`, finding = the `<title>` of its report bullet, checklist class or rule = the name after `B<n> -` / `R<n> -`; (b) the reference form, identical in chat and in files: `` `<title>` (<pointer>) `` with pointers `decision 3`, `phase 01`, `Task 3`, `criterion 3`, `C2`, `B3`, and `#3` inside a `Covers:` line; a bare pointer never appears in anything a human reads, while headings keep their own form; (c) title rules: a few words, no `#`, no backticks inside, unchanged for the item's life; (d) legacy fallback: an item written before this contract with no title is cited by the first clause of its own text - for a finding bullet that is its "what is wrong" clause, never the `file:line`; (e) machine contracts untouched: `Covers:` is parsed for `#<n>` tokens, `task: NN`, `tasks/task-NN.md`, `phases/NN-<slug>` and finding-ID stability stay as they are.
3. Update `## Finding IDs` (a title is assigned with the ID and kept across rounds), `## Report skeleton` (finding bullet `- <ID> - <title> - file:line - what is wrong - why it matters - how to fix`; prior-findings table `| ID | Title | Verdict | Evidence |`; a `### Needs decision` bullet names its finding as `` `<title>` (<ID>) `` and its criterion or task in the reference form), `## Debt file` (`- <ID> - <title> - <round report basename> - file:line - <what>`) and `## Decisions file` (the `<criterion or task>` field is written in the reference form; the line shape itself is unchanged).
4. Mirror the finding bullet shape with the title in `superdev/agents/superbuild-task-reviewer.md`, as the contract's opening paragraph requires; change the coverage line of `superdev/skills/superbuild-reviewer-spec/SKILL.md` to `` `<title>` (#N) - met | not met | partial | blocked - evidence ``; make the needs-decision sentences of that file and of `superdev/skills/simplebuild-reviewer/SKILL.md` say the bullet names the finding and the criterion in the contract's reference form.

### Failure modes
- when input is invalid (a prior report whose findings carry no title) -> response: the reviewer treats it like a prior report without IDs - the contract's existing rule - and cites the finding's "what is wrong" clause as its title in the verdict table, log: one line in the report's `## Notes`, test: none - contract text, covered by the reviewer reading the contract.

### Contracts
- `## Naming` section of `superdev/references/review-contract.md` - the reference form `` `<title>` (<pointer>) `` and the per-kind title sources; consumed by Task 2, Task 3, Task 5, Task 6, Task 7, Task 9.
- Finding bullet `- <ID> - <title> - file:line - what is wrong - why it matters - how to fix` and the `Title` column of the prior-findings table - read by the fix-mode implementors (their work list stays keyed on the ID); consumed by Task 7.

### DoD
The contract has the `## Naming` section and the titled shapes; the task reviewer, spec reviewer and simplebuild reviewer carry the mirrored shapes; every lint run prints `FAIL=0`; the test suite is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - Give acceptance criteria a short name in the spec template and checklist
- Covers: `Titled criteria` (#3)
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- `Add the naming contract and titled finding shapes to review-contract` (Task 1) - blocks: the criterion title rule this task applies

### Files
- modify - superdev/skills/superspec/templates/spec.md (`## Acceptance criteria` example lines)
- modify - superdev/skills/superspec/references/checklist.md (Blocking list)
- modify - superdev/skills/superspec/SKILL.md (the "Acceptance criteria =" bullet)
- modify - superdev/skills/simpleplan/templates/plan.md (`## Acceptance criteria` in the header)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superspec

#### Tests
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan
- node --test tests/superdev/decompose.test.ts

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for the edits.
2. In `superdev/skills/superspec/templates/spec.md` rewrite the four example criteria as `<n>. <short name> - <condition>` (e.g. `1. Add a task - A signed-in user can add a task with a title and an optional due date.`) and state in the placeholder line that the short name is the criterion's title, a few words, no `#`.
3. In `superdev/skills/superspec/references/checklist.md` add one Blocking item: an acceptance criterion with no short name before its ` - ` separator, or a short name containing `#`.
4. In `superdev/skills/superspec/SKILL.md` extend the "Acceptance criteria =" bullet with the short-name form and one example.
5. In `superdev/skills/simpleplan/templates/plan.md` change the header's `## Acceptance criteria` placeholder to `1. <short name> - <numbered, testable, observable true/false condition>`.

### Failure modes
- none - templates.

### Contracts
- Criterion line shape `<n>. <short name> - <condition>` - the whole line is still what `decompose.sh`'s `criterion_of` copies verbatim into `### Covered criteria`; consumed by Task 3, Task 8.

### DoD
Both templates and the spec checklist carry the short-name form; the two lint runs print `FAIL=0`; `decompose.test.ts` is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - Write plan references by title and add checklist class B15
- Covers: `Titled plan references` (#4)
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- `Add the naming contract and titled finding shapes to review-contract` (Task 1) - blocks: the reference form
- `Give acceptance criteria a short name in the spec template and checklist` (Task 2) - blocks: the criterion title `Covers:` cites

### Files
- modify - superdev/references/plan-review-checklist.md (`## Evidence rule`, `## Blocking classes`, `## Advisory (NOTES)`, `## Author self-check`)
- modify - superdev/skills/superplan/templates/plan.md (`Covers:`, `### Dependencies`, `### Contracts` placeholder)
- modify - superdev/skills/simpleplan/templates/plan.md (`Covers:`, `### Dependencies`, `### Contracts` placeholder)
- modify - superdev/skills/superplan/SKILL.md (the `consumed by Task <N>` rule, the `B1-B14` self-review line)
- modify - superdev/skills/simpleplan/SKILL.md (the `consumed by Task <N>` rule, the `B1-B14` self-review line)
- modify - superdev/skills/superplan-reviewer/SKILL.md (`B1-B14` bucket text, `FINDINGS:` output line)
- modify - superdev/skills/simpleplan-reviewer/SKILL.md (`B1-B14` bucket text, `FINDINGS:` output line)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan

#### Tests
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan-reviewer
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan-reviewer
- node --test tests/superdev/decompose.test.ts tests/superdev/review-plan.test.ts

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for the edits.
2. In `superdev/references/plan-review-checklist.md` add `B15 - Reference with a bare number: a Covers:, ### Dependencies or consumed by entry that names a criterion or task by number alone, or whose title differs from the heading or criterion line it points at; settled by reading the entry against the plan's task headings and the criteria source. A legacy criteria source with no short names is cited by the first clause of the criterion, per the contract's ## Naming.` Replace every `B1-B14` range with `B1-B15` in `## Evidence rule` and in `## Advisory (NOTES)`; add one Author self-check bullet for it.
3. In both plan templates: `- Covers: `<criterion short name>` (#<n>)[, ...]`; Dependencies bullet `` - `<task title>` (Task <N>) - blocks: <…> ``; the Contracts placeholder's `consumed by Task <N>` becomes `` consumed by `<task title>` (Task <N>) ``.
4. In `superplan/SKILL.md` and `simpleplan/SKILL.md`: the `consumed by` rule takes the new form, the self-review line says `B1-B15`, and one sentence under `### Rules` says every reference to a criterion or task in the plan is written as `` `<title>` (<pointer>) `` per the contract's `## Naming`.
5. In both plan reviewers: `B1-B14` becomes `B1-B15` and the `FINDINGS:` output line reads "one line each - checklist class name and ID, e.g. `` `Leftover placeholder` (B5) ``, where it is, what's wrong, how to fix".

### Failure modes
- when input is invalid (a `Covers:` title containing `#` followed by digits) -> response: B15 flags it, since `decompose.sh` reads every `#<n>` token of the line as a criterion number, log: the FINDINGS line, test: none - rubric text.

### Contracts
- `Covers:` line grammar `` `<title>` (#<n>) `` - the `#<n>` tokens stay the only thing `decompose.sh` parses; consumed by Task 8.

### DoD
Templates, both planner skills, both plan reviewers and the checklist carry the form and class B15; every lint run prints `FAIL=0`; both named test files are green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - Print the phase title as a third column in phases-status.sh
- Covers: `Phase title column` (#5)
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- none

### Files
- modify - superdev/scripts/phases-status.sh (header comment, the `values` loop, the `# --- report ---` block)
- modify - tests/superdev/phases-status.test.ts (`writePhases`, every `assert.deepEqual` on stdout, two new cases)

### Test Commands
#### Build
- bash -n superdev/scripts/phases-status.sh

#### Tests
- node --test tests/superdev/phases-status.test.ts
- node --test "tests/**/*.test.ts"

### Approach
1. Replace the `sed -n 's/^-[[:space:]]*Dir:...'` reader with one `awk` pass that emits one `<dir-value>\t<title>` line per `- Dir:` line: a `^###[[:space:]]+[0-9]+\.[[:space:]]*` heading sets `title` to the rest of that line (trailing whitespace trimmed, any tab replaced by a space so the column count holds); a `- Dir:` line prints the trimmed value and the current `title`, then clears `title`; no heading since the last `Dir:` prints `-`.
2. Read that output into two parallel arrays (`values`, `titles`) with the existing `count` guard; the `count == 0` exit 3 branch is unchanged.
3. In the report block print `printf '%s\t%s\t%s\n' "$dir" "$status" "$title"` and, for the first non-done phase, `next: <dir>\t<title>`; `next: none` is unchanged.
4. Update the header comment's contract to the three columns and the `-` fallback.
5. In the test: `writePhases` takes an optional per-entry title (default `Phase NN`, matching the current fixture heading); update every expected stdout line to the three columns and `next:` with its title; add a case where a `- Dir:` line has no `###` heading before it (expects `-`) and a case with a heading carrying a multi-word title with trailing spaces, no tab (expects it trimmed).

### Failure modes
- when input is invalid (a `- Dir:` line with no `### NN.` heading before it) -> response: title column `-`, exit 0, log: none, test: the new no-heading case in `phases-status.test.ts`.

### Contracts
- stdout lines `<dir>\t<status>\t<title>` and `next: <dir>\t<title>` | `next: none`; consumed by Task 5.

### DoD
The script prints three columns, the fallback is `-`, the whole suite is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - Name phases by title in the phases skill, template, checklist and reviewer
- Covers: `Titled phases` (#6)
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- `Add the naming contract and titled finding shapes to review-contract` (Task 1) - blocks: the reference form
- `Print the phase title as a third column in phases-status.sh` (Task 4) - blocks: the resume table columns

### Files
- modify - superdev/skills/phases/SKILL.md (`## Fresh` step 3, `## Phase intents` constraint bullet, `## Handoff [GATE]`, `## Resume` steps 2 and 4)
- modify - superdev/skills/phases/references/phases-template.md (`Covers:` and `Depends on:` rules and template lines)
- modify - superdev/skills/phases/references/checklist.md (`### Severity classes`)
- modify - superdev/skills/phases-reviewer/SKILL.md (`R1-R5` bucket text, `FINDINGS:` output line)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/phases

#### Tests
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/phases-reviewer
- node --test tests/superdev/phases-status.test.ts

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for the edits.
2. Template: `` - Covers: `<decision question>` (decision <n>)[, ...] `` and `` - Depends on: `<phase title>` (phase 01) `` | `none`; the content rules say the title is copied from the intent's `### <n>.` heading (the question) or the phase's own `###` heading, and that a decision number stays the master's.
3. Checklist: add `**R6 - reference with a bare number.** A `Covers:` or `Depends on:` entry naming a decision or phase by number alone, or whose title differs from the heading it points at, is Blocking.` and change `R1-R5` to `R1-R6` where the range is named; in `phases-reviewer/SKILL.md` do the same and make the `FINDINGS:` line read "violated rule name and ID, e.g. `` `decision coverage` (R1) ``".
4. Skill: the `## Fresh` proposal lists `Covers` as titled decisions; the `Phase <NN> of` bullet becomes `` `<phase title>` (phase <NN>) of <phases file path> ``; the handoff option label reads `` Start `<phase 01 title>` (phase 01) ``; `## Resume` step 2 relays the three columns (`<dir>`, `<status>`, `<title>`) and step 4's option label reads `` Start `<title>` (phase <NN>) `` from the `next:` line, a `-` title falling back to the dir name.

### Failure modes
- when input is invalid (`phases-status.sh` prints `-` as the title of a legacy phases file) -> response: the gate label uses the phase's dir name in place of the title, log: none, test: none - skill prose.

### Contracts
- none

### DoD
Template, checklist, both skills carry the form and rule R6; both lint runs print `FAIL=0`; `phases-status.test.ts` is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - Name decisions by their question on intent resume and in refresh.md
- Covers: `Titled decisions on resume` (#7)
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- `Add the naming contract and titled finding shapes to review-contract` (Task 1) - blocks: the reference form

### Files
- modify - superdev/skills/intent/SKILL.md (`## Resume from a file` first bullet, `## Refresh on resume` step 4)
- modify - superdev/skills/intent/references/refresh-template.md (`## Impact on decisions` rules and template line)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/intent

#### Tests
- node --test tests/superdev/resolve-input.test.ts

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for the edits.
2. `## Resume from a file`: "ask the user whether to reopen one decision by number" becomes "ask the user whether to reopen one decision, naming each as `` `<question>` (decision <n>) ``"; the marking sentence names decisions the same way.
3. `## Refresh on resume` step 4: `## Impact on decisions` names each touched decision as `` `<question>` (decision <n>) `` - the question copied from the intent's `### <n>.` heading - and nothing else.
4. `refresh-template.md`: the content rule and the template line take that form (`` - `<question>` (decision <n>) - what about it the delta makes worth re-reading ``).

### Failure modes
- none - markdown.

### Contracts
- none

### DoD
Both files carry the form; the lint run prints `FAIL=0`; the named test file is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - Name tasks and findings by title in the build orchestrators
- Covers: `Titled build escalations` (#8)
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- `Add the naming contract and titled finding shapes to review-contract` (Task 1) - blocks: the titled finding bullet the orchestrator reads

### Files
- modify - superdev/skills/superbuild/SKILL.md (`## Harness pre-check` state line, `### Loop` steps 2-3, `### Fix loop` BLOCKED and FAIL branches)
- modify - superdev/skills/simplebuild/SKILL.md (`## Harness pre-check` state line, `### Loop` step 2, `### Fix loop` BLOCKED and FAIL branches)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild

#### Tests
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simplebuild
- node --test tests/superdev/record-decision.test.ts tests/superdev/status-update.test.ts

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for the edits.
2. Add one sentence under `## Mandatory rules` of each orchestrator: every task, criterion or finding named to the user is written as `` `<title>` (<pointer>) `` per the contract's `## Naming` - the task title from the decompose index's title column, the finding title from the report bullet.
3. State line: `` last completed task `<title from the index>` (Task NN) ``. Loop escalations (implementor FAIL, reviewer FAIL after three rounds, missing reviewer input): the `AskUserQuestion` text names the task in that form.
4. Fix loop: the BLOCKED branch's per-bullet question names the finding as `` `<title>` (<ID>) `` and passes `record-decision.sh`'s `<criterion or task>` argument in the reference form; the post-re-review question lists each still-open finding as `` `<title>` (<ID>) `` instead of the bare IDs.

### Failure modes
- when input is invalid (a report bullet with no title - written by a reviewer from before Task 1) -> response: the orchestrator names the finding by its "what is wrong" clause plus the ID, log: none, test: none - skill prose.

### Contracts
- none

### DoD
Both orchestrators carry the rule and the titled escalations; both lint runs print `FAIL=0`; the named test files are green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 8 - Name the task in decompose.sh criterion messages
- Covers: `Titled decompose messages` (#9)
- TDD: none
- Model: sonnet
- Effort: medium

### Dependencies
- `Write plan references by title and add checklist class B15` (Task 3) - blocks: the titled `Covers:` grammar the new test decomposes

### Files
- modify - superdev/scripts/decompose.sh (the `# --- kryteria akceptacji do plików tasków` loop)
- modify - tests/superdev/decompose.test.ts (the `exit 5` case, the `taskBlock` helper, one new case)

### Test Commands
#### Build
- bash -n superdev/scripts/decompose.sh

#### Tests
- node --test tests/superdev/decompose.test.ts
- node --test "tests/**/*.test.ts"

### Approach
1. In the loop, read `task_title="$(sed -n 's/^##[[:space:]]*//p' "$task_file" | head -n 1)"` before the `Covers:` grep.
2. Print the warning as `warning: \`<task_title>\` (<basename>) has no 'Covers:' criteria - none appended` and the error as `error: \`<task_title>\` (<basename>) covers criterion #<n>, absent from source: <crit_source>` with `printf '%s\n'`, so the backticks are literal.
3. Update the header comment line about `exit 5`.
4. Test: the existing `exit 5` case additionally asserts the task heading text appears in stderr; a new case, named as a guard of the titled `Covers:` grammar, decomposes a plan whose `Covers:` line reads `` - Covers: `First criterion` (#1) `` and asserts `### Covered criteria` still carries criterion 1 verbatim.

### Failure modes
- when input is invalid (a task file with no `## ` heading) -> response: the message prints an empty title between the backticks and the basename, exit code unchanged, log: the message itself, test: none - `decompose.sh` only creates task files from TASK marker blocks that always open with a heading.

### Contracts
- none

### DoD
Both messages carry the task title; the new `Covers:` grammar case passes; the whole suite is green.

<!-- /TASK -->

---

<!-- TASK -->

## Task 9 - Document titled references in the superdev README and root CLAUDE.md
- Covers: `Documentation` (#10)
- TDD: none
- Model: sonnet
- Effort: low

### Dependencies
- `Print the phase title as a third column in phases-status.sh` (Task 4) - blocks: the output shape to document
- `Name tasks and findings by title in the build orchestrators` (Task 7) - blocks: the escalation wording to document

### Files
- modify - superdev/README.md (step 3 phases sentence, step 6 findings sentence)
- modify - CLAUDE.md (the superdev bullet's review-loop sentence)

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- node --test "tests/**/*.test.ts"

### Approach
1. `superdev/README.md`: step 6 says findings keep stable IDs and a short title (`` `Missing timeout test` (C1) ``) and that every escalation names tasks and findings that way; step 3 says `phases <phases.md>` shows each phase's title and status.
2. Root `CLAUDE.md`: the superdev bullet's sentence on finding IDs adds the title and names `review-contract.md`'s `## Naming` section as the owner of the reference form.

### Failure modes
- none - documentation.

### Contracts
- none

### DoD
Both documents describe the titled form and the three-column status output; the suite is green.

<!-- /TASK -->
