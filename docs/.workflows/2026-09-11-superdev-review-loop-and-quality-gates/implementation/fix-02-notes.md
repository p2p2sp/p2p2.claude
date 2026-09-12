# Fix round 2 notes - review-02-code.md

The report carries no finding IDs (bullets only), so IDs are assigned here in order of appearance:
`I1`-`I3` for the three Important bullets, `M1`-`M7` for the seven Minor bullets.

## Status per finding

- I1: fixed - no test: skill body text, no script or test surface. Resume now recovers `KK`, the fix `NN`, every re-review `R` and (superbuild only) the per-task review `R` from one `Glob` over `<workdir>/implementation/`, each continuing one past the highest ordinal already on disk.
- I2: fixed - no test: skill body text. Both orchestrators now pass `adr: <root>/docs/adr`, joined with the decompose index's `root:` like every other path.
- I3: fixed - no test: skill body text. The Simple-track plan-alignment gate now scopes "does it match the plan" and "is all planned functionality present" to the tasks whose commits are inside `git diff <since>..HEAD` at `stage: checkpoint`, and keeps the whole-plan reading for `final`.
- M1: fixed - no test: reference text. `## Debt file` now names the mechanism (Read the file, then write existing lines plus this round's in one write) instead of only the rule.
- M2: fixed - no test: reference text. The consumer list now states that the task reviewer gets no `refs:` label, does not read the contract and carries its own reduced copy.
- M3: fixed - no test: reference text. The e2e re-run rule is now "again on `re-review`, whatever the fix changed" - the "non-test file" predicate was a test-file heuristic the preamble forbids.
- M4: fixed - no test: reference text. `## Gates` now says "every plan task's `### Test Commands`", not "the task's".
- M5: fixed - no test: skill body text. The spec reviewer's stage list now carries `final` alone and says `checkpoint` is reserved and never dispatched there.
- M6: fixed - no test: README prose. The re-review table is described as `ADDRESSED` / `NOT ADDRESSED` / `ACCEPTED`.
- M7: fixed - a red-first case was not possible (the branch already worked); the new `commit-task.test.ts` case covers `--path .`: a fresh repository, a tracked file committed, the harness's own undeclared `.gitconfig-global` riding along, `.temp/` left out, `commit: <sha>` last.

## Deviations

- touched: superdev/skills/superbuild-reviewer-change/SKILL.md - not named by any finding; its `## Gates` line restated the retired "after a fix round that touched a non-test file" wording that M3 removed from the contract, so it would have contradicted its own owner.
- touched: superdev/skills/superbuild-reviewer-spec/SKILL.md - same restatement fixed there (on top of M5, which does name this file).
- touched: superdev/skills/simplebuild-reviewer/SKILL.md - same restatement fixed there (on top of I3, which does name this file).
- touched: tests/superdev/commit-task.test.ts - header comment extended to name the `--path .` mode the new M7 case proves.
- M1 was closed by naming the two-step append in the contract rather than by adding a third bookkeeping script, as the finding suggested: a new plugin script plus its test file and orchestrator wiring is a structural change well beyond a Minor, and the observable loss (an overwritten `debt.md`) is closed by the instruction alone.
- The report's `### Recommendations` and `### Strengths` sections were not acted on, per the fix mandate. The one recommendation that overlaps a finding (a `## Verdict rules` sentence saying the plan beyond the committed tasks is not due at `checkpoint`) is delivered at the two owners the findings name instead: the Simple-track gate (I3) and the spec reviewer's stage list (M5).
- Both `NOTE: plan defect` lines in the report's `## Notes` were left as recorded decisions - they belong to the spec, not to this delivery.

## Underspecified

- UNDERSPECIFIED: how a resumed orchestrator learns the next ordinal - neither the report nor the plan pins the mechanism. Decided: one `Glob` over `<workdir>/implementation/`, highest existing ordinal per file-name shape plus one, run at the start of the build and again on every resume. `checkpoint-update.sh` was left alone deliberately: its file holds the last closed round, and widening it to four counters would need a new argument list, a new test file and a second write path for the same facts the file names already carry.
- UNDERSPECIFIED: the re-run rule replacing M3's test-file heuristic - the finding offered two shapes (files not named under a `### Test Commands` block, or always). Decided: always on `re-review`, the only one of the two that is observable without inspecting what a command runs.
