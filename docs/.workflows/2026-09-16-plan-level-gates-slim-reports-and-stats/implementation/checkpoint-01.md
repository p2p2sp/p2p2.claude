# checkpoint review - checkpoint-01.md

## Gates

Collected from the `### Test Commands` blocks of the five committed tasks (Tasks 1-5); tasks 6-14
are not implemented yet, so their blocks are not collected in this round. Every command below ran
once through `run.sh`, each `RESULT: SUCCESS`, so no `superdev:executor` dispatch was made and no
log was read. `integration and e2e deferred to final`.

Build blocks (Tasks 1-5):

- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan` (Tasks 1, 2) - RESULT: SUCCESS / EXIT: 0 / TAIL: FAIL=0 WARN=0
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan` (Tasks 1, 2) - RESULT: SUCCESS / EXIT: 0 / TAIL: FAIL=0 WARN=0
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan-reviewer` (Task 3) - RESULT: SUCCESS / EXIT: 0 / TAIL: FAIL=0 WARN=1
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan-reviewer` (Task 3) - RESULT: SUCCESS / EXIT: 0 / TAIL: FAIL=0 WARN=1
- `grep -c '^## Dispatch strength' superdev/references/review-contract.md` (Task 4) - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-implementor.md` (Task 5) - RESULT: SUCCESS / EXIT: 0 / TAIL: FAIL=0 WARN=1
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/simplebuild-task-implementor.md` (Task 5) - RESULT: SUCCESS / EXIT: 0 / TAIL: FAIL=0 WARN=1

Test blocks, Task 1:

- `grep -c '^## Gate commands' superdev/skills/superplan/templates/plan.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `grep -c '^## Gate commands' superdev/skills/simpleplan/templates/plan.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `grep -c '^#### Integration' superdev/skills/superplan/templates/plan.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `grep -c '^### Task Checks' superdev/skills/superplan/templates/plan.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `grep -c '^### Task Checks' superdev/skills/simpleplan/templates/plan.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `grep -c '^### Task Checks' superdev/references/adr-task.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `grep -c 'Review:' superdev/skills/superplan/templates/plan.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 2
- `! grep -Eq 'Test Commands|Task Tests' superdev/skills/superplan/templates/plan.md superdev/skills/simpleplan/templates/plan.md superdev/references/adr-task.md` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)
- `! grep -q 'Review:' superdev/skills/simpleplan/templates/plan.md` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)

Test blocks, Task 2:

- `grep -c 'Gate commands' superdev/skills/superplan/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 3
- `grep -c 'Gate commands' superdev/skills/simpleplan/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 3
- `grep -c 'Review:' superdev/skills/superplan/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 2
- `! grep -q 'Review:' superdev/skills/simpleplan/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)
- `! grep -Eq 'Test Commands|Task Tests' superdev/skills/superplan/SKILL.md superdev/skills/simpleplan/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)
- `! grep -q 'Undecided between two levels' superdev/skills/superplan/SKILL.md superdev/skills/simpleplan/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)

Test blocks, Task 3:

- `grep -c '^- B17 - ' superdev/references/plan-review-checklist.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `grep -c 'B1-B17' superdev/references/plan-review-checklist.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 2
- `grep -c 'B1-B17' superdev/skills/superplan-reviewer/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `grep -c 'B1-B17' superdev/skills/simpleplan-reviewer/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `! grep -rq 'B1-B16' superdev/references/plan-review-checklist.md superdev/skills/superplan-reviewer superdev/skills/simpleplan-reviewer superdev/skills/superplan superdev/skills/simpleplan` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)
- `! grep -Eq 'Test Commands|Task Tests' superdev/references/plan-review-checklist.md` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)

Test blocks, Task 4:

- `grep -c 'Review notes' superdev/references/review-contract.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 2
- `grep -c 'Gate commands' superdev/references/review-contract.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 2
- `grep -c '### Task Checks' superdev/references/review-contract.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 4
- `! grep -q '^## Debt file' superdev/references/review-contract.md` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)
- `! grep -q 'debt.md' superdev/references/review-contract.md` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)
- `! grep -Eq 'Test Commands|Task Tests' superdev/references/review-contract.md` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)

Test blocks, Task 5:

- `grep -c '### Task Checks' superdev/agents/superbuild-task-implementor.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 7
- `grep -c '### Task Checks' superdev/agents/simplebuild-task-implementor.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 7
- `! grep -Eq 'Test Commands|Task Tests|#### Build' superdev/agents/superbuild-task-implementor.md` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)
- `! grep -Eq 'Test Commands|Task Tests|#### Build' superdev/agents/simplebuild-task-implementor.md` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)
- `grep -c '## Runs' superdev/agents/superbuild-task-implementor.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 2
- `grep -c '## Runs' superdev/agents/simplebuild-task-implementor.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 2

Host suite, not a plan gate at this stage, run because Task 1's template rename touches sections the
repo's own script tests parse (`CLAUDE.md` documents it as the dev-time regression suite):

- `node --test "tests/**/*.test.ts"` - RESULT: SUCCESS / EXIT: 0 / DURATION: 25s / TAIL: `ℹ duration_ms 24574.712875`

