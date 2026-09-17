# final review

## Gates

- Build - none - the plan moves markdown and one bash script; nothing compiles
- Tests - pass - 63s
- Integration - none - the repo has no integration suite

## Prior findings

| ID | Title | Verdict | Evidence |
| --- | --- | --- | --- |
| C1 | Answered stop re-raised at the task gate | ADDRESSED | superdev/agents/superbuild-task-reviewer.md:20 carries the optional `decisions` label with its "unset or absent -> every `DECISION:` line is open" default; superdev/agents/superbuild-task-reviewer.md:41 closes a line a decisions line answers; superdev/skills/superbuild/SKILL.md:107 passes `decisions:` on the step-3 reviewer dispatch, and `### Implementor stop` step 3 (superdev/skills/superbuild/SKILL.md:124) writes that file before the re-dispatch. |
| I1 | Delegated copy still a plan defect | ADDRESSED | superdev/agents/superbuild-task-reviewer.md:39 carries the `copy: implementor, after <existing key or file>` exception on text alone, matching B19 at superdev/references/plan-review-checklist.md:111; superdev/skills/simplebuild-reviewer/SKILL.md:86 carries the same exception word for word on the Simple track. |
| M1 | Naming missing the fix pointer | NOT ADDRESSED | superdev/references/review-contract.md:67 still enumerates `decision 3`, `phase 01`, `Task 3`, `criterion 3`, `C2`, `B3`, `#3` - no `fix <NN>`, no `D<n>`, both of which the contract now uses (superdev/references/review-contract.md:415). |
| M2 | Integration placeholder not widened | NOT ADDRESSED | superdev/skills/superplan/templates/plan.md:19 and superdev/skills/simpleplan/templates/plan.md:38 still read "the host's integration or end-to-end suite over that scope"; the whole-repository sentence landed only in the block's opening placeholder. |
| M3 | Corrupted sentence in simpleplan | NOT ADDRESSED | superdev/skills/simpleplan/SKILL.md:23 still reads "is in your king context". |

## Findings

### Important

- I2 - Fix-round decisions unlisted on Super - superdev/skills/superbuild/SKILL.md:155 - `## Decisions taken` is owned by `superbuild-reviewer-spec` alone (superdev/references/review-contract.md:142, superdev/skills/superbuild-reviewer-spec/SKILL.md:83), but Step 3's third adjustment re-dispatches only "every reviewer that raised a Critical or an Important". A final round where the spec dimension PASSes and the code dimension FAILs therefore never rewrites that section, while the fix the round dispatches is explicitly allowed to write new `UNDERSPECIFIED:` lines into `fix-NN-notes.md` (superdev/references/review-contract.md:394). Those decisions reach no `## Decisions taken` anywhere - the spec report was written before the fix and the code reviewer's re-review may not write the section. The same run is also the one place neither track judges an `UNDERSPECIFIED:` line: a build-level fix round passes no per-task gate on Super, and the Simple three-step judgment is scoped to "the notes of a task" (superdev/skills/simplebuild-reviewer/SKILL.md:82), so the listing is the only reader those lines had. On Simple the hole does not exist - one reviewer means the re-review always reruns - so the two tracks also diverge here. Fix: in Step 3's third adjustment, re-dispatch `superbuild-reviewer-spec` at `stage: re-review` after the fix commit whenever any report failed, not only when it raised findings of its own.

## Debt

- M4 - Split documented as Super-only - superdev/README.md:68 puts the `UNDERSPECIFIED:` / `DECISION:` split at the end of item 5's Super-track sentence chain and says the value is "judged at the per-task gate", with no counterpart for the Simple track, where `simplebuild-reviewer`'s `## Calibration` is the judging site. A Simple-track reader is pointed at a gate that track does not have.
- M5 - Inverted implementor sentence in CLAUDE.md - CLAUDE.md:403 reads "both return `VERDICT: BLOCKED` on a re-dispatch carrying a `decisions:` label when a task or fix raises a `DECISION:` it cannot settle", which states the BLOCKED return as happening on the re-dispatch; the re-dispatch is what follows the return.

## Notes

NOTE: two of this build's task commits carry an unrelated run's documents - `docs/.workflows/2026-09-17-vibe-track/{intent,refresh,spec}.md` in `1a332c6` (Task 6) and `{intent,spec}.md` again in `a765678` (Task 7). Neither task's `### Files` nor its notes' `touched:` lines declare them, and `commit-task.sh`'s `is_declared` matches on a path boundary, so the declared set could not have swept them in on its own. Nothing in this build's diff is at fault; the files simply ride into whatever this run is merged or released as, and the user should know they are there.

NOTE: M1, M2 and M3 were Minor in `prior`, no `minor:` line named them for the fix dispatch, and no later round copies a Minor forward - they stand as recorded there and move no verdict here.

## Assessment

The build composes cleanly - both implementors, both orchestrators, the per-task gate and the two coverage-owning reviewers carry the same line shapes, the same `D<n>` derivation and the same three-step judgment, `record-decision.sh` takes a `D<n>` ID unchanged, and the stats counter and its test agree on the seven-column table - but the one section that shows the user every decision an implementor took has an owner that the final round does not always re-run.

VERDICT: FAIL
