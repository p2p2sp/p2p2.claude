## Runs
- grep -c 'bash "\${CLAUDE_PLUGIN_ROOT}' superdev/skills/vibe/SKILL.md -> 0
- grep -o -e 'Bash(\${CLAUDE_PLUGIN_ROOT}/scripts/vibe-guard.sh:\*)' -e 'Bash(\${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:\*)' superdev/skills/vibe/SKILL.md | wc -l -> 2

no deviations
