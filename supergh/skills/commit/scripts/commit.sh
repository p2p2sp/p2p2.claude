#!/usr/bin/env bash
#
# commit.sh - runs the git commit with the message it is handed.
#
# It exists so the commit skill's one write to history is a single command to
# the permission engine rather than an add-then-commit pair the model composes
# per call, and so the selectors resolve through one shared parser
# (commit-args.sh) instead of once per call site.
#
# Usage:
#   commit.sh <message> [selector...]
#
# Contract:
#   argv   : $1 message (REQUIRED) - the commit's message, used verbatim.
#            $2.. selector (optional) - what to commit; several args are
#            joined with spaces into one selector string:
#              (empty)/all - every change (modified, new and deleted files)
#              <paths>     - ONLY those paths (files or directories, separated
#                            by whitespace or commas), isolated from any other
#                            staged change; POSIX, C:/, C:\ and /c/ spellings
#                            are all accepted (see commit-args.sh). A path
#                            already staged, removed with "git rm" or tracked
#                            under an ignored directory is committed; an
#                            untracked path an ignore rule covers is not.
#   cwd    : the repository the commit lands in - every git call here runs in
#            the caller's working directory, and a <path> selector resolves
#            against it too.
#   env    : none.
#   stdout : git's own commit line, or the single line "Nothing to commit."
#            when the selected set holds no staged change.
#   exit   : 0 on a commit and on "Nothing to commit." alike. 1 on a missing
#            message (usage on stderr); 3 when the selector names paths and
#            none of them exists (mode 'missing' in commit-args.sh - nothing
#            is committed, never a fallback to every change); otherwise git's
#            own non-zero status.
#
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/commit-args.sh"

message="${1:-}"
selector="${*:2}"

if [[ -z "$message" ]]; then
  echo "error: missing required parameter 'message'" >&2
  echo "usage: commit.sh <message> [selector...]" >&2
  exit 1
fi

resolve_commit_selector "$selector"

if [[ "$COMMIT_MODE" == "missing" ]]; then
  echo "error: none of the named paths exists: $COMMIT_MISSING - nothing committed" >&2
  exit 3
fi

if [[ "$COMMIT_MODE" == "paths" ]]; then
  # One "git add -- <paths>" is not enough: it fails outright on a path already
  # removed with "git rm", and exits 1 on a TRACKED file under a directory an
  # ignore rule covers although it staged the file - either aborts the commit.
  # Tracked paths go through "add -u", which ignore rules never touch; untracked
  # ones only when no ignore rule covers them (never force-added). A path gone
  # from disk and index needs nothing: its deletion is already staged, and the
  # pathspec commit below takes it from HEAD. Only paths git knows afterwards
  # (index or HEAD) enter that pathspec - an ignored untracked one would make
  # "git commit" refuse the whole list.
  known=()
  for p in "${COMMIT_PATHS[@]}"; do
    if [[ -n "$(git ls-files -- "$p")" ]]; then
      git add -u -- "$p"
    fi
    if [[ -e "$p" ]]; then
      new=()
      while IFS= read -r -d '' u; do new+=("$u"); done < <(git ls-files -z -o --exclude-standard -- "$p")
      if [[ ${#new[@]} -gt 0 ]]; then
        git add -- "${new[@]}"
      fi
    fi
    if [[ -n "$(git ls-files -- "$p")" || -n "$(git ls-tree -r --name-only HEAD -- "$p" 2>/dev/null)" ]]; then
      known+=("$p")
    fi
  done
  # those paths alone: check them, then commit under the pathspec limit
  if [[ ${#known[@]} -eq 0 ]] || git diff --cached --quiet -- "${known[@]}"; then
    echo "Nothing to commit."
    exit 0
  fi
  git commit -m "$message" -- "${known[@]}"
else
  git add -A
  if git diff --cached --quiet; then
    echo "Nothing to commit."
    exit 0
  fi
  git commit -m "$message"
fi
