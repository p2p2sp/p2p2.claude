#!/usr/bin/env bash
# superdev / mem-rules — lib_find_excludes.sh
#
# Builds a global FIND_EXCLUDES=( -not -path ... ) array for `find`, derived from
# the project's .gitignore (root located by walking up from a start path), with a
# fallback to the bundled ../../setup/assets/gitignore.txt template.
#
# Contract:
#   input  : $1 = start path (default: CWD). The project root is the nearest
#            ancestor containing .gitignore (preferred) or a .git/ directory.
#   output : sets the GLOBAL array FIND_EXCLUDES (always non-empty — safety floor).
#            Always returns 0 (fail-soft). Diagnostics go to stderr, never stdout.
#   usage  : source "$(dirname "${BASH_SOURCE[0]}")/lib_find_excludes.sh"
#            load_find_excludes "$TARGET_PATH"
#            find "$TARGET_PATH" -type d "${FIND_EXCLUDES[@]}"
#   note   : self-contained; does NOT enable set -e/-u, and every internal command
#            is fail-soft, so a caller running under `set -e` is never aborted by a
#            non-matching grep / empty read.
#   scope  : DIRECTORY pruning only. File-glob patterns (*.log, .DS_Store),
#            negations (!...) and the leading-"/" root anchor are intentionally
#            skipped/relaxed — a directory token that matches nothing is harmless,
#            so the parser only ever risks excluding too LITTLE, never too much.

# Append the (*/p, */p/*) token pair for one normalized directory pattern.
_emit_dir_pattern() {
  local p="$1"
  [ -z "$p" ] && return 0
  FIND_EXCLUDES+=( -not -path "*/$p" -not -path "*/$p/*" )
}

# Print one directory name per line, parsed from the gitignore file at $1.
_collect_dir_names() {
  [ -f "$1" ] || return 0
  # tr strips CR so a CRLF (Windows-authored) gitignore does not leave \r in tokens.
  tr -d '\r' < "$1" 2>/dev/null | while IFS= read -r line; do
    # trim leading/trailing whitespace
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [ -z "$line" ] && continue
    case "$line" in
      \#*) continue ;;   # comment
      \!*) continue ;;   # negation — not expressible as -not -path; skip
    esac
    # classify directory vs file
    local is_dir=0
    case "$line" in
      */)   is_dir=1; line="${line%/}" ;;   # explicit trailing slash -> dir
      *.*)  is_dir=0 ;;                      # has a dot extension -> file
      *)    is_dir=1 ;;                      # bare name -> treat as dir
    esac
    # rescue dot-prefixed dir names without a further dot (.vs .idea .next) -> dir
    case "$line" in
      .[!.]*) case "${line#.}" in *.*) : ;; *) is_dir=1 ;; esac ;;
    esac
    [ "$is_dir" -eq 0 ] && continue
    # normalize: drop leading "/" (root anchor ignored), ** -> *, drop trailing "/"
    line="${line#/}"
    line="${line//\*\*/*}"
    line="${line%/}"
    [ -z "$line" ] && continue
    # guard: skip all-glob patterns (* / ** / */*) that would prune everything
    case "$line" in
      *[!*/]*) : ;;     # keep: has at least one literal char
      *) continue ;;    # only "*" and "/" -> too broad
    esac
    printf '%s\n' "$line"
  done
}

# Populate the global FIND_EXCLUDES array. See contract above.
load_find_excludes() {
  local start="${1:-.}"
  FIND_EXCLUDES=()

  # safety floor — always excluded, and keeps the array non-empty (guards the
  # set -u + empty-array trap on the older bash that ships with Git Bash).
  _emit_dir_pattern ".git"
  _emit_dir_pattern "node_modules"

  # locate the project root: walk up, prefer the nearest .gitignore, else stop at .git/
  local dir parent gi=""
  dir="$(cd "$start" 2>/dev/null && pwd)"
  [ -z "$dir" ] && dir="$(pwd)"
  while [ -n "$dir" ]; do
    if [ -f "$dir/.gitignore" ]; then gi="$dir/.gitignore"; break; fi
    if [ -d "$dir/.git" ]; then break; fi
    parent="$(dirname "$dir")"
    [ "$parent" = "$dir" ] && break          # reached / (or /c on Windows)
    dir="$parent"
  done

  # fallback to the bundled template, resolved relative to THIS library file
  if [ -z "$gi" ]; then
    local lib_dir fb
    lib_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    fb="$lib_dir/../../setup/assets/gitignore.txt"
    if [ -f "$fb" ]; then
      gi="$fb"
    else
      echo "lib_find_excludes: no .gitignore and no fallback ($fb) — safety floor only" >&2
      return 0
    fi
  fi

  # parse + dedupe directory names, append a token pair for each
  local name
  while IFS= read -r name; do
    _emit_dir_pattern "$name"
  done < <(_collect_dir_names "$gi" | sort -u)

  return 0
}
