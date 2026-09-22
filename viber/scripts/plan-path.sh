#!/usr/bin/env bash
#
# plan-path.sh - resolves the plan file of a build, and on --land puts the
# approved plan there. One dated directory per run:
# docs/_specs/<yyyy-mm-dd-HH-mm-ss>_<slug>/plan.md, the stamp being the moment
# the plan is landed. The decomposition plan-index.sh --split writes (spec.md
# and tasks/T<n>.md) lands in that same directory, so one run is one directory
# and one key.
#
# `_specs` is the DEFAULT name of that directory, not a fixed one: `runs` inside
# the `directories:` group of .claude/viber.yml renames it, resolved here the
# same way config.sh resolves it and fail-open on anything unusable, so every
# example below reads docs/<runs>/ for a project that set the key.
#
# Usage:
#   plan-path.sh --land <src>              land <src> as this run's plan
#   plan-path.sh --land <src> --into <key> land <src> into that existing draft
#   plan-path.sh                           no argument: the plan most recently
#                                          worked on
#
# <src> is the approved plan as plan mode wrote it. Its directory is a user-level
# setting ("plansDirectory"), so the file normally sits OUTSIDE this repository:
# it is copied, never moved, and the source is left untouched. The slug comes
# from the plan's own first H1, falling back to its file name, and is normalized
# here - lowercased, every other run of characters collapsed to "-", 60 chars
# max - so no caller has to form one. The copy is stripped of the template's
# guidance comments on the way in: everything the run itself reads stays
# (<!-- TASK -->, <!-- /TASK -->, <!-- source: -->), the rest would only ride
# through spec.md and every task file into the build.
#
# --into names ONE directory under docs/<runs>/ - no slash, no "." and no ".." -
# and that directory has to be a DRAFT: a run whose plan carries not one task
# block, so nothing was ever built from it. The round lands over it in place,
# keeping the key and the stamp, which is what lets a draft go through several
# rounds of remarks and still be one run. A target that already started building
# is refused rather than overwritten.
#
# Contract:
#   argv   : --land and the source plan, optionally --into and a run key, or
#            nothing.
#   cwd    : the repository root - every path printed is relative to it, and the
#            caller splits and stages those paths from there. The config file is
#            read from there too, as .claude/viber.yml.
#   env    : none.
#   stdout :
#     path: docs/_specs/2026-09-19-17-30-00_add-login/plan.md
#     key: 2026-09-19-17-30-00_add-login
#     state: new | existing | draft
#     open: docs/_specs/2026-09-18-09-12-44_add-search/plan.md | 2/6
#   exit != 0:
#     2 - unusable argv: an unknown first argument, --land without a source, a
#         source that is not a file, a slug that normalizes to nothing, or an
#         --into key that is empty, carries a slash or a traversal, or names no
#         directory under docs/<runs>/
#     3 - no argument and docs/_specs/ holds no plan
#     4 - --into on a target that is not a draft; nothing was written
#     5 - the copy failed; nothing was landed
#
# One "open:" line per OTHER run still holding a task that is neither committed
# nor skipped - the resolved run is never among them, and a repository with
# nothing else half-built prints none. The counter shown is committed over total,
# so a run closed by dropping its last task reads as finished and disappears.
# A build resumes from the plan it was given; a second run left unfinished is the
# one thing the caller cannot see for itself, and it decides whether landing this
# plan is a switch or a fresh start. Progress is read the same way everywhere: the
# done list out of the run's status.md, the total out of the plan's own TASK
# blocks.
#
# "new"      - the plan was just copied in, so this run starts here.
# "existing" - a run already open for that slug, carrying its own progress in the
#              status.md beside its plan. It is NEVER overwritten: a source edited
#              after the build started does not reach it, because the landed run
#              is the state. A <src> that already IS a landed plan answers the
#              same way, which makes --land idempotent.
# "draft"    - "state: draft", the run's plan carrying not one task block, so
#              there is nothing to build yet: a specification still being
#              discussed and rounds away from a task list. It replaces both
#              answers above, because what a caller does with a draft is the same
#              whether it was just landed or found in place. A draft is also never
#              an "open:" line - it holds no task to resume.
#
set -euo pipefail
shopt -s nullglob

# The runs directory, named by `runs` inside the `directories:` group of
# .claude/viber.yml and defaulting to `_specs`. Read exactly as config.sh reads
# it: only inside that group, and one path segment rather than a path, so a
# value carrying a slash, a traversal or an absolute path leaves the default
# standing instead of moving the run directory out of docs/.
runs_dir="_specs"
if [[ -f .claude/viber.yml ]]; then
  configured="$(awk '
/^[^[:space:]#]/ { ingroup = ($0 ~ /^directories[[:space:]]*:/); next }
ingroup && /^[[:space:]]+runs[[:space:]]*:/ {
  sub(/^[^:]*:[[:space:]]*/, "")
  sub(/[[:space:]#].*$/, "")
  print
  exit
}
' .claude/viber.yml)"
  case "$configured" in
    ''|.|..|*[!A-Za-z0-9._-]*) ;;
    *) runs_dir="$configured" ;;
  esac
fi
specs_dir="docs/$runs_dir"

# Modification time of a file, 0 when it is missing or unreadable.
mtime() {
  t="$(stat -c %Y "$1" 2>/dev/null || stat -f %m "$1" 2>/dev/null || echo 0)"
  case "$t" in ''|*[!0-9]*) t=0 ;; esac
  printf '%s\n' "$t"
}

