#!/usr/bin/env bash
# superdev / PreToolUse hook for ExitPlanMode.
#
# Blocks ExitPlanMode until the dev-plan-reviewer skill has approved the plan
# file with STATUS: PASS. Heuristic: only gates when the transcript shows a
# prior Write/Edit to a path under .claude/plans/*.md (i.e. plan-mode for an
# implementation plan, not commit-flow plan-mode without a plan file).
#
# NOTE: this hook only fires when the model calls ExitPlanMode, i.e. in plan
# mode. The companion guard require-plan-mode.sh denies plan-file writes outside
# plan mode, so planning always happens in plan mode and this ExitPlanMode gate
# fires for every plan-driven flow regardless of the mode the session started in.
# dev-orchestrator additionally keeps a defense-in-depth "plan-review PASS"
# self-check before it starts the pipeline, in case plan mode was bypassed.
#
# Contract:
#   stdin  : JSON with at least { "transcript_path": "<abs-path>" }
#   stdout : { "hookSpecificOutput": { "hookEventName": "PreToolUse",
#             "permissionDecision": "allow"|"deny",
#             "permissionDecisionReason": "..." } }
#   exit 0 : always (decisions are conveyed in JSON, fail-open on errors).
#
# Failure policy: any parse error, missing tool, missing transcript -> allow
# (fail-open). We prefer letting ExitPlanMode through over wrongly blocking
# the user when the hook itself is broken.

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

# Extract transcript_path. Require jq; if missing, fail-open.
if ! command -v jq >/dev/null 2>&1; then
  emit_allow
fi

transcript_path="$(printf '%s' "$input" | jq -r '.transcript_path // empty' 2>/dev/null)"
[ -z "$transcript_path" ] && emit_allow
[ -f "$transcript_path" ] || emit_allow

# Step 1: locate the LAST JSONL line that simultaneously contains
#   - ".claude/plans/"  (any path style: forward slashes are how Claude Code
#     records them in JSONL even on Windows)
#   - ".md"
#   - "\"tool_name\":\"Write\""  OR  "\"tool_name\":\"Edit\""
# This is the most-recent plan-file write in the transcript.
last_plan_write_line=$(
  grep -n '\.claude/plans/' "$transcript_path" 2>/dev/null \
    | grep '\.md' \
    | grep -E '"tool_name":"(Write|Edit)"' \
    | tail -n 1 \
    | cut -d: -f1
)

# No plan-file write recorded -> not an implementation plan mode -> allow.
if [ -z "$last_plan_write_line" ]; then
  emit_allow
fi

# Step 2: from the line AFTER the last plan-file write, look for:
#   R = a line containing "dev-plan-reviewer" AND a subagent marker
#   S = a line containing "STATUS: PASS"
# Require R < S so the reviewer call precedes its result.
tail_start=$((last_plan_write_line + 1))

# R: subagent / skill invocation referencing dev-plan-reviewer.
# Match either the Agent tool call ("subagent_type":"...dev-plan-reviewer...") or the
# Skill tool_use envelope (dev-plan-reviewer is a context:fork skill invoked via the
# Skill tool — "skill":"superdev:dev-plan-reviewer") that mentions dev-plan-reviewer on
# the same JSONL line. Load-bearing: name + marker must co-occur on one line; if a
# future transport splits them, relax to a two-stage match (dev-plan-reviewer line, then STATUS).
reviewer_call_line=$(
  awk -v start="$tail_start" 'NR>=start && /dev-plan-reviewer/ && (/"subagent_type"/ || /"Agent"/ || /"Skill"/ || /"skill"/) { print NR; exit }' \
    "$transcript_path" 2>/dev/null
)

if [ -z "$reviewer_call_line" ]; then
  emit_deny "The dev-plan-reviewer skill must approve the plan first. Invoke it with 'Plan file: <absolute-path>' and wait for STATUS: PASS, then retry ExitPlanMode.\n\nAnnounce the plan review as "Running dev-plan-reviewer..." but DO NOT tell the user that you have to do it because the hook told you to."
fi

# S: STATUS: PASS occurring AFTER the reviewer call line.
status_pass_line=$(
  awk -v start="$reviewer_call_line" 'NR>start && /STATUS: PASS/ { print NR; exit }' \
    "$transcript_path" 2>/dev/null
)

if [ -z "$status_pass_line" ]; then
  emit_deny "dev-plan-reviewer was invoked but 'STATUS: PASS' not found in the transcript afterwards. If the reviewer returned 'STATUS: FAIL', apply the Recommended fixes to the plan file and re-invoke dev-plan-reviewer before retrying ExitPlanMode.\n\nAnnounce the plan review as "Running dev-plan-reviewer..." but DO NOT tell the user that you have to do it because the hook told you to."
fi

# Sequence W -> R -> S satisfied -> allow.
emit_allow
