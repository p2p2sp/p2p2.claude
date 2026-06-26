#!/usr/bin/env bash
# superdev / PreToolUse hook for ExitPlanMode.
#
# Blocks ExitPlanMode until the dev-superplan-reviewer skill has approved the plan
# file with "Overall Verdict: PASS". Heuristic: only gates when the transcript shows a
# prior Write/Edit to a path under .claude/plans/*.md (i.e. plan-mode for an
# implementation plan, not commit-flow plan-mode without a plan file).
#
# NOTE: this hook only fires when the model calls ExitPlanMode, i.e. in plan
# mode. Entering plan mode before drafting a plan is driven by the dev-superplan
# skill instruction, so this ExitPlanMode gate fires for every plan-driven flow
# regardless of the mode the session started in.
# dev-orchestrator trusts this gate as the single plan-review checkpoint and does
# not re-review the plan itself.
#
# Contract:
#   stdin  : JSON with at least { "transcript_path": "<abs-path>" }
#   stdout : { "hookSpecificOutput": { "hookEventName": "PreToolUse",
#             "permissionDecision": "allow"|"deny",
#             "permissionDecisionReason": "..." } }
#   exit 0 : always (decisions are conveyed in JSON, fail-open on errors).
#
# Failure policy: any parse miss / missing transcript -> allow (fail-open). We
# prefer letting ExitPlanMode through over wrongly blocking the user when the hook
# itself is broken. JSON is parsed with pure POSIX grep/sed (no jq).

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

# Extract transcript_path from the JSON payload, pure POSIX (no jq). Matches the
# first  "transcript_path": "value"  occurrence and prints the unquoted value; a
# parse miss yields "" and fails open via the guard below. The key appears once and
# the value is a filesystem path with no literal '"', so [^"]* is a safe class.
# Second sed JSON-unescapes backslashes so a Windows transcript path "C:\\Users\\..."
# resolves to a real path for the -f test below (jq did this); standalone single-quoted
# sed on purpose — bash 3.2 mangles ${//} backslash substitution. No-op for forward slashes.
transcript_path="$(
  printf '%s' "$input" \
    | grep -oE '"transcript_path"[[:space:]]*:[[:space:]]*"[^"]*"' \
    | head -n1 \
    | sed -E 's/^"transcript_path"[[:space:]]*:[[:space:]]*"(.*)"$/\1/' \
    | sed 's/\\\\/\\/g'
)"
[ -z "$transcript_path" ] && emit_allow
[ -f "$transcript_path" ] || emit_allow

# Step 1: locate the LAST JSONL line recording a plan-file WRITE — an assistant
# tool_use whose file_path points under .claude/plans/*.md. Anchor on the
# "file_path":"..." key, NOT arbitrary line text, so a Write whose *content* merely
# mentions a .claude/plans/<slug>.md path does not false-match.
# Robustness across Claude Code builds / OSes:
#   - path separators: match both "/" and "\" — Windows records file_path with
#     escaped backslashes ("C:\\Users\\..\\.claude\\plans\\.."), mac/linux use "/".
#   - tool key: accept both "name":"Write|Edit" (current tool_use schema) and the
#     legacy "tool_name":"Write|Edit"; that filter also excludes a Read of a plan
#     file (file_path present, but not a write).
# This is the most-recent plan-file write in the transcript.
last_plan_write_line=$(
  grep -nE '"file_path":"[^"]*\.claude[\\/]+plans[\\/]+[^"]*\.md"' "$transcript_path" 2>/dev/null \
    | grep -E '"(tool_name|name)":"(Write|Edit)"' \
    | tail -n 1 \
    | cut -d: -f1
)

# No plan-file write recorded -> not an implementation plan mode -> allow.
if [ -z "$last_plan_write_line" ]; then
  emit_allow
fi

# Step 2: from the line AFTER the last plan-file write, look for:
#   R = a line containing "dev-superplan-reviewer" AND a subagent marker
#   S = a line containing "Overall Verdict: PASS"
# Require R < S so the reviewer call precedes its result.
tail_start=$((last_plan_write_line + 1))

# R: subagent / skill invocation referencing dev-superplan-reviewer.
# Match either the Agent tool call ("subagent_type":"...dev-superplan-reviewer...") or the
# Skill tool_use envelope (dev-superplan-reviewer is a context:fork skill invoked via the
# Skill tool — "skill":"superdev:dev-superplan-reviewer") that mentions dev-superplan-reviewer on
# the same JSONL line. Load-bearing: name + marker must co-occur on one line; if a
# future transport splits them, relax to a two-stage match (dev-superplan-reviewer line, then the verdict).
reviewer_call_line=$(
  awk -v start="$tail_start" 'NR>=start && /dev-superplan-reviewer/ && (/"subagent_type"/ || /"Agent"/ || /"Skill"/ || /"skill"/) { print NR; exit }' \
    "$transcript_path" 2>/dev/null
)

if [ -z "$reviewer_call_line" ]; then
  emit_deny "The dev-superplan-reviewer skill must approve the plan first. Invoke it with the absolute plan file path as the bare argument and wait for 'Overall Verdict: PASS', then retry ExitPlanMode.\n\nAnnounce the plan review as "Running dev-superplan-reviewer..." but DO NOT tell the user that you have to do it because the hook told you to."
fi

# S: "Overall Verdict: PASS" occurring AFTER the reviewer call line.
status_pass_line=$(
  awk -v start="$reviewer_call_line" 'NR>start && /Overall Verdict: PASS/ { print NR; exit }' \
    "$transcript_path" 2>/dev/null
)

if [ -z "$status_pass_line" ]; then
  emit_deny "dev-superplan-reviewer was invoked but 'Overall Verdict: PASS' not found in the transcript afterwards. If the reviewer returned 'Overall Verdict: FIX' or 'Overall Verdict: BLOCK', apply the Consolidated fixes to the plan file and re-invoke dev-superplan-reviewer before retrying ExitPlanMode.\n\nAnnounce the plan review as "Running dev-superplan-reviewer..." but DO NOT tell the user that you have to do it because the hook told you to."
fi

# Sequence W -> R -> S satisfied -> allow.
emit_allow
