
## Task 3 - Handle the implementor stop in both orchestrators
- TDD: none
- Model: opus
- Effort: high
- Covers: `Sprawa bez odpowiedzi zatrzymuje` (#2), `Odpowiedź wiąże resztę biegu` (#4), `Zatrzymane zadanie idzie dalej` (#5), `Przerwanie kończy bieg` (#6), `Ścieżka Simple równa Super` (#7), `Naprawa jak zadanie` (#8)

### Dependencies
- `Define the two decision lines, the implementor stop and the final decisions listing in the review contract` (Task 1) - blocks: the protocol this task writes into the loops
- `Split the two lines and the stop in both task implementors` (Task 2) - blocks: the `decisions` label and the return shape the loops branch on

### Files
- modify - superdev/skills/superbuild/SKILL.md (`### Loop` step 2 and step 3 FAIL branch, `### Fix loop` step 1, `## Mandatory rules` escalation bullet)
- modify - superdev/skills/simplebuild/SKILL.md (`### Loop` step 2, `### Fix loop` step 1, `## Mandatory rules` escalation bullet)

### Task Checks
- grep -n "VERDICT: BLOCKED" superdev/skills/superbuild/SKILL.md
- grep -n "VERDICT: BLOCKED" superdev/skills/simplebuild/SKILL.md
- grep -c "record-decision.sh" superdev/skills/superbuild/SKILL.md

### Approach
1. In both `### Loop` step 2 (the implementor dispatch), add the branch `VERDICT: BLOCKED` + `REASON: <line>`: read every `DECISION:` line off `notes`; one `AskUserQuestion` per line, naming the task `` `<title>` (Task NN) `` and quoting the line's `<what>` and `<options>`, with the options **answer** (free text) / **abort**; per answer run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/record-decision.sh" <workdir> "D<n>" "`<title>` (Task NN)" "<the answer>"`; then re-dispatch the same implementor call with the same labels plus `decisions: <workdir>/implementation/decisions.md`; abort ends the loop exactly as today's abort. The re-dispatch is neither a review round nor a fix round; a second BLOCKED from the re-dispatched task is a new matter and takes this same branch again.
2. In superbuild's step 3 FAIL branch (the fix after a task review) and in both `### Fix loop` step 1, add the same `VERDICT: BLOCKED` branch with `<subject>` `` `<fix title>` (fix <NN>) `` for a fix dispatch, the re-dispatch carrying `decisions:` alongside the labels it already had.
3. Every implementor dispatch anywhere in both skills passes `decisions: <workdir>/implementation/decisions.md` when that file exists, the same condition the reviewer dispatches already use.
4. In both `## Mandatory rules`, extend the escalation bullet so an implementor `BLOCKED` is recorded as kind `escalation`, label the task or fix in reference form, note the `DECISION:` `<what>` and the user's answer.
5. Keep the `no report` interruption rule intact: an implementor `VERDICT: BLOCKED` whose `notes` file holds no `DECISION:` line is the no-report state and takes that rule (retry / abort), never this branch.

### Failure modes
- when the implementor returns `VERDICT: BLOCKED` and `notes` holds no `DECISION:` line -> response: the existing `no report` interruption (`AskUserQuestion` retry / abort), log: the escalation stats event with note `BLOCKED without DECISION line`, test: none - orchestrator prose
- when `record-decision.sh` exits non-zero -> response: `AskUserQuestion` (retry the script / abort), no re-dispatch until it succeeds, log: the escalation stats event, test: none - orchestrator prose

### Contracts
- Orchestrator question shape for a stop: task or fix in reference form, the `DECISION:` `<what>` and `<options>`, options **answer** / **abort** - consumed by `Document the decision lines and the implementor stop` (Task 9)

### DoD
Both orchestrators branch on an implementor `VERDICT: BLOCKED` in the task loop and in every fix dispatch, ask once per `DECISION:` line, record through `record-decision.sh` with a `D<n>` ID, re-dispatch with `decisions:`, and treat abort as today's abort.


### Covered criteria
2. Sprawa bez odpowiedzi zatrzymuje - Sprawa, której wykonawca nie potrafi rozstrzygnąć (sprzeczność z zapisaną decyzją, ze specyfikacją, z inną częścią planu, kryterium niespełnialne bez zmiany zapisanej decyzji), zatrzymuje zadanie i wraca z pytaniem do prowadzącego, zanim zadanie zostanie zamknięte.
4. Odpowiedź wiąże resztę biegu - Odpowiedź prowadzącego zostaje zapisana w zapisie rozstrzygnięć biegu, obowiązuje przy każdym następnym zadaniu, naprawie i recenzji tego biegu i nie wraca jako pytanie ani jako znalezisko.
5. Zatrzymane zadanie idzie dalej - Po odpowiedzi to samo zadanie lub ta sama naprawa jest wykonywana ponownie z tą odpowiedzią i może zostać zamknięta.
6. Przerwanie kończy bieg - Prowadzący może zamiast odpowiedzi przerwać bieg; przerwanie zachowuje się jak dzisiejsze przerwanie z eskalacji zadania (pętla kończy się, drzewo robocze zostaje jak jest, zadanie pozostaje niezamknięte).
7. Ścieżka Simple równa Super - Zachowania z kryteriów 1-6 działają identycznie na ścieżce Simple i na ścieżce Super.
8. Naprawa jak zadanie - Zachowania z kryteriów 1-6 działają też w rundzie naprawczej po recenzji, gdzie sprawą jest wartość, której raport nie ustalił, albo dwa znaleziska wymagające sprzecznych rzeczy.
