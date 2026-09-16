# final review - review-01-spec.md

## Gates

Gate commands were collected from every task's `### Test Commands` (Tasks 1-7, the whole build is
committed - `git log` shows Task 7 at HEAD). Each distinct string ran once through `run.sh`; one came
back `RESULT: DEVIATION` and was dispatched to `superdev:executor` in analysis mode. No host
integration or e2e command is documented (`CLAUDE.md`, `.claude/rules/`), so this stage's third gate
carries the no-suite sentence.

- `node --test "tests/**/*.test.ts"` (the `#### Build` block of Tasks 1-5) - `RESULT: DEVIATION` /
  `EXIT: 1` -> `superdev:executor` (analysis) -> `VERDICT: FAIL` / `SUMMARY: Tests: 536 passed, 1
  failed, 537 total` / `FAILURES: this repo's tag list must be unchanged by the suite - a tag
  '0.43.1' was created by one test and not cleaned up`. Traced independently: tag `0.43.1` is a real,
  permanent tag on commit `9bdca59` ("chore(bump): bump version to 0.43.1"), an actual past release
  of this repo, unrelated to any of the seven tasks' `### Files` (none touches `tests/`, `.github/`
  or the release scripts) and predating this run. Evidence for findings only when it bears on this
  build's own delivery; here it does not - see `## Notes`.
- `grep -c '^### Task Tests' superdev/skills/superplan/templates/plan.md` (Task 1) - `RESULT: SUCCESS` / `TAIL: 1`
- `grep -c '^### Task Tests' superdev/skills/simpleplan/templates/plan.md` (Task 1) - `RESULT: SUCCESS` / `TAIL: 1`
- `! grep -rq 'TDD Commands' superdev/skills/superplan superdev/skills/simpleplan` (Task 1) - `RESULT: SUCCESS` (log empty)
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan` (Tasks 1, 2) - `RESULT: SUCCESS` / `TAIL: FAIL=0 WARN=0`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan` (Tasks 1, 2) - `RESULT: SUCCESS` / `TAIL: FAIL=0 WARN=0`
- `grep -c '^- B16 - ' superdev/references/plan-review-checklist.md` (Task 2) - `RESULT: SUCCESS` / `TAIL: 1`
- `grep -c '^### Task Tests' superdev/references/adr-task.md` (Task 2) - `RESULT: SUCCESS` / `TAIL: 1`
- `! grep -rq 'TDD Commands' superdev/references/plan-review-checklist.md superdev/references/adr-task.md` (Task 2) - `RESULT: SUCCESS` (log empty)
- `! grep -rq 'B1-B15' superdev/` (Task 2) - `RESULT: SUCCESS` (log empty)
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan-reviewer` (Task 2) - `RESULT: SUCCESS` / `TAIL: FAIL=0 WARN=1`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan-reviewer` (Task 2) - `RESULT: SUCCESS` / `TAIL: FAIL=0 WARN=1`
- `grep -c '### Task Tests' superdev/references/review-contract.md` (Task 3) - `RESULT: SUCCESS` / `TAIL: 2`
- `! grep -q 'TDD Commands' superdev/references/review-contract.md` (Task 3) - `RESULT: SUCCESS` (log empty)
- `grep -c 'deferred to final' superdev/references/review-contract.md` (Task 3) - `RESULT: SUCCESS` / `TAIL: 2`
- `! grep -Eq 'run\.sh|runner:|superdev:executor|LOG:|RESULT:' superdev/agents/superbuild-task-implementor.md` (Task 4) - `RESULT: SUCCESS` (log empty)
- `! grep -Eq 'run\.sh|runner:|superdev:executor|LOG:|RESULT:' superdev/agents/simplebuild-task-implementor.md` (Task 4) - `RESULT: SUCCESS` (log empty)
- `grep -q '## Runs' superdev/agents/superbuild-task-implementor.md && echo ok` (Task 4) - `RESULT: SUCCESS` / `TAIL: ok`
- `grep -q '## Runs' superdev/agents/simplebuild-task-implementor.md && echo ok` (Task 4) - `RESULT: SUCCESS` / `TAIL: ok`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-implementor.md` (Task 4) - `RESULT: SUCCESS` / `TAIL: FAIL=0 WARN=1`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/simplebuild-task-implementor.md` (Task 4) - `RESULT: SUCCESS` / `TAIL: FAIL=0 WARN=1`
- `! grep -q 'runner' superdev/skills/superbuild/SKILL.md` (Task 5) - `RESULT: SUCCESS` (log empty)
- `! grep -q 'runner' superdev/skills/simplebuild/SKILL.md` (Task 5) - `RESULT: SUCCESS` (log empty)
- `grep -c 'task-implementor.*refs: <refs>' superdev/skills/superbuild/SKILL.md` (Task 5) - `RESULT: SUCCESS` / `TAIL: 3`
- `grep -c 'task-implementor.*refs: <refs>' superdev/skills/simplebuild/SKILL.md` (Task 5) - `RESULT: SUCCESS` / `TAIL: 2`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild` (Task 5) - `RESULT: SUCCESS` / `TAIL: FAIL=0 WARN=0`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simplebuild` (Task 5) - `RESULT: SUCCESS` / `TAIL: FAIL=0 WARN=0`
- `grep -c 'Runs recorded' superdev/agents/superbuild-task-reviewer.md` (Task 6) - `RESULT: SUCCESS` / `TAIL: 1`
- `! grep -Eq 'run\.sh|superdev:executor' superdev/agents/superbuild-task-reviewer.md` (Task 6) - `RESULT: SUCCESS` (log empty)
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-reviewer.md` (Task 6) - `RESULT: SUCCESS` / `TAIL: FAIL=0 WARN=1`
- `grep -rl 'superdev:executor' superdev/ | sort` (Task 7) - `RESULT: SUCCESS` / matches the five expected files exactly (`review-contract.md`, `run.sh`, `simplebuild-reviewer/SKILL.md`, `superbuild-reviewer-change/SKILL.md`, `superbuild-reviewer-spec/SKILL.md`)
- `! grep -rq 'TDD Commands' superdev/ CLAUDE.md` (Task 7) - `RESULT: SUCCESS` (log empty)
- `grep -c 'Task Tests' superdev/README.md` (Task 7) - `RESULT: SUCCESS` / `TAIL: 5`
- `grep -c 'Task Tests' CLAUDE.md` (Task 7) - `RESULT: SUCCESS` / `TAIL: 1`
- `git status --short superdev/skills/executor superdev/skills/tdd superdev/scripts/decompose.sh` (Task 7) - `RESULT: SUCCESS` (log empty)
- no e2e or integration suite in this host.

## Coverage

1. `Bezpośredni bieg` (#1) - met - both agents run `#### Build` and every `### Task Tests` line as a
   direct `Bash` call, max 5 fix rounds (`superbuild-task-implementor.md:47-60`,
   `simplebuild-task-implementor.md:48-61`); the four "no `run.sh`/`runner:`/`superdev:executor`/
   `LOG:`/`RESULT:`" gates above are all green.
