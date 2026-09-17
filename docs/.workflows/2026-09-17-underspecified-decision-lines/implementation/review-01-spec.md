# final review

## Gates

- Build - none - the plan moves markdown and one bash script; nothing compiles
- Tests - pass - 44s
- Integration - none - the repo has no integration suite

## Coverage

1. `Wartość z rekomendacją nie zatrzymuje` (#1) - met - superdev/references/review-contract.md:361-365 defines `UNDERSPECIFIED:` as the build-continuing line for a defensible value; superdev/agents/superbuild-task-implementor.md:81 and superdev/agents/simplebuild-task-implementor.md:82 carry the same rule; task-01-notes.md, task-02-notes.md, task-03-notes.md, task-04-notes.md and task-06-notes.md each show it exercised inside this very build without a stop.
2. `Sprawa bez odpowiedzi zatrzymuje` (#2) - met - superdev/references/review-contract.md:366-370 (`DECISION:` line) and :401-411 (`## Implementor stop`); superdev/agents/superbuild-task-implementor.md:33,88-90 and superdev/agents/simplebuild-task-implementor.md:31,89-91 write the same stop-before-editing rule and `VERDICT: BLOCKED` return.
3. `Zatrzymanie nazywa sprawę` (#3) - met - review-contract.md:366 fixes the `DECISION: <what> - <why it cannot be settled here> - <options seen, or none>` shape, and `## Implementor stop` step 1 (review-contract.md:417-419) has the orchestrator carry that `<what>`, `<why>` and `<options>` into the question it asks the user.
4. `Odpowiedź wiąże resztę biegu` (#4) - met - review-contract.md `## Decisions file` (line 292 area) plus `## Implementor stop` steps 2-3 (superdev/skills/superbuild/SKILL.md:124-125, superdev/skills/simplebuild/SKILL.md:120-121) record the answer through `record-decision.sh` and re-dispatch with `decisions:`; every implementor and reviewer dispatch site in both skills passes `decisions: <workdir>/implementation/decisions.md` whenever that file exists (superbuild/SKILL.md:103,107,109,129,138,150,151; simplebuild/SKILL.md:103,125,134,145).
5. `Zatrzymane zadanie idzie dalej` (#5) - met - superbuild/SKILL.md:125 and simplebuild/SKILL.md:121 re-dispatch the same task or fix with the same ordinal and read its verdict where the stopped dispatch's verdict was read, so it can close from there.
6. `Przerwanie kończy bieg` (#6) - met - superbuild/SKILL.md:123 and simplebuild/SKILL.md:119: "Abort ends the loop exactly as every other abort of this build does - the working tree is left as it stands and the task or fix stays unclosed."
7. `Ścieżka Simple równa Super` (#7) - met - superdev/agents/simplebuild-task-implementor.md mirrors superbuild-task-implementor.md's input, stop and output-format wording line for line; superdev/skills/simplebuild/SKILL.md:116-125 mirrors superbuild/SKILL.md:120-125's `### Implementor stop` handling; superdev/skills/simplebuild-reviewer/SKILL.md:82-87 carries the same three-step judgment as superdev/agents/superbuild-task-reviewer.md:36-41, since the Simple track has no per-task gate to run it at.
8. `Naprawa jak zadanie` (#8) - met - review-contract.md's fix-mode paragraph (line 383 area) and the last bullet of `## Implementor fix-mode input` ("A fix round stops exactly as a task does") extend both lines and the stop into fix mode; superbuild/SKILL.md:130,136-140 and simplebuild/SKILL.md:132,136-140 wire `VERDICT: BLOCKED` into `### Fix loop` the same way as the task loop, and superbuild/SKILL.md:109 does the same for the fix dispatched after a task review.
9. `Ustalona wartość nie jest decyzją` (#9) - met - superdev/agents/superbuild-task-reviewer.md:37 step (a) and superdev/skills/simplebuild-reviewer/SKILL.md:83 step (a).
10. `Zła decyzja jest znaleziskiem` (#10) - met - superbuild-task-reviewer.md:38 step (b) and simplebuild-reviewer/SKILL.md:84 step (b).
11. `Decyzja należąca do planu jest zastrzeżeniem` (#11) - met - superbuild-task-reviewer.md:39 step (c) and simplebuild-reviewer/SKILL.md:85 step (c), both routing to a `NOTE: plan defect` line instead of a finding.
12. `Spis decyzji na koniec` (#12) - met - review-contract.md:139-146 defines `## Decisions taken`, written at `final` and at the re-review of a final report only, never at checkpoint; superdev/skills/superbuild-reviewer-spec/SKILL.md:83 and superdev/skills/simplebuild-reviewer/SKILL.md:92 both state the same stage restriction in matching words and this very report carries that section below.
13. `Zapis dla testera zna decyzje` (#13) - met - superdev/agents/qa-writer.md:34-36 (reads `decisions.md` off `Workdir:`) and :40-44 (`Notes dir:` names the `UNDERSPECIFIED:` and `DECISION:` lines as the source of delivered behaviour for both the acceptance document and the handoff file).
14. `Statystyki liczą oba rodzaje` (#14) - met - superdev/scripts/stats-report.sh:272-273,282,284,289 add a `DECISION` counter beside `UNDERSPECIFIED` in both the header and the `printf` row; tests/superdev/stats-report.test.ts:244-245,261,284 assert the seven-column table; proven by the Tests gate above (`node --test "tests/**/*.test.ts"` - RESULT: SUCCESS, 44s).
15. `Nowy endpoint ma kontrakt` (#15) - met - superdev/references/plan-review-checklist.md:104-108 (class B18).
16. `Tekst dla użytkownika ma właściciela` (#16) - met - plan-review-checklist.md:109-114 (class B19), including the one delegation form `copy: implementor, after <existing key or file>` named in both plan skills and both templates.
17. `Awaria w połowie operacji ma decyzję` (#17) - met - plan-review-checklist.md:115-118 (class B20).
18. `Cały projekt tylko w bramce końcowej` (#18) - met - plan-review-checklist.md:119-125 (class B21); superdev/skills/superplan/SKILL.md:39-40 and superdev/skills/simpleplan/SKILL.md:45-46 (Gate commands paragraph); superplan/SKILL.md:83 and simpleplan/SKILL.md:86 (Task Checks paragraph); superplan/templates/plan.md:10 and simpleplan/templates/plan.md:29 (template placeholder).

## Decisions taken

- task-01-notes.md - where the `D<n>` ID lives on a `DECISION:` line - written as derived, not stored: a stop's first line takes the number after the highest `D<n>` in the decisions file handed in (`D1` when there is none), its further lines continue in write order.
- task-02-notes.md - the gate sentence of the notes step ("Only on PASS, and only when notes was given") - resolved as one named exception in that same sentence: the stop writes its `DECISION:` lines there and nothing else, rather than a second notes step.
- task-03-notes.md - what a stop costs the round budgets - decided: nothing; a stop's re-dispatch moves no ordinal and leaves the per-task 3-round cap and the per-review one-fix budget untouched.
- task-04-notes.md - the `### Contracts` endpoint wording for B18 - kept to "request shape, response shape and status codes" for an "HTTP endpoint, route or handler", no transport beyond HTTP named, since criterion 15 names only an API endpoint.
- task-04-notes.md - B21's whole-repository test - written against the host's memory files plus the plan's `### Files`, so a host whose runner offers no narrower scope never trips B21.
- task-06-notes.md - behaviour of the three-step judgment at `stage: re-review` - the DoD pins `checkpoint` and `final` only; written as "only a line the fix round itself wrote is judged," following the contract's `## Verdict rules` re-review clause.

## Findings

### Important

- I1 - Unrelated files committed inside this build's task commits - docs/notes.md (commit 20a2275, Task 1) and docs/.workflows/2026-09-17-vibe-track/intent.md, refresh.md, spec.md (commits 1a332c6 and a765678, Task 6 and Task 7) - three of this build's nine task commits carry files that name no plan task's `### Files` and appear on no `touched:` line in task-01-notes.md, task-06-notes.md or task-07-notes.md, an entirely separate `docs/.workflows/` run's intent/spec plus an unrelated personal notes file (`docs/notes.md`) riding inside commits titled "Task 6 - List the run's decisions..." and "Task 7 - Name the two decision lines..." - why it matters: the build's own commit history no longer says what each commit actually changed, and a later `git log`/`git diff <since>..HEAD` reader (this review included) has to hand-sort real task content from unrelated content pulled in alongside it - how to fix: split `docs/notes.md` and the `docs/.workflows/2026-09-17-vibe-track/` files out of commits 20a2275, 1a332c6 and a765678 into their own commit(s) with their own message, or confirm this was a deliberate "include named ones" answer to commit-task.sh's undeclared-file prompt and, if so, note it in the run's own notes so a future reader does not mistake it for scope creep.

## Notes

NOTE: plan defect - none raised at this review; `Notes dir`'s `NOTE: plan defect` lines already exist per task and are not restated here since this section carries only new information.

## Assessment

Every one of the eighteen acceptance criteria is met by code and prompt text this build actually landed, the Tests gate is green, and the two prior `### Implementor stop` mechanics (`CARRY:` C1 and `I1` from the checkpoint round) are both closed - but three of the nine task commits carry files outside any task's declared scope with no record of the deviation, which the "no scope creep" mandate makes a finding on its own.

VERDICT: FAIL
