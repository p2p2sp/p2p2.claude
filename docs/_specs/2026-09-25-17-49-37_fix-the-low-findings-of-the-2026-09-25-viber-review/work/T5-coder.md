# T5 - notes

Root cause: `skill_line`'s regex was `"skill":"([a-zA-Z0-9_.-]+:)?planner"`, which matched ANY
plugin prefix, so a Skill tool_use for `xyz:planner` armed viber's plan gate too. Narrowed to
`"skill":"(viber:)?planner"` so only bare `planner` or `viber:planner` arms it.

Left the script's other comments (top header, the "Which review owns this plan" block) as they
were - neither claimed "any prefix" explicitly, so no other text needed correction; only the
regex and its adjacent inline comment changed.

Did not touch `viber/CLAUDE.md`'s "Plan gate" section - task's Out of scope reserves it for the
build's close (folds in with L15/L16 too).

Full `tests/viber/plan-gate.test.ts` run: 53/53 pass, including the new
"xyz:planner does not arm the gate" test, watched RED before the fix.
