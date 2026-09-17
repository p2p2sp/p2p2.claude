# Task 6 notes

## Runs
- grep -n "Decisions taken" superdev/skills/superbuild-reviewer-spec/SKILL.md -> exit 0
- grep -n "Decisions taken" superdev/skills/simplebuild-reviewer/SKILL.md -> exit 0
- grep -n "UNDERSPECIFIED:" superdev/skills/simplebuild-reviewer/SKILL.md -> exit 0

Step 2 and step 3: the `DECISION:`-in-a-closed-task rule is written in both files with the decisions-file
caveat (a matter a `Decisions` line answers raises nothing), not as the unconditional Important the step
names, because the contract's `## Implementor stop` makes such a line plan text and
`superdev/agents/superbuild-task-reviewer.md:41` already carries that caveat - an unconditional rule here
would fire on every answered stop.

Step 3: the final report is identified by its `# final review` title line, not by the `review-NN.md`
filename the step names - the contract's `## Gates` already keys `re-review` off that same title line, and
the reviewer is handed no report basename it could match.

Step 3: also touched `simplebuild-reviewer`'s `Notes dir:` paragraph (named under `### Files`, named by no
Approach step) - the two decision lines are introduced there and the paragraph points at `## Calibration`
as this track's judgment site.

UNDERSPECIFIED: behaviour of the three-step judgment at `stage: re-review` - the DoD pins `checkpoint` and
`final` only; written as "only a line the fix round itself wrote is judged", following the contract's
`## Verdict rules` re-review clause (a new Critical or Important only for a defect the fix introduced).

Commit 1a332c6 also carries `docs/.workflows/2026-09-17-vibe-track/intent.md`, `.../refresh.md` and
`.../spec.md` - a separate run's workdir that no step of this task wrote. Those files were already present
in the working tree when the commit ran; `commit-task.sh` never stages outside the declared set, so it
reported them as `undeclared:` and refused, and they entered the commit only through the loop's step-4
**include named ones** answer (a re-run with one `--path` per file). Not scope creep and deliberately not
`touched:` lines - a later `commit-task.sh --notes` run over this file must not declare those paths again.
