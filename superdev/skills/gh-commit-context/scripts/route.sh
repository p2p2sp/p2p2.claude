#!/bin/sh
# route.sh — gh-commit-context mode router.
# IN : $1 = raw skill argument ($ARGUMENTS). First whitespace token, lowercased, selects the mode:
#      all → mode-all.md | staged → mode-staged.md | empty/anything else → mode-session.md
# OUT: the chosen references/mode-*.md verbatim on stdout (the playbook injected into the skill body).
# Self-locating via $0 (POSIX) — references resolved relative to this script's own dir, not the host CWD.
set -eu
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ref="$dir/../references"
token=$(printf '%s' "${1:-}" | awk '{print tolower($1)}')
case "$token" in
  all)    cat "$ref/mode-all.md" ;;
  staged) cat "$ref/mode-staged.md" ;;
  *)      cat "$ref/mode-session.md" ;;
esac
