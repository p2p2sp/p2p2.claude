
## Runs

- grep -n "DECISION:" superdev/references/review-contract.md -> exit 0
- grep -n "## Decisions taken" superdev/references/review-contract.md -> exit 0
- grep -n "## Implementor stop" superdev/references/review-contract.md -> exit 0

UNDERSPECIFIED: where the `D<n>` ID lives on a `DECISION:` line - step 1 says the line carries the ID
while the `### Contracts` shape has no field for it; written as derived, not stored: a stop's first
line takes the number after the highest `D<n>` in the decisions file handed in (`D1` when there is
none), its further lines continue in write order, so the pinned line shape stays byte-exact and
Task 3's orchestrator reads the same number off the same two facts.

Step 1 also touched `## Implementor fix-mode input`: its last bullet restated the three-things rule
verbatim and would have contradicted the rewritten fix-mode paragraph, so it now names the two
decision lines too, plus one new bullet saying a fix round stops exactly as a task does.

Steps outside the `### Files` parenthetical, same file: the `## Labels` `decisions:` bullet and the
document's opening sentence. The label bullet defined the decisions file as findings and criterion
changes only, which step 5 makes false; the opening sentence lists what the contract owns and now
names the implementor stop.

`## Implementor stop` step 1 scopes the orchestrator's questions to the `DECISION:` lines the
decisions file does not already answer - a notes file appended to across re-dispatches keeps the
earlier stop's lines and would otherwise be re-asked, against the "never asked a second time" rule
of the same section.

`agents/superbuild-task-reviewer.md` was left untouched despite the mirroring rule in this file's
header: its inline copy covers only the `C<n>`/`I<n>` finding shape it writes itself, and neither
`D<n>` nor `## Decisions taken` enters that shape.

Commit 20a2275 also carries `docs/notes.md`, which no step of this task wrote. It was already
modified in the working tree when the commit ran; `commit-task.sh` never stages outside the declared
set, so it reported the file as `undeclared:` and refused, and the path entered the commit only
through the loop's step-4 **include named ones** answer (a re-run with `--path docs/notes.md`). Not
scope creep and deliberately not a `touched:` line - a later `commit-task.sh --notes` run over this
file must not declare that path again.

## Review notes

NOTE: `## Report skeleton`'s closing sentence names the final reviewer's owned section literally
(`` `## Decisions taken` above ``) but keeps the spec reviewer's owned section as descriptive prose
(`the spec reviewer's coverage table`) rather than the literal `` `## Coverage` `` heading the
Approach step asked to name and that `skills/superbuild-reviewer-spec/SKILL.md` actually defines -
a cosmetic asymmetry within the same sentence, not a functional gap.
NOTE: the decisions-file and `## Implementor stop` reference form `` `<fix title>` (fix <NN>) ``
introduces a pointer kind (`fix NN`) that `## Naming`'s own bullet list and its `<pointer>`
enumeration do not carry, even though `## Naming` is documented elsewhere as the sole owner of that
vocabulary; the Approach specified this exact text and `## Naming` sits outside this task's `Files`,
so this is at most a plan gap for a later task to close, not a defect in this diff.
