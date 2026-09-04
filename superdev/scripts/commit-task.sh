#!/usr/bin/env bash
#
# commit-task.sh - commituje pracę pojedynczego taska; opcjonalnie przesuwa status.
#
# Użycie:
#   commit-task.sh <message> [task-file]
#
# Parametry:
#   message    (wymagany) - treść commita
#   task-file  (opcjonalny) - jeśli podany, przed commitem deleguje do
#              status-update.sh <task-file>, zapisując numer taska w status.md
#              (bump statusu wchodzi do tego samego commita co praca taska)
#
# Działanie:
#   - jeśli podano <task-file> -> najpierw status-update.sh <task-file>
#     (zapisuje numer taska do <workdir>/status.md, aby trafił do commita taska)
#   - outside a git repository -> "Not a git repository - skipping commit."
#     and exit 0 (the status bump above has already been written)
#   - git add -A; brak zmian w staged -> "Nothing to commit." i exit 0
#   - w przeciwnym razie git commit -m <message>
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

message="${1:-}"
task="${2:-}"

if [[ -z "$message" ]]; then
  echo "error: missing required parameter 'message'" >&2
  echo "usage: commit-task.sh <message> [task-file]" >&2
  exit 1
fi

if [[ -n "$task" ]]; then
  "$SCRIPT_DIR/status-update.sh" "$task"
fi

# The commit is best-effort. Outside a git repository there is nothing to commit
# to and the task's work is already on disk - so skip it and exit clean, instead
# of letting `set -e` turn git's exit 128 into a failed task that stops the
# implementation loop mid-build.
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Not a git repository - skipping commit."
  exit 0
fi

git add -A
if git diff --cached --quiet; then
  echo "Nothing to commit."
else
  git commit -m "$message"
fi
