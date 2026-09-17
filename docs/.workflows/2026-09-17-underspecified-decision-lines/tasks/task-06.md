
## Task 6 - List the run's decisions at the final review and judge them on the Simple track
- TDD: none
- Model: opus
- Effort: medium
- Covers: `Ustalona wartość nie jest decyzją` (#9), `Zła decyzja jest znaleziskiem` (#10), `Decyzja należąca do planu jest zastrzeżeniem` (#11), `Spis decyzji na koniec` (#12), `Ścieżka Simple równa Super` (#7)

### Dependencies
- `Define the two decision lines, the implementor stop and the final decisions listing in the review contract` (Task 1) - blocks: the `## Decisions taken` section shape
- `Judge every implementor decision at the per-task gate` (Task 5) - blocks: the three-step judgment mirrored here for the Simple track

### Files
- modify - superdev/skills/superbuild-reviewer-spec/SKILL.md (`Notes dir:` paragraph, `## Report`)
- modify - superdev/skills/simplebuild-reviewer/SKILL.md (`Notes dir:` paragraph, `## Calibration` paragraphs, `## Report`)

### Task Checks
- grep -n "Decisions taken" superdev/skills/superbuild-reviewer-spec/SKILL.md
- grep -n "Decisions taken" superdev/skills/simplebuild-reviewer/SKILL.md
- grep -n "UNDERSPECIFIED:" superdev/skills/simplebuild-reviewer/SKILL.md

### Approach
1. In `superbuild-reviewer-spec`'s `## Report`, extend the owned-sections sentence: at `Stage` `final`, and at `re-review` when `Prior report` is a final report, also write `## Decisions taken` per the contract's `## Report skeleton`, one line per `UNDERSPECIFIED:` line across the notes directory; at `checkpoint` never.
2. In `superbuild-reviewer-spec`'s `Notes dir:` paragraph, name the two decision lines and say an `UNDERSPECIFIED:` line is a decision the code is judged against, and a `DECISION:` line in a closed task's notes is an Important finding.
3. In `simplebuild-reviewer`, add the same `## Decisions taken` rule to `## Report` (this track's final report is `review-NN.md`), and add to `## Calibration`, next to the duplicate-pair scan paragraph, the three-step judgment of Task 5 step 2 verbatim in mandate, applied to every `UNDERSPECIFIED:` line in the notes of tasks inside `git diff <since>..HEAD` - the Simple track has no per-task gate, so this round is where (a), (b) and (c) run - with (c) written as a `NOTE: plan defect` line in this report.
4. Leave the existing duplicate-pair scan in both `simplebuild-reviewer` and `superbuild-reviewer-change` unchanged.

### Failure modes
- none - fork prose

### Contracts
- none

### DoD
The Super final spec review and the Simple final review write `## Decisions taken` on final and its re-review only; the Simple checkpoint and final rounds judge `UNDERSPECIFIED:` lines by the same three steps as the Super per-task gate.


### Covered criteria
9. Ustalona wartość nie jest decyzją - Wartość, którą plan ustalił, a wykonawca zapisał jako własną decyzję, jest znaleziskiem recenzji zadania.
10. Zła decyzja jest znaleziskiem - Decyzja wykonawcy niezgodna z wzorcem w repozytorium lub z kryterium, które zadanie pokrywa, jest znaleziskiem recenzji zadania z konkretną poprawką.
11. Decyzja należąca do planu jest zastrzeżeniem - Decyzja wykonawcy o wartości, którą według reguł planowania plan powinien był ustalić, jest odnotowana jako zastrzeżenie do planu, nie jako znalezisko.
12. Spis decyzji na koniec - Recenzja końcowa biegu i jej ponowna recenzja po naprawie wypisują w jednym miejscu wszystkie decyzje wykonawców z całego biegu (zadanie lub naprawa, wartość, decyzja), bez wpływu na werdykt; recenzja pośrednia tego spisu nie wypisuje.
7. Ścieżka Simple równa Super - Zachowania z kryteriów 1-6 działają identycznie na ścieżce Simple i na ścieżce Super.
