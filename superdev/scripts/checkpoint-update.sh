#!/usr/bin/env bash
#
# checkpoint-update.sh - records a run's latest checkpoint bookkeeping.
#
# Usage:
#   checkpoint-update.sh <workdir> <since-sha> <prior-report>
#
# workdir       (required) - the run's working directory, as decompose.sh
#               prints it (docs/.workflows/<run>/); a trailing "/" and a
#               leading "./" are tolerated and normalised away before use,
#               the same way cleanup-run.sh does.
# since-sha     (required) - the SHA the next review round diffs from.
# prior-report  (required) - the path to the last report of this checkpoint
#               (a review or a re-review).
#
# Any missing argument -> usage on stderr, exit 1.
#
# Overwrites <workdir>/checkpoint.md with exactly two lines:
#   since: <since-sha>
#   prior: <prior-report>
# decompose.sh already preserves any file in an existing run directory other
# than tasks/, so this file survives a resume. Prints
# "checkpoint: <path> -> <since-sha>" on stdout and exits 0.
#
set -euo pipefail

raw_workdir="${1:-}"
since_sha="${2:-}"
prior_report="${3:-}"

if [[ -z "$raw_workdir" || -z "$since_sha" || -z "$prior_report" ]]; then
  echo "error: missing required parameter" >&2
  echo "usage: checkpoint-update.sh <workdir> <since-sha> <prior-report>" >&2
  exit 1
fi

# normalise workdir: drop a trailing "/" and a leading "./"
dir="${raw_workdir%/}"
[[ "$dir" == ./* ]] && dir="${dir#./}"

checkpoint="$dir/checkpoint.md"

{
  printf 'since: %s\n' "$since_sha"
  printf 'prior: %s\n' "$prior_report"
} > "$checkpoint"

echo "checkpoint: $checkpoint -> $since_sha"
