# Task 12 notes

- superdev/README.md: the rewritten flow step 5 became two numbered steps (5 = task loop plus the Super-track gate and its failure pass, 6 = the review rounds, budget, IDs, debt/decisions files, BLOCKED and the orchestrator's no-write / escalate rule), and Close Out was renumbered 6 -> 7 - one step could not carry all of it readably.
- superdev/.claude-plugin/plugin.json: verified, not modified - Tasks 1-11 added, renamed and removed no skill and no agent, so `skills[]` (20 entries) and `agents[]` (7 entries) need none; the counts match the task's expected `20 7`.
- superdev/hooks/content/manifest.md: the new `## Build chain` section sits after `## Four rules that always override convenience` and before `## Save all temporary files in .temp` - the task pinned the section's content, not its position.
- Edge case "a dash in a file this build did not touch" did not occur: the only U+2013/U+2014 characters left in the repo were the three listed in the task (manifest line 4, intent SKILL.md lines 45 and 81), so no extra file was touched and no `touched:` line is needed.
