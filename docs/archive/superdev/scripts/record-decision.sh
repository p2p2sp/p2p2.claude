#!/usr/bin/env bash
#
# record-decision.sh - appends one accepted-decision line to a run's
# decisions file.
#
# Usage:
#   record-decision.sh <workdir> <id> <subject> <accepted-text>
#
# workdir        (required) - the run's working directory, as decompose.sh
#                prints it (docs/.workflows/<run>/); a trailing "/" and a
#                leading "./" are tolerated and normalised away before use,
#                the same way cleanup-run.sh does.
# id             (required) - the finding or criterion ID the decision
#                covers (e.g. "C3", "criterion 21").
# subject        (required) - the criterion or task the decision changes.
# accepted-text  (required) - what the user accepted, verbatim.
#
# Any missing argument -> usage on stderr, exit 1.
#
# Appends one line, in the shape documented at
# superdev/references/review-contract.md ## Decisions file:
#   - <id> - <subject> - accepted: <accepted-text> - <date +%F>
# to <workdir>/implementation/decisions.md, creating the implementation/
# directory (and the file) as needed. When the file already exists and does
# not end in a newline, one is written first so the new line always starts
# fresh. Prints "decision: <path> -> <id>" on stdout and exits 0.
#
set -euo pipefail

raw_workdir="${1:-}"
id="${2:-}"
subject="${3:-}"
accepted="${4:-}"

if [[ -z "$raw_workdir" || -z "$id" || -z "$subject" || -z "$accepted" ]]; then
  echo "error: missing required parameter" >&2
  echo "usage: record-decision.sh <workdir> <id> <subject> <accepted-text>" >&2
  exit 1
fi

# normalise workdir: drop a trailing "/" and a leading "./"
dir="${raw_workdir%/}"
[[ "$dir" == ./* ]] && dir="${dir#./}"

mkdir -p "$dir/implementation"
decisions="$dir/implementation/decisions.md"

if [[ -s "$decisions" ]]; then
  last_byte="$(tail -c1 "$decisions")"
  [[ -n "$last_byte" ]] && printf '\n' >> "$decisions"
fi

printf -- '- %s - %s - accepted: %s - %s\n' "$id" "$subject" "$accepted" "$(date +%F)" >> "$decisions"

echo "decision: $decisions -> $id"
