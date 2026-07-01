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

# S: the reviewer's OWN verdict — the FIRST verdict line AFTER the reviewer call.
# Anchor on the escaped newline (\n in the JSONL) that precedes it: the real verdict
# always starts its own markdown line, so it appears as `\n**Verdict:** <value>` (the
# `(\*\*)?` makes the bold markers optional; the `\\n` matches the two literal chars
# backslash-n JSON uses to escape a newline — this excludes inline/back-ticked mentions).
# LOAD-BEARING: bind to the FIRST verdict, matching PASS|FAIL, not "any later PASS".
# A FAIL verdict must DENY even when a later line (a paste, an assistant restatement,
# a tool_result echo, or a `Verdict: PASS | FAIL` legend) carries a stray PASS.
# The verdict VALUE must END the line-anchored token — followed by the escaped
# newline (\n) that starts the next markdown line, or the closing quote (") that
# ends the JSON content string (optional trailing spaces tolerated). This rejects a
# qualified/negated `Verdict: PASS is NOT ...` whose value is not the whole token:
# without the end-anchor its last matched word is still `PASS` -> a false-allow.
verdict_line=$(
  awk -v start="$reviewer_call_line" 'NR>start && /\\n(\*\*)?Verdict:(\*\*)? (PASS|FAIL)[[:space:]]*(\\n|")/ { print NR; exit }' \
    "$transcript_path" 2>/dev/null
)

if [ -z "$verdict_line" ]; then
  emit_deny "Next step: address the review. superplan-reviewer ran but returned no 'Verdict:' line — re-run superplan-reviewer, then retry ExitPlanMode. (This is the normal approval gate, not an error.)"
fi

# The value on that first verdict line — strip the trailing anchor, then take the
# last whitespace-delimited token of the remaining `\n**Verdict:** <value>` span.
verdict_value=$(
  awk -v ln="$verdict_line" 'NR==ln {
    if (match($0, /\\n(\*\*)?Verdict:(\*\*)? (PASS|FAIL)[[:space:]]*(\\n|")/)) {
      v = substr($0, RSTART, RLENGTH); sub(/[[:space:]]*(\\n|")$/, "", v)
      n = split(v, a, " "); print a[n]
    }
  }' "$transcript_path" 2>/dev/null
)

if [ "$verdict_value" != "PASS" ]; then
  emit_deny "Next step: address the review. superplan-reviewer returned 'Verdict: ${verdict_value}', not PASS — apply its Fix list to the plan file, re-run superplan-reviewer, then retry ExitPlanMode. (This is the normal approval gate, not an error.)"
fi

# Tamper guard: a PASS approves the plan AS REVIEWED. The Step-1 write-detection only
# sees Write/Edit, so a plan mutation via a Bash command AFTER the verdict is invisible
# and would let a stale PASS approve tampered content. Re-gate when a later Bash line
# makes the plan path the TARGET of a mutation (a redirect target, or an operand of
# sed -i / tee / cp / mv) — NOT mere co-occurrence, so a read/stage (`cat`, `git add`)
# or a redirect aimed at another file that merely names the plan does not false-deny.
plan_path=$(
  awk -v ln="$last_plan_write_line" 'NR==ln' "$transcript_path" 2>/dev/null \
    | grep -oE '"file_path":"[^"]*\.claude[\\/]+plans[\\/]+[^"]*\.md"' \
    | head -n1 \
    | sed -E 's/.*"file_path":"([^"]*)"$/\1/'
)
plan_base="${plan_path##*[\\/]}"

if [ -n "$plan_base" ]; then
  tamper_line=$(
    awk -v start="$verdict_line" -v base="$plan_base" '
      NR>start && /"(tool_name|name)":"Bash"/ {
        redir = ($0 ~ (">>?[[:space:]]*[^[:space:]]*" base))
        verb  = ($0 ~ /[^[:alnum:]_](sed[[:space:]]+-i|tee|cp|mv)[[:space:]]/)
        tok   = ($0 ~ ("[[:space:]][^[:space:]]*" base))
        if (redir || (verb && tok)) { print NR; exit }
      }' "$transcript_path" 2>/dev/null
  )
  if [ -n "$tamper_line" ]; then
    emit_deny "Next step: re-review. The plan file was modified after 'Verdict: PASS' — re-run superplan-reviewer on the current plan, then retry ExitPlanMode. (This is the normal approval gate, not an error.)"
  fi
fi

# Sequence W -> R -> S(PASS) satisfied, no post-approval tamper -> allow.
emit_allow
