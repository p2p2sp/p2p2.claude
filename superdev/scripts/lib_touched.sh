#!/usr/bin/env bash
# superdev / scripts - lib_touched.sh
#
# The ONE reader of a notes file's "touched:" declarations, plus the path
# normalisation and the trim behind it. Both consumers source it:
# commit-task.sh (the declared set it STAGES) and vibe-guard.sh (the declared
# set it MEASURES). It exists so those two can never drift: the vibe track's
# guarantee is that the guard measures exactly what the commit stages, and
# before this file each script carried its own copy of the cut rule, the
# separator folding and the trim - two copies no test bound together, where a
# change to one silently left the other staging a path the guard had never
# counted.
#
# Contract:
#   trim <string>
#     -> the string with leading and trailing whitespace stripped, on stdout.
#
#   normalise_path <path>
#     -> the repository-root relative form on stdout: backslashes folded to
#        "/", a surrounding backtick dropped, the repository root itself
#        reduced to ".", a path under it made relative to it, a "./" prefix and
#        a trailing "/" removed. Reads the CALLER's global `root` (the
#        repository root, no trailing slash); an unset or empty `root` simply
#        leaves the root reduction out, it is never an error here.
#
#   touched_paths <notes-file>
#     -> one declared path per line on stdout, in file order, duplicates kept.
#        Every "touched: <value>" line of the file counts, bulleted ("- ", "* ")
#        or bare, leading whitespace and a trailing CR tolerated. The declared
#        path is what stands between "touched:" and the first " - " or " (" on
#        that line, whichever comes first, so a reason written after the path
#        does not corrupt the declaration; a path whose own name carries " - "
#        or " (" is cut there too - a reason is the far likelier reading. Both
#        cuts run BEFORE the trim, so a value that is nothing but a separator
#        and a reason reduces to empty rather than to the reason itself, and an
#        empty value declares nothing and prints no line. A notes file that does
#        not exist prints nothing and returns 0 - what a missing declaration
#        means is the caller's decision.
#        The output is NOT normalised and NOT deduplicated: each caller applies
#        its own policy (commit-task.sh drops .temp/ and reads "." as the whole
#        tree, vibe-guard.sh collapses duplicates) to every path this prints.
#
#   usage  : source "$(dirname "${BASH_SOURCE[0]}")/lib_touched.sh"
#            while IFS= read -r p; do add_declared "$p"; done \
#              < <(touched_paths "$notes")
#   note   : self-contained; does NOT enable set -e/-u/pipefail, and needs no
#            external command - a caller running under `set -euo pipefail`
#            (commit-task.sh) or under `set -u` alone (vibe-guard.sh) is never
#            aborted by it.

# Strips leading and trailing whitespace.
trim() {
  local s="$1"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "$s"
}

# Repository-root relative form of a declared path: separators normalised, a
# surrounding backtick and a "./" prefix dropped, the repository root itself
# reduced to ".". See the contract above for the `root` global it reads.
normalise_path() {
  local p repo_root
  repo_root="${root:-}"
  p="$(trim "$1")"
  p="${p//\\//}"
  p="${p#\`}"
  p="${p%\`}"
  p="$(trim "$p")"
  if [[ -n "$repo_root" ]]; then
    if [[ "$p" == "$repo_root" ]]; then
      p="."
    elif [[ "$p" == "$repo_root"/* ]]; then
      p="${p#"$repo_root"/}"
    fi
  fi
  while [[ "$p" == ./* ]]; do
    p="${p#./}"
  done
  while [[ "$p" == */ ]]; do
    p="${p%/}"
  done
  printf '%s' "$p"
}

# Every "touched: <path>" line of the notes file, one path per line.
touched_paths() {
  local file="$1" line entry value
  if [[ -z "$file" || ! -f "$file" ]]; then
    return 0
  fi
  while IFS= read -r line || [[ -n "$line" ]]; do
    entry="$(trim "$line")"
    case "$entry" in
      -\ * | \*\ *)
        entry="$(trim "${entry#?}")"
        ;;
    esac
    case "$entry" in
      touched:*)
        # "%%" strips the longest matching suffix, so each cut lands on the
        # first occurrence of its own separator and the pair leaves whatever
        # came before the earlier one.
        value="${entry#touched:}"
        value="${value%% - *}"
        value="${value%% (*}"
        value="$(trim "$value")"
        if [[ -n "$value" ]]; then
          printf '%s\n' "$value"
        fi
        ;;
    esac
  done < "$file"
  return 0
}
