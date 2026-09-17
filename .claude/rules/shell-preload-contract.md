---
paths:
  - "superdev/scripts/*.sh"
  - "supergh/shared/scripts/*.sh"
---

# Shell preload contract

- A script named in a SKILL.md `!` preload keeps mode 100755 and is invoked DIRECTLY by its quoted path, never through an interpreter: ``!`"${CLAUDE_PLUGIN_ROOT}/scripts/read-config.sh"` `` in `superdev/skills/intent/SKILL.md`. All four preload-invoked scripts - `read-config.sh`, `last-commit-date.sh`, `check-playwright.sh` and `supergh/shared/scripts/preflight.sh` - are 100755.
- The same two requirements (exec bit, direct invocation) bind a RUNTIME call - a bundled script a skill has the model run via the `Bash` tool mid-session, not as a preload. `commit-task.sh`, `decompose.sh`, `cleanup-run.sh`, `stats-record.sh`, `stats-report.sh`, `checkpoint-update.sh`, `record-decision.sh` and `vibe-guard.sh` are all 100755 and every call site (`superbuild/SKILL.md`, `simplebuild/SKILL.md`, `vibe/SKILL.md`, `e2e/SKILL.md`) writes the literal line `"${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" <args>` - never `bash "${CLAUDE_PLUGIN_ROOT}/..."`, never assigned to a variable, never preceded by `cd`, never chained with `;`. The permission classifier matches the literal prefix pre-approved in `allowed-tools`; any other form of the same command is a new, unapproved classification.
- A script invoked through an explicit interpreter does not need the exec bit and does not carry it: `superdev/hooks/hooks.json` runs `bash "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/session-start.sh"` and that file is 100644. This is the exception, reserved for hook wiring outside any skill's own `Bash` calls - it does not apply to a script a skill invokes at runtime.
- A preload script must NEVER exit non-zero on a data condition: a non-zero exit aborts the whole fork load and the fork receives none of its input. `read-config.sh` runs under `set -u` and ends with a literal `exit 0` so a missing config file is fail-open, reserving a non-zero exit for a wiring bug alone. A preload that parses its own arguments follows the same shape: capture any failure-prone pipeline as `value="$(... || true)"` rather than letting `pipefail` kill the load.
- Choose the `set` line from the script's role and argue it in that script's header, rather than reaching for one habitually: of the 42 tracked scripts, 14 use `set -euo pipefail`, 16 use `set -u` on its own, and 12 set neither (every `lib_` file, plus scripts that handle their own exit codes). Under `pipefail`, never leave `head -n1` as the last command of a pipeline - it exits non-zero once it stops reading.
- Add a matching PATTERN entry to the skill's `allowed-tools` for every preload; a bare `Bash` allow does not cover an inline `!` command.
- Single-quote any preload argument containing `?`, `*` or `[`. The host shell parses the inline command before the script sees it, and zsh's default `nomatch` aborts the whole command, killing the fork load with no input, where bash would pass it through.
