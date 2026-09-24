#!/usr/bin/env bash
# Detect .claude/rules state in a project
# Usage: ./detect_state.sh [path]
# Returns: "none" | "partial" | "complete"
#
# none     - no .claude/rules/*.md files at all
# partial  - rule files exist but at least one lacks frontmatter with paths:
# complete - every rule file carries frontmatter with a paths: field
#
# Frozen files (basename starting with "_", e.g. _superdev.md) are hand-authored
# meta-rules: listed for visibility but excluded from the state calculation and
# from everything downstream (never read, scored, edited, or created).

set -e

TARGET_PATH="${1:-.}"
RULES_DIR="$TARGET_PATH/.claude/rules"

RULE_FILES=()
FROZEN_FILES=()
if [ -d "$RULES_DIR" ]; then
    while IFS= read -r file; do
        RULE_FILES+=("$file")
    done < <(find "$RULES_DIR" -type f -name "*.md" ! -name "_*" 2>/dev/null | sort)
    while IFS= read -r file; do
        FROZEN_FILES+=("$file")
    done < <(find "$RULES_DIR" -type f -name "_*.md" 2>/dev/null | sort)
fi

echo "=== Rules State ==="
if [ -d "$RULES_DIR" ]; then
    echo "rules_dir: $RULES_DIR"
else
    echo "rules_dir: none"
fi
echo "rule_files: ${#RULE_FILES[@]}"
echo "frozen_files: ${#FROZEN_FILES[@]} (leading _, immutable - excluded from state and from all downstream work)"
for f in "${FROZEN_FILES[@]}"; do
    echo "  - $f (frozen)"
done

MISSING_PATHS=0
for f in "${RULE_FILES[@]}"; do
    # frontmatter = line 1 is '---' and a 'paths:' line appears before the closing '---'
    if head -n1 "$f" | grep -q '^---[[:space:]]*$' && \
       sed -n '2,/^---[[:space:]]*$/p' "$f" | grep -q '^[[:space:]]*paths:'; then
        echo "  - $f (paths: yes)"
    else
        echo "  - $f (paths: MISSING)"
        MISSING_PATHS=$((MISSING_PATHS + 1))
    fi
done

echo ""
if [ ${#RULE_FILES[@]} -eq 0 ]; then
    echo "state: none"
    echo "action: initial discovery required"
elif [ "$MISSING_PATHS" -gt 0 ]; then
    echo "state: partial"
    echo "action: discovery + fix files without paths: gating"
else
    echo "state: complete"
    echo "action: maintenance mode (audit/candidates/both)"
fi
