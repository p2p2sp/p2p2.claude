#!/usr/bin/env bash
# viber / SessionStart hook.
#
# Force-injects viber's manifest into the MAIN session's context at session
# start, so it is guaranteed to be read regardless of whether the agent chooses
# to invoke any skill.
#
# Contract:
#   stdin  : JSON with at least { "source": "startup"|"resume"|"clear"|"compact" }
#            and, when present, "cwd" (the session directory).
#   env    : CLAUDE_PLUGIN_ROOT, the plugin root; unset -> paths relative to
#            this script.
#   stdout : { "systemMessage": "viber loaded <version>[ - <schema note>]",
#              "hookSpecificOutput": { "hookEventName": "SessionStart",
#                                      "additionalContext": "<manifest>" } }
#            OR (manifest empty or unreadable) only the systemMessage /
#            hookEventName, without additionalContext.
#   exit 0 : always (fail-open; decisions are conveyed in stdout, not exit code).
#
# Schema note: the column-0 `schema:` number of the project's
# `.claude/viber.yml` (git top level of `cwd`, else under `cwd`; 0 when absent or
# not a number) is compared with the one in `skills/setup/templates/viber.yml`:
#   lower  -> " - .claude/viber.yml is at schema <n>, this version expects <m>: run /viber:setup"
#   higher -> " - .claude/viber.yml is at schema <n>, newer than this version's <m>: update the viber plugin"
# Equal numbers, no file, no `cwd` or no readable template -> the plain banner.
# The manifest is never touched by it.
#
# Wrapping discipline: this script injects the manifest VERBATIM. Any wrapping
# markers (e.g. <EXTREMELY_IMPORTANT>) live in `hooks/content/manifest.md`
# itself, NOT here. Same for any preamble.
#
# Policy:
#   - source == "resume"  -> excluded by the matcher in hooks.json (the prior
#                            injection reloads with the transcript), so this
#                            script does not fire on resume.
#   - manifest empty or
#     unreadable          -> skip additionalContext (banner still fires). An
#                            empty manifest is a valid state: nothing is
#                            injected until the file carries content.
#   - any error           -> exit 0 (never wedge the harness).
#
# SessionStart fires for the main session only (sub-agents use SubagentStart/
# SubagentStop), so this does not pollute sub-agent contexts.

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

# --- read stdin ----------------------------------------------------------
# Read the whole hook payload so the writer never hits EPIPE; only its `cwd` is
# used, and a payload that does not parse simply carries none. The
# `startup|clear|compact` matcher in hooks.json already excludes `resume`, so
# no source-value filtering is needed here (a resumed session reloads the prior
# transcript, which already holds the original injection).
input="$(cat 2>/dev/null)"

json_str() {
  printf '%s' "$2" \
    | grep -oE "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" \
    | head -n1 \
    | sed -E "s/^\"$1\"[[:space:]]*:[[:space:]]*\"(.*)\"$/\1/" \
    | sed 's/\\\\/\\/g'
}

# Prints the number of the column-0 `schema:` line of file $1: 0 when the line is
# absent or not a number. Fails (prints nothing) when the file cannot be read.
schema_of() {
  local line
  [ -f "$1" ] && [ -r "$1" ] || return 1
  line="$(grep -m1 -E '^schema:' "$1" 2>/dev/null | tr -d '\r')"
  line="${line#schema:}"
  line="${line%%#*}"
  line="${line//[[:space:]]/}"
  case "$line" in
    ''|*[!0-9]*) printf '0' ;;
    *) printf '%s' "$((10#$line))" ;;
  esac
}

# --- read the manifest verbatim ------------------------------------------
manifest=""
[ -n "$manifest_file" ] && manifest="$(cat "$manifest_file" 2>/dev/null)"

# --- version banner (user-facing, NOT injected into the model) -----------
# `systemMessage` surfaces in the user's terminal but is NOT added to the
# model's context (per the Claude Code hooks docs). Source the version from
# the plugin-root basename - Claude Code installs each plugin under
# `cache/<marketplace>/<plugin>/<version-or-commit-sha>/`, so this matches
# whatever the host considers the installed version.
version="${CLAUDE_PLUGIN_ROOT:-}"
version="${version//\\//}" # normalize Windows backslashes so the basename strip works there too
version="${version##*/}"
[ -z "$version" ] && version="dev"
banner="viber loaded ${version}"

# --- schema note (user-facing, appended to the banner) -------------------
# Compare the project's `.claude/viber.yml` schema with the plugin template's.
# The project file is the one at the git top level of the payload's `cwd`, else
# under `cwd`. Any missing piece (no cwd, no file, no readable template) leaves
# the plain banner.
project_cwd="$(json_str cwd "$input")"
template_file=""
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/skills/setup/templates/viber.yml" ]; then
  template_file="${CLAUDE_PLUGIN_ROOT}/skills/setup/templates/viber.yml"
elif [ -n "$SCRIPT_DIR" ] && [ -f "${SCRIPT_DIR}/../../skills/setup/templates/viber.yml" ]; then
  template_file="${SCRIPT_DIR}/../../skills/setup/templates/viber.yml"
fi
if [ -n "$project_cwd" ] && [ -d "$project_cwd" ] && [ -n "$template_file" ]; then
  project_file="$project_cwd/.claude/viber.yml"
  top="$(git -C "$project_cwd" rev-parse --show-toplevel 2>/dev/null)"
  [ -n "$top" ] && [ -f "$top/.claude/viber.yml" ] && project_file="$top/.claude/viber.yml"
  expected="$(schema_of "$template_file")"
  actual="$(schema_of "$project_file")"
  if [ -n "$expected" ] && [ -n "$actual" ]; then
    if [ "$actual" -lt "$expected" ]; then
      banner="${banner} - .claude/viber.yml is at schema ${actual}, this version expects ${expected}: run /viber:setup"
    elif [ "$actual" -gt "$expected" ]; then
      banner="${banner} - .claude/viber.yml is at schema ${actual}, newer than this version's ${expected}: update the viber plugin"
    fi
  fi
fi

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
