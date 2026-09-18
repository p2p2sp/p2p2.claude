# Task 6 notes

## Runs

- grep -n 'deferred' superdev/skills/superbuild/SKILL.md -> exit 0 (17 lines)
- grep -n 'RED: yes' superdev/skills/superbuild/SKILL.md -> exit 0 (2 lines)
- grep -n 'gates:' superdev/skills/superbuild/SKILL.md -> exit 0 (9 lines)

## Delta

Approach 6 named step-number pointers only; `### Implementor stop`'s opening "Nothing was
committed" was corrected too, because a fix implementor stopping inside the loop's close step now
runs after step 4 already committed that task, so the absolute claim had become false.

Approach 3 item 5 puts `TaskStop` before the review decision, so a deferred task is marked
completed at step 5 and its verdict lands at step 6 of the FOLLOWING task. Recorded because it
changes what a task's completed state means, not only the order.

Step 1's off-disk ordinal list gained `gates-checkpoint-KK.md` and `gates-final-KK.md`, to honour
the `### Contracts` line "the ordinal read off disk like every other ordinal of this build".

UNDERSPECIFIED: per-task fix commit title - Approach 4 says "its own title" without a form.
Wrote `fix: <task title>`, distinct from the task commit's `<task title>` so criterion 5 holds in
`git log`. `### Task gate blocked`'s **fix the plan** commit keeps the bare `<task title>` per
Approach 6's literal "under the task's own title and notes file".

UNDERSPECIFIED: deferral when the task owns no range - the `base: none` failure mode's stated
reason ("no commit exists to review") also covers a step 4 printing `Nothing to commit.`, so both
land in one branch of the decide step: defer nothing, dispatch here with no `range:` line.

UNDERSPECIFIED: a checkpoint window task whose review outcome the current session never saw
(resume inside a window) - the three stated dispatch conditions cannot be evaluated for it. Added
as a fourth reason to dispatch, per `## plan-header`'s rule that missing data is read
conservatively.

UNDERSPECIFIED: the `run-gate.sh` failure mode's third option, "dispatch the reviewer without a
gate block" - Approach 7 makes the dispatch conditional on `RED:`, which that branch never gets.
It reads the round as `RED: yes` and omits the `gates:` line, so a failed gate run never silently
skips a checkpoint review.

## Runs

- grep -n 'deferred' superdev/skills/superbuild/SKILL.md -> exit 0 (17 lines)
- grep -n 'RED: yes' superdev/skills/superbuild/SKILL.md -> exit 0 (2 lines)
- grep -n 'gates:' superdev/skills/superbuild/SKILL.md -> exit 0 (8 lines)

I1: fixed - no test: skill prose, and Task 6's `### Task Checks` are `grep` lines; the repo has no
test tooling that can express a dispatch condition written in markdown.

I2: fixed - no test: same reason - the commit call is a line of prose, not a code path any suite
under `tests/` reaches.

touched: superdev/skills/superbuild/SKILL.md

UNDERSPECIFIED: how a resumed session recognises a `skip reviewer` answer - I1 treats that value as
unrecoverable, but the index's `<review>` column keeps the invalid token that produced the
escalation, so condition 3 reads that column alone (`none`, or a first token that is neither a
`Model:` value nor `none`) and no session memory is needed. Supersedes this file's earlier
UNDERSPECIFIED line adding a fourth dispatch reason, which I1 removed.
