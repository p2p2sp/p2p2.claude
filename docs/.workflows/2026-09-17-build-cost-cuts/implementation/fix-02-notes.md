# fix 02 - review-01-code

## Runs

- grep -c 'Kind: text' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md -> superbuild:1 simplebuild:1 (exit 0)
- grep -c 'Kind: scaffold' superdev/agents/superbuild-task-implementor.md superdev/agents/simplebuild-task-implementor.md -> superbuild:2 simplebuild:2 (exit 0)

Task 6 is the only plan task whose `### Files` prefix-matches a touched path; `superdev/references/adr-task.md` is named by no task's `### Files` (it landed through fix 01), so it has no check line of its own.

I3: fixed - no test: the change is agent-instruction prose in two markdown files; `tests/` carries script suites plus `orphan-tags.test.ts` only, with no harness able to express when an implementor raises its scaffold stop, and a grep over the new clause would assert the wording, not the behaviour.

I3 taken by its second fix option: the kind stays `scaffold` and the scaffold sub-bullet plus the BLOCKED clause of both implementors now cover an `### Approach` that carries its output verbatim. Option one (a new B22 row sending such a section to `text`) was rejected - it would make the derivation read `### Approach` beside `### Task Checks`, against plan-header line 23 and superplan/SKILL.md:104 / simpleplan/SKILL.md:107 ("derived from the task's own `### Task Checks`, never chosen freely"), and would have pulled B22, both planners, both `### Self-Review` lines and `superdev/README.md` along with it.

touched: superdev/agents/superbuild-task-implementor.md
touched: superdev/agents/simplebuild-task-implementor.md

One `## Fill rules` bullet added at I3's own file:line, so a later editor does not retype the marker as `text` and reopen the seam; the `## Task block` itself is byte-unchanged (the bullet sits outside it and never reaches a plan).
touched: superdev/references/adr-task.md

UNDERSPECIFIED: wording of the verbatim-output clause - both implementors carry it byte-identical, as their Kind block already was; the diff of the two files' `Kind` lines is empty.
