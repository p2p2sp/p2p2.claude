#!/usr/bin/env bash
#
# commit-args.sh - the shared argument normalisation of the commit skill.
# Source it and call: resolve_commit_selector "<raw>"
#
# It exists because commit-context.sh (which MEASURES the selected set) and
# commit.sh (which STAGES it) each parsed the selector themselves and drifted:
# one treated a file named "all" as a path, the other as the keyword.
#
# Sets these variables:
#   COMMIT_MODE       - all | paths | missing
#   COMMIT_PATHS      - array of the paths (only for mode=paths), otherwise
#                       empty
#   COMMIT_MISSING    - the path-shaped tokens that do not exist, space-joined
#                       (only for mode=missing), otherwise empty
#   COMMIT_ISSUE_REFS - the issue numbers given in the arguments - from GitHub
#                       links and from bare "#123" references (the way a user
#                       names an issue in a prompt) - unique, in order of
#                       appearance ("42" / "42 7"), an empty string when there
#                       was no reference at all
#
# The selector (the keyword is case-insensitive; an existing path WINS over it
# - a file or directory named "all" is a path). "Existing" means on disk or in
# the git index, so a deleted tracked file still counts:
#   the whole string is an existing path -> paths (that one path, spaces kept)
#   "" / all         -> all    (every change: modified, new and deleted)
#   a list           -> paths  (split on whitespace and commas; every token
#                               that is an existing path is kept, the rest
#                               dropped)
#   no token is an existing path, and one of them is path-shaped (holds a
#   "/" or "\")               -> missing (nothing is committed: a caller who
#                               named paths never gets a commit of everything)
#   no token is an existing path, none path-shaped -> all (fallback: a prose
#                               description passed by mistake in place of a
#                               selector)
#
# A path containing a space works only as the sole selector: inside a list the
# split cuts it apart.
#
# Paths are handed to git VERBATIM. On every platform git natively resolves
# the POSIX (src/foo), Windows-drive (C:/foo, C:\foo) and MSYS (/c/foo) forms,
# so no manual separator conversion is needed.
#
# Issue references are cut out of the arguments BEFORE the selector is
# recognised, so "src/foo #42" still resolves to path=src/foo.
#
# Contract:
#   argv   : none - it is sourced, never run. resolve_commit_selector takes $1,
#            the whole raw argument string of the skill; empty means mode all.
#   cwd    : the repository the commit lands in - the existence checks run git
#            and test paths relative to the caller's working directory.
#   env    : none read; sets the four COMMIT_* variables above plus the
#            internal COMMIT_SELECTOR_RAW in the sourcing shell.
#   stdout : nothing.
#   exit   : resolve_commit_selector always returns 0; the mode carries the
#            result.
add_issue_ref() {
  local num="$1"
  case " $COMMIT_ISSUE_REFS " in
    *" $num "*) : ;;  # the same issue named twice - keep one
    *) COMMIT_ISSUE_REFS="${COMMIT_ISSUE_REFS:+$COMMIT_ISSUE_REFS }$num" ;;
  esac
}

# Cuts every match of regex $2 out of $1, adding the number from group $3 to
# COMMIT_ISSUE_REFS; the text left without matches lands in COMMIT_SELECTOR_RAW.
# The loop consumes a prefix (out += before-match, scan := after-match), so it
# shrinks every iteration and always ends - an in-place replacement could hit
# an earlier, unmatched occurrence of the same text.
strip_issue_refs() {
  local scan="$1" re="$2" grp="$3" out="" full
  while [[ "$scan" =~ $re ]]; do
    full="${BASH_REMATCH[0]}"
    add_issue_ref "${BASH_REMATCH[$grp]}"
    out="$out${scan%%"$full"*} "
    scan="${scan#*"$full"}"
  done
  COMMIT_SELECTOR_RAW="$out$scan"
}

extract_issue_refs() {
  local raw="${1:-}"
  # A bare "#123" needs a non-alphanumeric boundary on both sides, or a hex
  # colour (#1a2b3c) or a URL fragment (#issue-12x) would pass for an issue.
  local url_re='(https?://[^[:space:]]+/issues/([0-9]+)[^[:space:]]*)'
  local hash_re='(^|[^[:alnum:]_])(#([0-9]+))([^[:alnum:]_]|$)'
  COMMIT_ISSUE_REFS=""
  # Links first: a URL may carry a fragment (.../issues/42#issuecomment-1),
  # and nothing of it is left once the whole link is cut out.
  strip_issue_refs "$raw" "$url_re" 2
  strip_issue_refs "$COMMIT_SELECTOR_RAW" "$hash_re" 3
  raw="$COMMIT_SELECTOR_RAW"
  # Cutting the references leaves doubled spaces - collapse them and trim the
  # ends, or the rest of the arguments matches neither the keyword nor a path.
  while [[ "$raw" == *"  "* ]]; do raw="${raw//  / }"; done
  raw="${raw#"${raw%%[![:space:]]*}"}"
  raw="${raw%"${raw##*[![:space:]]}"}"
  COMMIT_SELECTOR_RAW="$raw"
}

# True when $1 is on disk, in the git index (a deleted tracked file is gone
# from disk but still indexed) or in HEAD (a path already removed with
# "git rm" is gone from both, and its staged deletion is exactly what the
# caller wants committed - dropping it silently narrowed a list to the paths
# still on disk, or widened a list of only such paths to mode 'all').
is_commit_path() {
  [ -n "$1" ] || return 1
  [ -e "$1" ] && return 0
  git ls-files --error-unmatch -- "$1" >/dev/null 2>&1 && return 0
  [ -n "$(git --literal-pathspecs ls-tree -r --name-only HEAD -- "$1" 2>/dev/null)" ]
}

resolve_commit_selector() {
  local raw tok
  local -a toks=()
  extract_issue_refs "${1:-}"
  raw="$COMMIT_SELECTOR_RAW"
  COMMIT_PATHS=()
  COMMIT_MISSING=""
  # Path check BEFORE the keyword: otherwise a file named "all" could never be
  # committed alone (the keyword would silently widen the commit).
  if is_commit_path "$raw"; then
    COMMIT_MODE="paths"; COMMIT_PATHS=("$raw")
    return 0
  fi
  case "$raw" in
    ""|[Aa][Ll][Ll]) COMMIT_MODE="all"; return 0 ;;
  esac
  # read -a, not an unquoted expansion: a token holding * or ? must not glob.
  IFS=$' \t\n,' read -r -d '' -a toks <<<"$raw" || true
  for tok in ${toks[@]+"${toks[@]}"}; do
    if is_commit_path "$tok"; then
      COMMIT_PATHS+=("$tok")
    elif [[ "$tok" == */* || "$tok" == *\\* ]]; then
      COMMIT_MISSING="${COMMIT_MISSING:+$COMMIT_MISSING }$tok"
    fi
  done
  # No existing path at all: named paths that are not there are an error, never
  # a commit of everything (a typo, a stale list or a wrong cwd would otherwise
  # sweep the whole tree in); pure prose falls back to 'all'.
  if [ "${#COMMIT_PATHS[@]}" -gt 0 ]; then
    COMMIT_MODE="paths"
    COMMIT_MISSING=""
  elif [ -n "$COMMIT_MISSING" ]; then
    COMMIT_MODE="missing"
  else
    COMMIT_MODE="all"
  fi
}
