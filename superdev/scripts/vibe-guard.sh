#!/usr/bin/env bash
#
# vibe-guard.sh - measures ONE vibe run's declared delta and reports whether it
# stays inside the track's fixed size thresholds and clear of the host's
# sensitive paths.
#
# Usage:
#   vibe-guard.sh <notes-file> [--sensitive <glob>]...
#
# Parameters:
#   notes-file  (required, positional) - the run's notes file. Every
#               "touched: <path>" line in it declares one path of the measured
#               set. The declared path is what stands between "touched:" and
#               the first " - " or " (" on that line, whichever comes first -
#               the cut rule lib_touched.sh implements for this script and for
#               commit-task.sh alike, so one notes file measures here exactly
#               as it stages there; a value that cuts to nothing declares
#               nothing. Duplicates collapse, first occurrence order kept.
#   --sensitive (optional, repeatable) - one shell glob, read by the caller out
#               of the host's own memory. It is matched as a bash `case`
#               pattern against a repository-relative path ("*" crosses "/",
#               the value is a glob and never a regex), never expanded against
#               the filesystem and never passed to `eval`. It must be
#               non-empty and free of newline and carriage return.
#
# Measured set:
#   Every declared path is read as repository-root relative (an absolute path
#   inside the repository is reduced to one, a backslash separator to "/") and
#   classified against the repository, every git call made from its root:
#     - an existing directory, or a path that neither exists nor is tracked
#       -> dropped: one "dropped: <path>" line, counted nowhere
#     - tracked (`git ls-files --error-unmatch`) -> counted once under
#       "files:", its lines the added plus the deleted column of
#       `git diff --numstat HEAD -- <path>` (a "-" column, i.e. a binary file,
#       counts 0)
#     - untracked but an existing regular file -> new: counted once under
#       "new:" AND once under "files:", its lines as `awk 'END{print NR}'`
#       prints them (a last line with no trailing newline counts, the way
#       numstat would count it)
#   Everything is measured against HEAD and nothing else: an earlier
#   uncommitted change to a file this run did not declare is invisible here.
#
# Thresholds (fixed for every host - there is no configuration):
#   MAX_FILES=5, MAX_NEW=1, MAX_LINES=200; exceeded means strictly greater.
#
# Output - stdout, in this order:
#   files: <n>
#   new: <n>
#   lines: <n>
#   dropped: <path>      zero or more, first occurrence order
#   sensitive: <path>    zero or more, one per COUNTED path matching any
#                        --sensitive glob (once per path, however many globs
#                        hit), first occurrence order
#   RESULT: OK                              nothing exceeded, nothing sensitive
#   RESULT: OVER - <reason>[; <reason>]     reasons joined by "; " in the fixed
#                                           order "files <n> > 5",
#                                           "new <n> > 1", "lines <n> > 200",
#                                           "sensitive <path>" (one per hit)
#   RESULT: ERROR - <reason>                the only line an error prints
#
# The guard advises, it does not gate: OVER is a finding for the caller to put
# to the user, never a refusal - hence exit 0 for it too.
#
# Exit codes:
#   0  RESULT: OK / RESULT: OVER
#   1  RESULT: ERROR - notes file not found: <path>   (the argument is missing,
#                                                      names no file, or names
#                                                      one that cannot be read;
#                                                      <path> is empty when the
#                                                      argument itself is
#                                                      missing)
#      RESULT: ERROR - not a git repository
#      RESULT: ERROR - invalid --sensitive value
#      RESULT: ERROR - unknown argument: <arg>
#
# Every git call runs through `git -C <repository root>`, so the measurement
# does not depend on the directory the caller was started in.
#
set -u

# The declared set's reader - `trim`, `normalise_path` and `touched_paths` -
# shared with commit-task.sh, so this script measures exactly the paths that
# one stages. The cut rule documented above lives there and nowhere else.
source "$(dirname "${BASH_SOURCE[0]}")/lib_touched.sh"

MAX_FILES=5
MAX_NEW=1
MAX_LINES=200

# The one error exit: the RESULT line on stdout and nothing else anywhere.
fail() {
  echo "RESULT: ERROR - $1"
  exit 1
}

notes=""
notes_seen=0
globs=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --sensitive)
      if [[ $# -lt 2 ]]; then
        fail "invalid --sensitive value"
      fi
      # A newline or a carriage return would split one glob into two lines of
      # whatever reads this script's caller; an empty one would match nothing
      # and hide a memory the caller misread. ANSI-C quoting, never
      # `$(printf '\n')` - command substitution strips the trailing newline and
      # would leave the pattern matching everything.
      if [[ -z "$2" || "$2" == *$'\n'* || "$2" == *$'\r'* ]]; then
        fail "invalid --sensitive value"
      fi
      globs+=("$2")
      shift 2
      ;;
    --*)
      fail "unknown argument: $1"
      ;;
    *)
      if [[ $notes_seen -eq 1 ]]; then
        fail "unknown argument: $1"
      fi
      notes="$1"
      notes_seen=1
      shift
      ;;
  esac
