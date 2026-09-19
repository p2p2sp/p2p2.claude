#!/usr/bin/env bash
# superdev / PreToolUse hook for ExitPlanMode.
#
# Blocks ExitPlanMode until the plan reviewer (superplan-reviewer for the spec
# path, or simpleplan-reviewer for the Simple path) has approved the plan
# file with "VERDICT: PASS". Heuristic: gates when the transcript shows a
# prior Write/Edit to a path under .claude/plans/*.md (i.e. plan-mode for an
# implementation plan, not commit-flow plan-mode without a plan file); when a
# host project configures its own `plansDirectory`, falls back to the LAST
# Write/Edit of any .md file whose on-disk first line declares the plan
# format ("# SimplePlan" / "# SuperPlan"), so the gate is not blind to a
# custom plans directory.
#
# The verdict it reads is the one from the LATEST completed review after that write
# (a reviewer call plus the first verdict following it), never the first review of
# the session - so a plan that was fixed and re-reviewed clears an earlier FAIL even
# when the fix itself went through a channel Step 1 cannot see. What keeps such an
# unseen edit honest is the tamper guard at the end: the plan file must be OLDER than
# the verdict that approved it (file mtime vs. the transcript timestamp on the verdict
# line), whatever wrote it.
#
# It also requires the plan file to DECLARE its format up front - a SimplePlan
# ("# SimplePlan" / "simplebuild") or a SuperPlan ("# SuperPlan" / "superbuild").
# A plan that names neither format is denied with guidance to use the default
# SimplePlan format, so the review / build path is never ambiguous.
#
# NOTE: this hook only fires when the model calls ExitPlanMode, i.e. in plan
# mode. Entering plan mode before drafting a plan is driven by the superplan /
# simpleplan skill instruction, so this ExitPlanMode gate fires for every plan-driven flow
# regardless of the mode the session started in. Plain plan mode (entered by the
# harness/user, not a plan skill) also writes its plan under .claude/plans/*.md, so it
# is gated identically; the deny guidance defaults to simpleplan-reviewer.
# superbuild trusts this gate as the single plan-review checkpoint and does
# not re-review the plan itself.
#
# Routing exit: an ExitPlanMode call whose "plan" value OPENS with the literal
# "superdev:routing-exit" is allowed unconditionally and writes no sidecar. It
# is how the three skills that begin by leaving plan mode (intent, superspec,
# phases) get out when an earlier plan of the same session is standing at
# VERDICT: FAIL - including the BLOCKED-to-intent route both plan writers
# prescribe. Those calls present no plan and ask for no approval, so there is
# nothing for this gate to gate.
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
#
# Reviewed-plan record: on the FINAL allow only - the W -> R -> S(PASS) sequence
# satisfied and no post-approval tamper - the hook writes the sha256 of the plan
# file's bytes, as one "<hex>\n" line, to the sidecar "<plan path>.sha256" beside
# the plan (e.g. .claude/plans/foo.md.sha256). decompose.sh recomputes the digest
# of the plan it is handed and refuses (exit 7) one that differs, so a plan edited
# between this approval and the build is never decomposed as approved. The digest
# comes from scripts/lib_sha256.sh (the one spelling both sides share). Every
# early fail-open allow writes NO sidecar, and a failure here - no digest tool,
# an unwritable directory - is swallowed: the decision stays "allow".

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

# Routing exit: three skills (intent, superspec, phases) open by LEAVING
# plan mode - they present no plan and ask for no approval, so the review gate
# below has nothing to gate. Without this escape a plan reviewed earlier in the
# session with VERDICT: FAIL denies them, and the route the plan writers
# themselves prescribe for a BLOCKED finding ("run the intent Skill first")
# cannot be taken: the plan skill is told to go to intent, and intent's own
# first call is refused by this hook. Such a call passes the literal marker
# "superdev:routing-exit" as the OPENING of the ExitPlanMode plan argument, and
# it is allowed here before anything else is read. The marker must open the
# value, not merely appear in it, so a real plan cannot trip it: a plan file
# always opens with "# SimplePlan" / "# SuperPlan". No sidecar is written on
# this path - nothing was approved.
if printf '%s' "$input" | grep -qE '"plan"[[:space:]]*:[[:space:]]*"superdev:routing-exit'; then
  emit_allow
