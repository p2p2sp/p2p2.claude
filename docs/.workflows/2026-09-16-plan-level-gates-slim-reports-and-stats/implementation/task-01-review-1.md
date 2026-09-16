# task review - task-01-review-1

## Notes
- NOTE: plan defect - the header constraint "`## Gate commands` siedzi w nagłówku planu, który `decompose.sh` już kopiuje do `plan-header.md`" does not hold with the placement this task's `### Approach` prescribes. `decompose.sh` builds `plan-header.md` from the `Title:` / `Spec:` / `Intent:` lines plus the spec's two global sections (Super track) and from the `<!-- HEADER -->` block (Simple track); Approach steps 2 and 5 place the block after the preamble and after `<!-- /HEADER -->`, so on both tracks the gate reaches the workdir only through the full `plan.md` copy. The implementor followed the Approach and recorded the conflict as a `CARRY:` line against `superdev/scripts/decompose.sh`. Tasks 4 and 7 must source the gate from `plan.md`, not from `plan-header.md`, or the placement has to move inside `<!-- HEADER -->` on the Simple track.

## Assessment
Both templates carry `## Gate commands` above the first task block and `### Task Checks` on the task block, `### Test Commands` and `### Task Tests` are gone from all three files, the `Review:` marker is on the superplan template only, the ADR task block carries `### Task Checks`, and every listed grep condition holds by inspection; the diff stays inside the task's three files and the notes record every visible deviation.

VERDICT: PASS
