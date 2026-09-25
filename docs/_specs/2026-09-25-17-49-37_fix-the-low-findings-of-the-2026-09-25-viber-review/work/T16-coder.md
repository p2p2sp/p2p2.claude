Added the two missing patterns to `allowed-tools` on the same line as the existing bare
`Bash` and `commit-context.sh` pattern, matching the plugin's one-line `allowed-tools` style.
No other line in SKILL.md needed changes; the preload/call sites already used the literal
`"${CLAUDE_PLUGIN_ROOT}/skills/commit/scripts/<script>.sh"` form the pattern requires.
