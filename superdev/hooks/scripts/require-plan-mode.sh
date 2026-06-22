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
# Failure policy: any parse error, missing jq, missing fields -> allow
# (fail-open). A broken guard must never block a legitimate edit.

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

# Require jq; if missing, fail-open.
if ! command -v jq >/dev/null 2>&1; then
  emit_allow
fi

permission_mode="$(printf '%s' "$input" | jq -r '.permission_mode // empty' 2>/dev/null)"
file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"

# Writing a plan in plan mode is the happy path -> allow.
[ "$permission_mode" = "plan" ] && emit_allow

# No file path to inspect -> nothing to gate -> allow.
[ -z "$file_path" ] && emit_allow

# Normalize Windows backslashes so the substring check is path-style agnostic.
# (review-plan.sh greps the JSONL transcript, where Claude Code records forward
# slashes even on Windows; here we read tool_input.file_path directly, which on
# Windows can carry backslashes, e.g. C:\Users\...\.claude\plans\foo.md.)
# NB: an inline literal pattern (${file_path//\\//}) is mis-parsed by bash here
# — replace via a quoted intermediate variable, which is unambiguous.
bs='\'
norm="${file_path//"$bs"/"/"}"

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
