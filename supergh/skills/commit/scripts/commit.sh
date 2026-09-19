#!/usr/bin/env bash
#
# commit.sh - runs the git commit with the message it is handed.
#
# It exists so the commit skill's one write to history is a single command to
# the permission engine rather than an add-then-commit pair the model composes
# per call, and so the three selectors resolve through one shared parser
# (commit-args.sh) instead of once per call site.
#
# Usage:
#   commit.sh <message> [selector]
#
# Contract:
#   argv   : $1 message (REQUIRED) - the commit's message, used verbatim.
#            $2 selector (optional) - what to commit:
#              (empty)/all - every change (staged + unstaged + new files)
#              staged      - only what is already staged
#              <path>      - ONLY that path (a file or a directory), isolated
#                            from any other staged change; POSIX, C:/, C:\ and
#                            /c/ spellings are all accepted (see
#                            commit-args.sh)
#   cwd    : the repository the commit lands in - every git call here runs in
#            the caller's working directory, and a <path> selector resolves
#            against it too.
#   env    : none.
#   stdout : git's own commit line, or the single line "Nothing to commit."
#            when the selected set holds no staged change.
#   exit   : 0 on a commit and on "Nothing to commit." alike. 1 on a missing
#            message (usage on stderr); otherwise git's own non-zero status.
#
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/commit-args.sh"

message="${1:-}"
selector="${2:-}"

if [[ -z "$message" ]]; then
  echo "error: missing required parameter 'message'" >&2
  echo "usage: commit.sh <message> [selector]" >&2
  exit 1
fi

resolve_commit_selector "$selector"

case "$COMMIT_MODE" in
  all)    git add -A ;;
  staged) : ;;  # stage nothing - commit the index as it stands
  path)   git add -- "$COMMIT_PATH" ;;
esac

if [[ "$COMMIT_MODE" == "path" ]]; then
  # that path alone: check it, then commit under the pathspec limit
  if git diff --cached --quiet -- "$COMMIT_PATH"; then
    echo "Nothing to commit."
    exit 0
  fi
  git commit -m "$message" -- "$COMMIT_PATH"
else
  if git diff --cached --quiet; then
    echo "Nothing to commit."
    exit 0
  fi
  git commit -m "$message"
fi
