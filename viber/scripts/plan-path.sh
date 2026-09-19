#!/usr/bin/env bash
#
# plan-path.sh - resolves the plan file of a build. One dated directory per plan:
# docs/plans/<yyyy-mm-dd-HH-mm-ss>_<slug>/plan.md, the stamp being the moment the
# plan is landed.
#
# Usage:
#   plan-path.sh <slug>   a plan to land: the run already open for that slug, or a new one
#   plan-path.sh          no slug: the plan most recently worked on
#
# <slug> is normalized here - lowercased, every other run of characters collapsed to
# "-", 60 chars max - so the caller may hand over the plan title as it stands.
#
# stdout:
#   path: docs/plans/2026-09-19-17-30-00_add-login/plan.md
#   key: 2026-09-19-17-30-00_add-login
#   state: new | existing
#
# "new"      - nothing on disk yet: the caller writes the plan to that path.
# "existing" - a build under way carrying its own progress: take it as it stands.
# A plan from the earlier flat layout (docs/plans/<slug>.md) counts as existing, and
# its key is the filename without the extension.
#
# exit != 0:
#   2 - the slug normalizes to nothing
#   3 - no slug given and docs/plans/ holds no plan
#
set -euo pipefail
shopt -s nullglob

plans_dir="docs/plans"

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

key_of() {
  d="${1%/*}"
  b="${1##*/}"
  if [[ "$b" == "plan.md" ]]; then printf '%s\n' "${d##*/}"; else printf '%s\n' "${b%.md}"; fi
}

emit() {
  printf 'path: %s\n' "$1"
  printf 'key: %s\n' "$(key_of "$1")"
  printf 'state: %s\n' "$2"
}

slug_in="${1:-}"

# --- no slug: whichever plan was touched last ---
if [[ -z "$slug_in" ]]; then
  found="$(printf '%s\n' "$plans_dir"/*/plan.md "$plans_dir"/*.md | newest)"
  if [[ -z "$found" ]]; then
    echo "error: no plan under $plans_dir" >&2
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
found="$(printf '%s\n' "$plans_dir"/*_"$slug"/plan.md "$plans_dir/$slug.md" | newest)"
if [[ -n "$found" ]]; then
  emit "$found" existing
  exit 0
fi

emit "$plans_dir/$(date +%Y-%m-%d-%H-%M-%S)_$slug/plan.md" new
