# re-review review

## Gates

- Build - none - the plan moves markdown and one bash script; nothing compiles
- Tests - pass - 46s
- Integration - none - the repo has no integration suite

## Coverage

1. `Wartość z rekomendacją nie zatrzymuje` (#1) - met - superdev/references/review-contract.md:361-365 defines `UNDERSPECIFIED:` as the build-continuing line for a defensible value; superdev/agents/superbuild-task-implementor.md:81 and superdev/agents/simplebuild-task-implementor.md:82 carry the same rule; task-01, task-02, task-03, task-04 and task-06 notes each show it exercised inside this very build without a stop.
2. `Sprawa bez odpowiedzi zatrzymuje` (#2) - met - review-contract.md:366-372 (`DECISION:` line) and :401-413 (`## Implementor stop`); superdev/agents/superbuild-task-implementor.md and superdev/agents/simplebuild-task-implementor.md write the same stop-before-editing rule and `VERDICT: BLOCKED` return.
3. `Zatrzymanie nazywa sprawę` (#3) - met - review-contract.md:366-372 fixes the `DECISION: <what> - <why it cannot be settled here> - <options seen, or none>` shape, and `## Implementor stop` step 1 (review-contract.md:417-420) has the orchestrator carry that `<what>`, `<why>` and `<options>` into the question it asks the user.
4. `Odpowiedź wiąże resztę biegu` (#4) - met - review-contract.md `## Decisions file` (line 312 area) plus `## Implementor stop` steps 2-3 record the answer through `record-decision.sh` and re-dispatch with `decisions:`; superbuild/SKILL.md and simplebuild/SKILL.md pass `decisions: <workdir>/implementation/decisions.md` whenever that file exists, unchanged by this round's fix.
5. `Zatrzymane zadanie idzie dalej` (#5) - met - unchanged by this round's fix; the re-dispatch keeps the same task or fix ordinal, as verified at the prior review.
6. `Przerwanie kończy bieg` (#6) - met - unchanged by this round's fix.
7. `Ścieżka Simple równa Super` (#7) - met - unchanged by this round's fix; simplebuild-task-implementor.md, simplebuild/SKILL.md and simplebuild-reviewer/SKILL.md still mirror the Super-track wording verified at the prior review.
8. `Naprawa jak zadanie` (#8) - met - review-contract.md `## Implementor fix-mode input` (line 380 area) and `## Implementor stop`'s closing bullet ("A fix round stops exactly as a task does") still extend both decision lines and the stop into fix mode; superbuild/SKILL.md's Step 3 (`superdev/skills/superbuild/SKILL.md:155`) was reworded by this round's fix to re-dispatch `superbuild-reviewer-spec` at `stage: re-review` whenever the round dispatched a fix at all, closing I2 of `review-01-code.md` without touching this criterion's own mechanics.
9. `Ustalona wartość nie jest decyzją` (#9) - met - unchanged by this round's fix.
10. `Zła decyzja jest znaleziskiem` (#10) - met - unchanged by this round's fix.
11. `Decyzja należąca do planu jest zastrzeżeniem` (#11) - met - unchanged by this round's fix.
12. `Spis decyzji na koniec` (#12) - met - review-contract.md:139-146 still defines `## Decisions taken`, written at `final` and at the re-review of a final report by the reviewer that owns requirement coverage; this very report carries that section below, and the fix's Step 3 reword (superbuild/SKILL.md:155) now guarantees this reviewer reruns after any final-round fix, not only one it raised findings on itself.
13. `Zapis dla testera zna decyzje` (#13) - met - unchanged by this round's fix.
14. `Statystyki liczą oba rodzaje` (#14) - met - proven again by the Tests gate above (`node --test "tests/**/*.test.ts"` - RESULT: SUCCESS, 46s); no file under this criterion's evidence changed in this round's diff.
15. `Nowy endpoint ma kontrakt` (#15) - met - unchanged by this round's fix.
16. `Tekst dla użytkownika ma właściciela` (#16) - met - unchanged by this round's fix.
17. `Awaria w połowie operacji ma decyzję` (#17) - met - unchanged by this round's fix.
18. `Cały projekt tylko w bramce końcowej` (#18) - met - unchanged by this round's fix.

## Prior findings

| ID | Title | Verdict | Evidence |
| --- | --- | --- | --- |
| I1 | Unrelated files committed inside this build's task commits | ADDRESSED | task-01-notes.md, task-06-notes.md and task-07-notes.md each now record, in the shape the finding's own "how to fix" offered as its second option, that `docs/notes.md` (commit 20a2275) and `docs/.workflows/2026-09-17-vibe-track/{intent,refresh,spec}.md` (commits 1a332c6, a765678) rode in through `commit-task.sh`'s step-4 "include named ones" answer, were already present in the working tree, and are deliberately left undeclared as `touched:` lines going forward; fix-02-notes.md:10 carries the matching `I1: fixed - no test:` status line. |

## Decisions taken

- task-01-notes.md - where the `D<n>` ID lives on a `DECISION:` line - written as derived, not stored: a stop's first line takes the number after the highest `D<n>` in the decisions file handed in (`D1` when there is none), its further lines continue in write order.
- task-02-notes.md - the gate sentence of the notes step ("Only on PASS, and only when notes was given") - resolved as one named exception in that same sentence: the stop writes its `DECISION:` lines there and nothing else, rather than a second notes step.
- task-03-notes.md - what a stop costs the round budgets - decided: nothing; a stop's re-dispatch moves no ordinal and leaves the per-task 3-round cap and the per-review one-fix budget untouched.
- task-04-notes.md - the `### Contracts` endpoint wording for B18 - kept to "request shape, response shape and status codes" for an "HTTP endpoint, route or handler", no transport beyond HTTP named, since criterion 15 names only an API endpoint.
- task-04-notes.md - B21's whole-repository test - written against the host's memory files plus the plan's `### Files`, so a host whose runner offers no narrower scope never trips B21.
- task-06-notes.md - behaviour of the three-step judgment at `stage: re-review` - the DoD pins `checkpoint` and `final` only; written as "only a line the fix round itself wrote is judged," following the contract's `## Verdict rules` re-review clause.

## Findings

### Important

- I2 - Fix round left a second undeclared change to docs/notes.md - docs/notes.md - the fix commit (45117b2) does not only re-carry the pre-existing, now-documented inclusion of `docs/notes.md`: it further edits that file's content - "czyta" becomes "czasami czyta" and a new unrelated paragraph ("Przywróć poprzednie działanie intent...") is appended - content with no connection to I1, I2 or M4/M5 of `review-01-code.md`, the only work items this fix round had. `fix-02-notes.md`'s four `touched:` lines name `superdev/skills/superbuild/SKILL.md` and the three task notes files only; `docs/notes.md` is not among them, although the contract's fix-mode rule requires "one `touched:` line per file the round changed" (`## Notes line formats`) - why it matters: this is the same defect I1 raised - an undeclared file riding inside a build commit - recurring inside the very round dispatched to close I1, and this time with no note anywhere explaining it, so a later `git diff <since>..HEAD` reader has no way to tell this content apart from the fix's actual work - how to fix: add a `touched: docs/notes.md` line (with its reason) to `fix-02-notes.md`, or split that file's further edit out of commit 45117b2 into its own commit.

## Notes

NOTE: docs/notes.md is the user's own scratch file, edited outside this build's task boundaries in both the original build and this fix round; nothing in the build's own prompt text asked for its content to change either time.

## Assessment

The prior Important is addressed exactly as its own second option asked, and every acceptance criterion still holds against the fixed tree with the Tests gate green - but the fix commit itself repeats the undeclared-file pattern I1 was raised over, this time inside the round meant to close it and with no record at all.

VERDICT: FAIL
