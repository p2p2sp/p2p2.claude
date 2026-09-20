#!/usr/bin/env bash
#
# plan-path.sh - resolves the plan file of a build, and on --land puts the
# approved plan there. One dated directory per run:
# docs/_specs/<yyyy-mm-dd-HH-mm-ss>_<slug>/plan.md, the stamp being the moment
# the plan is landed. The decomposition plan-index.sh --split writes (spec.md
# and tasks/T<n>.md) lands in that same directory, so one run is one directory
# and one key.
#
# Usage:
#   plan-path.sh --land <src>   land <src> as this run's plan
#   plan-path.sh                no argument: the plan most recently worked on
#
# <src> is the approved plan as plan mode wrote it. Its directory is a user-level
# setting ("plansDirectory"), so the file normally sits OUTSIDE this repository:
# it is copied, never moved, and the source is left untouched. The slug comes
# from the plan's own first H1, falling back to its file name, and is normalized
# here - lowercased, every other run of characters collapsed to "-", 60 chars
# max - so no caller has to form one.
#
# Contract:
#   argv   : --land and the source plan, or nothing.
#   cwd    : the repository root - every path printed is relative to it, and the
#            caller splits and stages those paths from there.
#   env    : none.
#   stdout :
#     path: docs/_specs/2026-09-19-17-30-00_add-login/plan.md
#     key: 2026-09-19-17-30-00_add-login
#     state: new | existing
#   exit != 0:
#     2 - unusable argv: an unknown first argument, --land without a source, a
#         source that is not a file, or a slug that normalizes to nothing
#     3 - no argument and docs/_specs/ holds no plan
#     5 - the copy failed; nothing was landed
#
# "new"      - the plan was just copied in, so this run starts here.
# "existing" - a run already open for that slug, carrying its own progress in the
#              plan's own done markers. It is NEVER overwritten: a source edited
#              after the build started does not reach it, because the landed plan
#              is the state. A <src> that already IS a landed plan answers the
#              same way, which makes --land idempotent.
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

mode="${1:-}"

# --- no argument: whichever plan was touched last ---
if [[ -z "$mode" ]]; then
  found="$(printf '%s\n' "$specs_dir"/*/plan.md | newest)"
  if [[ -z "$found" ]]; then
    echo "error: no plan under $specs_dir - land the approved plan first: plan-path.sh --land <src>" >&2
    exit 3
  fi
  emit "$found" existing
  exit 0
fi

if [[ "$mode" != "--land" ]]; then
  echo "error: usage: plan-path.sh [--land <src>], got: $mode" >&2
  exit 2
fi

src="${2:-}"
if [[ -z "$src" ]]; then
  echo "error: usage: plan-path.sh --land <src>" >&2
  exit 2
fi
if [[ ! -f "$src" ]]; then
  echo "error: plan file not found: $src" >&2
  exit 2
fi

# Already landed? The source's own directory, resolved, against docs/_specs - so
# a relative, an absolute and a native Windows path all answer alike, and
# re-landing a plan that is already in place is a no-op rather than a second run.
src_dir="$(cd -- "$(dirname -- "$src")" 2>/dev/null && pwd -P || true)"
if [[ "$(basename -- "$src")" == "plan.md" && -n "$src_dir" && -d "$specs_dir" ]]; then
  specs_abs="$(cd -- "$specs_dir" 2>/dev/null && pwd -P || true)"
  if [[ -n "$specs_abs" && "${src_dir%/*}" == "$specs_abs" ]]; then
    emit "$specs_dir/${src_dir##*/}/plan.md" existing
    exit 0
  fi
fi

# The slug: the plan's own title, or its file name when it carries no H1.
title="$(awk '/^#[[:space:]]/ { sub(/^#[[:space:]]+/, ""); sub(/\r$/, ""); print; exit }' "$src")"
if [[ -z "$title" ]]; then
  base="$(basename -- "$src")"
  title="${base%.md}"
fi

slug="$(
  printf '%s' "$title" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -e 's/[^a-z0-9]\{1,\}/-/g' -e 's/^-*//' -e 's/-*$//' \
    | cut -c1-60 \
    | sed -e 's/-*$//'
)"

if [[ -z "$slug" ]]; then
  echo "error: slug is empty after normalization: $title" >&2
  exit 2
fi

# --- a run already open for that slug: its progress is the state, leave it ---
found="$(printf '%s\n' "$specs_dir"/*_"$slug"/plan.md | newest)"
if [[ -n "$found" ]]; then
  emit "$found" existing
  exit 0
fi

dest="$specs_dir/$(date +%Y-%m-%d-%H-%M-%S)_$slug/plan.md"
if ! mkdir -p -- "${dest%/*}" || ! cp -- "$src" "$dest"; then
  rmdir -- "${dest%/*}" 2>/dev/null || true
  echo "error: could not land the plan at $dest" >&2
  exit 5
fi
emit "$dest" new
