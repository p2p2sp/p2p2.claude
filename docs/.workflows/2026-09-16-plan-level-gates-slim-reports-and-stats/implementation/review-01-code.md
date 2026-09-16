# final review - review-01-code.md

## Gates

Every `### Test Commands` block of all fourteen plan tasks was collected; 69 distinct command
strings ran once each through `run.sh`, and every one came back `RESULT: SUCCESS`, so no
`superdev:executor` dispatch was made and no log was read. The full suite's `TAIL:` carries no skip
figure, so nothing there left a criterion unproven. `no e2e or integration suite in this host` - the
plan documents none and the host's memory files name only the `node --test` regression suite, which
is already a build gate below.

Build blocks:

- `node --test "tests/**/*.test.ts"` (Tasks 8, 9, 10, 11, 14) - RESULT: SUCCESS / EXIT: 0 / DURATION: 25s / LINES: 653 / TAIL: `ℹ duration_ms 24310.471458`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan` (Tasks 1, 2) - RESULT: SUCCESS / EXIT: 0 / TAIL: FAIL=0 WARN=0
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan-reviewer` (Task 3) - RESULT: SUCCESS / EXIT: 0 / TAIL: FAIL=0 WARN=1
- `grep -c '^## Dispatch strength' superdev/references/review-contract.md` (Task 4) - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-implementor.md` (Task 5) - RESULT: SUCCESS / EXIT: 0 / TAIL: FAIL=0 WARN=1
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-reviewer.md` (Task 6) - RESULT: SUCCESS / EXIT: 0 / TAIL: FAIL=0 WARN=1
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild-reviewer-change` (Task 7) - RESULT: SUCCESS / EXIT: 0 / TAIL: FAIL=0 WARN=2
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild` (Task 12) - RESULT: SUCCESS / EXIT: 0 / TAIL: FAIL=0 WARN=0
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simplebuild` (Task 13) - RESULT: SUCCESS / EXIT: 0 / TAIL: FAIL=0 WARN=0

Test blocks - the lint runs declared inside them:

- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan` (Tasks 1, 2) - RESULT: SUCCESS / EXIT: 0 / TAIL: FAIL=0 WARN=0
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan-reviewer` (Task 3) - RESULT: SUCCESS / EXIT: 0 / TAIL: FAIL=0 WARN=1
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/simplebuild-task-implementor.md` (Task 5) - RESULT: SUCCESS / EXIT: 0 / TAIL: FAIL=0 WARN=1
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild-reviewer-spec` (Task 7) - RESULT: SUCCESS / EXIT: 0 / TAIL: FAIL=0 WARN=2
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simplebuild-reviewer` (Task 7) - RESULT: SUCCESS / EXIT: 0 / TAIL: FAIL=0 WARN=2

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

Test blocks, Task 6:

- `grep -c '^model: sonnet' superdev/agents/superbuild-task-reviewer.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `grep -c '^effort: high' superdev/agents/superbuild-task-reviewer.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `grep -c '## Review notes' superdev/agents/superbuild-task-reviewer.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `grep -c '### Task Checks' superdev/agents/superbuild-task-reviewer.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 2
- `! grep -Eq 'Test Commands|Task Tests|debt.md' superdev/agents/superbuild-task-reviewer.md` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)

Test blocks, Task 7:

- `grep -c 'Gate commands' superdev/skills/superbuild-reviewer-spec/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 2
- `grep -c 'Gate commands' superdev/skills/superbuild-reviewer-change/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `grep -c 'Gate commands' superdev/skills/simplebuild-reviewer/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `! grep -rq 'debt.md' superdev/skills/superbuild-reviewer-spec superdev/skills/superbuild-reviewer-change superdev/skills/simplebuild-reviewer` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)
- `! grep -rEq 'Test Commands|Task Tests' superdev/skills/superbuild-reviewer-spec superdev/skills/superbuild-reviewer-change superdev/skills/simplebuild-reviewer` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)

Test blocks, Task 8:

- `grep -c 'review\[n\]' superdev/scripts/decompose.sh` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `bash -n superdev/scripts/decompose.sh` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)

Test blocks, Task 9:

- `grep -c 'stats' superdev/scripts/read-config.sh` - RESULT: SUCCESS / EXIT: 0 / TAIL: 2
- `grep -c '^stats:' superdev/skills/setup/assets/config.yml` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `bash -n superdev/scripts/read-config.sh` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)
- `bash -n superdev/skills/setup/scripts/bootstrap.sh` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)

Test blocks, Task 10:

- `bash -n superdev/scripts/stats-record.sh` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)
- `test -x superdev/scripts/stats-record.sh` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)

Test blocks, Task 11 (this delta):

- `bash -n superdev/scripts/stats-report.sh` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)
- `test -x superdev/scripts/stats-report.sh` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)
- `grep -c '{{ANOMALIES}}' superdev/references/stats-template.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1

