
## Task 2 - Split the two lines and the stop in both task implementors
- TDD: none
- Model: opus
- Effort: high
- Covers: `Wartość z rekomendacją nie zatrzymuje` (#1), `Sprawa bez odpowiedzi zatrzymuje` (#2), `Zatrzymanie nazywa sprawę` (#3), `Ścieżka Simple równa Super` (#7), `Naprawa jak zadanie` (#8)

### Dependencies
- `Define the two decision lines, the implementor stop and the final decisions listing in the review contract` (Task 1) - blocks: the line shapes, the `D<n>` ID and the return shape this task writes into the agents

### Files
- modify - superdev/agents/superbuild-task-implementor.md (`## Input`, `## 1. Implement`, `## 3. Record notes`, `## Output format`)
- modify - superdev/agents/simplebuild-task-implementor.md (`## Input`, `## 1. Implement`, `## 4. Record notes`, `## Output format`)

### Task Checks
- grep -n "DECISION:" superdev/agents/superbuild-task-implementor.md
- grep -n "DECISION:" superdev/agents/simplebuild-task-implementor.md
- grep -n "VERDICT: BLOCKED" superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md

### Approach
1. In both agents' `## Input`, add an optional `decisions` label: a path to the run's decisions file; every line in it is plan text, a matter a line there answers is settled, never raised as a `DECISION:` again, and a new `DECISION:` takes the next `D<n>` after the highest one found there (1 when the label is absent or holds no `D<n>` line).
2. In both agents' `## 1. Implement`, add one bullet on the stop: before editing any file, read the task against `## plan-header`, `## decisions` (when given) and the task's own sections; a matter the implementor cannot settle by the contract's `## Notes line formats` rule -> write its `DECISION:` lines to `notes` and return per `## Output format` without editing; a matter found mid-work -> stop at that point, leave the working tree as it stands, write the lines and return the same way.
3. In both agents' notes step, replace the `UNDERSPECIFIED:` bullet (superbuild) or add it (simplebuild) with the two bullets from the contract's `## Notes line formats`, the split rule in one sentence, and rewrite the fix-mode paragraph to the contract's extended shape; keep the simplebuild step number (`4`) and the superbuild step number (`3`).
4. In both agents' `## Output format`, add the third shape: line 1 `VERDICT: BLOCKED`, line 2 `REASON: <the first DECISION line's <what>>`, notes already written.

### Failure modes
- when `notes` is unset and a stop is raised -> response: `VERDICT: FAIL` with `REASON: DECISION needs a notes path - <what>`, log: none, test: none - agent prose (the orchestrators always pass `notes:`, so the branch guards a direct invocation only)

### Contracts
- Implementor label `decisions` (optional, path) - consumed by `Handle the implementor stop in both orchestrators` (Task 3)
- Both implementors write the two decision lines in the contract's shapes and return `VERDICT: BLOCKED` per the contract's `## Implementor stop` - consumed by `Handle the implementor stop in both orchestrators` (Task 3), `Judge every implementor decision at the per-task gate` (Task 5)

### DoD
Both agent files carry the split rule, both line shapes, the `decisions` input, the stop-before-edit bullet, the extended fix-mode notes and the `VERDICT: BLOCKED` return; the two notes steps read identically apart from their step numbers.


### Covered criteria
1. Wartość z rekomendacją nie zatrzymuje - Wartość, której plan nie ustalił, a dla której wykonawca ma obronną odpowiedź opartą na wzorcu w repozytorium, kryterium lub konwencji, zostaje przyjęta przez wykonawcę i zapisana w zapisie zadania wraz z podjętą decyzją, a bieg się nie zatrzymuje.
2. Sprawa bez odpowiedzi zatrzymuje - Sprawa, której wykonawca nie potrafi rozstrzygnąć (sprzeczność z zapisaną decyzją, ze specyfikacją, z inną częścią planu, kryterium niespełnialne bez zmiany zapisanej decyzji), zatrzymuje zadanie i wraca z pytaniem do prowadzącego, zanim zadanie zostanie zamknięte.
3. Zatrzymanie nazywa sprawę - Zatrzymanie nazywa prowadzącemu, co jest nierozstrzygalne, dlaczego, i jakie opcje wykonawca widzi, jeśli jakieś widzi.
7. Ścieżka Simple równa Super - Zachowania z kryteriów 1-6 działają identycznie na ścieżce Simple i na ścieżce Super.
8. Naprawa jak zadanie - Zachowania z kryteriów 1-6 działają też w rundzie naprawczej po recenzji, gdzie sprawą jest wartość, której raport nie ustalił, albo dwa znaleziska wymagające sprzecznych rzeczy.
