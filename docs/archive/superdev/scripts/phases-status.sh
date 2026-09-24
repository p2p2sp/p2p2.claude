#!/usr/bin/env bash
#
# phases-status.sh - reports the build status of every phase listed in a
# phases file, plus the phase to start next.
#
# Usage:
#   phases-status.sh <phases-file>
#
# phases-file  (required) - path to a phases.md written by the phases skill.
#              Every phase contributes exactly one "- Dir: <value>" line (in
#              its "## Phases" block); <value> is relative to the phases
#              file's OWN directory, which is what makes the whole run
#              movable.
#
# cwd: only ever resolves a relative <phases-file> argument. Every other path
#      this script prints or tests derives from that file's OWN directory, so
#      an absolute argument makes the call fully cwd-independent - which is
#      what keeps a whole run movable.
#
# Behaviour:
#   - missing argument, or a path that is not a file -> error + usage on
#     stderr, exit 1
#   - no "- Dir:" line anywhere in the file -> error on stderr, exit 3
#   - one stdout line per "- Dir:" line, in file order:
#       "<dir><TAB><status><TAB><title>"
#     where <dir> = dirname(phases-file) + "/" + the trimmed Dir: value
#     (backslashes normalised to "/", a leading "./" stripped, so a phases
#     file passed as "./docs/..." prints "docs/...")
#   - <title> of <dir>: the text after the number of the nearest preceding
#     "### NN. <title>" heading, trailing whitespace trimmed and any inner tab
#     turned into a space (the columns are tab-separated); "-" when no such
#     heading precedes that "- Dir:" line - a title-less phases file still
#     reports, one column wider
#   - <status> of <dir>:
#       directory absent                                     -> done
#         (a cleaned-up phase: cleanup-run.sh removed it)
#       status.md present, its "task: NN" equal to the highest
#         NN among tasks/task-NN.md, and that highest not 00  -> done
#       status.md present in any other case                   -> building
#       no status.md, but spec.md or plan.md present          -> planned
#       otherwise                                             -> pending
#     (the done/building rule is exactly cleanup-run.sh's completeness check)
#   - last stdout line: "next: <dir><TAB><title>" for the first phase whose
#     status is not done, or "next: none" when every phase is done
#
# stdout carries the report only; every error goes to stderr.
#
set -euo pipefail

phases_file="${1:-}"

if [[ -z "$phases_file" ]]; then
  echo "error: missing required parameter 'phases-file'" >&2
  echo "usage: phases-status.sh <phases-file>" >&2
  exit 1
fi

if [[ ! -f "$phases_file" ]]; then
  echo "error: phases file not found: $phases_file" >&2
  echo "usage: phases-status.sh <phases-file>" >&2
  exit 1
fi

# base = the phases file's own directory, separator- and "./"-normalised. The two
# separator literals are held in variables on purpose: spelled inline, the
# backslash pattern of ${var//.../...} is read by bash as an escaped "/" and
# the expansion silently deletes every separator instead of converting it.
backslash='\'
forwardslash='/'
base="${phases_file//"$backslash"/"$forwardslash"}"
base="$(dirname -- "$base")"
[[ "$base" == ./* ]] && base="${base#./}"
[[ "$base" == "." ]] && base=""

# --- phase status ----------------------------------------------------------

# Prints done|building|planned|pending for one phase directory.
phase_status() {
  local dir="$1"
  local parsed last highest n f

  if [[ ! -d "$dir" ]]; then
    printf 'done\n'
    return 0
  fi

  if [[ -f "$dir/status.md" ]]; then
    last="00"
    parsed="$(sed -n '/^task:[[:space:]]*[0-9]/{s/^task:[[:space:]]*\([0-9]\{1,\}\).*$/\1/p;q;}' "$dir/status.md")"
    if [[ -n "$parsed" ]]; then
      last="$parsed"
    fi

    highest="00"
    for f in "$dir"/tasks/task-*.md; do
      [[ -e "$f" ]] || continue
      n="$(basename "$f" | sed -n 's/^task-\([0-9]\{1,\}\)\.md$/\1/p')"
      if [[ -z "$n" ]]; then
        continue
      fi
      if (( 10#$n > 10#$highest )); then
        highest="$n"
      fi
    done

    if [[ "$highest" != "00" && "$((10#$last))" -eq "$((10#$highest))" ]]; then
      printf 'done\n'
    else
      printf 'building\n'
    fi
    return 0
  fi

  if [[ -f "$dir/spec.md" || -f "$dir/plan.md" ]]; then
    printf 'planned\n'
    return 0
  fi

  printf 'pending\n'
  return 0
}

# --- phase directories and titles from the phases file ---------------------

# One awk pass emits "<dir value><TAB><title>" per "- Dir:" line: a
# "### NN. <title>" heading arms the title, the next "- Dir:" line spends it
# and disarms it again - so a phase whose "- Dir:" line has no heading of its
# own gets "-" rather than the previous phase's title. A tab inside a title is
# turned into a space here, because the tab is this script's column separator.
# `count` rather than ${#values[@]}: an empty array under `set -u` is a trap in
# older bash (3.2 still ships as /bin/bash on macOS), and the counter keeps the
# empty case away from any array expansion at all.
values=()
titles=()
count=0
while IFS=$'\t' read -r value title; do
  values+=("$value")
  titles+=("$title")
  count=$((count + 1))
done < <(awk '
  /^###[[:space:]]+[0-9]+\./ {
    heading = $0
    sub(/^###[[:space:]]+[0-9]+\.[[:space:]]*/, "", heading)
    sub(/[[:space:]]+$/, "", heading)
    gsub(/\t/, " ", heading)
    title = heading
    next
  }
  match($0, /^-[[:space:]]*Dir:[[:space:]]*/) {
    value = substr($0, RLENGTH + 1)
    sub(/[[:space:]]+$/, "", value)
    if (value != "") {
      printf "%s\t%s\n", value, (title == "" ? "-" : title)
    }
    title = ""
  }
' "$phases_file")

if (( count == 0 )); then
  echo "error: no '- Dir:' lines found in $phases_file" >&2
  exit 3
fi

# --- report ----------------------------------------------------------------

next=""
next_title=""
next_found=0
for (( i = 0; i < count; i++ )); do
  value="${values[$i]}"
  title="${titles[$i]}"
  dir="${base:+$base/}$value"
  status="$(phase_status "$dir")"
  printf '%s\t%s\t%s\n' "$dir" "$status" "$title"
  if (( next_found == 0 )) && [[ "$status" != "done" ]]; then
    next="$dir"
    next_title="$title"
    next_found=1
  fi
done

if (( next_found == 1 )); then
  printf 'next: %s\t%s\n' "$next" "$next_title"
else
  printf 'next: none\n'
fi
