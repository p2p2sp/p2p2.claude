# Task 12 - Retune superbuild for review strength, fix strength and stats events

## Runs

- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild -> FAIL=0 WARN=0

## Deviations

Approach step 5 lists eight event sites; the event rules live in ONE `### Stats` subsection under `## Config` instead of an inline call at each site, because the same `stats-record.sh` command repeated in eight places is the repetition the skill-designer audit removes and the rules belong beside the switch that gates them. The Step 5 `stats-report.sh` call is inline in Step 5 as the approach asks, since it is a step in a numbered sequence rather than a rule.

Approach step 3 says to replace "no `model:` / `effort:` parameters" in `### Loop` step 3's FAIL branch; that wording was not there - the branch already read "same `model:` / `effort:` as in step 2", which is the contract's rule. It was rewritten to name the rule explicitly (a fix after a task review runs at that task's own `<model>` / `<effort>`) rather than replaced.

`allowed-tools` was left untouched: no pattern entry was added for `stats-record.sh` / `stats-report.sh`, because only the `!` preload (`read-config.sh`) needs one and no other bundled script this skill runs (`decompose.sh`, `commit-task.sh`, `cleanup-run.sh`) carries one either.

UNDERSPECIFIED: stats `kind` vocabulary - the script takes "the caller's own vocabulary"; chose `start`, `resume`, `implementor`, `task-reviewer`, `fix-implementor`, `writer`, `fork`, `commit`, `escalation`, so that `stats-report.sh`'s `/implement/` and `/review/` kind matches populate its per-task table and forks / commits / markers stay in the kind table alone.

UNDERSPECIFIED: stats `label` values - chose the task file basename for an implementor and a task reviewer (so both events land on one report row), `fix-NN` for a fix dispatch, the `subagent_type` for a close-out writer, the fork name plus its report basename for a `Skill` return, the commit title for a commit, and the workdir basename for the `start` / `resume` marker.

UNDERSPECIFIED: the `verdict` field of a `commit` event - no verdict exists there; chose the SHA of the `commit:` line, `nothing` when the script had nothing to commit, and `undeclared` on its exit 2.

UNDERSPECIFIED: argument quoting - added "every argument double-quoted" to the call line, because a label or note bearing spaces would otherwise split into several positional fields and shift every later value.
