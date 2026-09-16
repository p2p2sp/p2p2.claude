# checkpoint review - checkpoint-01.md

## Gates

Gate commands were collected from the plan tasks committed in this delta (Tasks 1-5, `status.md`:
`task: 05`); Tasks 6 and 7 are not yet built, so their `### Test Commands` blocks describe work that
has not landed and are not collected at this checkpoint. Each distinct string ran once through
`run.sh`; no command came back `RESULT: DEVIATION`, so no `superdev:executor` dispatch was needed and
no log was read.

- `node --test "tests/**/*.test.ts"` (the `#### Build` block of Tasks 1-5, one distinct string) -
  `RESULT: SUCCESS` / `EXIT: 0` / `TAIL: ℹ duration_ms 52031.9414`
- `grep -c '^### Task Tests' superdev/skills/superplan/templates/plan.md` (Task 1) -
  `RESULT: SUCCESS` / `EXIT: 0` / `TAIL: 1`
- `grep -c '^### Task Tests' superdev/skills/simpleplan/templates/plan.md` (Task 1) -
  `RESULT: SUCCESS` / `EXIT: 0` / `TAIL: 1`
- `! grep -rq 'TDD Commands' superdev/skills/superplan superdev/skills/simpleplan` (Task 1) -
  `RESULT: SUCCESS` / `EXIT: 0` (log empty, no `TAIL:`)
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan` (Tasks 1, 2) -
  `RESULT: SUCCESS` / `EXIT: 0` / `TAIL: FAIL=0 WARN=0`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan` (Tasks 1, 2) -
  `RESULT: SUCCESS` / `EXIT: 0` / `TAIL: FAIL=0 WARN=0`
- `grep -c '^- B16 - ' superdev/references/plan-review-checklist.md` (Task 2) -
  `RESULT: SUCCESS` / `EXIT: 0` / `TAIL: 1`
- `grep -c '^### Task Tests' superdev/references/adr-task.md` (Task 2) -
  `RESULT: SUCCESS` / `EXIT: 0` / `TAIL: 1`
- `! grep -rq 'TDD Commands' superdev/references/plan-review-checklist.md superdev/references/adr-task.md` (Task 2) -
  `RESULT: SUCCESS` / `EXIT: 0` (log empty, no `TAIL:`)
- `! grep -rq 'B1-B15' superdev/` (Task 2) - `RESULT: SUCCESS` / `EXIT: 0` (log empty, no `TAIL:`)
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan-reviewer` (Task 2) -
  `RESULT: SUCCESS` / `EXIT: 0` / `TAIL: FAIL=0 WARN=1`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan-reviewer` (Task 2) -
  `RESULT: SUCCESS` / `EXIT: 0` / `TAIL: FAIL=0 WARN=1`
- `grep -c '### Task Tests' superdev/references/review-contract.md` (Task 3) -
  `RESULT: SUCCESS` / `EXIT: 0` / `TAIL: 2`
- `! grep -q 'TDD Commands' superdev/references/review-contract.md` (Task 3) -
  `RESULT: SUCCESS` / `EXIT: 0` (log empty, no `TAIL:`)
- `grep -c 'deferred to final' superdev/references/review-contract.md` (Task 3) -
  `RESULT: SUCCESS` / `EXIT: 0` / `TAIL: 2`
- `! grep -Eq 'run\.sh|runner:|superdev:executor|LOG:|RESULT:' superdev/agents/superbuild-task-implementor.md` (Task 4) -
  `RESULT: SUCCESS` / `EXIT: 0` (log empty, no `TAIL:`)
- `! grep -Eq 'run\.sh|runner:|superdev:executor|LOG:|RESULT:' superdev/agents/simplebuild-task-implementor.md` (Task 4) -
  `RESULT: SUCCESS` / `EXIT: 0` (log empty, no `TAIL:`)
- `grep -q '## Runs' superdev/agents/superbuild-task-implementor.md && echo ok` (Task 4) -
  `RESULT: SUCCESS` / `EXIT: 0` / `TAIL: ok`
