#!/usr/bin/env bash
# superdev / mem-rules — detect_state.sh
#
# Detects the `.claude/rules/` state of a project for the Bootstrap workflow.
#
# Contract:
#   input  : $1 = target path (default: "."). The rules dir checked is
#            "<path>/.claude/rules".
#   output : a terse state block on stdout, ending in the line
#            "state: none | has-rules".
#            "has-rules" iff "<path>/.claude/rules/" exists AND holds >=1
#            non-frozen "*.md" file; frozen "_"-prefixed files are NOT counted
#            toward the rule count (a rules dir with only "_*.md" is "none").
#            "none" otherwise.
#   note   : intentionally does NOT source lib_find_excludes.sh — the scan is a
#            single flat directory (.claude/rules/), never a recursive tree.
set -e

TARGET_PATH="${1:-.}"
RULES_DIR="$TARGET_PATH/.claude/rules"

RULE_COUNT=0
if [ -d "$RULES_DIR" ]; then
    # count non-frozen top-level *.md files; frozen "_"-prefixed files excluded.
    for f in "$RULES_DIR"/*.md; do
        [ -e "$f" ] || continue            # no-match glob guard
        base="$(basename "$f")"
        case "$base" in
            _*) continue ;;                # frozen — not counted
        esac
        RULE_COUNT=$((RULE_COUNT + 1))
    done
fi

echo "=== Rules State ==="
echo "rules_dir: $RULES_DIR"
echo "rule_count: $RULE_COUNT"
echo ""
if [ "$RULE_COUNT" -ge 1 ]; then
    echo "state: has-rules"
else
    echo "state: none"
fi
