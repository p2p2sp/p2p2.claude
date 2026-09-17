
## Task 9 - Document the decision lines and the implementor stop
- TDD: none
- Model: sonnet
- Effort: low
- Covers: `Sprawa bez odpowiedzi zatrzymuje` (#2), `Spis decyzji na koniec` (#12)

### Dependencies
- `Handle the implementor stop in both orchestrators` (Task 3) - blocks: the protocol the documentation describes
- `List the run's decisions at the final review and judge them on the Simple track` (Task 6) - blocks: the section the documentation names
- `Count DECISION lines in the stats report` (Task 8) - blocks: the table column the documentation names

### Files
- modify - superdev/hooks/content/manifest.md (`## Build chain`)
- modify - superdev/README.md (item 5 and item 6 of the numbered flow)
- modify - CLAUDE.md (the superdev bullet's build-chain sentences, `## Cross-plugin architecture invariants` self-documentation paragraph on the implementors)

### Task Checks
- grep -n "DECISION" superdev/hooks/content/manifest.md
- grep -n "DECISION" superdev/README.md
- grep -n "DECISION" CLAUDE.md

### Approach
1. In the manifest's `## Build chain`, rewrite the `VERDICT: BLOCKED` bullet: BLOCKED comes from a build reviewer on a criterion unmet by a recorded decision and from a task implementor on a `DECISION:` it cannot settle; in both cases the user answers once and the answer binds the rest of the build.
2. In `superdev/README.md`, add to item 5 the split between `UNDERSPECIFIED:` (a value the implementor settled by an existing pattern, judged at the per-task gate and listed at the final review under `## Decisions taken`) and `DECISION:` (a hard stop answered by the user through `decisions.md`), and to item 6 the `## Decisions taken` section of the final report, the whole-repository rule for `#### Build` / `#### Tests` versus `#### Integration`, and the stats table's `DECISION` column.
3. In root `CLAUDE.md`, extend the superdev bullet's review-chain sentences with the same facts in one or two sentences, and the implementors' paragraph under self-documentation with the `VERDICT: BLOCKED` return and the `decisions:` label.

### Failure modes
- none - documentation

### Contracts
- none

### DoD
Manifest, README and root CLAUDE.md describe the two lines, the implementor stop, the `## Decisions taken` section, the whole-repository gate rule and the `DECISION` stats column consistently with Tasks 1-8.


### Covered criteria
2. Sprawa bez odpowiedzi zatrzymuje - Sprawa, której wykonawca nie potrafi rozstrzygnąć (sprzeczność z zapisaną decyzją, ze specyfikacją, z inną częścią planu, kryterium niespełnialne bez zmiany zapisanej decyzji), zatrzymuje zadanie i wraca z pytaniem do prowadzącego, zanim zadanie zostanie zamknięte.
12. Spis decyzji na koniec - Recenzja końcowa biegu i jej ponowna recenzja po naprawie wypisują w jednym miejscu wszystkie decyzje wykonawców z całego biegu (zadanie lub naprawa, wartość, decyzja), bez wpływu na werdykt; recenzja pośrednia tego spisu nie wypisuje.
