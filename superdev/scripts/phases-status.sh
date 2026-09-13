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
# Behaviour:
#   - missing argument, or a path that is not a file -> error + usage on
#     stderr, exit 1
#   - no "- Dir:" line anywhere in the file -> error on stderr, exit 3
#   - one stdout line per "- Dir:" line, in file order:
#       "<dir><TAB><status>"
#     where <dir> = dirname(phases-file) + "/" + the trimmed Dir: value
#     (backslashes normalised to "/", a leading "./" stripped, so a phases
#     file passed as "./docs/..." prints "docs/...")
#   - <status> of <dir>:
#       directory absent                                     -> done
#         (a cleaned-up phase: cleanup-run.sh removed it)
#       status.md present, its "task: NN" equal to the highest
#         NN among tasks/task-NN.md, and that highest not 00  -> done
#       status.md present in any other case                   -> building
#       no status.md, but spec.md or plan.md present          -> planned
#       otherwise                                             -> pending
#     (the done/building rule is exactly cleanup-run.sh's completeness check)
#   - last stdout line: "next: <dir>" for the first phase whose status is not
#     done, or "next: none" when every phase is done
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

# --- phase directories from the phases file --------------------------------

# `count` rather than ${#values[@]}: an empty array under `set -u` is a trap in
# older bash (3.2 still ships as /bin/bash on macOS), and the counter keeps the
# empty case away from any array expansion at all.
values=()
count=0
while IFS= read -r raw; do
  value="$(printf '%s' "$raw" | sed -e 's/[[:space:]]*$//')"
  if [[ -z "$value" ]]; then
    continue
  fi
  values+=("$value")
  count=$((count + 1))
done < <(sed -n 's/^-[[:space:]]*Dir:[[:space:]]*//p' "$phases_file")

if (( count == 0 )); then
  echo "error: no '- Dir:' lines found in $phases_file" >&2
  exit 3
fi

# --- report ----------------------------------------------------------------

next="none"
next_found=0
for value in "${values[@]}"; do
  dir="${base:+$base/}$value"
  status="$(phase_status "$dir")"
  printf '%s\t%s\n' "$dir" "$status"
  if (( next_found == 0 )) && [[ "$status" != "done" ]]; then
    next="$dir"
    next_found=1
  fi
done

printf 'next: %s\n' "$next"
