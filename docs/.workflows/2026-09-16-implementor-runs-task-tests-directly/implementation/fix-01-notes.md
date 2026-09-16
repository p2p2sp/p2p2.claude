# fix round 01 notes - checkpoint-01.md

I1: fixed
I2: fixed

Each fix was proved by a check run before and after it: for I1 `grep -q 'explicit timeout'` over both
implementor agents (exit 1 before, exit 0 after), for I2 `grep -c '## Runs'` over the review contract
(exit 1 before, prints 2 after). Both are ephemeral command checks in the same form as the plan's own
`#### Tests` gates for these files - the repo's persisted suite covers scripts, not plugin prose, so
no test file was added.

I1 fix: one bullet added to the build-and-test step of both agents, worded to stay clear of the
strings Task 4's gates forbid (no `run.sh`, no runner label, no executor name, no log or result
tags).

superdev/agents/superbuild-task-implementor.md
touched: superdev/agents/superbuild-task-implementor.md
superdev/agents/simplebuild-task-implementor.md
touched: superdev/agents/simplebuild-task-implementor.md
I2 fix: `## Runs` added to `## Notes line formats` (its intro now reads "Lines and sections", since the
entry is a section and not a line) and named in the last bullet of `## Implementor fix-mode input`.
touched: superdev/references/review-contract.md

Gate scope: ran the plan's `#### Build` plus every distinct `#### Tests` command of Tasks 1-5 rather
than of all seven tasks - Tasks 6 and 7 are not built yet, so their blocks describe work that has not
landed and could only come back red for that reason.

Not mine: `.claude/rules/_research.md` shows as modified in the working tree; it was edited outside
this dispatch and is left unstaged and unchanged by this round.
