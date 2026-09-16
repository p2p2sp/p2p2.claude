#!/usr/bin/env bash
#
# stats-record.sh - appends ONE workflow-execution event to a run's stats
# event file.
#
# Usage:
#   stats-record.sh <workdir> <kind> <label> [model] [effort] [tokens] \
#                   [tool_uses] [duration_ms] [verdict] [note]
#
# workdir      (required) - the run's working directory, as decompose.sh
#              prints it (docs/.workflows/<run>/); a trailing "/" and a
#              leading "./" are tolerated and normalised away before use, the
#              same way record-decision.sh does. It only names the run - the
#              event file itself always lands under the current working
#              directory, never inside the workdir.
# kind         (required) - what produced the event, in the caller's own
#              vocabulary (start, resume, implementor, task-reviewer, fork,
#              commit, escalation ...).
# label        (required) - which one (a task file, a fork name, a review
#              round).
# model        (optional) - the dispatch's model, copied from the harness
#              notification.
# effort       (optional) - the dispatch's effort, copied the same way.
# tokens       (optional) - subagent_tokens from that notification.
# tool_uses    (optional) - tool_uses from that notification.
# duration_ms  (optional) - duration_ms from that notification.
# verdict      (optional) - what the dispatch returned (PASS, FAIL, BLOCKED).
# note         (optional) - one short free-text line.
#
# Every optional argument absent or empty is written as "-". Nothing is
# computed here beyond the timestamp: the caller copies each value from the
# harness notification verbatim.
#
# A missing or empty <workdir>, <kind> or <label> -> "error: missing required
# parameter" plus the usage line on stderr, exit 1, nothing written.
#
# RUN ID: the <workdir> tail after its LAST "docs/.workflows/" segment, that
# tail's path segments joined with "-", so a phase workdir
# (docs/.workflows/<run>/phases/01-slug) gets an id of its own
# ("<run>-phases-01-slug"). A workdir carrying no "docs/.workflows/" segment
# falls back to its basename.
#
# OUTPUT FILE: .temp/superdev/stats/<run>.events, relative to the current
# working directory (the host repo root, where the orchestrator runs); the
# directory and the file are created as needed. One event is exactly one
# tab-separated line, ten fields in this order:
#   <epoch seconds> kind label model effort tokens tool_uses duration_ms
#   verdict note
# The timestamp is this script's own `date +%s`. Every tab, carriage return
# and newline is removed from each argument first, so one event can never span
# two lines and the file stays parseable. When the file already exists and does
# not end in a newline, one is written first so the new event starts fresh.
#
# Prints "stats: <path> -> <kind> <label>" on stdout and exits 0.
#
set -euo pipefail

usage() {
  echo "usage: stats-record.sh <workdir> <kind> <label> [model] [effort] [tokens] [tool_uses] [duration_ms] [verdict] [note]" >&2
}

# One field's value with every tab, carriage return and newline removed - the
# three characters that would otherwise break the one-event-one-line contract.
flatten() {
  local value="${1-}"
  value="${value//$'\t'/}"
  value="${value//$'\r'/}"
  value="${value//$'\n'/}"
  printf '%s' "$value"
}

raw_workdir="$(flatten "${1-}")"
kind="$(flatten "${2-}")"
label="$(flatten "${3-}")"

if [[ -z "$raw_workdir" || -z "$kind" || -z "$label" ]]; then
  echo "error: missing required parameter" >&2
  usage
  exit 1
fi

model="$(flatten "${4-}")";       model="${model:--}"
effort="$(flatten "${5-}")";      effort="${effort:--}"
tokens="$(flatten "${6-}")";      tokens="${tokens:--}"
tool_uses="$(flatten "${7-}")";   tool_uses="${tool_uses:--}"
duration_ms="$(flatten "${8-}")"; duration_ms="${duration_ms:--}"
verdict="$(flatten "${9-}")";     verdict="${verdict:--}"
note="$(flatten "${10-}")";       note="${note:--}"

# normalise workdir: drop a trailing "/" and a leading "./"
dir="${raw_workdir%/}"
[[ "$dir" == ./* ]] && dir="${dir#./}"

# run id: the tail after the LAST "docs/.workflows/", its segments joined with
# "-"; the basename when the workdir carries no such segment
marker="docs/.workflows/"
tail_path=""
[[ "$dir" == *"$marker"* ]] && tail_path="${dir##*"$marker"}"
if [[ -n "$tail_path" ]]; then
  run="${tail_path//\//-}"
else
  run="${dir##*/}"
fi

stats_dir=".temp/superdev/stats"
mkdir -p "$stats_dir"
events="$stats_dir/$run.events"

if [[ -s "$events" ]]; then
  last_byte="$(tail -c1 "$events")"
  [[ -n "$last_byte" ]] && printf '\n' >> "$events"
fi

printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
  "$(date +%s)" "$kind" "$label" "$model" "$effort" \
  "$tokens" "$tool_uses" "$duration_ms" "$verdict" "$note" >> "$events"

echo "stats: $events -> $kind $label"