Test blocks, Task 12 (this delta):

- `grep -c 'stats-record.sh' superdev/skills/superbuild/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 2
- `grep -c 'stats-report.sh' superdev/skills/superbuild/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 2
- `grep -c '<review>' superdev/skills/superbuild/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 2
- `grep -c 'Dispatch strength' superdev/skills/superbuild/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `! grep -q 'debt.md' superdev/skills/superbuild/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)

Test blocks, Task 13 (this delta):

- `grep -c 'stats-record.sh' superdev/skills/simplebuild/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 2
- `grep -c 'stats-report.sh' superdev/skills/simplebuild/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 2
- `grep -c 'Dispatch strength' superdev/skills/simplebuild/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `grep -c '<review>' superdev/skills/simplebuild/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `! grep -q 'debt.md' superdev/skills/simplebuild/SKILL.md` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)

Test blocks, Task 14 (this delta):

- `grep -c 'stats' superdev/README.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 3
- `grep -c 'Task Checks' superdev/README.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 6
- `grep -c 'stats' superdev/hooks/content/manifest.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 1
- `grep -c 'Task Checks' CLAUDE.md` - RESULT: SUCCESS / EXIT: 0 / TAIL: 2
- `! grep -Eq 'Test Commands|Task Tests|debt\.md' superdev/README.md CLAUDE.md superdev/hooks/content/manifest.md` - RESULT: SUCCESS / EXIT: 0 / (log held no non-blank line)

## Prior findings

| ID | Title | Verdict | Evidence |
| --- | --- | --- | --- |
| I1 | Gate sourced from the wrong file | ADDRESSED | superdev/references/review-contract.md:149-151 |
| M1 | Re-review title breaks the stage lookup | NOT ADDRESSED | superdev/references/review-contract.md:113,159 |
| M2 | No blocking class for a missing gate block | NOT ADDRESSED | superdev/references/plan-review-checklist.md:98-103 |
| M3 | Change reviewer not bound to Naming | NOT ADDRESSED | superdev/skills/superbuild-reviewer-change/SKILL.md:32 |
| M4 | Trailing-newline branch untested | NOT ADDRESSED | tests/superdev/stats-record.test.ts:38 |
| M5 | Notes dir description omits reviewer notes | NOT ADDRESSED | superdev/skills/superbuild-reviewer-change/SKILL.md:29 |

I1 stays closed: `## Gates` still names `<workdir>/plan.md`, the `plan:` input, as the block's only
source and still says plainly that `plan-header.md` does not carry it; all three reviewer forks now
read the gate from the plan, so the Task 1 and fix-01 `CARRY:` lines against `decompose.sh` are
closed for this build. M1-M5 are Minor, carried no `minor:` line in any fix dispatch and were not
touched by Tasks 11-14; each keeps its class and is re-verified against the tree rather than
re-raised.

## Findings

### Critical

- none

### Important

- I2 - Wrong frontmatter defaults for both implementors - superdev/README.md:133,146 - Task 14
  rewrote both implementor rows and carried through a stale parenthetical: `simplebuild-task-implementor`
  is documented as "frontmatter default `sonnet` / `high`" and `superbuild-task-implementor` as
  "frontmatter default `opus` / `high`", while both agents have carried `effort: xhigh` for some time
  (`superdev/agents/simplebuild-task-implementor.md:6`, `superdev/agents/superbuild-task-implementor.md:6`).
  This delta is exactly what makes the number load-bearing: the same sweep added "at neither parameter,
  so at the agent's own frontmatter, when that column is `-`" to `CLAUDE.md:75` and the `Review:`
  default to `superdev/README.md:147`, so a reader is now pointed at the frontmatter default and then
  handed the wrong one - a planner leaving a task's markers off expects `high` and gets `xhigh`, a
  materially different spend. The sibling row for `superbuild-task-reviewer` (:147) states its
  `sonnet` / `high` default correctly, which is what makes the two wrong ones read as facts.
  Fix: change both parentheticals to `sonnet` / `xhigh` and `opus` / `xhigh`.

### Needs decision

- none

## Debt

