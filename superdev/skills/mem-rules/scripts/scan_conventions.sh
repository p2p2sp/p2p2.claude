#!/usr/bin/env bash
# superdev / mem-rules — scan_conventions.sh
#
# Stack-agnostic convention scanner for the Bootstrap workflow: dumps any passed
# signal files plus a fixed set of always-on repo signals (recent history, the
# CLAUDE.md inventory, and a shallow directory tree) so the skill can discover
# conventions from the codebase rather than from memory.
#
# Contract:
#   input  : $@ = an optional `--` separator splits the arguments into two groups:
#            (a) BEFORE `--` (or all args when no `--` is present) = zero or more
#                signal-file paths (e.g. linter / formatter / CI config); each is
#                existence-guarded — a non-existent path is skipped (no crash, a
#                one-line stderr note), never aborting the run.
#            (b) AFTER `--` = zero or more extension globs (e.g. "**/*.sh"), used
#                to list the project's tracked source files grouped by extension.
#   output : on stdout, for EACH existing signal file: "=== <path> ===" then its
#            content. Then, ALWAYS (even with zero args):
#              - a "=== git log --oneline -20 ===" block,
#              - a "=== CLAUDE.md inventory ===" block (count + list),
#              - a "=== Directory tree (depth 2-3) ===" block.
#            Then, ONLY when `--` was present, for EACH extension glob (in order):
#              - a "=== Files by extension: <glob> ===" block listing the tracked
#                files matching the glob via `git ls-files -- "<glob>"`, capped at
#                FILES_BY_EXT_CAP (50) entries.
#            When no `--` is present the output is byte-for-byte the legacy shape
#            (no "Files by extension" block) — existing signal-file-only callers
#            are unaffected.
#   note   : sources lib_find_excludes.sh so the CLAUDE.md scan and the tree are
#            .gitignore-aware. Fail-soft: scans CWD; git/find failures degrade to
#            an empty section rather than a non-zero exit.

TARGET_PATH="."
FILES_BY_EXT_CAP=50

# --- split args on the optional `--` separator -----------------------------
# signal files = args before `--` (or ALL args when no `--`); ext globs = args
# after `--`. The HAS_SEP flag gates the per-glob blocks so the no-`--` output
# stays byte-for-byte identical to the legacy shape.
SIGNAL_FILES=()
EXT_GLOBS=()
HAS_SEP=0
for arg in "$@"; do
    if [ "$HAS_SEP" -eq 0 ] && [ "$arg" = "--" ]; then
        HAS_SEP=1
        continue
    fi
    if [ "$HAS_SEP" -eq 1 ]; then
        EXT_GLOBS+=("$arg")
    else
        SIGNAL_FILES+=("$arg")
    fi
done

# shared directory-exclusion filters, derived from the project .gitignore
source "$(dirname "${BASH_SOURCE[0]}")/lib_find_excludes.sh"
load_find_excludes "$TARGET_PATH" || true

# --- passed signal files (existence-guarded) -------------------------------
for f in "${SIGNAL_FILES[@]+"${SIGNAL_FILES[@]}"}"; do
    if [ -f "$f" ]; then
        echo "=== $f ==="
        cat "$f" 2>/dev/null || true
        echo ""
    else
        echo "scan_conventions: skipping non-existent path: $f" >&2
    fi
done

# --- always-on: recent history ---------------------------------------------
echo "=== git log --oneline -20 ==="
git -C "$TARGET_PATH" log --oneline -20 2>/dev/null || true
echo ""

# --- always-on: CLAUDE.md inventory ----------------------------------------
echo "=== CLAUDE.md inventory ==="
CLAUDE_FILES=()
while IFS= read -r file; do
    [ -n "$file" ] && CLAUDE_FILES+=("$file")
done < <(find "$TARGET_PATH" -name "CLAUDE.md" "${FIND_EXCLUDES[@]}" 2>/dev/null)
echo "count: ${#CLAUDE_FILES[@]}"
for node in "${CLAUDE_FILES[@]}"; do
    echo "  - $node"
done
echo ""

# --- always-on: shallow directory tree -------------------------------------
echo "=== Directory tree (depth 2-3) ==="
find "$TARGET_PATH" -type d -mindepth 2 -maxdepth 3 \
    "${FIND_EXCLUDES[@]}" 2>/dev/null | sort | head -100
echo ""

# --- opt-in: tracked files grouped by extension glob (only when `--` present) --
# Emitted ONLY when the caller passed a `--` separator, so the no-`--` output is
# unchanged. `git ls-files -- "<glob>"` is already .gitignore-aware; capped at
# FILES_BY_EXT_CAP entries so a broad glob never floods the scan. Fail-soft: a
# git failure / no match degrades to an empty (capped) listing, never a non-zero exit.
if [ "$HAS_SEP" -eq 1 ]; then
    for glob in "${EXT_GLOBS[@]+"${EXT_GLOBS[@]}"}"; do
        echo "=== Files by extension: $glob ==="
        git -C "$TARGET_PATH" ls-files -- "$glob" 2>/dev/null | head -"$FILES_BY_EXT_CAP"
        echo ""
    done
fi
