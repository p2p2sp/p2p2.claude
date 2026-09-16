# Task 13 - Retune simplebuild for fix strength and stats events

## Runs

- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simplebuild -> FAIL=0 WARN=0

## Deviations

Approach step 4 lists the event sites; as in Task 12 the event rules live in ONE `### Stats` subsection under `## Config` rather than inline at each site, so the same `stats-record.sh` command is not repeated in eight places and the rules sit beside the switch that gates them. The Step 5 `stats-report.sh` call is inline in Step 5 as the approach asks, since it is a step in a numbered sequence rather than a rule.

Approach step 4 names two awaited `Agent` kinds (implementor, close-out writer); the `### Stats` bullet also carries `fix-implementor`, mirroring Task 12, because a fix dispatch is an awaited `Agent` completion on this track too and criterion 18 asks for one event per such notification. No `task-reviewer` kind is listed - this track runs no per-task reviewer.

`allowed-tools` was left untouched: no pattern entry was added for `stats-record.sh` / `stats-report.sh`, because only the `!` preload (`read-config.sh`) needs one and no other bundled script this skill runs (`decompose.sh`, `commit-task.sh`, `cleanup-run.sh`) carries one either.

UNDERSPECIFIED: how the ignored `<review>` column is worded - the task asks only that the column be ignored; chose to say it on the index row itself ("`<review>` is a per-task reviewer's, and this track runs none - ignore that fifth column everywhere below, whatever it holds"), so the instruction sits where the column is first read and no later step has to repeat it.
