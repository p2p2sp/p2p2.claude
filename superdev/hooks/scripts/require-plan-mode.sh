#!/usr/bin/env bash
# superdev / PreToolUse hook for Write|Edit — plan-mode guard.
#
# Enforces that plan files (.claude/plans/*.md) can only be written while the
# session is in plan mode. If the model tries to Write/Edit a plan file in any
# other permission mode, this denies and steers it to call EnterPlanMode first.
#
# This is the deterministic backstop that makes planning always happen in plan
# mode, so the companion ExitPlanMode gate (review-plan.sh) -> dev-plan-reviewer
# STATUS: PASS applies uniformly regardless of the mode the session started in.
#
# NOTE: a PreToolUse deny is reliably honored in default / acceptEdits / plan.
# In permission-relaxed modes (bypassPermissions / dontAsk / auto) the harness
# may override a hook denial — there the guard is best-effort and the gate falls
# back to the Layer-A EnterPlanMode instruction + dev-orchestrator's self-check.
#
# Contract:
#   stdin  : JSON with at least { "permission_mode": "...",
#             "tool_input": { "file_path": "<path>" } }
#   stdout : { "hookSpecificOutput": { "hookEventName": "PreToolUse",
#             "permissionDecision": "allow"|"deny",
#             "permissionDecisionReason": "..." } }
#   exit 0 : always (decisions are conveyed in JSON, fail-open on errors).
#
# Failure policy: any parse miss / missing fields -> allow (fail-open). A broken
# guard must never block a legitimate edit. JSON is parsed with pure POSIX
# grep/sed (no jq), so the guard is always active regardless of installed tools.

set -u
# NB: no `set -e` -- fail-open requires us to swallow non-zero exits.

emit_allow() {
  printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
  exit 0
}

emit_deny() {
  # $1 = reason (single line, JSON-safe)
  local reason="$1"
  # Escape backslashes and double quotes for JSON.
  reason="${reason//\\/\\\\}"
  reason="${reason//\"/\\\"}"
  printf '%s\n' "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"${reason}\"}}"
  exit 0
}

# Read stdin payload.
input="$(cat)"
[ -z "$input" ] && emit_allow

# Extract a JSON string field by key from $input, pure POSIX (no jq). Matches the
# first  "key": "value"  occurrence and prints the unquoted value (empty if absent).
# Hook payload keys (permission_mode, file_path, transcript_path) each appear once;
# values are enums / filesystem paths that never contain a literal '"', so [^"]* is
# a safe value class. A parse miss yields "" -> the callers below fail-open.
json_str() {
  # First sed pulls the value out of  "key": "value" . Second sed JSON-unescapes
  # the backslash so a Windows file_path "C:\\Users\\..." collapses to single
  # backslashes (jq did this); the caller then normalizes \ -> /. The unescape is a
  # standalone single-quoted sed on purpose — bash 3.2 (macOS) mangles ${//} backslash
  # substitution. No-op for forward-slash paths.
  printf '%s' "$input" \
    | grep -oE "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" \
    | head -n1 \
    | sed -E "s/^\"$1\"[[:space:]]*:[[:space:]]*\"(.*)\"$/\1/" \
    | sed 's/\\\\/\\/g'
}

permission_mode="$(json_str permission_mode)"
file_path="$(json_str file_path)"

# Writing a plan in plan mode is the happy path -> allow.
[ "$permission_mode" = "plan" ] && emit_allow

# No file path to inspect -> nothing to gate -> allow.
[ -z "$file_path" ] && emit_allow

# Normalize Windows backslashes so the substring check is path-style agnostic.
# (review-plan.sh greps the JSONL transcript, where Claude Code records forward
# slashes even on Windows; here we read tool_input.file_path directly, which on
# Windows can carry backslashes, e.g. C:\Users\...\.claude\plans\foo.md.)
# Use tr, not ${//}: bash 3.2 (macOS) mangles backslash pattern substitution.
norm="$(printf '%s' "$file_path" | tr '\\' '/')"

# Only gate plan files: a path under .claude/plans/ ending in .md. Same heuristic
# as review-plan.sh — covers both the repo .claude/plans/ and the user-home
# ~/.claude/plans/ (both contain the substring). The leading dot is a literal in
# a shell glob, so this matches the path component exactly.
case "$norm" in
  *.claude/plans/*.md) ;;   # plan file outside plan mode -> deny below
  *) emit_allow ;;          # anything else -> not a plan file -> allow
esac

# A plan-file write outside plan mode -> deny and steer to EnterPlanMode.
emit_deny "Plans must be drafted in plan mode. Call EnterPlanMode now, then retry writing the plan file. Announce it naturally (e.g. 'Entering plan mode to draft the plan'); do NOT tell the user a hook required it."