# Newest by mtime of the paths on stdin; non-files are skipped, so a non-matching
# glob and a name that does not exist both drop out here. A landed plan is frozen,
# so "most recently worked on" is the later of the plan and the status file beside
# it - the one file every commit of that run rewrites.
newest() {
  best=""
  best_t=-1
  while IFS= read -r f; do
    [[ -f "$f" ]] || continue
    t="$(mtime "$f")"
    s="$(mtime "${f%/*}/status.md")"
    if [[ "$s" -gt "$t" ]]; then t="$s"; fi
    if [[ "$t" -gt "$best_t" ]]; then
      best_t="$t"
      best="$f"
    fi
  done
  printf '%s\n' "$best"
}

# "<done> <settled> <total>" for one run: the done and skipped lists out of the
# status file beside the plan, the total out of the plan's own TASK blocks. A run
# that never reached its first commit carries no status file and comes back with
# nothing done. "settled" counts the dropped tasks too - a run whose every task
# is either committed or skipped has nothing left to build.
progress_of() {
  awk -v st="${1%/*}/status.md" '
/<!--[[:space:]]*TASK[[:space:]]*-->/ { n++ }
END {
  while ((getline line < st) > 0) {
    if (line !~ /^done:/ && line !~ /^skipped:/) continue
    isdone = (line ~ /^done:/)
    sub(/^[A-Za-z]+:/, "", line)
    m = split(line, v, /[[:space:]]+/)
    for (k = 1; k <= m; k++) {
      if (v[k] == "" || v[k] == "none" || v[k] == "-") continue
      s++
      if (isdone) d++
    }
  }
  close(st)
  printf "%d %d %d\n", d + 0, s + 0, n + 0
}
' "$1"
}

# The landed plan, without the guidance the template carries for whoever writes
# it: those comments have done their work by the time the plan is approved, and
# they would otherwise ride into spec.md, into every task file and through the
# whole build. Only the markers the run itself reads survive - <!-- TASK -->,
# <!-- /TASK --> and <!-- source: --> - and a comment block spanning several
# lines goes whole. Blank runs left behind collapse to one, so the result reads
# like a plan written without them. In place, on the COPY only.
strip_guidance() {
  tmp="$1.tmp.$$"
  awk '
function trim(s) { sub(/^[[:space:]]+/, "", s); sub(/[[:space:]]+$/, "", s); return s }
{
  t = trim($0)
  if (inblock) { if (t ~ /-->/) inblock = 0; next }
  if (t ~ /^<!--/ && t !~ /^<!--[[:space:]]*\/?TASK[[:space:]]*-->$/ && t !~ /^<!--[[:space:]]*source:/) {
    if (t !~ /-->/) inblock = 1
    next
  }
  if (t == "") { blank = 1; next }
  if (blank && NR > 1 && kept) print ""
  blank = 0; kept = 1
  print
}
' "$1" > "$tmp" && mv -f "$tmp" "$1"
  rm -f "$tmp"
}

# Does that plan carry at least one task block? A plan without one is a draft:
# the head alone, still being discussed. "<!-- /TASK -->" cannot match here - the
# slash sits where the pattern wants "TASK".
has_tasks() {
  grep -q '<!--[[:space:]]*TASK[[:space:]]*-->' "$1" 2>/dev/null
}

emit() {
  d="${1%/*}"
  state="$2"
  has_tasks "$1" || state="draft"
  printf 'path: %s\n' "$1"
  printf 'key: %s\n' "${d##*/}"
  printf 'state: %s\n' "$state"
  # every OTHER run still holding unfinished tasks, so the caller can tell a
  # switch from a fresh start without reading a single file itself
  for f in "$specs_dir"/*/plan.md; do
    [[ -f "$f" ]] || continue
    [[ "$f" == "$1" ]] && continue
    read -r pdone psettled ptotal <<<"$(progress_of "$f")"
    if [[ "$psettled" -lt "$ptotal" ]]; then
      printf 'open: %s | %s/%s\n' "$f" "$pdone" "$ptotal"
    fi
  done
  return 0
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

# --- --into: the next round of a draft, into the directory it already has ---
if [[ $# -gt 2 ]]; then
  if [[ "${3:-}" != "--into" || $# -gt 4 ]]; then
    echo "error: usage: plan-path.sh --land <src> [--into <key>]" >&2
    exit 2
  fi
  into="${4:-}"
  case "$into" in
    ''|.|..|*[!A-Za-z0-9._-]*)
      echo "error: --into takes one directory name under $specs_dir, got: $into" >&2
      exit 2
      ;;
  esac
  dest="$specs_dir/$into/plan.md"
  if [[ ! -d "$specs_dir/$into" ]]; then
    echo "error: no run directory to land into: $specs_dir/$into" >&2
    exit 2
  fi
  # A target that already started building is the state; a round landed over it
  # would drop work the tree cannot give back.
  if [[ -e "$specs_dir/$into/status.md" || -d "$specs_dir/$into/tasks" ]] \
    || { [[ -f "$dest" ]] && has_tasks "$dest"; }; then
    echo "error: $specs_dir/$into is not a draft - it carries tasks, a decomposition or progress" >&2
    exit 4
  fi
  # the round landed from the run's own plan: nothing to copy, and cp would
  # refuse the file onto itself
  src_dir="$(cd -- "$(dirname -- "$src")" 2>/dev/null && pwd -P || true)"
  dest_dir="$(cd -- "$specs_dir/$into" 2>/dev/null && pwd -P || true)"
  if [[ "$(basename -- "$src")" == "plan.md" && -n "$src_dir" && "$src_dir" == "$dest_dir" ]]; then
    emit "$dest" existing
    exit 0
  fi
  if ! cp -- "$src" "$dest"; then
    echo "error: could not land the plan at $dest" >&2
    exit 5
  fi
  strip_guidance "$dest"
  emit "$dest" new
  exit 0
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
strip_guidance "$dest"
emit "$dest" new
