#!/usr/bin/env bash
#
# commit-task.sh - commits one task's work, staging only the declared set.
#
# Usage:
#   commit-task.sh <message> [task-file] [--notes <notes-file>] [--path <path>]...
#
# cwd: irrelevant. The repository root is resolved here and EVERY git call
#      goes through `git -C <root>`, so a session started in a subdirectory
#      stages and commits exactly what one started at the root would. Declared
#      paths are normalised against that same root, absolute and relative
#      forms alike. Outside a repository the commit is skipped with a note on
#      stdout and exit 0, and no cwd matters there either.
#
# Parameters:
#   message     (required) - the commit message.
#   task-file   (optional, positional) - when given, status-update.sh runs on it
#               first (so the status bump rides in this same commit) and every
#               path under its "### Files" section joins the declared set.
#   --notes     (optional) - a notes file; every "touched: <path>" line in it
#               joins the declared set. The declared path is what stands
#               between "touched:" and the first " - " or " (" on that line,
#               whichever comes first, so a reason written after the path on
#               the same line does not corrupt the declaration; a value that
#               cuts to nothing declares nothing. A path whose own name carries
#               " - " or " (" is cut there too - a reason is the far likelier
#               reading. That cut lives in lib_touched.sh, the one reader of a
#               notes file's declarations, so the parse behind the staged set
#               has a single home and a test of its own.
#   --path      (optional, repeatable) - one more path for the declared set; a
#               directory declares everything below it. A literal path, never a
#               git pathspec: it is normalised, checked for existence and
#               matched by prefix, so a magic pathspec (":(exclude)x", a glob)
#               is dropped as a path that does not exist. A fresh repository's
#               initial commit declares its whole tree with `--path .`; there is
#               no flag that stages without a declared path.
#
# Declared set:
#   the "### Files" paths + the "touched:" paths + every --path value + the run
#   directory (the parent of the parent of the task file, or of the notes file).
#   Paths are read as repository-root relative; an absolute path inside the
#   repository is reduced to one, and a backslash separator to "/". A declared
#   path that neither exists nor is tracked is dropped, so a planned but never
#   created file does not abort the commit; anything under .temp/ is dropped too.
#
# Behaviour:
#   - outside a git repository (or with no working tree) -> the status bump
#     (see below) is written, then "Not a git repository - skipping commit."
#     and exit 0
#   - any change in the working tree outside the declared set - a modified or
#     deleted tracked file, an untracked file .gitignore does not cover - is
#     reported as one "undeclared: <path>" line per path on stdout, with
#     "error: undeclared changes in the working tree - nothing committed" on
#     stderr and exit 2: nothing is staged and nothing is committed. Paths under
#     .temp/ are ignored here whatever the host's .gitignore says. That refusal
#     also lists every declared path that was dropped (see "Declared set"
#     above), one "dropped: <path>" line per path on stdout after the
#     "undeclared:" lines and before the stderr error - so the reader can tell a
#     malformed declaration from a missing one. A run that gets as far as
#     staging prints no such line.
#   - task-file given -> status-update.sh <task-file> (writes the task number
#     to <workdir>/status.md) runs only once the run is past the undeclared
#     check and about to stage, so the bump lands in this commit and never
#     survives a refusal: status.md is the build's only resume marker, and a
#     bump left behind by an exit 2 marks a task done that was never committed
#     and never reviewed
#   - otherwise stage the declared set only, never .temp/; an empty index ->
#     "Nothing to commit.", else `git commit -m <message>` followed by the line
#     "commit: <sha>" as the last line on stdout.
#
# Exit codes:
#   0  committed / nothing to commit / not a git repository
#   1  missing message, unknown argument, or a failed status bump
#   2  undeclared changes in the working tree
#
# Every git call runs through `git -C <repository root>`, so the result does not
# depend on the directory the caller was started in.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# The declared set's reader - `trim`, `normalise_path` and `touched_paths`.
# The "touched:" cut rule documented above lives there.
source "$(dirname "${BASH_SOURCE[0]}")/lib_touched.sh"

