#!/usr/bin/env bash
# Sample deterministic convention signals from a codebase, one section per
# convention area. Counts only - interpreting what the convention IS (and
# proving it with real file reads) is the caller's job.
# Usage: ./scan_conventions.sh [path]

set -e

TARGET_PATH="${1:-.}"

# shared directory-exclusion filters, derived from the project .gitignore
source "$(dirname "${BASH_SOURCE[0]}")/../../../scripts/lib_find_excludes.sh"
load_find_excludes "$TARGET_PATH" || true

echo "=== Convention Signals ==="
echo "Target: $TARGET_PATH"

echo ""
echo "## Languages (file extensions, top 12)"
find "$TARGET_PATH" -type f "${FIND_EXCLUDES[@]}" 2>/dev/null \
  | sed -n 's/.*\.\([A-Za-z0-9_]\{1,10\}\)$/\1/p' \
  | sort | uniq -c | sort -rn | head -12

echo ""
echo "## File naming styles (basenames, dot-files excluded)"
BASENAMES=$(find "$TARGET_PATH" -type f "${FIND_EXCLUDES[@]}" 2>/dev/null \
  | sed 's|.*/||' | grep -v '^\.' | sed 's/\.[^.]*$//')
count() { printf '%s\n' "$BASENAMES" | grep -cE "$1" || true; }
echo "kebab-case:  $(count '^[a-z0-9]+(-[a-z0-9]+)+$')"
echo "snake_case:  $(count '^[a-z0-9]+(_[a-z0-9]+)+$')"
echo "PascalCase:  $(count '^[A-Z][a-zA-Z0-9]*$')"
echo "camelCase:   $(count '^[a-z]+[A-Z][a-zA-Z0-9]*$')"
echo "single-word: $(count '^[a-z0-9]+$')"
echo "dotted:      $(count '^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)+$')"

echo ""
echo "## Test file patterns"
for p in '*.test.*' '*.spec.*' '*_test.*' '*Test.*' 'test_*'; do
    c=$(find "$TARGET_PATH" -type f -name "$p" "${FIND_EXCLUDES[@]}" 2>/dev/null | wc -l | tr -d ' ')
    echo "$p: $c"
done
echo "test directories:"
find "$TARGET_PATH" -type d \
  \( -name test -o -name tests -o -name __tests__ -o -name spec -o -name testdata \) \
  "${FIND_EXCLUDES[@]}" 2>/dev/null | head -10

echo ""
echo "## Tool / format configs (depth 2)"
find "$TARGET_PATH" -maxdepth 2 -type f \
  \( -name ".editorconfig" -o -name ".*rc" -o -name ".*rc.*" -o -name "*.config.*" \
  -o -name "Makefile" -o -name "justfile" -o -name "*.toml" -o -name "*.props" \) \
  "${FIND_EXCLUDES[@]}" 2>/dev/null | head -20

echo ""
echo "## Directory layout (depth 2)"
find "$TARGET_PATH" -maxdepth 2 -type d "${FIND_EXCLUDES[@]}" 2>/dev/null | head -40

echo ""
echo "Read 2-3 representative files per candidate area before proposing a convention."
