#!/usr/bin/env bash
# superdev / SessionStart hook.
#
# Force-injects the single using-superdev dispatcher manifest into the MAIN
# session's context at session start, so the manifest is guaranteed to be read
# regardless of whether the agent chooses to invoke the Skill tool. This is the
# obra/superpowers `session-start` pattern (inline the whole manifest verbatim),
# minus its multi-platform (Cursor/Copilot) and legacy-warning branches.
#
# Config-aware injection: the manifest wraps each opt-in area in sentinel pairs
#   <!--SUPERDEV:AREA <name>--> ... <!--/SUPERDEV:AREA <name>-->
# This hook reads the host project's `.superdev/config.yml` and, for every area
# whose switch is `false`, replaces that area's block(s) with ONE short OFF
# directive (printed once, at the area's first block). Enabled areas keep their
# content; the sentinel marker lines are always stripped from what is injected.
# A missing / unreadable config means EVERYTHING is enabled (fail-open) — a
# project that never ran `/superdev:setup` behaves exactly as before this hook.
#
# Contract:
#   stdin  : JSON with at least { "source": "startup"|"resume"|"clear"|"compact" }
#   stdout : { "systemMessage": "superdev loaded <version>",
#              "hookSpecificOutput": { "hookEventName": "SessionStart",
#                                      "additionalContext": "<rendered manifest>" } }
#            OR (manifest unreadable) only the systemMessage / hookEventName,
#            without additionalContext.
#   exit 0 : always (fail-open; decisions are conveyed in stdout, not exit code).
#
# Wrapping discipline: this script injects the manifest VERBATIM (modulo the
# config-driven area swap above). Any wrapping markers (e.g. <EXTREMELY_IMPORTANT>)
# live in `hooks/content/manifest.md` itself, NOT here. Same for any preamble.
#
# Policy:
#   - source == "resume"  -> excluded by the matcher in hooks.json (the prior
#                            injection reloads with the transcript), so this
#                            script does not fire on resume.
#   - manifest unreadable -> skip additionalContext (banner still fires).
#   - config unreadable / awk failure -> inject the manifest with all areas
#                            enabled (fail-open).
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

# --- render the opt-in areas from .superdev/config.yml -------------------
# Pure-bash switch read (no jq dependency): a key is OFF only when its value is
# literally `false`; a missing key, missing file, or unreadable file => ON.
cfg="${CLAUDE_PROJECT_DIR:-$PWD}/.superdev/config.yml"

read_switch() {
  # $1 = key. Echoes "false" only when explicitly disabled, else "true".
  local key="$1" line val
  [ -f "$cfg" ] || { printf 'true'; return; }
  line="$(grep -E "^[[:space:]]*${key}[[:space:]]*:" "$cfg" 2>/dev/null | head -n1)"
  [ -z "$line" ] && { printf 'true'; return; }
  val="$(printf '%s' "$line" | sed -E "s/^[[:space:]]*${key}[[:space:]]*:[[:space:]]*//; s/[[:space:]]*(#.*)?$//" | tr '[:upper:]' '[:lower:]')"
  if [ "$val" = "false" ]; then printf 'false'; else printf 'true'; fi
}

if [ -n "$manifest" ]; then
  off_areas=""
  for key in ui artifacts adr rules_improver help; do
    [ "$(read_switch "$key")" = "false" ] && off_areas="$off_areas $key"
  done

  # awk transform: strip sentinel markers (always); for an OFF area, replace its
  # block(s) with a single OFF directive (printed once). Runs in this real bash
  # script, so awk is fine here (the `!`-exec-shell awk caveat does not apply).
  rendered="$(printf '%s' "$manifest" | awk -v off="$off_areas" '
    BEGIN{
      n=split(off,arr," "); for(i=1;i<=n;i++) if(arr[i]!="") offmap[arr[i]]=1;
      dir["ui"]="> **UI/design layer is OFF** (user disabled it) — never route to any `ui-*` skill.";
      dir["artifacts"]="> **Claude Code Artifacts are OFF** (user disabled it) — never route to `cc-artifact`.";
      dir["adr"]="> **ADR capture is OFF** (user disabled it) — never propose or record ADRs; the orchestrator skips `dev-adr-analyzer`.";
      dir["rules_improver"]="> **Rules auto-learning is OFF** (user disabled it) — the orchestrator skips the `dev-improver` step.";
      dir["help"]="> **End-user help layer is OFF** (user disabled it) — never route to `doc-help`.";
    }
    /^<!--SUPERDEV:AREA /{ a=$2; sub(/-->.*$/,"",a); inreg=1; supp=0;
      if(a in offmap){ if(!shown[a]){ print dir[a]; shown[a]=1 } supp=1 } next }
    /^<!--\/SUPERDEV:AREA /{ inreg=0; supp=0; next }
    { if(inreg && supp) next; print }
  ' 2>/dev/null)"

  # Fail-open: only adopt the rendered manifest if the transform produced output.
  [ -n "$rendered" ] && manifest="$rendered"
fi

# --- version banner (user-facing, NOT injected into the model) -----------
# `systemMessage` surfaces in the user's terminal but is NOT added to the
# model's context (per the Claude Code hooks docs). Source the version from
# the plugin-root basename — Claude Code installs each plugin under
# `cache/<marketplace>/<plugin>/<version-or-commit-sha>/`, so this matches
# whatever the host considers the installed version.
version="${CLAUDE_PLUGIN_ROOT:-}"
version="${version##*/}"
[ -z "$version" ] && version="dev"
banner="superdev loaded ${version}"

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
