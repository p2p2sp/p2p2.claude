#!/usr/bin/env bash
#
# status-update.sh - records the number of the task just processed in
# status.md, so a resumed build knows where it stopped.
#
# It exists so the one write that makes a build resumable is a single
# deterministic call rather than a `printf > <path>` the orchestrator composes
# from the run's paths - a composition that wrote the wrong number, or the
# right number into the wrong run, whenever the path was built by hand. Run
# after a task finishes, immediately before TaskStop -> completed.
#
# Contract:
#   argv   : $1 task-file (REQUIRED) - the task's own file, named
#            `tasks/task-NN.md`. NN comes from that basename and the working
#            directory from the file's grandparent (the parent of `tasks/`),
#            so BOTH derive from this one argument and nothing is read from
#            the environment or guessed.
#   cwd    : irrelevant. Every path this script touches is derived from the
#            argument, so an absolute argument makes the call fully
#            cwd-independent and a relative one resolves against the caller's
#            cwd like any relative path. Both build orchestrators pass an
#            absolute path (their `## Mandatory rules` require it).
#   env    : none.
#   writes : <workdir>/status.md, overwritten whole with the single line
#            `task: NN`.
#   stdout : ONE line, `status: <path> -> task: NN`.
#   exit   : 0 on that line. 1 on a missing argument, a task file that does
#            not exist, or a basename no NN can be read from - each with the
#            reason on stderr and nothing written.
#
set -euo pipefail

task="${1:-}"

if [[ -z "$task" ]]; then
  echo "error: missing required parameter 'task-file'" >&2
  echo "usage: status-update.sh <task-file>" >&2
  exit 1
fi

if [[ ! -f "$task" ]]; then
  echo "error: task file not found: $task" >&2
  exit 1
fi

# NN from the task-NN.md basename
base="$(basename "$task")"
num="$(printf '%s' "$base" | sed -n 's/^task-\([0-9]\{1,\}\)\.md$/\1/p')"

if [[ -z "$num" ]]; then
  echo "error: cannot extract task number from '$base' (expected task-NN.md)" >&2
  exit 1
fi

# working directory = the parent of tasks/
workdir="$(dirname "$(dirname "$task")")"
status="$workdir/status.md"

printf 'task: %s\n' "$num" > "$status"
echo "status: $status -> task: $num"
