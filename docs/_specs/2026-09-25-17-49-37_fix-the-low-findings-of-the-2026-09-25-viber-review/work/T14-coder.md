T14 was a one-line fix: quoted `<plan-path>` in the planner's step-2 `plan-index.sh` invocation
(viber/skills/planner/SKILL.md line 46), matching the already-quoted form used elsewhere (line 67
here, and `implementor/SKILL.md`'s `"<plan>"`). No other occurrence of the unquoted form existed
in the file. No script or allowed-tools change was needed since the existing
`Bash(${CLAUDE_PLUGIN_ROOT}/scripts/plan-index.sh:*)` pre-approval already covers a quoted arg.