- `grep -q '## Runs' superdev/agents/simplebuild-task-implementor.md && echo ok` (Task 4) -
  `RESULT: SUCCESS` / `EXIT: 0` / `TAIL: ok`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-implementor.md` (Task 4) -
  `RESULT: SUCCESS` / `EXIT: 0` / `TAIL: FAIL=0 WARN=1`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/simplebuild-task-implementor.md` (Task 4) -
  `RESULT: SUCCESS` / `EXIT: 0` / `TAIL: FAIL=0 WARN=1`
- `! grep -q 'runner' superdev/skills/superbuild/SKILL.md` (Task 5) -
  `RESULT: SUCCESS` / `EXIT: 0` (log empty, no `TAIL:`)
- `! grep -q 'runner' superdev/skills/simplebuild/SKILL.md` (Task 5) -
  `RESULT: SUCCESS` / `EXIT: 0` (log empty, no `TAIL:`)
- `grep -c 'task-implementor.*refs: <refs>' superdev/skills/superbuild/SKILL.md` (Task 5) -
  `RESULT: SUCCESS` / `EXIT: 0` / `TAIL: 3`
- `grep -c 'task-implementor.*refs: <refs>' superdev/skills/simplebuild/SKILL.md` (Task 5) -
  `RESULT: SUCCESS` / `EXIT: 0` / `TAIL: 2`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild` (Task 5) -
  `RESULT: SUCCESS` / `EXIT: 0` / `TAIL: FAIL=0 WARN=0`
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simplebuild` (Task 5) -
  `RESULT: SUCCESS` / `EXIT: 0` / `TAIL: FAIL=0 WARN=0`
- no e2e or integration suite in this host.

## Findings

### Critical

- none.

### Important

- I1 - Run timeout unspecified - superdev/agents/superbuild-task-implementor.md:49 (identically
  superdev/agents/simplebuild-task-implementor.md:50) - the rewrite moves every build and task-test
  run from `run.sh` to a direct `Bash` call but drops the one rule the old text carried about how
  long a run may take (`timeout:` "always explicit and generous enough for the host's slowest
  documented suite - left to the default, a slow suite comes back as a false timeout"), and puts
  nothing in its place; neither agent now mentions a timeout at all. Why it matters: on any host
  whose build or task-test command runs longer than the `Bash` tool's default timeout, the call is
  cut off. That outcome is neither the step's "cannot start at all" case (line 54 / line 55, which
  covers only command-not-found and shell errors) nor a test red, so it falls through to "Any red ->
  fix, then re-run from step 1" - the implementor edits working code chasing a phantom failure, five
  rounds deep, before returning `VERDICT: FAIL`. The old runner made this impossible by construction;
  the delta reintroduces it, in both agents at once, and no plan task covers it (Task 4's
  `### Failure modes` has seven entries and none is the timeout case). How to fix: add one bullet to
  the build-and-test step of both agents - every direct `Bash` call of a build or `### Task Tests`
  command carries an explicit timeout generous enough for the host's slowest documented command, and
  a run the tool cuts off at its timeout is not a red to fix: re-run it once with a larger timeout,
  and if it is cut off again stop and return `VERDICT: FAIL` naming that command and the timeout it
  was given.

- I2 - Runs section undocumented in the contract - superdev/references/review-contract.md:318 - both
  implementors now write a `## Runs` section into their `*-notes.md` on every PASS
  (superbuild-task-implementor.md:64, simplebuild-task-implementor.md:65), but
  `## Notes line formats` - which opens "Lines the implementors write into their `*-notes.md` file
  under `<workdir>/implementation/`" and is the declared single owner of that file's shape - still
  lists only `touched:`, `CARRY:`, the fix status lines, `UNDERSPECIFIED:` and `no deviations`. The
  same omission repeats at line 344-345 in `## Implementor fix-mode input`, which enumerates what a
  fix round's notes must carry and names only the status line and the `touched:` line, though the
  implementors write `## Runs` in fix mode too. Why it matters: the contract is read by both
  implementors on every findings-report dispatch, and Task 4's own `### Contracts` entry hands
  `## Runs` to Task 6, which will make the per-task reviewer raise an Important finding whenever the
  section is missing - so a gate is about to be enforced against a shape its owning document does not
  define, and an implementor that trusts the contract over its own agent file writes notes that fail
  that gate. How to fix: add `## Runs` to `## Notes line formats` in the shape the agents write
  (written on PASS, one line per command of the last green pass, in run order,
  `- <command verbatim> -> <summary line | exit <n>>`), and name it alongside the status and
  `touched:` lines in `## Implementor fix-mode input`.

