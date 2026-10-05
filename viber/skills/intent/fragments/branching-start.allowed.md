Settle the run branch before reading any code. Run `"${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh" --start "<issue URL>"` as one literal Bash line when the run is tied to an issue, else `"${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh" --start` alone. Ask every question below through one `AskUserQuestion`, at most four options, any further entry by free text.

- `mode: off` -> say nothing about branches; hand off no branch line.
- Any `error:` line -> show every one, ask nothing here; hand off no branch line.
- A returning draft (read it first, per `## Returning to a draft`) whose frontmatter records `branch:` -> ask no entry question and run no base check: the entry is its `work:` key, or "no branch" on `branch: none`. When `current:` differs from a recorded branch other than `none`, ask: switch to that branch, stay on `current:`, or abort.
- Otherwise a `suggested:` entry other than `none` -> take it without a question.
- Otherwise ask which entry the run uses, offering only `entry:` lines reading `usable: yes`, plus "no branch". No usable entry -> say so and hand off no branch line: each name waits for an issue number, so the planner settles the entry once the run carries an issue, a saved one included.
- "no branch" -> no base check; the run stays on `current:`.
- The chosen entry's `at-base: yes` -> go on. `at-base: no` on a `roadmap.md` the user points at, with `current-is-base: no` and `current:` not `detached` -> take "stay" without a question: the next part builds on the previous one's branch. Any other `at-base: no` -> ask: switch to its `base:`, stay on `current:`, or abort. Name how many commits the base is behind its remote when `behind:` is above 0, and that uncommitted changes block the switch when `dirty: yes`. On `base-exists: no` name the missing base and never offer "switch".
- "switch" -> run `"${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh" --checkout "<branch>"` as one literal Bash line. Exit 6 -> show its error; when it names uncommitted changes, tell the user to commit or stash first and ask the same question again, otherwise ask stay or abort.
- "stay" -> go on from `current:`. "abort" -> stop and run nothing else.
