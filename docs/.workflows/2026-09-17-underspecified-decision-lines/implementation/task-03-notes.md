## Runs

- grep -n "VERDICT: BLOCKED" superdev/skills/superbuild/SKILL.md -> exit 0
- grep -n "VERDICT: BLOCKED" superdev/skills/simplebuild/SKILL.md -> exit 0
- grep -c "record-decision.sh" superdev/skills/superbuild/SKILL.md -> 6

Approach 1-2: the branch body is written once per skill as a new `### Implementor stop` subsection (between `### Loop` and `### Checkpoint`) and referenced from each dispatch site with `<subject>` / `<notes>`, instead of restated at three (superbuild) / two (simplebuild) sites - the protocol is identical at every site and both skills already share `### Fix loop` this way.

Approach 4: the escalation bullet is under `### Stats`, not `## Mandatory rules` as `### Files` says - `## Mandatory rules` carries no escalation bullet in either skill, and `### Stats`' is the only one.

Approach 2: the fix after a task review (superbuild `### Loop` step 3) takes `<subject>` `` `<title>` (Task NN) ``, not the `` `<fix title>` (fix NN) `` the step names - that branch has no fix ordinal at all and writes the task's own `task-NN-notes.md`; `(fix NN)` is kept for the `### Fix loop` dispatch, which does have one.

Approach 1: the question also carries the `DECISION:` line's `<why>`, beyond the `<what>` and `<options>` of `### Contracts` - review-contract.md `## Implementor stop` step 1 names all three, and it owns the protocol.

Approach 5: the `no report` bullet of `## Harness pre-check` was extended in both skills (a section `### Files` does not name) - it read "a **reviewer** returning ...", so an implementor `VERDICT: BLOCKED` with no `DECISION:` line fell under no rule; it now names that case and outranks `### Implementor stop` the way it outranks `### Fix loop`.

UNDERSPECIFIED: what a stop costs the round budgets - decided: nothing. A stop's re-dispatch moves no ordinal (`notes:` file, fix `NN`, reviewer `R` all unchanged) and leaves the per-task 3-round cap and the per-review one-fix budget untouched, following review-contract.md's "neither a review round nor a fix round".

## Review notes

NOTE: all four deviations from `### Approach`/`### Files` wording (branch factored into a shared `### Implementor stop` subsection; escalation bullet extended under `### Stats` rather than `## Mandatory rules`, the only escalation bullet either skill has; `<subject>` for the fix-after-task-review branch keeping `(Task NN)` rather than `(fix NN)`, since that branch has no fix ordinal; the question carrying `<why>` alongside `<what>`/`<options>`) are honestly recorded with justification and verified correct against the diff and against review-contract.md, which owns the protocol these sections implement.