## Findings

### Critical

- none

### Important

- I1 - Gate sourced from the wrong file - superdev/references/review-contract.md:150 - `## Gates` opens with "The gate commands come from the plan's `## Gate commands` block - the one in the plan header, above the first task block, copied into `plan-header.md` - and from nowhere else", but nothing copies that block into `plan-header.md`. `decompose.sh` builds `plan-header.md` from the `Title:` / `Spec:` / `Intent:` lines plus the spec's `## Out of scope` and `## Constraints / assumptions` on the Super track, and from the `<!-- HEADER -->` block alone on the Simple track (`superdev/scripts/decompose.sh:279-295, 345-352`); `superplan/templates/plan.md` places the new block after the `Plan:` line and `simpleplan/templates/plan.md` places it after `<!-- /HEADER -->`, so on both tracks it reaches the workdir only inside the full `plan.md` copy - this very run's `plan-header.md` carries no `## Gate commands` block. It matters because the contract is the single owner of the gate procedure and `simplebuild-reviewer` is preloaded with both `## plan-header` and `## plan` (`superdev/skills/simplebuild-reviewer/SKILL.md:13`): a reviewer that follows the sentence looks in the header, finds no block, and runs no gate at all, and Task 7 - which points all three forks at this section - would propagate the same wrong source to the Super track. Fix: change that clause to name the run's `plan.md` copy (the block is above the first task block there), or, if the header really is meant to carry it, that is a `decompose.sh` change the plan currently forbids (see `## Notes`).

## Debt

- M1 - Re-review title breaks the stage lookup - superdev/references/review-contract.md:113,178 - the skeleton's title line is `# <stage> review`, which spells a re-review's own report `# re-review review`, while `## Gates` reads the re-review's subsection set off "the first line of the report on `prior`" and maps only `# checkpoint review` and `# final review`. Unreachable inside the documented budget of one re-review per round, since `prior` is then always the checkpoint or final report, but the title reads wrong and the mapping has no branch for it.
- M2 - No blocking class for a missing gate block - superdev/references/plan-review-checklist.md:47-52,84-88 - B6 was narrowed to marker lines alone and B17 names a missing `### Task Checks` section but nothing about a missing `## Gate commands` block or a missing subsection inside it. A plan that simply omits the header block therefore violates no Blocking class, while the symmetric per-task omission is B17; the author self-check does require all three subsections, so only the reviewer side has the hole.

## Notes

- NOTE: plan defect - the header constraint "`## Gate commands` siedzi w nagłówku planu, który `decompose.sh` już kopiuje do `plan-header.md`; zmiana `decompose.sh` ogranicza się do kolumny `Review:`" (`spec.md:89`) is false, and the plan leaves no task able to make it true: Task 8 is the only `decompose.sh` task and is scoped to the `Review:` index column. Task 1's implementor recorded the conflict as a `CARRY:` line and its reviewer as a plan defect; Task 4 then wrote the constraint's claim into the contract instead (I1). Closing I1 in the contract text is enough for the build; making the constraint itself true would need a `decompose.sh` change outside the plan.
- Stale references to the removed `### Test Commands` / `### Task Tests` / `#### Build` sections survive in `superdev/agents/superbuild-task-reviewer.md:19,35`, `superdev/skills/superbuild-reviewer-spec/SKILL.md:39`, `superdev/skills/superbuild/SKILL.md:93`, `superdev/README.md:116,125,138` and `CLAUDE.md:84`; every one of those files is declared under the `### Files` of Tasks 6, 7, 12 and 14, and `tests/superdev/commit-task.test.ts:64` is named in the spec's `## Out of scope`. Nothing is orphaned - noted so the final review can confirm the sweep closed.
- The same holds for `debt.md`: the contract dropped its `## Debt file` section, and the remaining mentions sit in the three reviewer forks (Task 7), both orchestrators (Tasks 12, 13) and `superdev/README.md` / `CLAUDE.md` (Task 14).
- The `Review:` marker is accepted on a task of either track by `plan-review-checklist.md` B6 while only `superplan` writes it and only `superbuild` has a per-task reviewer. That asymmetry is criterion `B6 i B16 przecięte` (#5) verbatim ("dozwolony na zadaniu obu torów"), so it is recorded, not a defect.
- Cross-file consistency of the new `Review:` semantics holds: the template's "absent, the per-task reviewer runs at its own frontmatter default", `superplan/SKILL.md`'s "the reviewer agent's own frontmatter applies" and the contract's "dispatched with no `model` and no `effort` parameter at all" are the same rule stated three times without drift. No `UNDERSPECIFIED:` value is decided twice across the five tasks' notes.

## Assessment

The five committed tasks land a coherent rename - the plan-level `## Gate commands` block, the per-task `### Task Checks` section, the narrowed B6 / B16 and the new B17, the slim report shape and the two implementors that now run task checks alone - with every gate command green and no duplicated derivation across tasks; the one Important defect is the contract naming `plan-header.md` as the gate's source when nothing puts the block there.

VERDICT: FAIL
