#!/usr/bin/env bash
#
# status-update.sh - zapisuje numer przetworzonego taska do status.md.
#
# Użycie:
#   status-update.sh <task-file>
#
# Wyznacza numer NN z nazwy pliku taska (tasks/task-NN.md) oraz katalog
# roboczy (rodzic katalogu tasks/) i nadpisuje <workdir>/status.md numerem.
# Uruchamiany po ukończeniu taska, tuż przed TaskStop -> completed.
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

# numer NN z nazwy pliku task-NN.md
base="$(basename "$task")"
num="$(printf '%s' "$base" | sed -n 's/^task-\([0-9]\{1,\}\)\.md$/\1/p')"

if [[ -z "$num" ]]; then
  echo "error: cannot extract task number from '$base' (expected task-NN.md)" >&2
  exit 1
fi

# katalog roboczy = rodzic katalogu tasks/
workdir="$(dirname "$(dirname "$task")")"
status="$workdir/status.md"

printf 'task: %s\n' "$num" > "$status"
echo "status: $status -> task: $num"
