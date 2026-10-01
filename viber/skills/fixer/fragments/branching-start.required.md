Settle the run branch before tracing or reading any code. Run `"${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh" --start "<issue URL>"` as one literal Bash line when the report was read from an issue, else `"${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh" --start` alone. Ask every question below through one `AskUserQuestion`, at most four options, any further entry by free text.

- `mode: off` -> say nothing about branches; hand off no branch line.
- Any `error:` line -> show every one, ask nothing here; hand off no branch line.
- A `suggested:` entry other than `none` -> take it without a question.
- Otherwise ask which entry the run uses, offering only `entry:` lines reading `usable: yes`, plus "abort". No usable entry -> say so; hand off no branch line.
- The chosen entry's `at-base: yes` -> go on. `at-base: no` -> ask: switch to its `base:`, stay on `current:`, or abort. Name how many commits the base is behind its remote when `behind:` is above 0, and that uncommitted changes block the switch when `dirty: yes`. On `base-exists: no` name the missing base and never offer "switch".
- Never offer "stay" on `current-is-base: yes` or `current: detached`: a required run never commits onto an entry base. With "abort" the only option left, say why and stop.
- "switch" -> run `"${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh" --checkout "<branch>"` as one literal Bash line. Exit 6 -> show its error, tell the user to commit or stash first, and ask the same question again.
- "stay" -> go on from `current:`. "abort" -> stop and run nothing else.
