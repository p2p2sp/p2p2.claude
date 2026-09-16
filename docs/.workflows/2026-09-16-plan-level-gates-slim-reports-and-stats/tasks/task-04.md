
## Task 4 - Rewrite the review contract for plan-level gates, slim reports and dispatch strength
- TDD: none
- Model: opus
- Effort: xhigh
- Covers: `Gate z nagłówka na etapie` (#10), `Gates jedną linią` (#14), `Bez debt.md i bez recytacji` (#15), `Notes bez duplikatów` (#16), `Siła fix z planu` (#12)

### Dependencies
- `Move the gate into the plan header and rename the per-task section to Task Checks` (Task 1) - blocks: the gate block and the task-check section this contract governs

### Files
- modify - superdev/references/review-contract.md (`## Gates`, `## Report skeleton`, `## Debt file`, `## Notes line formats`, `## Implementor fix-mode input`, `## Labels`)

### Test Commands
#### Build
- grep -c '^## Dispatch strength' superdev/references/review-contract.md - prints `1`

#### Tests
- grep -c 'Review notes' superdev/references/review-contract.md - prints at least `1`
- grep -c 'Gate commands' superdev/references/review-contract.md - prints at least `1`
- grep -c '### Task Checks' superdev/references/review-contract.md - prints at least `1`
- ! grep -q '^## Debt file' superdev/references/review-contract.md - exits 0
- ! grep -q 'debt.md' superdev/references/review-contract.md - exits 0
- ! grep -Eq 'Test Commands|Task Tests' superdev/references/review-contract.md - exits 0

### Task Tests
- none - contract text only, no test file changes

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below.
2. Rewrite `## Gates`: the commands come from the plan's `## Gate commands` block - the one above the first task block - and from nowhere else; `stage: checkpoint` runs `#### Build` and `#### Tests`, `stage: final` runs all three, and `stage: re-review` runs the set of the round it closes, read off the first line of `prior` (a `checkpoint` round -> two subsections, a `final` round -> three). A subsection reading `none - <reason>` is not run and its reason is carried into the report. State that no command is collected from a task section, that `### Task Checks` belongs to the implementor and runs at no review stage, and drop the deduplication paragraph - the block is already one list. Keep the `run.sh` transport, the three-case result reading, the evidence rules and the BLOCKED mapping untouched.
3. Rewrite `## Report skeleton` to carry only new information: the title line is `# <stage> review` with no file name; `## Gates` is one line per subsection shaped `<subsection> - <result> - <wall time>`, and on a failure that line adds the tool's own summary line and the `LOG:` path, never the commands themselves; a section with nothing to say is omitted entirely; `## Prior findings` stays as it is; `## Debt` stays as this round's Minor list and is the only home of a Minor; `## Assessment` is one sentence about the verdict with no restatement of any acceptance criterion; the bare `VERDICT:` line at the end is the only section that always appears. Add that a re-review reports its re-run in that same one-line-per-subsection shape rather than copying the prior round's block.
4. Delete `## Debt file` whole, and repoint the `minor:` label in `## Labels` and the Minor rule in `## Implementor fix-mode input` at the report's own `## Debt` section. Then Grep the whole file for every surviving `debt.md`, `### Test Commands` and `### Task Tests` mention - the opening "Stack-agnostic:" paragraph's section list and the file's own preamble among them - and rewrite each against the sections that replaced them.
5. Extend `## Notes line formats` with the rule that notes never restate the task or a report - an `### Approach` step is cited by its number and a finding by its ID - and that they are written LLM to LLM, concrete and unexplained; define `## Review notes` as the section a per-task reviewer appends its `NOTE: <what>` lines to in `task-NN-notes.md` when it raises notes and nothing else; restate fix-mode notes as `## Runs` plus exactly one status line per finding ID plus the `touched:` lines and nothing more; keep `## Runs` as the implementor's record and bind it to the task's `### Task Checks` lines (a `none - <reason>` section yielding the single line `none - <reason>`). Finally add `## Dispatch strength`: the orders `opus` over `sonnet` and `xhigh` over `high` over `medium` over `low`; the per-task reviewer runs at the task's `Review:` marker, and with none, at no `model` / `effort` parameter at all; a fix dispatch after a task review runs at that task's own `Model:` / `Effort:`; a fix dispatch after a checkpoint or final round runs at the highest `Model:` and the highest `Effort:` among the tasks whose `### Files` names a file some finding points at, and with no such task, at no parameter at all.

### Failure modes
- none - contract text

### Contracts
- Gate stage mapping: `checkpoint` -> `#### Build` + `#### Tests`, `final` -> all three, `re-review` -> the set of the round named on `prior`'s first line; consumed by `Point the three build reviewer forks at the plan-level gate and drop the debt file` (Task 7).
- Slim report shape: no file name in the title, one line per gate subsection, empty sections omitted, `## Debt` the only home of a Minor, `VERDICT:` last; consumed by `Retune the per-task reviewer strength, its runs check and its notes-only path` (Task 6), `Point the three build reviewer forks at the plan-level gate and drop the debt file` (Task 7).
- Notes line formats, `## Runs` and `## Review notes` included; consumed by `Run only the task checks in both task implementors and keep the notes lean` (Task 5), `Retune the per-task reviewer strength, its runs check and its notes-only path` (Task 6).
- `## Dispatch strength` orders and the three selection rules; consumed by `Retune superbuild for review strength, fix strength and stats events` (Task 12), `Retune simplebuild for fix strength and stats events` (Task 13).

### DoD
`review-contract.md` sources every gate command from the plan's `## Gate commands`, maps the three stages, carries the slim report shape, holds no `## Debt file` section and no `debt.md` mention, defines `## Review notes` and the lean notes rules, and owns `## Dispatch strength`; the greps exit as listed.


### Covered criteria
10. Gate z nagłówka na etapie - `review-contract.md ## Gates` mówi, że reviewer-fork czyta `## Gate commands` z nagłówka planu, na `stage: checkpoint` uruchamia `#### Build` i `#### Tests`, na `stage: final` wszystkie trzy podsekcje, a na `stage: re-review` ten sam zestaw co runda, którą zamyka (po checkpoincie dwie, po final trzy); `none - <powód>` oznacza brak biegu z tym powodem w raporcie, żadna komenda z sekcji zadań nie jest zbierana ani deduplikowana, a trzej reviewerzy-forki wskazują tam bez własnego streszczenia.
14. Gates jedną linią - kształt raportu w `review-contract.md` każe sekcji `## Gates` nieść jedną linię na podsekcję gate'u (`Build`, `Tests`, `Integration`) z wynikiem i czasem, przy FAIL linię podsumowania narzędzia i ścieżkę logu, bez przepisywania komend; raport nie ma linii tytułowej z nazwą pliku, sekcja bez treści jest pominięta, `VERDICT:` na końcu jest jedyną stałą, `## Prior findings` zostaje, a re-review podaje wynik ponownego biegu w tej samej jednej linii na podsekcję zamiast kopiować poprzedni blok.
15. Bez debt.md i bez recytacji - `debt.md` nie jest tworzony ani wymieniany w `superdev/` ani w root `CLAUDE.md` (Minor żyje wyłącznie w `## Debt` raportu), `## Assessment` to jedno zdanie o werdykcie bez powtarzania DoD, a recenzja zadania z samymi uwagami nie pisze własnego pliku, tylko dopisuje `NOTE:` linie pod `## Review notes` w `task-NN-notes.md`.
16. Notes bez duplikatów - oba implementatory niosą regułę: notes nigdy nie przepisują treści zadania ani raportu, odwołują się do kroku `Approach` lub findingu numerem / ID, są pisane LLM dla LLM (konkret bez tłumaczeń); notes fix-mode to `## Runs` plus jedna linia statusu per ID i `touched:` linie, nic więcej; `review-contract.md ## Notes line formats` odzwierciedla to samo.
12. Siła fix z planu - oba orkiestratory dispatchują implementatora w trybie fix po recenzji zadania z `Model:` / `Effort:` tego zadania; w rundzie fix po checkpoincie lub final z najwyższymi `Model:` / `Effort:` spośród zadań, których `### Files` pokrywa plik nazwany w findingach, a gdy żaden finding nie nazywa pliku zadeklarowanego przez jakieś zadanie, bez parametrów (frontmatter agenta).