### Needs decision

- none.

## Debt

- M1 - Reviewer gate sentence list stale - superdev/skills/superbuild-reviewer-change/SKILL.md:37
  (identically superbuild-reviewer-spec/SKILL.md:37 and simplebuild-reviewer/SKILL.md:37) - each
  reviewer's gates paragraph enumerates what the contract's `## Gates` governs and names "the single
  sentence for a host that documents none"; Task 3 added a second fixed single sentence
  (`integration and e2e deferred to final` on `stage: checkpoint`) that the enumeration does not
  mention. Behaviour is unaffected - the paragraph defers to the contract, which the reviewer reads -
  but the summary is now incomplete, and Task 3's `### Contracts` names only Task 7 (README and root
  `CLAUDE.md`) as the consumer, so no task closes it.
- M2 - Stale plan-label parenthetical - superdev/skills/superbuild/SKILL.md:93 - the re-dispatch line
  still explains the `plan` label as "(`plan` lets it source the real Test Commands)", while the
  implementor's own `plan` bullet now reads "sources the `#### Build` block and the `### Task Tests`
  lines when `task` is a findings report or lists no build command" - `#### Tests` is precisely the
  part the implementor no longer runs.
- M3 - Contract still sources integration/e2e from the plan -
  superdev/references/review-contract.md:142 - the gate bullet reads "when the plan or the host's
  memory files document one", but Task 1 made both planners forbid an integration or e2e command in
  `### Task Tests` and in the `#### Tests` block, which are the only structured places a plan task
  carries a command. The "the plan or" half of that source is now effectively dead text.

## Notes

- NOTE: plan defect - the replacement scope sentence "`Bash` runs the build, the task tests, `git`
  and file inspection; nothing else" (superbuild-task-implementor.md:57,
  simplebuild-task-implementor.md:58) narrows what the old text allowed: that read "Every build,
  test, lint, type-check, formatter and script run goes out through `<runner>`", so a scaffolding or
  code-generation script was permitted. Under the new sentence it is not - yet the `touched:` bullet
  a few lines below still anticipates the output of exactly such a run ("a generated name - an EF
  migration timestamp, a snapshot hash, a dated file"). Task 4's `### Approach` step 5 prescribed
  this sentence verbatim, so it is a plan decision, not an implementation defect; worth one clause
  restoring a generator or scaffolding run to the allowed set at the final review.
- The delta is internally consistent on the one cross-cutting pattern it introduces: both
  implementors carry byte-identical wording for the input set, the direct RED/GREEN cycle, the
  build-and-test step, the fix-mode scope and the `## Runs` section, differing only where the plan
  said they should (section numbers, the `spec` label, "the build reviewers' gate" vs. "the build
  reviewer's gate").
- `superdev/scripts/decompose.sh` and `superdev/scripts/commit-task.sh` were checked against the
  rename and the new notes section: decompose.sh never names `### TDD Commands` or any per-task
  section other than `### Covered criteria`, and commit-task.sh matches `touched:` only at the start
  of a bullet, so a `## Runs` line cannot be mistaken for a declared path. Neither script needs a
  change.
- The ADR task template's new `### Task Tests` reading `none - documentation only` sits on a
  `TDD: none` task, so it does not trip the new `B16 - Oversized TDD task` class, which fires on
  `TDD: required` only.
- Two `UNDERSPECIFIED:` lines appear across the notes (task-01: the scope of "the marker bullet's
  TDD clause"; task-02: the "many files" bound; task-04: the per-round `## Runs` shape). No two name
  the same field or rule, so no duplicated-derived-value defect follows from them.

## Assessment

The rename, the sizing bound, the in-memory rule, the new `B16` class, the checkpoint gate scoping
and the direct-run rewrite all landed coherently across the seven files, every gate command is green,
and the two implementors stay byte-for-byte symmetric. Two seams are open: the direct-run rewrite
left no rule for a run the `Bash` tool cuts off at its timeout, and the `## Runs` section is written
by both implementors while the contract that owns the notes shape still does not define it.

VERDICT: FAIL
