#!/usr/bin/env bash
#
# plan-path.sh - resolves the plan file of a build. One dated directory per run:
# docs/_specs/<yyyy-mm-dd-HH-mm-ss>_<slug>/plan.md, the stamp being the moment
# the plan is landed. The decomposition plan-index.sh --split writes (spec.md
# and tasks/T<n>.md) lands in that same directory, so one run is one directory
# and one key.
#
# Usage:
#   plan-path.sh <slug>   a plan to land: the run already open for that slug, or a new one
#   plan-path.sh          no slug: the plan most recently worked on
#
# <slug> is normalized here - lowercased, every other run of characters collapsed to
# "-", 60 chars max - so the caller may hand over the plan title as it stands.
#
# Contract:
#   argv   : the plan's slug, or nothing.
#   cwd    : the repository root - every path printed is relative to it, and the
#            caller writes and stages those paths from there.
#   env    : none.
#   stdout :
#     path: docs/_specs/2026-09-19-17-30-00_add-login/plan.md
#     key: 2026-09-19-17-30-00_add-login
#     state: new | existing
#   exit != 0:
#     2 - the slug normalizes to nothing
#     3 - no slug given and docs/_specs/ holds no plan
#
# "new"      - nothing on disk yet: the caller writes the plan to that path.
# "existing" - a run under way carrying its own progress: take it as it stands.
#
set -euo pipefail
shopt -s nullglob

specs_dir="docs/_specs"

# Newest by mtime of the paths on stdin; non-files are skipped, so a non-matching
# glob and a name that does not exist both drop out here.
newest() {
  best=""
  best_t=-1
  while IFS= read -r f; do
    [[ -f "$f" ]] || continue
    t="$(stat -c %Y "$f" 2>/dev/null || stat -f %m "$f" 2>/dev/null || echo 0)"
    case "$t" in ''|*[!0-9]*) t=0 ;; esac
    if [[ "$t" -gt "$best_t" ]]; then
      best_t="$t"
      best="$f"
    fi
  done
  printf '%s\n' "$best"
}

emit() {
  d="${1%/*}"
  printf 'path: %s\n' "$1"
  printf 'key: %s\n' "${d##*/}"
  printf 'state: %s\n' "$2"
}

slug_in="${1:-}"

# --- no slug: whichever plan was touched last ---
if [[ -z "$slug_in" ]]; then
  found="$(printf '%s\n' "$specs_dir"/*/plan.md | newest)"
  if [[ -z "$found" ]]; then
    echo "error: no plan under $specs_dir" >&2
    exit 3
  fi
  emit "$found" existing
  exit 0
fi

slug="$(
  printf '%s' "$slug_in" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -e 's/[^a-z0-9]\{1,\}/-/g' -e 's/^-*//' -e 's/-*$//' \
    | cut -c1-60 \
    | sed -e 's/-*$//'
)"

if [[ -z "$slug" ]]; then
  echo "error: slug is empty after normalization: $slug_in" >&2
  exit 2
fi

# --- a run already open for that slug ---
found="$(printf '%s\n' "$specs_dir"/*_"$slug"/plan.md | newest)"
if [[ -n "$found" ]]; then
  emit "$found" existing
  exit 0
fi

emit "$specs_dir/$(date +%Y-%m-%d-%H-%M-%S)_$slug/plan.md" new
