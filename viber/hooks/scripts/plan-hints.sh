#!/usr/bin/env bash
#
# plan-hints.sh - viber / UserPromptSubmit hook: plan-writing hints for plain plan mode.
#
# Injects two plan-writing rules into the model's context on every prompt sent
# in plain plan mode: end the plan with a subagent review of the finished
# implementation, and have independent tasks run in parallel subagents. The
# viber planner needs neither - its implementor already runs task-reviewer and
# parallel coders - so a planner Skill tool_use in the current plan-mode episode
# (or one whose own EnterPlanMode opened it) silences the hint.
#
# Why a hook: the rules only matter while a plain plan is written, so carrying
# them in the session manifest spent context in every session for nothing. The
# hint is soft; plain-plan-review (plan-gate.sh, plain-plan-review: true) is
# what enforces the closing review task.
#
# The episode window and the planner Skill grep are copied from plan-gate.sh:
# keep both in step, a rename on either side disarms the other silently.
#
# Contract:
#   argv   : none - every input arrives on stdin.
#   cwd    : irrelevant; the payload carries an absolute "transcript_path".
#   env    : none read.
#   reads  : the transcript file named by the payload's "transcript_path", only
#            to look for a planner Skill tool_use in the current episode. A
#            missing or unreadable transcript counts as no planner.
#   stdin  : UserPromptSubmit JSON; "permission_mode" decides. Absent, empty,
#            or any value but "plan" -> nothing printed. Empty stdin -> the same.
#   stdout : nothing, or in plain plan mode
#            {"hookSpecificOutput":{"hookEventName":"UserPromptSubmit",
#             "additionalContext":"<the two rules>"}}
#   exit 0 : always (fail-open: a broken hint must never block a prompt).
#            JSON is read with grep/sed; jq is not assumed.
set -u

# Value of a top-level string key, JSON-unescaped enough for a Windows path
# ("C:\\Users\\.." -> "C:\Users\.."). Same as plan-gate.sh.
json_str() {
  printf '%s' "$2" \
    | grep -oE "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" \
    | head -n1 \
    | sed -E "s/^\"$1\"[[:space:]]*:[[:space:]]*\"(.*)\"$/\1/" \
    | sed 's/\\\\/\\/g'
}

input="$(cat)"
[ -n "$input" ] || exit 0
printf '%s' "$input" | grep -qE '"permission_mode"[[:space:]]*:[[:space:]]*"plan"' || exit 0

transcript_path="$(json_str transcript_path "$input")"
if [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then
  # Episode window, as in plan-gate.sh: everything after the last turn recorded
  # in a non-plan permission mode.
  episode_start=$(
    grep -nE '"type":"permission-mode"' "$transcript_path" 2>/dev/null \
      | grep -vE '"permissionMode":"plan"' \
      | tail -n1 \
      | cut -d: -f1
  )
  episode_start="${episode_start:-0}"

  # Planner Skill tool_use, as in plan-gate.sh: bare "planner" or "viber:planner",
  # inside the episode or directly followed by its own EnterPlanMode inside it.
  planner_raw="$(
    awk '
      /"name":"Skill"/ && /"skill":"(viber:)?planner"/ { skill = NR; entry = 0; pending = 1; next }
      pending && /"type":"tool_use",("id":"[^"]*",)?"name":"EnterPlanMode"/ { entry = NR; pending = 0; next }
      pending && (/"permissionMode":"plan"/ || /"message":[{]("role":"user",)?"content":"/) { pending = 0 }
      END { print skill + 0, entry + 0 }
    ' "$transcript_path" 2>/dev/null
  )"
  printf '%s' "$planner_raw" | grep -qE '^[0-9]+ [0-9]+$' || planner_raw="0 0"
  set -- $planner_raw
  if [ "$1" -gt "$episode_start" ] || [ "$2" -gt "$episode_start" ]; then
    exit 0
  fi
fi

printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"Plain plan mode, plan-writing rules:\n- End the plan with a task in which a subagent reviews the finished implementation against the plan, and its findings are fixed before the work is reported done.\n- During implementation time matters: have the plan run independent tasks in parallel subagents.\n- Skip both when a viber skill (intent, fixer, planner) drives the plan."}}'
exit 0
