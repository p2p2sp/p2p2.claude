
## Task 1 - Define the two decision lines, the implementor stop and the final decisions listing in the review contract
- TDD: none
- Model: opus
- Effort: high
- Covers: `Wartość z rekomendacją nie zatrzymuje` (#1), `Sprawa bez odpowiedzi zatrzymuje` (#2), `Zatrzymanie nazywa sprawę` (#3), `Naprawa jak zadanie` (#8), `Spis decyzji na koniec` (#12)

### Dependencies
- none

### Files
- modify - superdev/references/review-contract.md (`## Finding IDs`, `## Report skeleton`, `## Decisions file`, `## Notes line formats`, `## Implementor fix-mode input`, new `## Implementor stop`)

### Task Checks
- grep -n "DECISION:" superdev/references/review-contract.md
- grep -n "## Decisions taken" superdev/references/review-contract.md
- grep -n "## Implementor stop" superdev/references/review-contract.md

### Approach
1. In `## Notes line formats`, replace the `UNDERSPECIFIED:` bullet with two bullets and the split rule above them: `UNDERSPECIFIED: <value> - <the decision made>` is a value the task, its `### Contracts`, its `### Failure modes` and the plan header left open and for which the implementor had a defensible answer (an existing pattern in the repo, a covered criterion, a host convention) and used it; `DECISION: <what> - <why it cannot be settled here> - <options seen, or none>` is a matter the implementor cannot settle (a contradiction with a decisions-file line, the spec, another plan section, or a criterion unmeetable without changing a recorded decision), carrying an ID `D<n>` unique for the life of the build - `<n>` continues from the highest `D<n>` in the `decisions` file handed in, or starts at 1 when no such file or line exists - and written together with a `VERDICT: BLOCKED` return. State the rule in one sentence: a recommendation exists -> use it and write `UNDERSPECIFIED:`; none exists -> write `DECISION:` and stop. Rewrite the fix-mode paragraph: fix-mode notes are the `## Runs` section, one status line per ID, one `touched:` line per file, plus `UNDERSPECIFIED:` and `DECISION:` lines under the same two rules when a report left a value open or two findings contradict each other.
2. Add a `## Implementor stop` section after `## Implementor fix-mode input`: the implementor's third return shape, line 1 `VERDICT: BLOCKED`, line 2 `REASON: <the first DECISION line's <what>>`, with every `DECISION:` line written to `notes` before returning; the stop is raised before any file is edited when the matter is visible from the task text, and a matter found mid-work leaves the working tree as it stands; the orchestrator asks the user one question per `DECISION:` line, records each answer through `scripts/record-decision.sh` with `<id>` = `D<n>`, `<subject>` = `` `<task title>` (Task <N>) `` (or `` `<fix title>` (fix <NN>) `` in fix mode) and `<accepted-text>` = the answer, and re-dispatches the same implementor call with a `decisions:` line added; a `decisions` file handed to an implementor is plan text, and a `DECISION:` whose matter a line there already answers is never raised again.
3. In `## Finding IDs`, add `D<n>` as the ID class of an implementor stop, unique for the life of the build (continuing from the highest `D<n>` in the decisions file, or 1), never renumbered, reused by the decisions-file line and the orchestrator's question.
4. In `## Report skeleton`, add `## Decisions taken` between `## Prior findings` and `## Findings`: written at `stage: final` and at the re-review of a final report only, by the reviewer that owns requirement coverage on its track (`superbuild-reviewer-spec` on Super, `simplebuild-reviewer` on Simple), one line per `UNDERSPECIFIED:` line found across every `*-notes.md` of the notes directory, shaped `- <notes file basename> - <value> - <decision>`, informational, never affecting the verdict, omitted when no such line exists. Rewrite the closing sentence so it names two owned sections: the spec reviewer's `## Coverage` and the final reviewer's `## Decisions taken`.
5. In `## Decisions file`, extend the first sentence so a line is also written for every answer the user gives at an implementor stop, in the same shape, `<ID>` being `D<n>`.

### Failure modes
- none - reference text

### Contracts
- Line shape `UNDERSPECIFIED: <value> - <the decision made>` with the recommendation rule - consumed by `Split the two lines and the stop in both task implementors` (Task 2), `Judge every implementor decision at the per-task gate` (Task 5), `List the run's decisions at the final review and judge them on the Simple track` (Task 6), `Name the two decision lines as delivered behaviour for qa-writer` (Task 7)
- Line shape `DECISION: <what> - <why it cannot be settled here> - <options seen, or none>`, ID `D<n>` per notes file - consumed by `Split the two lines and the stop in both task implementors` (Task 2), `Handle the implementor stop in both orchestrators` (Task 3), `Judge every implementor decision at the per-task gate` (Task 5), `Count DECISION lines in the stats report` (Task 8)
- Implementor return shape `VERDICT: BLOCKED` + `REASON: <first DECISION what>` and the orchestrator protocol (question per line, `record-decision.sh <workdir> "D<n>" "<subject>" "<answer>"`, re-dispatch with `decisions:`) - consumed by `Split the two lines and the stop in both task implementors` (Task 2), `Handle the implementor stop in both orchestrators` (Task 3)
- Report section `## Decisions taken`, final stage and its re-review only, line shape `- <notes file basename> - <value> - <decision>` - consumed by `List the run's decisions at the final review and judge them on the Simple track` (Task 6)
- Fix-mode notes = `## Runs` + status lines + `touched:` lines + the two decision lines when they arise - consumed by `Split the two lines and the stop in both task implementors` (Task 2)

### DoD
The contract defines both line shapes, the `D<n>` ID class, the implementor stop protocol, the `## Decisions taken` section and the extended fix-mode notes; every later task cites these sections instead of restating them.


### Covered criteria
1. Wartość z rekomendacją nie zatrzymuje - Wartość, której plan nie ustalił, a dla której wykonawca ma obronną odpowiedź opartą na wzorcu w repozytorium, kryterium lub konwencji, zostaje przyjęta przez wykonawcę i zapisana w zapisie zadania wraz z podjętą decyzją, a bieg się nie zatrzymuje.
2. Sprawa bez odpowiedzi zatrzymuje - Sprawa, której wykonawca nie potrafi rozstrzygnąć (sprzeczność z zapisaną decyzją, ze specyfikacją, z inną częścią planu, kryterium niespełnialne bez zmiany zapisanej decyzji), zatrzymuje zadanie i wraca z pytaniem do prowadzącego, zanim zadanie zostanie zamknięte.
3. Zatrzymanie nazywa sprawę - Zatrzymanie nazywa prowadzącemu, co jest nierozstrzygalne, dlaczego, i jakie opcje wykonawca widzi, jeśli jakieś widzi.
8. Naprawa jak zadanie - Zachowania z kryteriów 1-6 działają też w rundzie naprawczej po recenzji, gdzie sprawą jest wartość, której raport nie ustalił, albo dwa znaleziska wymagające sprzecznych rzeczy.
12. Spis decyzji na koniec - Recenzja końcowa biegu i jej ponowna recenzja po naprawie wypisują w jednym miejscu wszystkie decyzje wykonawców z całego biegu (zadanie lub naprawa, wartość, decyzja), bez wpływu na werdykt; recenzja pośrednia tego spisu nie wypisuje.