fi

# Extract transcript_path from the JSON payload, pure POSIX (no jq). Matches the
# first  "transcript_path": "value"  occurrence and prints the unquoted value; a
# parse miss yields "" and fails open via the guard below. The key appears once and
# the value is a filesystem path with no literal '"', so [^"]* is a safe class.
# Second sed JSON-unescapes backslashes so a Windows transcript path "C:\\Users\\..."
# resolves to a real path for the -f test below (jq did this); standalone single-quoted
# sed on purpose - bash 3.2 mangles ${//} backslash substitution. No-op for forward slashes.
transcript_path="$(
  printf '%s' "$input" \
    | grep -oE '"transcript_path"[[:space:]]*:[[:space:]]*"[^"]*"' \
    | head -n1 \
    | sed -E 's/^"transcript_path"[[:space:]]*:[[:space:]]*"(.*)"$/\1/' \
    | sed 's/\\\\/\\/g'
)"
[ -z "$transcript_path" ] && emit_allow
[ -f "$transcript_path" ] || emit_allow

# Step 1: locate the LAST JSONL line recording a plan-file WRITE - an assistant
# tool_use whose file_path points under .claude/plans/*.md. Anchor on the
# "file_path":"..." key, NOT arbitrary line text, so a Write whose *content* merely
# mentions a .claude/plans/<slug>.md path does not false-match.
# Robustness across Claude Code builds / OSes:
#   - path separators: match both "/" and "\" - Windows records file_path with
#     escaped backslashes ("C:\\Users\\..\\.claude\\plans\\.."), mac/linux use "/".
#   - tool key: accept both "name":"Write|Edit" (current tool_use schema) and the
#     legacy "tool_name":"Write|Edit"; that filter also excludes a Read of a plan
#     file (file_path present, but not a write).
# This is the most-recent plan-file write in the transcript.
#   - review siblings excluded (defensive): a stray `<plan>.md.review-<N>.md`
#     written NEXT TO the plan (the pre-fixer reviewer flow used these; none of the
#     current skills do) would otherwise match this glob and latch plan_base onto
#     the review file - silently disarming the post-PASS tamper guard below.
last_plan_write_line=$(
  grep -nE '"file_path":"[^"]*\.claude[\\/]+plans[\\/]+[^"]*\.md"' "$transcript_path" 2>/dev/null \
    | grep -vE '"file_path":"[^"]*\.review-[0-9]+\.md"' \
    | grep -E '"(tool_name|name)":"(Write|Edit)"' \
    | tail -n 1 \
    | cut -d: -f1
)

# Step 1-fallback: a host project with its own `plansDirectory` writes the
# plan somewhere else entirely, so the fixed .claude/plans/ anchor above finds
# nothing. Fall back to the LAST write/edit to ANY .md file in the transcript,
# then require its first line on disk to declare the format ("# SimplePlan" /
# "# SuperPlan") before accepting it as the plan - the path alone carries no
# signal outside .claude/plans/, so anchoring on the on-disk first line is
# what keeps an unrelated .md write (or one merely mentioning "superbuild" in
# prose) from false-arming the gate. An unreadable/missing file fails open,
# same policy as everywhere else in this hook.
if [ -z "$last_plan_write_line" ]; then
  fallback_line=$(
    grep -nE '"file_path":"[^"]*\.md"' "$transcript_path" 2>/dev/null \
      | grep -vE '"file_path":"[^"]*\.review-[0-9]+\.md"' \
      | grep -E '"(tool_name|name)":"(Write|Edit)"' \
      | tail -n 1 \
      | cut -d: -f1
  )
  if [ -n "$fallback_line" ]; then
    fallback_path=$(
      awk -v ln="$fallback_line" 'NR==ln' "$transcript_path" 2>/dev/null \
        | grep -oE '"file_path":"[^"]*\.md"' \
        | head -n1 \
        | sed -E 's/.*"file_path":"([^"]*)"$/\1/' \
        | sed 's/\\\\/\\/g'
    )
    if [ -n "$fallback_path" ] && [ -f "$fallback_path" ] \
       && head -n1 "$fallback_path" 2>/dev/null | grep -qE '^# (SimplePlan|SuperPlan)'; then
      last_plan_write_line="$fallback_line"
    fi
  fi
