#!/usr/bin/env bash
# Estimate token count for a directory to determine Memory Node needs.
#
# Usage:
#     estimate_tokens.sh <path>
#
# Token estimation: ~4 chars per token (rough approximation)
#
# Guidelines:
#     <20k tokens: Usually no dedicated node needed
#     20-64k tokens: Good candidate for 2-3k token node
#     >64k tokens: Consider splitting into child nodes

set -e

TARGET_PATH="${1:-.}"

if [ ! -d "$TARGET_PATH" ]; then
    echo "Error: Path not found: $TARGET_PATH"
    exit 1
fi

# shared directory-exclusion filters, derived from the project .gitignore
source "$(dirname "${BASH_SOURCE[0]}")/lib_find_excludes.sh"
load_find_excludes "$TARGET_PATH" || true

DIR_NAME=$(basename "$TARGET_PATH")

echo "=== Token Estimate: $DIR_NAME ==="
echo ""

# Count bytes and estimate tokens
BYTES=$(find "$TARGET_PATH" -type f \
    \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
    -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.java" \
    -o -name "*.rb" -o -name "*.php" -o -name "*.swift" -o -name "*.kt" \
    -o -name "*.c" -o -name "*.cpp" -o -name "*.h" -o -name "*.cs" \
    -o -name "*.vue" -o -name "*.svelte" -o -name "*.astro" \
    -o -name "*.md" -o -name "*.mdx" -o -name "*.json" \
    -o -name "*.yaml" -o -name "*.yml" -o -name "*.toml" \
    -o -name "*.sql" -o -name "*.graphql" -o -name "*.prisma" \) \
    "${FIND_EXCLUDES[@]}" \
    -exec cat {} + 2>/dev/null | wc -c | tr -d ' ')

TOKENS=$((BYTES / 4))
FILE_COUNT=$(find "$TARGET_PATH" -type f \
    \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
    -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.java" \
    -o -name "*.astro" -o -name "*.vue" -o -name "*.svelte" \
    -o -name "*.md" -o -name "*.mdx" \) \
    "${FIND_EXCLUDES[@]}" \
    2>/dev/null | wc -l | tr -d ' ')

# Format tokens
if [ "$TOKENS" -ge 1000000 ]; then
    FORMATTED="$((TOKENS / 1000000)).$(( (TOKENS % 1000000) / 100000 ))M"
elif [ "$TOKENS" -ge 1000 ]; then
    FORMATTED="$((TOKENS / 1000)).$(( (TOKENS % 1000) / 100 ))k"
else
    FORMATTED=$TOKENS
fi

echo "Total tokens: ~$FORMATTED ($TOKENS)"
echo "File count: $FILE_COUNT"
echo ""

# Recommendation
if [ "$TOKENS" -lt 20000 ]; then
    echo "Threshold: <20k"
    echo "Recommendation: No dedicated Memory Node needed"
elif [ "$TOKENS" -lt 64000 ]; then
    echo "Threshold: 20-64k"
    echo "Recommendation: Good candidate for 2-3k token Memory Node"
else
    echo "Threshold: >64k"
    echo "Recommendation: Consider splitting into child Memory Nodes"
fi
