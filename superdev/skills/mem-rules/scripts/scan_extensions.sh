#!/usr/bin/env bash
# superdev / mem-rules — scan_extensions.sh
#
# Prints an extension histogram over the project's tracked source files, so the
# skill can persist real `rule_extensions` globs (consumed by scan_conventions.sh
# and rule `paths:`) instead of guessing source types from memory.
#
# Contract:
#   input  : $1 = target path (default: "."). The histogram covers source files
#            beneath it.
#   output : "count  ext" lines on stdout, sorted DESCENDING by count (this is the
#            raw `sort -rn | uniq -c`-style shape, two leading-space-padded columns
#            "<count> <ext>"). Files WITHOUT an extension are skipped (never emitted
#            as a bogus extension). An empty repo / no tracked files yields NO
#            histogram lines (empty stdout). Exit code is 0 in EVERY case.
#   branch : (1) inside a git repo -> `git ls-files` (already .gitignore-aware, so
#            no FIND_EXCLUDES needed on this path); (2) outside a git repo -> `find`
#            with FIND_EXCLUDES sourced from lib_find_excludes.sh.
#   note   : sources lib_find_excludes.sh ONLY for the non-git `find` fallback —
#            that branch is a recursive tree scan, so per the discovery-scripts rule
#            it must be .gitignore-aware; the git branch is already filtered by
#            `git ls-files` and does not use the helper. Fail-soft: a git/find
#            failure degrades to no lines rather than a non-zero exit.
set -u

TARGET_PATH="${1:-.}"

# --- enumerate tracked source files (one path per line) --------------------
# git branch: `git ls-files` already honors .gitignore, so no FIND_EXCLUDES here.
# non-git branch: recursive `find` -> must prune .gitignore'd subtrees, so source
# lib_find_excludes.sh (recursive-scan -> sources, per the discovery-scripts rule).
list_files() {
    if git -C "$TARGET_PATH" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        git -C "$TARGET_PATH" ls-files 2>/dev/null
    else
        source "$(dirname "${BASH_SOURCE[0]}")/lib_find_excludes.sh"
        load_find_excludes "$TARGET_PATH" || true
        find "$TARGET_PATH" -type f "${FIND_EXCLUDES[@]}" 2>/dev/null
    fi
}

# Build the histogram: keep only files whose BASENAME contains a "." (extension),
# emit the lowercase extension, then `sort | uniq -c | sort -rn` -> count desc.
list_files | while IFS= read -r f; do
    [ -n "$f" ] || continue
    base="${f##*/}"
    # no dot in the basename -> no extension -> skip (never a bogus entry).
    case "$base" in
        *.*) : ;;
        *)   continue ;;
    esac
    ext="${base##*.}"
    [ -n "$ext" ] || continue          # trailing-dot guard ("foo." -> empty ext)
    printf '%s\n' "$ext"
done | sort | uniq -c | sort -rn