fi

# No plan-file write recorded -> not an implementation plan mode -> allow.
if [ -z "$last_plan_write_line" ]; then
  emit_allow
fi

# Resolve the plan file path from that write line (hoisted here so both the format
# gate below and the tamper guard at the end can reuse it). A generic .md match
# covers both the fast .claude/plans/ path and the plansDirectory fallback above -
# last_plan_write_line is, by construction, always a Write/Edit to a .md file at
# this point. Unescape the JSON backslashes so a Windows path ("C:\\Users\\..")
# becomes a real filesystem path we can read; a no-op for mac/linux forward
# slashes. plan_base is the bare filename, used by the tamper guard's transcript
# matching.
plan_path=$(
  awk -v ln="$last_plan_write_line" 'NR==ln' "$transcript_path" 2>/dev/null \
    | grep -oE '"file_path":"[^"]*\.md"' \
    | head -n1 \
    | sed -E 's/.*"file_path":"([^"]*)"$/\1/' \
    | sed 's/\\\\/\\/g'
)
plan_base="${plan_path##*[\\/]}"

# Step 1b: the plan MUST declare its format so the review / build path is
# unambiguous. A SimplePlan carries the "# SimplePlan" header / "simplebuild"
# reference; a SuperPlan carries "# SuperPlan" / "superbuild". Read the plan file;
# if it names NEITHER format, the format is undeclared -> deny and require the
# default (SimplePlan). Fail-open only when the plan file itself cannot be read
# (established fail-open policy for hook faults).
if [ -n "$plan_path" ] && [ -f "$plan_path" ] \
   && ! grep -qiE 'simpleplan|simplebuild|superplan|superbuild' "$plan_path" 2>/dev/null; then
  emit_deny "Next step: declare the plan format. The plan file does not indicate whether it is a SimplePlan or a SuperPlan. By default a plan MUST use the SimplePlan format - rewrite it from the simpleplan template (header '# SimplePlan' plus 'To build this plan must use the simplebuild skill.'). Add the format marker, re-run the plan reviewer, then retry ExitPlanMode. (This is the normal approval gate, not an error.)"
fi

# Step 1c: the plan MUST declare its own file path so both build orchestrators can
# resolve it after a context reset (the harness passes the plan TEXT, never its
# path). Read the first "Plan:" line from the plan file and compare its basename
# against plan_base (the file we actually resolved from the transcript) - basenames
# only, so a path-separator or drive-case difference between the transcript-recorded
# path and the author-written path cannot cause a false deny. Fail-open only when the
# plan file itself cannot be read (established fail-open policy for hook faults).
if [ -n "$plan_path" ] && [ -f "$plan_path" ] && [ -r "$plan_path" ]; then
  plan_line_value=$(grep -m1 -E '^Plan:' "$plan_path" 2>/dev/null | sed -E 's/^Plan:[[:space:]]*//; s/[[:space:]]+$//')
  plan_line_base="${plan_line_value##*[\\/]}"
  if [ -z "$plan_line_base" ] || [ "$plan_line_base" != "$plan_base" ]; then
    emit_deny "Next step: declare the plan's own path. The plan file does not carry a 'Plan:' line naming itself. Add 'Plan: ${plan_path}' to the plan preamble (exactly as given by plan mode), re-run the plan reviewer, then retry ExitPlanMode. (This is the normal approval gate, not an error.)"
  fi
fi

# Step 2: from the line AFTER the last plan-file write, resolve the MOST RECENT
# COMPLETED review - the LAST (R -> S) pair, where
#   R = a line containing the plan reviewer name AND a subagent marker
#   S = the FIRST verdict line ("VERDICT: PASS|FAIL") after that R.
# Binding to the FIRST R's verdict (the previous behavior) latched the gate onto a
# stale verdict for the rest of the session: this anchor only moves on a Write/Edit
# of the plan, so whenever the plan was fixed through something Step 1 cannot see (a
# Bash heredoc / script edit), every later re-review stayed invisible and an old FAIL
# could never be cleared - the run deadlocked with no way out from inside.
# Pairing keeps every anti-forgery property the first-verdict binding had:
#   - the verdict is still the FIRST verdict AFTER ITS OWN reviewer call, so a
#     stray/pasted/echoed PASS later in the transcript never overrides it;
#   - a FAIL from the newest review still denies;
#   - a line that merely LOOKS like a reviewer call but has no verdict after it
#     cannot clobber the last real pair - only call+verdict pairs are recorded;
#   - a plan Write/Edit after a review moves tail_start past every pair, so an
#     edited plan still demands a fresh review.
tail_start=$((last_plan_write_line + 1))

