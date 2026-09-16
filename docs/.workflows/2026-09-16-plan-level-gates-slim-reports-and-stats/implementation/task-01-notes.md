# Task 1 - Move the gate into the plan header and rename the per-task section to Task Checks

## Runs
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan -> FAIL=0 WARN=0

Approach step 5's conditional edit of `## Fill rules` in `adr-task.md` was not made: its marker-order bullet names only `Covers:`, `TDD:` and `Effort:`, none of them a removed section.

The three files were edited with `Bash` heredocs: this dispatch's tool set carries no Edit or Write tool, so a shell write was the only way to deliver the template changes.

UNDERSPECIFIED: ADR task check command - the removed line was `ls docs/adr/ | grep -c -- '-<slug>.md$'` followed by a "prints `1`" expectation, which the bare-command form of `### Task Checks` has no place for; written as `ls docs/adr/ | grep -q -- '-<slug>.md$'` so the exit code alone is the proof.

UNDERSPECIFIED: position of `Review:` among the task markers - "below `- Effort:`" allows either side of `Covers:`; placed directly under `Effort:`, keeping the three dispatch-strength markers together and leaving `Covers:` last, which also keeps `adr-task.md`'s "`Covers:` sits below `Effort:`" fill rule true.

CARRY: superdev/scripts/decompose.sh - `plan-header.md` is built from the `Title:` / `Spec:` / `Intent:` lines plus the spec's two global sections on the Super track, and from the `<!-- HEADER -->` block on the Simple track, so the new `## Gate commands` block (placed after the preamble and after `<!-- /HEADER -->`, per Approach steps 2 and 5) lands in the workdir only through the full `plan.md` copy, never in `plan-header.md`. That is enough for the reviewer forks, which read the plan, but the plan header's constraint asserting that decompose.sh already copies the gate into `plan-header.md` does not hold as written.
