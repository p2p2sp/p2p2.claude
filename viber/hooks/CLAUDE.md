# viber hooks - plan gate and plan hints

`content/manifest.md` names a skill only to scope a rule (`viber:fixer`'s reproduction test);
renaming that skill renames it there too, or the rule silently stops covering it.

## Plan gate

`scripts/plan-gate.sh` arms on a write to `plans/*.md` in the current plan-mode episode and
picks `planner-review` when a Skill tool_use named bare `planner` or `viber:planner` ran in it
(or its own `EnterPlanMode`, reached before any user prompt or `plan` record, opened it: a
mid-turn flush can record the old mode between the two) and the plan file opens with the
planner's frontmatter `source:` line (a missing or unreadable file keeps `planner-review`), else
`plain-plan-review` when `config.sh` (payload `cwd`) resolves `plain-plan-review: true`.
`ExitPlanMode` passes only after that agent, dispatched after the last plan write, returned
`VERDICT: PASS` and the plan's mtime is not newer. The deny reason is the plain path's only
instruction channel. Names match literally: renaming the skill, either agent, the switch or the
verdict line disarms the fail-open gate silently.

## Plan hints

`scripts/plan-hints.sh` (UserPromptSubmit, soft) adds the closing-review and
parallel-subagent rules to every prompt in plain plan mode only; its episode window and Skill
detection are copied from `plan-gate.sh`, so rename either side together; the frontmatter check
is gate-only, so a refused planner keeps the hint silent for the episode. Its detection alone also
counts `intent` and `fixer` (they only hand off to `planner`), so the gate never picks
`planner-review` for them, plus their typed `/viber:` commands: a user message opening with
`<command-message>viber:intent</command-message>`, which records no Skill tool_use.
