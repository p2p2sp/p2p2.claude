---
paths:
  - "superdev/scripts/*.sh"
  - "supergh/shared/scripts/*.sh"
---

# Shell preload contract

- A script named in a SKILL.md `!` preload keeps mode 100755 and is invoked DIRECTLY by its quoted path, never through an interpreter: ``!`"${CLAUDE_PLUGIN_ROOT}/scripts/read-config.sh"` `` in `superdev/skills/intent/SKILL.md`. All six preload-invoked scripts - `read-config.sh`, `label.sh`, `last-commit-date.sh`, `resolve-input.sh`, `check-playwright.sh` and `supergh/shared/scripts/preflight.sh` - are 100755.
- The same two requirements (exec bit, direct invocation) bind a RUNTIME call - a bundled script a skill has the model run via the `Bash` tool mid-session, not as a preload. `commit-task.sh`, `decompose.sh`, `cleanup-run.sh`, `stats-record.sh`, `stats-report.sh`, `checkpoint-update.sh`, `record-decision.sh` and `vibe-guard.sh` are all 100755 and every call site (`superbuild/SKILL.md`, `simplebuild/SKILL.md`, `vibe/SKILL.md`, `e2e/SKILL.md`) writes the literal line `"${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" <args>` - never `bash "${CLAUDE_PLUGIN_ROOT}/..."`, never assigned to a variable, never preceded by `cd`, never chained with `;`. The permission classifier matches the literal prefix pre-approved in `allowed-tools`; any other form of the same command is a new, unapproved classification.
- A script invoked through an explicit interpreter does not need the exec bit and does not carry it: `superdev/hooks/hooks.json` runs `bash "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/session-start.sh"` and that file is 100644. This is the exception, reserved for hook wiring outside any skill's own `Bash` calls - it does not apply to a script a skill invokes at runtime.
- A preload script must NEVER exit non-zero on a data condition: a non-zero exit aborts the whole fork load and the fork receives none of its input. `read-config.sh` runs under `set -u` and ends with a literal `exit 0` so a missing config file is fail-open; `label.sh` runs under `set -euo pipefail` but captures its pipeline as `value="$(label_value "$label" "$block" || true)"` and ends with `exit 0`, reserving `exit 1` for a wiring bug alone (no label argument, or a label outside `[A-Za-z0-9_-]+`).
- Choose the `set` line from the script's role and argue it in that script's header, rather than reaching for one habitually: 16 scripts use `set -euo pipefail`, 12 use `set -u` on its own, and `label.sh:52-53` records why `head -n1` must not be the last command under `pipefail`.
- Add a matching PATTERN entry to the skill's `allowed-tools` for every preload; a bare `Bash` allow does not cover an inline `!` command.
- Single-quote any preload argument containing `?`, `*` or `[`. The host shell parses the inline command before the script sees it, and zsh's default `nomatch` aborts the whole command, killing the fork load with no input, where bash would pass it through.
