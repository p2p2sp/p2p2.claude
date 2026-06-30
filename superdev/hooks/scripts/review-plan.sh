#!/usr/bin/env bash
# superdev / PreToolUse hook for ExitPlanMode.
#
# Blocks ExitPlanMode until the superplan-reviewer skill has approved the plan
# file with "Verdict: PASS". Heuristic: only gates when the transcript shows a
# prior Write/Edit to a path under .claude/plans/*.md (i.e. plan-mode for an
# implementation plan, not commit-flow plan-mode without a plan file).
#
# NOTE: this hook only fires when the model calls ExitPlanMode, i.e. in plan
# mode. Entering plan mode before drafting a plan is driven by the superplan
# skill instruction, so this ExitPlanMode gate fires for every plan-driven flow
# regardless of the mode the session started in.
# superbuild trusts this gate as the single plan-review checkpoint and does
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
#   R = a line containing "superplan-reviewer" AND a subagent marker
#   S = a line carrying the actual verdict "Verdict: PASS"
# Require R < S so the reviewer call precedes its result.
tail_start=$((last_plan_write_line + 1))

# R: subagent / skill invocation referencing superplan-reviewer.
# Match either the Agent tool call ("subagent_type":"...superplan-reviewer...") or the
# Skill tool_use envelope (superplan-reviewer is a context:fork skill invoked via the
# Skill tool — "skill":"superdev:superplan-reviewer") that mentions superplan-reviewer on
# the same JSONL line. Load-bearing: name + marker must co-occur on one line; if a
# future transport splits them, relax to a two-stage match (superplan-reviewer line, then the verdict).
reviewer_call_line=$(
  awk -v start="$tail_start" 'NR>=start && /superplan-reviewer/ && (/"subagent_type"/ || /"Agent"/ || /"Skill"/ || /"skill"/) { print NR; exit }' \
    "$transcript_path" 2>/dev/null
)

if [ -z "$reviewer_call_line" ]; then
  emit_deny "Next step: plan review. Run superplan-reviewer with the absolute plan file path as the bare argument, wait for 'Verdict: PASS', then retry ExitPlanMode. (This is the normal approval gate, not an error.)"
fi

# S: the ACTUAL "Verdict: PASS" verdict line occurring AFTER the reviewer
# call line. Anchor on the escaped newline (\n in the JSONL) that precedes it: the
# real verdict always starts its own markdown line, so it appears as `\n**Verdict:**
# PASS` in the transcript (the `(\*\*)?` makes the bold markers optional). This excludes
# prose/back-ticked mentions of the literal (e.g. guidance text "...checks for `Verdict:
# PASS`...") that ride inline and would otherwise match for a BLOCK/FIX report — turning
# the gate into a no-op. The `\\n` matches the two literal chars backslash-n that JSON
# uses to escape the newline.
status_pass_line=$(
  awk -v start="$reviewer_call_line" 'NR>start && /\\n(\*\*)?Verdict:(\*\*)? PASS/ { print NR; exit }' \
    "$transcript_path" 2>/dev/null
)

if [ -z "$status_pass_line" ]; then
  emit_deny "Next step: address the review. superplan-reviewer ran but did not return 'Verdict: PASS' — apply its Fix list to the plan file, re-run superplan-reviewer, then retry ExitPlanMode. (This is the normal approval gate, not an error.)"
fi

# Sequence W -> R -> S satisfied -> allow.
emit_allow
