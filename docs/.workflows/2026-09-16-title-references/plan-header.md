Title: "Refer to every item by title, never by a bare number"
Intent: docs/.workflows/2026-09-16-title-references/intent.md


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

