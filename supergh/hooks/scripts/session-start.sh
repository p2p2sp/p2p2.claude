#!/usr/bin/env bash
# supergh / SessionStart hook.
#
# Force-injects the single using-supergh dispatcher manifest into the MAIN
# session's context at session start, so the manifest is guaranteed to be read
# regardless of whether the agent chooses to invoke the Skill tool. This is the
# obra/superpowers `session-start` pattern (inline the whole manifest verbatim),
# minus its multi-platform (Cursor/Copilot) and legacy-warning branches.
#
# Contract:
#   stdin  : JSON with at least { "source": "startup"|"resume"|"clear"|"compact" }
#   stdout : { "systemMessage": "supergh loaded <version>",
#              "hookSpecificOutput": { "hookEventName": "SessionStart",
#                                      "additionalContext": "<manifest>" } }
#            OR (manifest unreadable) only the systemMessage / hookEventName,
#            without additionalContext.
#   exit 0 : always (fail-open; decisions are conveyed in stdout, not exit code).
#
# Wrapping discipline: this script injects the manifest VERBATIM. Any wrapping
# markers (e.g. <supergh:manifest>) live in `hooks/content/manifest.md`
# itself, NOT here. Same for any preamble.
#
# Policy:
#   - source == "resume"  -> excluded by the matcher in hooks.json (the prior
#                            injection reloads with the transcript), so this
#                            script does not fire on resume.
#   - manifest unreadable -> skip additionalContext (banner still fires).
#   - any error           -> exit 0 (never wedge the harness).
#
# SessionStart fires for the main session only (sub-agents use SubagentStart/
# SubagentStop), so this does not pollute pipeline / Explore sub-agent contexts.

set -u
# NB: no `set -e` -- fail-open requires us to swallow non-zero exits.

# --- locate the manifest -------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)" || SCRIPT_DIR=""
manifest_file=""
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/hooks/content/manifest.md" ]; then
  manifest_file="${CLAUDE_PLUGIN_ROOT}/hooks/content/manifest.md"
elif [ -n "$SCRIPT_DIR" ] && [ -f "${SCRIPT_DIR}/../content/manifest.md" ]; then
  manifest_file="${SCRIPT_DIR}/../content/manifest.md"
fi

# --- JSON string escaper (single-pass parameter substitution) ------------
escape_for_json() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}

# --- drain stdin ---------------------------------------------------------
# Drain and discard the hook payload so the writer never hits EPIPE. The
# `startup|clear|compact` matcher in hooks.json already excludes `resume`, so
# no source-value filtering is needed here (a resumed session reloads the prior
# transcript, which already holds the original injection).
cat >/dev/null 2>&1

# --- read the manifest verbatim ------------------------------------------
manifest=""
[ -n "$manifest_file" ] && manifest="$(cat "$manifest_file" 2>/dev/null)"

# --- version banner (user-facing, NOT injected into the model) -----------
# `systemMessage` surfaces in the user's terminal but is NOT added to the
# model's context (per the Claude Code hooks docs). Source the version from
# the plugin-root basename — Claude Code installs each plugin under
# `cache/<marketplace>/<plugin>/<version-or-commit-sha>/`, so this matches
# whatever the host considers the installed version.
version="${CLAUDE_PLUGIN_ROOT:-}"
version="${version##*/}"
[ -z "$version" ] && version="dev"
banner="supergh loaded ${version}"

# --- emit ----------------------------------------------------------------
# `systemMessage` MUST be a top-level JSON field, not nested in
# `hookSpecificOutput` -- `hookSpecificOutput.systemMessage` is not a documented
# SessionStart field and is silently ignored by Claude Code.
#
# Fail-open: if manifest is empty/unreadable, emit only the banner (no
# additionalContext) so no fallback prose leaks into the model context.
if [ -z "$manifest" ]; then
  printf '{"systemMessage":"%s","hookSpecificOutput":{"hookEventName":"SessionStart"}}\n' \
    "$(escape_for_json "$banner")"
  exit 0
fi

printf '{"systemMessage":"%s","hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' \
  "$(escape_for_json "$banner")" \
  "$(escape_for_json "$manifest")"
exit 0