- M7 - stats-report.sh header contradicts its own rule - superdev/scripts/stats-report.sh:44-50 - the `PER TASK` paragraph names "a writer" as one of the labels the per-task table holds, then its own entry rule ("a model, or a kind naming an implementor or a review") excludes it and the exclusion clause enumerates only "a run marker, a commit or a fork". Both orchestrators dispatch close-out writers with no `model:` / `effort:` (`superbuild/SKILL.md:153`), so a `writer` event carries `-` in both and never reaches that table. A self-verifying script's header is its contract; make the two sentences agree.
- M8 - Two tables key the same task differently - superdev/scripts/stats-report.sh:44 - the per-task row is the caller's label, which both orchestrators set to "the task file basename" (`superbuild/SKILL.md:57`), i.e. `task-01.md`, while the anomaly counter table keys by the `<name>-<NN>` head of the notes basename, i.e. `task-01`. The same task therefore reads under two names in one rendered report, so a reader cannot join the two tables by eye. Strip the extension from the task-table key, or key the counter table the same way.
- M9 - Close Out named as the stats render step - CLAUDE.md:57, superdev/README.md:86 - both place the `stats-report.sh` render "at Close Out" / inside the Close Out bullet, while both orchestrators run it as `## Step 5 - Done` step 1, after the Close Out commit (`superbuild/SKILL.md:164`, `simplebuild/SKILL.md:154`). `manifest.md:29` has it right ("after Close Out"); align the other two with it.
- M10 - No label rule for a fix after a task review - superdev/skills/superbuild/SKILL.md:57 - the `### Stats` bullet gives a fix dispatch the label `fix-NN`, but the `fix-NN` ordinal exists only in `### Fix loop`; a fix after a per-task review (`### Loop` step 3's FAIL branch) reuses `task-NN-notes.md` and has no such ordinal, leaving the orchestrator with no label for that dispatch. Say that the per-task fix keeps the task file's own label.

## Notes

- Both `CARRY:` lines that pointed at code are closed by the delivered tree. `superdev/skills/superbuild/SKILL.md` no longer says the fix dispatch sources "the real Test Commands" - Task 14's sweep rewrote it to `### Task Checks` (`:108`) - and every reviewer fork is preloaded with the full plan (`superbuild-reviewer-change/SKILL.md:13`, `superbuild-reviewer-spec/SKILL.md:13`, `simplebuild-reviewer/SKILL.md:13`), so the gate block reaches all three. The third `CARRY:`, against `spec.md`'s own header constraint, is a spec defect with no code to fix.
- The run-id derivation is duplicated byte for byte between `stats-record.sh:94-103` and `stats-report.sh:91-100`. It is deliberate and stated in both headers ("so both scripts always name the same run"), and `tests/superdev/stats-report.test.ts:414` asserts the two agree for a phase workdir and for the basename fallback, so the duplication is guarded rather than latent.
- `stats-record.sh` and `stats-report.sh` both resolve `.temp/superdev/stats/` against the current working directory rather than a git root - the `UNDERSPECIFIED:` line in `task-10-notes.md` named that as a constraint on Task 11, and Task 11 met it. Both scripts run from the same session, which never `cd`s, so the two always agree; only a session started in a subdirectory puts the stats tree somewhere other than the repo root, which is what `run.sh` avoids by resolving a git root for its logs.
- Probed end to end outside the repo tree: six recorded events plus a copy of this run's own `implementation/` rendered a complete report - both tables, the totals, and a twelve-row counter table - with the template's fixed prose preserved byte for byte. The `#### Integration` gate's three-subsection contract, the `Review:` column and the dispatch-strength rules read consistently across `review-contract.md`, both orchestrators, both planners and both READMEs.
- The `UNDERSPECIFIED:` lines of Tasks 11, 12 and 13 name adjacent values (the event vocabulary, the label set, the table entry rule) but no two decide the same one twice: Task 11 owns the report's entry rule, Tasks 12 and 13 own the vocabulary that feeds it, and the `implement|review` kind match in `stats-report.sh:179` accepts every kind Task 12 chose. The mismatches that survive are the labelling ones raised under `## Debt`, not conflicting decisions.
- `superdev/skills/setup/assets/config.yml` ends without a trailing newline, as it did before Task 9 added the `stats:` line. `read-config.sh` matches with `grep -qiE`, which reads an unterminated last line, so the switch resolves correctly; the missing newline is a pre-existing convention of that file, not a regression.

## Assessment

The four tasks land a working stats layer and a clean documentation sweep: `stats-report.sh` renders
exactly what its header promises under direct probing, its twelve tests assert real rendered output
rather than internals, both orchestrators gate every call on the switch and order the render before
cleanup, and no `Test Commands`, `Task Tests` or `debt.md` mention survives anywhere under
`superdev/`. One Important stands - the README hands the reader the wrong frontmatter default for
both task implementors in the very rows this sweep rewrote, on a page that now points at that
default as the fallback - plus four Minor labelling and wording mismatches.

VERDICT: FAIL
