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
#            The scan is RECURSIVE over the whole "<path>/.claude/rules/" tree
#            (find -type f -name '*.md'), so rules nested under subdirectories
#            (e.g. "<dir>/x.md") are seen at any depth.
#            "has-rules" iff "<path>/.claude/rules/" exists AND holds >=1
#            non-frozen "*.md" file at ANY depth; frozen "_"-prefixed BASENAMES
#            are NOT counted toward the rule count, at any level (a tree whose
#            only "*.md" are "_*.md" basenames — flat or nested — is "none").
#            "none" otherwise (empty or absent rules dir included).
#   note   : sources lib_find_excludes.sh because the scan is a recursive tree
#            walk — the helper keeps it .gitignore-aware so vendored/ignored
#            subtrees under the rules dir are pruned (a flat dir scan would not
#            need it; this one does). Exit code is 0 in all cases.
set -e

TARGET_PATH="${1:-.}"
RULES_DIR="$TARGET_PATH/.claude/rules"

# shared directory-exclusion filters, derived from the project .gitignore —
# required because this is a recursive tree scan (see note above).
source "$(dirname "${BASH_SOURCE[0]}")/../../../shared/scripts/lib_find_excludes.sh"
load_find_excludes "$TARGET_PATH" || true

RULE_COUNT=0
if [ -d "$RULES_DIR" ]; then
    # count non-frozen *.md files at ANY depth; frozen "_"-prefixed basenames
    # are excluded wherever they sit (flat or nested).
    while IFS= read -r f; do
        [ -n "$f" ] || continue
        base="$(basename "$f")"
        case "$base" in
            _*) continue ;;                # frozen — not counted
        esac
        RULE_COUNT=$((RULE_COUNT + 1))
    done < <(find "$RULES_DIR" -type f -name '*.md' "${FIND_EXCLUDES[@]}" 2>/dev/null)
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
