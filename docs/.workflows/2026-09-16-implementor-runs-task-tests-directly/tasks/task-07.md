
## Task 7 - Sync README and root CLAUDE.md with the direct-run implementors
- TDD: none
- Model: sonnet
- Effort: medium
- Covers: `Executor tylko u reviewerów` (#5), `Dokumentacja` (#12), `Skrypty nietknięte` (#13), `Lint` (#14)

### Dependencies
- `Scope the integration and e2e gate to final and re-review in the review contract` (Task 3) - blocks: the gate stage rule the docs describe
- `Drop the runner label from both build orchestrators` (Task 5) - blocks: every source change the docs describe is in place

### Files
- modify - superdev/README.md (`executor` row, `superdev:simplebuild-task-implementor` row, `superdev:superbuild-task-implementor` row, `superplan` row, `simpleplan` row)
- modify - CLAUDE.md (superdev bullet, the "Both task implementors and the three build reviewers" sentence)

### Test Commands

#### Tests
- grep -rl 'superdev:executor' superdev/ | sort - prints exactly `superdev/references/review-contract.md`, `superdev/skills/executor/scripts/run.sh`, `superdev/skills/simplebuild-reviewer/SKILL.md`, `superdev/skills/superbuild-reviewer-change/SKILL.md`, `superdev/skills/superbuild-reviewer-spec/SKILL.md`
- ! grep -rq 'TDD Commands' superdev/ CLAUDE.md - exits 0
- grep -c 'Task Tests' superdev/README.md - prints a count of at least `1`
- grep -c 'Task Tests' CLAUDE.md - prints a count of at least `1`
- git status --short superdev/skills/executor superdev/skills/tdd superdev/scripts/decompose.sh - prints nothing

### Approach
1. In `superdev/README.md`, spelling the fork as `executor` and never `superdev:executor` anywhere in the file, rewrite the `executor` row's last sentence: the three build reviewers call `run.sh` directly for every gate command first and dispatch `executor` in analysis mode only on `RESULT: DEVIATION`; the two task implementors never use it, they run the task's `#### Build` and `### Task Tests` lines directly and read the output themselves.
2. Rewrite both implementor rows: each runs the task's build and its `### Task Tests` lines directly with `Bash` (up to 5 rounds), never the full suite, and records every run under `## Runs` in its notes; the super row keeps the test-first sentence.
3. Extend the `superplan` and `simpleplan` rows with one clause: every task carries `### Task Tests`, one command per test file, and a `TDD: required` task owns exactly one test file.
4. In root `CLAUDE.md`, rewrite the sentence beginning "Both task implementors and the three build reviewers run build, test, lint and type-check commands through a direct `run.sh` Bash call first" so it names the three build reviewers alone as the `run.sh` and `executor` callers, adds that both task implementors run the task's `#### Build` and `### Task Tests` lines directly with `Bash` and read the output themselves, never the full suite and never the executor, records the `## Runs` notes section the per-task reviewer checks, and states that the host's integration or e2e command is a gate at the final review and its re-review only, the checkpoint deferring it.

### Failure modes
- none - markdown

### Contracts
- none

### DoD
The README rows and the root `CLAUDE.md` invariant describe the three reviewers as the only `run.sh` and executor callers and the implementors as direct runners; `superdev:executor` appears as a work step only in the three fork reviewers and the contract (the run.sh header and the executor skill are descriptive); `run.sh`, `executor/SKILL.md`, `tdd/SKILL.md` and `decompose.sh` show no change; the greps exit as listed; the test suite is green.


### Covered criteria
5. Executor tylko u reviewerów - w `superdev/` wywołanie `superdev:executor` jako kroku pracy występuje wyłącznie w trzech reviewerach-forkach i w `review-contract.md`; opisy w `executor/SKILL.md`, nagłówku `run.sh`, `README.md` i root `CLAUDE.md` nie liczą się jako wywołanie.
12. Dokumentacja - wiersz `executor` i wiersze obu implementatorów w `superdev/README.md` oraz inwariant w root `CLAUDE.md` mówią, że `run.sh` i executor są transportem gate'u trzech reviewerów-forków, a implementatory uruchamiają testy zadania bezpośrednio; `plugin.json` pozostaje bez zmian.
13. Skrypty nietknięte - `run.sh`, `executor/SKILL.md`, `tdd/SKILL.md` i `decompose.sh` są identyczne z HEAD sprzed zmiany, a `node --test "tests/**/*.test.ts"` przechodzi bez zmian w testach.
14. Lint - `lint_skill.sh` skill-designera zwraca zero FAIL dla każdego zmienionego pliku SKILL.md i agenta.