# R: subagent / skill invocation referencing the plan reviewer - either
# superplan-reviewer (spec path) or simpleplan-reviewer (Simple path).
# Match either the Agent tool call ("subagent_type":"...(super|simple)plan-reviewer...") or the
# Skill tool_use envelope (both reviewers are context:fork skills invoked via the
# Skill tool - "skill":"superdev:superplan-reviewer" / "superdev:simpleplan-reviewer") that
# mentions the reviewer on the same JSONL line. Load-bearing: name + marker must co-occur on
# one line; if a future transport splits them, relax to a two-stage match (reviewer line, then the verdict).
#
# S: the reviewer's OWN verdict. Anchor on the escaped newline (\n in the JSONL) that
# precedes it: the real verdict always starts its own markdown line, so it appears as
# `\nVERDICT: <value>`. The keyword is the literal, canonical `VERDICT:` (no bold, no
# case variance - every superdev skill returns exactly this) so a drifted format (old
# bold markers, a different case) does NOT match and correctly falls through to the
# "no VERDICT: line" deny below, rather than silently tolerating stale output shapes:
#   - `([-*] )?` tolerates a leading markdown list marker (`- VERDICT:`);
#   - `` `? `` on each side tolerates back-ticks around the value (`` `PASS` ``).
# The `\\n` matches the two literal chars backslash-n JSON uses to escape a newline -
# this excludes inline mentions mid-line. The alternative `"(text|content)":"` anchor
# accepts a verdict that OPENS the content string (a spec-faithful reviewer puts the
# verdict on the FIRST line with no preamble; today the harness prefixes forked-skill
# results with `Result:\n`, but the gate must not depend on that undocumented framing).
# The verdict VALUE must END the line-anchored token - followed by the escaped newline
# (\n) that starts the next markdown line, or the closing quote (") that ends the JSON
# content string (optional trailing spaces tolerated). This rejects a qualified/negated
# `VERDICT: PASS is NOT ...` whose value is not the whole token: without the end-anchor
# its last matched word is still `PASS` -> a false-allow.
# `next` on a call line keeps a round-2 reviewer call (whose ARGS quote the previous
# round's verdict) from being read as that same call's result.
# Emits three integers: the last reviewer call seen, then the call/verdict line numbers
# of the last complete pair (0 for each when there is none).
read -r last_call_line reviewer_call_line verdict_line <<PAIR
$(
  awk -v start="$tail_start" '
    NR < start { next }
    /(superplan|simpleplan)-reviewer/ && (/"subagent_type"/ || /"Agent"/ || /"Skill"/ || /"skill"/) {
      call = NR; last_call = NR; next
    }
    call && /(\\n|"(text|content)":")([-*] )?VERDICT:[[:space:]]+`?(PASS|FAIL)`?[[:space:]]*(\\n|")/ {
      best_call = call; best_verdict = NR; call = 0
    }
    END { print last_call + 0, best_call + 0, best_verdict + 0 }
  ' "$transcript_path" 2>/dev/null
)
PAIR
last_call_line="${last_call_line:-0}"
reviewer_call_line="${reviewer_call_line:-0}"
verdict_line="${verdict_line:-0}"

if [ "$last_call_line" = "0" ]; then
  emit_deny "Next step: plan review. Run the simpleplan-reviewer skill (or superplan-reviewer if this plan follows a spec), wait for 'VERDICT: PASS', then retry ExitPlanMode. (This is the normal approval gate, not an error.)"
fi

if [ "$verdict_line" = "0" ]; then
  emit_deny "Next step: address the review. The plan reviewer was called (transcript line ${last_call_line}, after the last plan Write/Edit on line ${last_plan_write_line}) but returned no 'VERDICT:' line - re-run it and let it return its verdict, then retry ExitPlanMode. (This is the normal approval gate, not an error.)"
fi