2. `Cykl TDD bezpośrednio` (#2) - met - `superbuild-task-implementor.md:33-37`,
   `simplebuild-task-implementor.md:31-35`: RED/GREEN run the matching `### Task Tests` line
   directly; a compile error, "no tests found" or a passing test is explicitly not RED; the stub rule
   ("a symbol with no behaviour, never production code") is present. No `TDD: required` task exists
   in this plan, so the cycle was not exercised by an actual build in this run - verified by text
   only.
3. `Bez pełnego suite` (#3) - met - both agents state the `#### Tests` block "never runs here... it
   is the build reviewers' gate" (`superbuild-task-implementor.md:52`,
   `simplebuild-task-implementor.md:53`) and give the fix-mode prefix-match rule
   (`superbuild-task-implementor.md:53`, `simplebuild-task-implementor.md:54`). One piece of evidence
   could not be resolved either way: `implementation/fix-01-notes.md`'s "Gate scope" line says the
   fix-01 round "ran the plan's `#### Build` plus every distinct `#### Tests` command of Tasks 1-5" -
   phrasing that, read literally, would be exactly what this criterion forbids the implementor from
   running, but is worded identically to `checkpoint-01.md`'s own (reviewer-owned) gate-scope
   sentence and may just be describing that separate, correct process. No run log or transcript
   settles which reading is right - see `## Notes`.
4. `Brak runner` (#4) - met - no `runner` string in either orchestrator (Task 5's two gates); every
   implementor dispatch still carries `refs: <refs>` (3× in `superbuild/SKILL.md`, 2× in
   `simplebuild/SKILL.md`, matching the plan's own DoD counts); the reviewer-fork and task-reviewer
   dispatches are unchanged.
5. `Executor tylko u reviewerów` (#5) - met - `grep -rl 'superdev:executor' superdev/` returns exactly
   the five files the plan names: `review-contract.md`, `run.sh`, `simplebuild-reviewer/SKILL.md`,
   `superbuild-reviewer-change/SKILL.md`, `superbuild-reviewer-spec/SKILL.md`.
6. `E2e tylko w final` (#6) - met - `review-contract.md` `## Gates` collects the integration/e2e
   command "on `stage: final` and `stage: re-review` only... a checkpoint never runs it" (line
   142-143), the `Rules:` list carries the checkpoint-deferral sentence and the re-review re-run rule
   unchanged (lines 229-236), and `## Report skeleton` lists the deferral sentence as a third fixed
   case (lines 111-113).
7. `Task Tests na każdym zadaniu` (#7) - met - both templates carry `### Task Tests` with the full
   rewritten annotation (`superplan/templates/plan.md:35-37`, `simpleplan/templates/plan.md:54-56`);
   `adr-task.md:53-54` carries `- none - documentation only`; no `TDD Commands` string remains under
   `superdev/` or `CLAUDE.md`.
8. `Jeden plik testowy przy TDD` (#8) - met - `plan-review-checklist.md` B6 rewritten to require
   `### Task Tests` on every task regardless of `TDD:` (lines 46-53), B16 added for an oversized
   `TDD: required` task (lines 92-96), no `B1-B15` range remains, and both planners' Task Sizing
   states the one-file bound (`superplan/SKILL.md:59`, `simpleplan/SKILL.md:62`).
9. `Rozmiar doradczy` (#9) - met - both planners' Task Sizing aims a `TDD: none` task at "one
   behaviour and a few files" (same lines as #8); the checklist's `## Advisory (NOTES)` carries the
   matching "Oversized `TDD: none` task" item (`plan-review-checklist.md:109-113`), explicitly never
   Blocking.
10. `Sekcja Runs` (#10) - partial - the delivered text is unconditional: both agents' Record-notes
    step opens with a `## Runs` section "written on every PASS... the build command, then each
    `### Task Tests` command that ran" (`superbuild-task-implementor.md:62-65`,
    `simplebuild-task-implementor.md:63-66`), and the `grep -q '## Runs'` gates on both files are
    green. Against real output, though: `implementation/task-06-notes.md` and
    `implementation/task-07-notes.md` - both from tasks that reached `VERDICT: PASS` and are
    committed - carry no `## Runs` section at all. See `C1`.
11. `Reviewer sprawdza Runs` (#11) - met on text, not on its own two real applications - the check
    exists with the right shape and severity (`superbuild-task-reviewer.md:35`: "a missing section or
    a missing line is an Important finding," skipped only when `notes` is unset, and it runs nothing
    itself). Both real times this build hit the condition it defines, it did not fire - see `C1`.
12. `Dokumentacja` (#12) - met - `superdev/README.md`'s `executor` row and both implementor rows now
    describe direct runs and the `## Runs` record; the `superplan`/`simpleplan` rows carry the
    Task-Tests clause; root `CLAUDE.md`'s invariant sentence is rewritten to name the three reviewers
    as the sole `run.sh`/`executor` callers and describe the implementors' direct runs and the gate
    stage rule. `superdev/.claude-plugin/plugin.json` differs by one version-bump line, traced to an
    unrelated external release commit (`9bdca59`), not to any of the seven tasks.
13. `Skrypty nietknięte` (#13) - met on the untouched-scripts half, not fully provable on the
    green-suite half - `run.sh`, `superdev/skills/executor`, `superdev/skills/tdd` and
    `decompose.sh` show no diff (the Task 7 gate). `node --test` currently reports 536 passed / 1
    failed; the one failure is proven pre-existing and unrelated to this delivery (see `## Gates` and
    `## Notes`), but the suite is not green as this criterion's own wording asks.
14. `Lint` (#14) - met - every `lint_skill.sh` run above across all seven tasks' changed `SKILL.md` /
    agent files returns `FAIL=0` (several carry a pre-existing `WARN=1`, none newly introduced and
    none blocking).
15. `Tylko testy w pamięci` (#15) - met - the in-memory rule is present verbatim in both planners'
    TDD Discipline section (`superplan/SKILL.md:76`, `simpleplan/SKILL.md:79`) and in both templates'
    `### Task Tests` annotation, naming the host's own memory files as the sole authority over which
    suite is fast/in-memory.
16. `Integracyjne tylko w final` (#16) - met - covered by #6's contract change plus
    `plan-review-checklist.md`'s `## Advisory (NOTES)` item "Integration or e2e test in a task's own
    commands" (lines 114-119), advisory and never Blocking.

## Findings

### Critical

- none.

### Important

- I1 - `## Runs` missing on two committed tasks - `docs/.workflows/2026-09-16-implementor-runs-task-tests-directly/implementation/task-06-notes.md`,
  `implementation/task-07-notes.md` - what is wrong: neither notes file carries a `## Runs` section,
  though both tasks reached `VERDICT: PASS` (`task-06-review-2.md`, and `task-07-notes.md` reads
  "no deviations" with no review report at all, i.e. a clean first-round PASS) and are committed
  (`git log`: `140a21b`, `54a9f71`); the delivered implementor contract requires the section
  unconditionally on every PASS when `notes` is given (`superbuild-task-implementor.md:62-65`), and
  the delivered per-task reviewer's own new bullet names exactly this condition an Important finding
  (`superbuild-task-reviewer.md:35`). Neither run raised it: `task-06-review-1.md` and
  `task-06-review-2.md` each note it only as `NOTE: plan defect - task-06 carries no
  ### Task Tests section`, and Task 7's silent PASS does not mention it at all - why it matters:
  criteria #10 and #11 exist precisely so "it was green" is never a declaration without a trace, and
  here two of the seven tasks this build shipped were committed with exactly that unproven trace,
  through the very mechanism meant to catch it - how to fix: state in the implementor's Record-notes
  step that a task carrying neither `#### Build` nor `### Task Tests` still gets a one-line `## Runs`
  naming whatever build command the plan/host fallback actually ran, never an empty section; state in
  the reviewer's `Runs recorded` bullet that a task's own missing `#### Build`/`### Task Tests` is
  never grounds to skip the check - only `notes` being unset is.

### Needs decision

- none.

## Debt

- none raised this round (`M1`-`M3` from the checkpoint round remain open in `implementation/debt.md`
  and are not re-raised here; `M2`'s stale parenthetical is still present verbatim at
  `superdev/skills/superbuild/SKILL.md:93`).

## Notes

- The one gate `DEVIATION` (`node --test`) traces to a real git tag, `0.43.1`, on commit `9bdca59`
  ("chore(bump): bump version to 0.43.1") - an actual past release of this repo, asserted against by
  `tests/github/release.test.ts` alone, a file none of the seven tasks touches. It predates this
  build and is unrelated to its delivery; not counted as a finding.
- `Since: 47cd63abe39fe210c8ff037dbfd2aae19af5485e` is not an ancestor of `HEAD`
  (`git merge-base --is-ancestor` returns false); `git log --all` shows a different commit,
  `f19bb6a`, with the identical message "Fix checkpoint-01 findings (I1 timeout rule, I2 Runs
  contract)" that *is* HEAD's actual parent-side ancestor - the branch's history diverged from the
  given SHA, most likely when the real release (`9bdca59`, tag `0.43.1`) landed and this branch was
  rebased past it. `git diff <since>..HEAD` under the given SHA pulls in five unrelated plugins'
  one-line `plugin.json` version bumps that do not appear in `git diff f19bb6a..HEAD`; this review's
  diff reading used `f19bb6a..HEAD` to avoid that noise. Criteria were still verdicted against the
  full repository state per the contract's `final`-stage rule, so this did not change any coverage
  line - it only affects which lines a defect-hunt over the delta would have to sift past.
- `fix-01-notes.md`'s "Not mine" line about `.claude/rules/_research.md` no longer applies: the file
  is clean in the working tree and untouched by this build (`git log -- .claude/rules/_research.md`
  shows only pre-build history).
- The `.claude/settings.json` `modelOverrides` addition (`opus` -> `claude-opus-4-8`) is closed:
  `implementation/decisions.md`'s `C1` records the user accepting it into Task 6's commit, and
  `task-06-notes.md` declares it with a `touched:` line.

## Assessment

Every gate but the pre-existing, unrelated `node --test` tag-pollution failure is green, and all
sixteen acceptance criteria are satisfied by the delivered text - the rename, the one-test-file and
advisory sizing rules, the checkpoint gate scoping, the direct-run rewrite, the runner removal, the
executor/README/CLAUDE.md sync all land coherently. One gap survives against the repository's actual
state: two of the seven tasks this build shipped were committed with no `## Runs` trace at all, and
the new per-task check built to catch exactly that did not fire either time.

VERDICT: FAIL
