
## Task 8 - feat(agents): implementors prove fixes, declare touched files and carry known problems
- TDD: none
- Model: opus
- Effort: high
- Covers: criteria #17, #18, #19, #33

### Dependencies
- 1, 6 - blocks: 11, 12

### Files
- modify - superdev/agents/superbuild-task-implementor.md (`## Input` labels `refs`, `more`, `minor`; `## 1. Implement` fix-mode rules; `## 3. Record notes`; temp-file rule)
- modify - superdev/agents/simplebuild-task-implementor.md (same sections; `## 4. Record notes`)

### Test Commands
#### Build
- `bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-implementor.md && bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/simplebuild-task-implementor.md` - expected: `FAIL=0` on both, exit 0

#### Tests
- `grep -c 'touched:' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md` - expected: at least `1` per file
- `grep -c 'CARRY:' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md` - expected: at least `1` per file
- `grep -n 'no test:' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md` - expected: one hit per file
- `grep -n '\.temp/' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md` - expected: one hit per file
- `! grep -n 'Edge cases' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md` - expected: no output, exit 0

### Approach
1. Through `supercc:skill-designer`, in both agents: rename `Edge cases` to `Failure modes` in the task shape and in the "honor its ..." rule; add the labels `refs` (required: the references dir; the agent reads `<refs>/review-contract.md` before acting on a findings-list task), `more` (optional, repeatable: additional findings reports) and `minor` (optional: comma-separated Minor IDs allowed in this dispatch), as defined in Task 1 `## Labels` and `## Implementor fix-mode input`.
2. Replace the fix-mode bullet in `## 1. Implement` with: fix every `### Critical` and `### Important` ID from `task` and each `more` report; touch a `## Debt` ID only when listed on `minor:`; never touch any other Minor; every fixed Critical/Important gets a test that fails before the fix and passes after it (write and run the test first, then the fix), or, when no test can express it, the `no test:` status line in the notes; `## Notes`, `## Gates` and `## Prior findings` sections of a report are context, not work items.
3. In the notes step: keep the existing deviation, `UNDERSPECIFIED:` (superbuild only) and `no deviations` lines; add one `touched: <path>` line per file changed outside `### Files` (plan task) and per file changed at all (fix mode); one `CARRY: <path> - <problem>` line per known problem seen outside the task's `### Files` and left in place; in fix mode one status line per ID from the reports (`<ID>: fixed`, `<ID>: fixed - no test: <reason>`, `<ID>: skipped - <reason>`), shapes from Task 1 `## Notes line formats`.
4. Add one rule in both agents: every temporary file (a probe, a log, a scratch test) lives under `.temp/` and never in the repo tree; anything else the agent creates is a deliverable listed under `### Files` or a `touched:` line.
5. Keep both agents within their current length plus 15 lines; lint with `lint_skill.sh`.

### Edge cases
- A fix-mode dispatch with a `task` report in the pre-change format (no IDs): fix every Critical/Important bullet, number them `C1..`/`I1..` in the status lines in order of appearance, and say so in the notes.
- A plan task whose `### Files` lists a file the implementor did not need to touch: no `touched:` line, and a deviation line explaining why.

### Contracts
- Consumes Task 1 `## Labels`, `## Notes line formats`, `## Implementor fix-mode input`; the `touched:` lines are consumed by Task 2's `commit-task.sh --notes`.

### DoD
Both agents carry the new labels, the fix-mode rules, the three notes line shapes and the `.temp/` rule; greps hold; portability sweep green.


### Covered criteria
17. `agents/superbuild-task-implementor.md` i `agents/simplebuild-task-implementor.md` w trybie listy znalezisk naprawiają wyłącznie ID Critical/Important z raportów, a Minor tylko z jawnie wskazanej listy w wejściu; każde naprawione Critical/Important ma test, który pada przed poprawką i przechodzi po niej, albo linię w notatkach `no test: <powód>` przy tym ID.
18. Notatki poprawek zawierają dla każdego ID z raportów jedną linię statusu (`C1: fixed` / `I3: no test: <powód>` / `I4: skipped: <powód>`) oraz jedną linię `touched: <ścieżka>` na każdy dotknięty plik; ten sam format `touched:` piszą implementorzy zadań dla plików spoza `### Files`.
19. Implementor zadania zapisuje znany problem poza `### Files` zadania jako linię `CARRY: <plik> - <opis>` w notatkach, a recenzja końcowa i implementor poprawek czytają te linie jako wejście (recenzja: do domknięcia w mandacie integracyjnym; implementor: jako część listy do naprawy, gdy raport je wskazuje).
33. Recenzenci i implementorzy mają zapisany zakaz plików roboczych poza `.temp/` (sonda, log, tymczasowy plik testowy), a raport recenzji trafia wyłącznie pod ścieżkę `report:`.