done

# `-f` alone answers "is there a file"; the `:` redirection answers "can this
# account open it", which is the question on a host whose permission model the
# shell's own -r test reads only approximately.
if [[ -z "$notes" || ! -f "$notes" ]] || ! { : < "$notes"; } 2>/dev/null; then
  fail "notes file not found: $notes"
fi

root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
root="${root%/}"
if [[ -z "$root" ]]; then
  fail "not a git repository"
fi

declared=()

add_declared() {
  local p d
  p="$(normalise_path "$1")"
  if [[ -z "$p" ]]; then
    return 0
  fi
  for d in ${declared[@]+"${declared[@]}"}; do
    if [[ "$d" == "$p" ]]; then
      return 0
    fi
  done
  declared+=("$p")
}

# Every "touched: <path>" line of the notes file, bulleted or bare, read by the
# shared parser; the dedupe above is this script's own policy on top of it.
while IFS= read -r declared_path; do
  add_declared "$declared_path"
done < <(touched_paths "$notes")

# The added plus the deleted column of every numstat record for one tracked
# path. A "-" column is git's own mark for a file it diffs as binary, and
# counts 0 - there is no line count to add.
tracked_lines() {
  local p="$1" added deleted rest total=0
  while read -r added deleted rest; do
    if [[ ! "$added" =~ ^[0-9]+$ ]]; then
      added=0
    fi
    if [[ ! "$deleted" =~ ^[0-9]+$ ]]; then
      deleted=0
    fi
    total=$((total + added + deleted))
  done < <(git -C "$root" diff --numstat HEAD -- "$p" 2>/dev/null)
  printf '%s' "$total"
}

# A new file has no numstat record to read, so its own line count stands in for
# one: awk's NR counts a last line with no trailing newline, as numstat would.
file_lines() {
  local n
  n="$(awk 'END{print NR}' < "$root/$1" 2>/dev/null || true)"
  if [[ ! "$n" =~ ^[0-9]+$ ]]; then
    n=0
  fi
  printf '%s' "$n"
}

is_sensitive() {
  local p="$1" glob
  for glob in ${globs[@]+"${globs[@]}"}; do
    # Unquoted on purpose: a case pattern expands its variable as a PATTERN,
    # with no word splitting and no pathname expansion - a glob, never a regex,
    # never a filesystem lookup, never an eval.
    case "$p" in
      $glob) return 0 ;;
    esac
  done
  return 1
}

files=0
new=0
lines=0
dropped=()
sensitive=()

for p in ${declared[@]+"${declared[@]}"}; do
  # The directory test comes first: `git ls-files --error-unmatch` succeeds on
  # a directory holding any tracked file, which would measure a whole subtree
  # as though it were one declared file.
  if [[ -d "$root/$p" ]]; then
    dropped+=("$p")
    continue
  fi
  if git -C "$root" ls-files --error-unmatch -- "$p" >/dev/null 2>&1; then
    files=$((files + 1))
    lines=$((lines + $(tracked_lines "$p")))
  elif [[ -f "$root/$p" ]]; then
    files=$((files + 1))
    new=$((new + 1))
    lines=$((lines + $(file_lines "$p")))
  else
    dropped+=("$p")
    continue
  fi
  if is_sensitive "$p"; then
    sensitive+=("$p")
  fi
done

echo "files: $files"
echo "new: $new"
echo "lines: $lines"
for p in ${dropped[@]+"${dropped[@]}"}; do
  echo "dropped: $p"
done
for p in ${sensitive[@]+"${sensitive[@]}"}; do
  echo "sensitive: $p"
done

# Built as one string rather than an array: an empty array under `set -u` is an
# unbound variable to a bash 3.2 (the macOS system shell), and no reason is
# ever the empty string, so "no reasons" reads off the string itself.
reasons=""
add_reason() {
  if [[ -z "$reasons" ]]; then
    reasons="$1"
  else
    reasons="$reasons; $1"
  fi
}

if [[ $files -gt $MAX_FILES ]]; then
  add_reason "files $files > $MAX_FILES"
fi
if [[ $new -gt $MAX_NEW ]]; then
  add_reason "new $new > $MAX_NEW"
fi
if [[ $lines -gt $MAX_LINES ]]; then
  add_reason "lines $lines > $MAX_LINES"
fi
for p in ${sensitive[@]+"${sensitive[@]}"}; do
  add_reason "sensitive $p"
done

if [[ -z "$reasons" ]]; then
  echo "RESULT: OK"
else
  echo "RESULT: OVER - $reasons"
fi
exit 0
