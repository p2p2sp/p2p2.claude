#!/usr/bin/env bash
#
# plan-gate.sh - viber / PreToolUse hook for ExitPlanMode: the planner's review gate.
#
# Armed only when the CURRENT plan-mode episode shows both signals of the planner
# skill driving the plan:
#   - a Skill tool_use for "planner", and
#   - a Write/Edit of a plans/*.md file - plan mode names that path itself, so it
#     is the harness plans directory unless the project redirects it.
# Anything else - plain plan mode, a plan-mode exit in a session that already
# built a plan - passes untouched. The episode starts after the last recorded
# non-plan permission mode, so a plan approved earlier in the session cannot
# re-arm the gate.
#
# When armed, ExitPlanMode is allowed only if the planner-review agent was
# dispatched AFTER the last plan write and returned "VERDICT: PASS", and the plan
# file has not been touched since that verdict (file mtime vs. the transcript
# timestamp on the verdict line - that catches an edit through any channel, not
# just Write/Edit).
#
# The verdict is read from the LAST completed (dispatch -> verdict) pair, bound by
# the dispatch's tool-use id where the transcript carries it: a re-review after a
# FAIL supersedes it, and a PASS quoted anywhere else never counts as one.
#
# Contract:
#   stdin  : PreToolUse JSON with at least { "transcript_path": "<abs path>" }
#   stdout : {"hookSpecificOutput":{"hookEventName":"PreToolUse",
#             "permissionDecision":"allow"|"deny","permissionDecisionReason":"..."}}
#   exit 0 : always. Every parse miss or unreadable file falls back to allow -
#            a broken gate must not trap the user in plan mode. JSON is read with
#            grep/sed/awk; jq is not assumed.
set -u

emit_allow() {
  printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
  exit 0
}

emit_deny() {
  reason="${1//\\/\\\\}"
  reason="${reason//\"/\\\"}"
  printf '%s\n' "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"${reason}\"}}"
  exit 0
}

# Value of a top-level string key, JSON-unescaped enough for a Windows path
# ("C:\\Users\\.." -> "C:\Users\..").
json_str() {
  printf '%s' "$2" \
    | grep -oE "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" \
    | head -n1 \
    | sed -E "s/^\"$1\"[[:space:]]*:[[:space:]]*\"(.*)\"$/\1/" \
    | sed 's/\\\\/\\/g'
}

input="$(cat)"
[ -n "$input" ] || emit_allow

transcript_path="$(json_str transcript_path "$input")"
[ -n "$transcript_path" ] && [ -f "$transcript_path" ] || emit_allow
project_cwd="$(json_str cwd "$input")"

# Episode window: everything after the last turn recorded in a non-plan permission
# mode. Keeps a plan that was approved and built earlier in this session - its file
# since touched by the implementor - from arming the gate on a later, unrelated exit.
episode_start=$(
  grep -nE '"type":"permission-mode"' "$transcript_path" 2>/dev/null \
    | grep -vE '"permissionMode":"plan"' \
    | tail -n1 \
    | cut -d: -f1
)
episode_start="${episode_start:-0}"

# Signal 1: the planner skill is running - invoked through the Skill tool, or typed
# by the user as /planner, which loads the skill with no Skill tool_use at all.
# An escaped mention inside some other tool's payload cannot match the first form:
# `\"skill\":\"planner\"` carries a backslash where the pattern needs the quote.
skill_line=$(
  {
    grep -nE '"name":"Skill"' "$transcript_path" 2>/dev/null \
      | grep -E '"skill":"([a-zA-Z0-9_.-]+:)?planner"'
    grep -nE '<command-name>/([a-zA-Z0-9_.-]+:)?planner</command-name>' "$transcript_path" 2>/dev/null
  } | cut -d: -f1 | sort -n | tail -n1
)
[ -n "$skill_line" ] && [ "$skill_line" -gt "$episode_start" ] || emit_allow

# Signal 2: the plan file itself. Anchored on the "file_path" key of a Write/Edit,
# so a plan path merely quoted in prose or read back does not arm the gate.
# Both separators are matched: Windows records "C:\\Users\\..\\plans\\..".
plan_write_line=$(
  grep -nE '"file_path":"[^"]*[\\/]+plans[\\/]+[^"]*\.md"' "$transcript_path" 2>/dev/null \
    | grep -E '"(tool_name|name)":"(Write|Edit)"' \
    | tail -n1 \
    | cut -d: -f1
)
[ -n "$plan_write_line" ] && [ "$plan_write_line" -gt "$episode_start" ] || emit_allow

plan_path=$(
  awk -v ln="$plan_write_line" 'NR==ln' "$transcript_path" 2>/dev/null \
    | grep -oE '"file_path":"[^"]*[\\/]+plans[\\/]+[^"]*\.md"' \
    | tail -n1 \
    | sed -E 's/^"file_path":"(.*)"$/\1/' \
    | sed 's/\\\\/\\/g'
)
# A relative file_path resolves against the session cwd.
if [ -n "$plan_path" ] && [ ! -f "$plan_path" ] && [ -n "$project_cwd" ] && [ -f "$project_cwd/$plan_path" ]; then
  plan_path="$project_cwd/$plan_path"
fi
plan_name="${plan_path##*[\\/]}"

