#!/usr/bin/env bash
# Detect Memory Layer state in a project
# Usage: ./detect_state.sh [path]
# Returns: "none" | "partial" | "complete"

set -e

TARGET_PATH="${1:-.}"

# shared directory-exclusion filters, derived from the project .gitignore
source "$(dirname "${BASH_SOURCE[0]}")/../../../scripts/lib_find_excludes.sh"
load_find_excludes "$TARGET_PATH" || true

ROOT_FILE=""
HAS_Memory_SECTION=false
CHILD_NODES=()

# Find root context file
if [ -f "$TARGET_PATH/CLAUDE.md" ]; then
    ROOT_FILE="CLAUDE.md"
fi

# Check for Memory Layer section
if [ -n "$ROOT_FILE" ]; then
    if grep -q "## Memory Layer" "$TARGET_PATH/$ROOT_FILE" 2>/dev/null; then
        HAS_Memory_SECTION=true
    fi
fi

# Find child CLAUDE.md files - -mindepth 2 drops the root's own CLAUDE.md
# (the only depth-1 match). A `-not -path "$TARGET_PATH/CLAUDE.md"` would not:
# -path is an fnmatch pattern, so a Windows-style target path's backslashes
# would be read as escapes and the root file would leak in as a child node.
while IFS= read -r file; do
    CHILD_NODES+=("$file")
done < <(find "$TARGET_PATH" -mindepth 2 -name "CLAUDE.md" "${FIND_EXCLUDES[@]}" 2>/dev/null)

# Output state
echo "=== Memory Layer State ==="
echo "root_file: ${ROOT_FILE:-none}"
echo "has_Memory_section: $HAS_Memory_SECTION"
echo "child_nodes: ${#CHILD_NODES[@]}"

for node in "${CHILD_NODES[@]}"; do
    echo "  - $node"
done

echo ""
if [ -z "$ROOT_FILE" ]; then
    echo "state: none"
    echo "action: initial setup required"
elif [ "$HAS_Memory_SECTION" = false ]; then
    echo "state: partial"
    echo "action: add Memory Layer section to $ROOT_FILE"
else
    echo "state: complete"
    echo "action: maintenance mode (audit/candidates/both)"
fi