# The value on that verdict line - strip the trailing anchor, drop any back-ticks,
# then take the last whitespace-delimited token of the remaining `\nVERDICT: <value>` span.
verdict_value=$(
  awk -v ln="$verdict_line" 'NR==ln {
    if (match($0, /(\\n|"(text|content)":")([-*] )?VERDICT:[[:space:]]+`?(PASS|FAIL)`?[[:space:]]*(\\n|")/)) {
      v = substr($0, RSTART, RLENGTH); sub(/[[:space:]]*(\\n|")$/, "", v); gsub(/`/, "", v)
      n = split(v, a, " "); print a[n]
    }
  }' "$transcript_path" 2>/dev/null
)

# The deny names WHICH review it read (reviewer-call and verdict transcript lines) and
# how that review was selected, so a run that keeps being denied is diagnosable from the
# message alone instead of by reading the transcript.
if [ "$verdict_value" != "PASS" ]; then
  emit_deny "Next step: address the review. The plan reviewer returned 'VERDICT: ${verdict_value}', not PASS - apply its Fix list to the plan file, re-run the reviewer, then retry ExitPlanMode. (Read from the LATEST review in the transcript: reviewer call on line ${reviewer_call_line}, its verdict on line ${verdict_line}, both after the last plan Write/Edit on line ${last_plan_write_line}; re-running the reviewer creates a newer pair that supersedes this one. This is the normal approval gate, not an error.)"
fi

# Tamper guard: a PASS approves the plan AS REVIEWED. Step 1 only sees Write/Edit, so a
# plan mutation through any other channel after the verdict would let a stale PASS
# approve content the reviewer never saw. Two independent detectors, both fail-open:
#
# (a) mtime - tool-agnostic. Compare the plan file's modification time against the
#     timestamp the transcript records on the verdict line: the reviewed plan must be
#     OLDER than its own verdict. This catches every writer (a redirect, sed, a
#     python/node heredoc, an external editor), instead of a hard-coded verb list that
#     can only ever enumerate the writers someone thought of. Needs both values;
#     anything unresolvable (no "timestamp" key on that line, a date/stat flavor that
#     rejects the input) skips the check rather than denying. The 2s slack absorbs
#     filesystem / clock rounding.
# (b) command shape - the historical textual detector, kept for transcripts that carry
#     no timestamps. Re-gate when a later Bash line makes the plan path the TARGET of a
#     mutation (a redirect target, or an operand of sed -i / tee / cp / mv) - NOT mere
#     co-occurrence, so a read/stage (`cat`, `git add`) or a redirect aimed at another
#     file that merely names the plan does not false-deny.
# plan_path / plan_base were resolved right after Step 1 (hoisted for the format gate).
tamper_reason="Next step: re-review. The plan file was modified after 'VERDICT: PASS' - re-run the plan reviewer on the current plan, then retry ExitPlanMode. (This is the normal approval gate, not an error.)"

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
  # Blank out anything non-numeric so the comparison below simply does not run.
  case "${plan_mtime:-}"    in ''|*[!0-9]*) plan_mtime="" ;; esac
  case "${verdict_epoch:-}" in ''|*[!0-9]*) verdict_epoch="" ;; esac
  if [ -n "$plan_mtime" ] && [ -n "$verdict_epoch" ] \
     && [ "$plan_mtime" -gt "$((verdict_epoch + 2))" ]; then
    emit_deny "$tamper_reason"
  fi
fi

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
    emit_deny "$tamper_reason"
  fi
fi

# Sequence W -> R -> S(PASS) satisfied, no post-approval tamper -> allow.
# Record the approved plan's digest beside it for decompose.sh (see the header);
# every failure on this path is swallowed so the decision stays "allow".
if [ -n "$plan_path" ] && [ -f "$plan_path" ]; then
  lib_sha256="$(dirname "${BASH_SOURCE[0]}")/../../scripts/lib_sha256.sh"
  if [ -f "$lib_sha256" ]; then
    # shellcheck source=../../scripts/lib_sha256.sh
    . "$lib_sha256" 2>/dev/null || true
    if reviewed_digest="$(sha256_of "$plan_path" 2>/dev/null)" && [ -n "$reviewed_digest" ]; then
      printf '%s\n' "$reviewed_digest" > "${plan_path}.sha256" 2>/dev/null || true
    fi
  fi
fi
emit_allow