# The review of THIS plan version: only dispatches after the last plan write count.
#
# Dispatch line: an Agent tool_use carrying "subagent_type":"planner-review" - or
# "viber:planner-review", the prefixed form a plugin-shipped agent gets - plus its
# "toolu_..." id when the line exposes one.
# Verdict line : the agent's own report - inline as a tool_result, or, for a
# background agent, inside the <result> of its task-notification. The verdict must
# open a line (escaped \n), a content string, or the <result> element, and its value
# must end the token, so a quoted "VERDICT: PASS is not..." cannot pass as one.
# Pairing prefers the dispatch's id when both sides carry it, and falls back to the
# first verdict after the dispatch when they do not; the later pair wins.
read -r last_dispatch dispatch_line verdict_line <<PAIR
$(
  awk -v start="$((plan_write_line + 1))" '
    NR < start { next }
    /"subagent_type":"([a-zA-Z0-9_.-]+:)?planner-review"/ {
      last_dispatch = NR; call = NR; weak = 0; cid = ""
      if (match($0, /"id":"toolu_[A-Za-z0-9_-]+"/)) cid = substr($0, RSTART + 6, RLENGTH - 7)
      next
    }
    call && /(\\n|"(text|content)":"|<result>)[[:space:]]*VERDICT:[[:space:]]+`?(PASS|FAIL)`?[[:space:]]*(\\n|"|<)/ {
      if (cid != "" && index($0, cid) == 0) {
        # Same dispatch, unlinked line (an echo, a sibling agent): remember it once,
        # but keep looking for the reply that carries this dispatch id.
        if (!weak) { weak = 1; weak_call = call; weak_verdict = NR }
        next
      }
      best_call = call; best_verdict = NR; call = 0
    }
    END {
      if (weak_verdict > best_verdict) { best_call = weak_call; best_verdict = weak_verdict }
      print last_dispatch + 0, best_call + 0, best_verdict + 0
    }
  ' "$transcript_path" 2>/dev/null
)
PAIR
last_dispatch="${last_dispatch:-0}"
dispatch_line="${dispatch_line:-0}"
verdict_line="${verdict_line:-0}"

if [ "$last_dispatch" = "0" ]; then
  emit_deny "Next step: review the plan. The planner skill wrote ${plan_name} but the viber:planner-review agent has not run on this version - dispatch it with the plan path, wait for 'VERDICT: PASS', then retry ExitPlanMode. (This is the planner's review gate, not an error.)"
fi

if [ "$verdict_line" = "0" ]; then
  emit_deny "Next step: let the review finish. The viber:planner-review agent was dispatched (transcript line ${last_dispatch}, after the last write of ${plan_name} on line ${plan_write_line}) but returned no 'VERDICT:' line - dispatch it again and read its verdict, then retry ExitPlanMode. (This is the planner's review gate, not an error.)"
fi

verdict_value=$(
  awk -v ln="$verdict_line" 'NR==ln {
    if (match($0, /(\\n|"(text|content)":"|<result>)[[:space:]]*VERDICT:[[:space:]]+`?(PASS|FAIL)`?/)) {
      v = substr($0, RSTART, RLENGTH); gsub(/`/, "", v)
      n = split(v, a, " "); print a[n]
    }
  }' "$transcript_path" 2>/dev/null
)

if [ "$verdict_value" != "PASS" ]; then
  emit_deny "Next step: fix the findings. The viber:planner-review agent returned 'VERDICT: ${verdict_value}' for ${plan_name}, not PASS - apply its findings to the plan, dispatch the agent again with the previous findings and your fixes, then retry ExitPlanMode. (Read from the latest review: dispatch on transcript line ${dispatch_line}, verdict on line ${verdict_line}. This is the planner's review gate, not an error.)"
fi

# A PASS approves the plan AS REVIEWED. The plan file must therefore be no newer
# than its own verdict - this catches an edit made through a channel the transcript
# scan above cannot see (a redirect, sed -i, an external editor). Either value
# missing skips the check; the 2s slack absorbs clock and filesystem rounding.
if [ -n "$plan_path" ] && [ -f "$plan_path" ]; then
  plan_mtime=$(stat -c %Y "$plan_path" 2>/dev/null || stat -f %m "$plan_path" 2>/dev/null)
  verdict_iso=$(
    awk -v ln="$verdict_line" 'NR==ln' "$transcript_path" 2>/dev/null \
      | grep -oE '"timestamp":"[^"]+"' \
      | head -n1 \
      | sed -E 's/.*"timestamp":"([^"]+)".*/\1/'
  )
  verdict_epoch=""
  if [ -n "$verdict_iso" ]; then
    verdict_epoch=$(date -u -d "$verdict_iso" +%s 2>/dev/null) \
      || verdict_epoch=$(date -j -u -f '%Y-%m-%dT%H:%M:%S' "${verdict_iso%%[.Z]*}" +%s 2>/dev/null) \
      || verdict_epoch=""
  fi
  case "${plan_mtime:-}"    in ''|*[!0-9]*) plan_mtime="" ;; esac
  case "${verdict_epoch:-}" in ''|*[!0-9]*) verdict_epoch="" ;; esac
  if [ -n "$plan_mtime" ] && [ -n "$verdict_epoch" ] && [ "$plan_mtime" -gt "$((verdict_epoch + 2))" ]; then
    emit_deny "Next step: re-review. ${plan_name} was modified after its 'VERDICT: PASS' - dispatch the viber:planner-review agent on the current plan, then retry ExitPlanMode. (This is the planner's review gate, not an error.)"
  fi
fi

emit_allow