usage() {
  echo "usage: commit-task.sh <message> [task-file] [--notes <notes-file>] [--path <path>]..." >&2
}

message="${1:-}"

if [[ -z "$message" ]]; then
  echo "error: missing required parameter 'message'" >&2
  usage
  exit 1
fi
shift

task=""
notes=""
extra_paths=()

# The optional positional task-file, kept for the existing callers; an option
# in its place means no task file was passed.
if [[ $# -gt 0 && "$1" != --* ]]; then
  task="$1"
  shift
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --notes)
      if [[ $# -lt 2 ]]; then
        echo "error: --notes requires a <notes-file>" >&2
        usage
        exit 1
      fi
      notes="$2"
      shift 2
      ;;
    --path)
      if [[ $# -lt 2 ]]; then
        echo "error: --path requires a <path>" >&2
        usage
        exit 1
      fi
      extra_paths+=("$2")
      shift 2
      ;;
    *)
      echo "error: unknown argument '$1'" >&2
      usage
      exit 1
      ;;
  esac
done

# The commit is best-effort. Outside a git repository there is nothing to commit
# to and the task's work is already on disk - so skip it and exit clean, instead
# of letting `set -e` turn git's exit 128 into a failed task that stops the
# implementation loop mid-build. A repository with no working tree (a bare one)
# takes the same exit: there is nothing to stage from.
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  # No commit will ever record this task here, so the resume marker is the only
  # record there is - and this path ends clean, so writing it cannot outlive a
  # refusal the way the old unconditional bump did.
  if [[ -n "$task" ]]; then
    "$SCRIPT_DIR/status-update.sh" "$task"
  fi
  echo "Not a git repository - skipping commit."
  exit 0
fi

root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
root="${root%/}"
if [[ -z "$root" ]]; then
  echo "Not a git repository - skipping commit."
  exit 0
fi

declared=()
declare_all=0

add_declared() {
  local p
  p="$(normalise_path "$1")"
  if [[ -z "$p" ]]; then
    return 0
  fi
  if [[ "$p" == "." ]]; then
    declare_all=1
    return 0
  fi
  # .temp/ is machine state, never part of a commit - whatever the host's
  # .gitignore says about it.
  if [[ "$p" == ".temp" || "$p" == .temp/* ]]; then
    return 0
  fi
  declared+=("$p")
}

# Every "### Files" bullet of the task file: "- <verb> - <path> (<symbol>)".
if [[ -n "$task" && -f "$task" ]]; then
  in_files=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    case "$line" in
      '### Files'*)
        in_files=1
        continue
        ;;
      '#'*)
        in_files=0
        continue
        ;;
    esac
    if [[ $in_files -eq 0 ]]; then
      continue
    fi
    entry="$(trim "$line")"
    case "$entry" in
      -\ *|\*\ *)
        entry="$(trim "${entry#?}")"
        ;;
      *)
        continue
        ;;
    esac
    # drop the verb, then the trailing " (<symbol>)" comment
    case "$entry" in
      add\ -\ *|modify\ -\ *|delete\ -\ *|create\ -\ *|remove\ -\ *|update\ -\ *)
        entry="${entry#* - }"
        ;;
    esac
    entry="${entry%% (*}"
    add_declared "$entry"
  done < "$task"
fi

# Every "touched: <path>" line of the notes file, read by the shared parser;
# the .temp/ drop and the "." handling above are this script's own policy on
# top of it.
if [[ -n "$notes" ]]; then
  while IFS= read -r declared_path; do
    add_declared "$declared_path"
  done < <(touched_paths "$notes")
fi

# The run directory itself - reports and status.md live there.
if [[ -n "$task" ]]; then
  add_declared "$(dirname "$(dirname "$task")")"
fi
if [[ -n "$notes" ]]; then
  add_declared "$(dirname "$(dirname "$notes")")"
fi

for extra in ${extra_paths[@]+"${extra_paths[@]}"}; do
  add_declared "$extra"
done

# A declared path that git cannot take: never created, or ignored and untracked.
# Dropping it here keeps `git add` from aborting the whole commit over it. Each
# one is remembered so a refused commit can name it below.
stageable=()
stageable_count=0
dropped=()
for p in ${declared[@]+"${declared[@]}"}; do
  if git -C "$root" ls-files --error-unmatch -- "$p" >/dev/null 2>&1; then
    stageable+=("$p")
    stageable_count=$((stageable_count + 1))
    continue
  fi
  if [[ ! -e "$root/$p" ]]; then
    dropped+=("$p")
    continue
  fi
  if git -C "$root" check-ignore -q -- "$p" >/dev/null 2>&1; then
    dropped+=("$p")
    continue
  fi
  stageable+=("$p")
  stageable_count=$((stageable_count + 1))
done

is_declared() {
  local target="$1" d
  if [[ $declare_all -eq 1 ]]; then
    return 0
  fi
  for d in ${declared[@]+"${declared[@]}"}; do
    if [[ "$target" == "$d" || "$target" == "$d"/* ]]; then
      return 0
    fi
  done
  return 1
}

# Porcelain v1 prints repository-root relative paths, NUL terminated; a rename
# or copy entry is followed by one more record holding its other path.
undeclared=()
undeclared_count=0
while IFS= read -r -d '' entry; do
  changed="${entry:3}"
  other=""
  case "${entry:0:1}" in
    R|C)
      IFS= read -r -d '' other || other=""
      ;;
  esac
  for candidate in "$changed" ${other:+"$other"}; do
    if [[ -z "$candidate" ]]; then
      continue
    fi
    if [[ "$candidate" == ".temp" || "$candidate" == .temp/* ]]; then
      continue
    fi
    if is_declared "$candidate"; then
      continue
    fi
    undeclared+=("$candidate")
    undeclared_count=$((undeclared_count + 1))
  done
done < <(git -C "$root" status --porcelain=v1 --untracked-files=all -z)

if [[ $undeclared_count -gt 0 ]]; then
  for p in "${undeclared[@]}"; do
    echo "undeclared: $p"
  done
  # Nothing gets committed now, so name the declarations that could not be
  # staged either: a path that matched no file is usually a declaration whose
  # line shape was wrong, not one the implementor forgot to write.
  for p in ${dropped[@]+"${dropped[@]}"}; do
    echo "dropped: $p"
  done
  echo "error: undeclared changes in the working tree - nothing committed" >&2
  exit 2
fi

# The resume marker is written HERE, past the exit 2 above and before the
# staging below: status.md is the build's only resume marker, and a bump that
# survives a refused commit leaves the task marked done, never committed and
# never reviewed - decompose.sh reads it back and both orchestrators then start
# above that number. Writing it now still puts it in this commit: status.md
# sits under the run directory, which is already in the declared set, and the
# undeclared scan above has already run, so its own change is never flagged.
if [[ -n "$task" ]]; then
  "$SCRIPT_DIR/status-update.sh" "$task"
fi

if [[ $declare_all -eq 1 ]]; then
  git -C "$root" add -A -- ':/' ':(exclude,top).temp'
elif [[ $stageable_count -gt 0 ]]; then
  # No exclude pathspec here on purpose: git stops matching a directory
  # pathspec as soon as any exclude joins it, and .temp/ is already out of the
  # declared set.
  git -C "$root" add -A -- ${stageable[@]+"${stageable[@]}"}
fi

if git -C "$root" diff --cached --quiet; then
  echo "Nothing to commit."
else
  git -C "$root" commit -m "$message"
  echo "commit: $(git -C "$root" rev-parse HEAD)"
fi
