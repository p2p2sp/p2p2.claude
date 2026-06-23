#!/usr/bin/env bash
# superdev / mem-rules — scan_conventions.sh
#
# Stack-agnostic convention scanner for the Bootstrap workflow: dumps any passed
# signal files plus a fixed set of always-on repo signals (recent history, the
# CLAUDE.md inventory, and a shallow directory tree) so the skill can discover
# conventions from the codebase rather than from memory.
#
# Contract:
#   input  : $@ = zero or more signal-file paths (e.g. linter / formatter / CI
#            config). Each is existence-guarded; a non-existent path is skipped
#            (no crash, a one-line stderr note), never aborting the run.
#   output : on stdout, for EACH existing passed file: "=== <path> ===" then its
#            content. Then, ALWAYS (even with zero args):
#              - a "=== git log --oneline -20 ===" block,
#              - a "=== CLAUDE.md inventory ===" block (count + list),
#              - a "=== Directory tree (depth 2-3) ===" block.
#   note   : sources lib_find_excludes.sh so the CLAUDE.md scan and the tree are
#            .gitignore-aware. Fail-soft: scans CWD; git/find failures degrade to
#            an empty section rather than a non-zero exit.

TARGET_PATH="."

# shared directory-exclusion filters, derived from the project .gitignore
source "$(dirname "${BASH_SOURCE[0]}")/lib_find_excludes.sh"
load_find_excludes "$TARGET_PATH" || true

# --- passed signal files (existence-guarded) -------------------------------
for f in "$@"; do
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
