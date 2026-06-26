#!/usr/bin/env bash
# collect_signals.sh — cheap, deterministic signal collection for the
# Impact x Opportunity sweep. Emits one JSON object per candidate source file to
# stdout (JSONL). These are PRIORS for the scouts, not the score itself.
#
# Usage:
#   bash collect_signals.sh [window_days] [repo_root] [--with-dependents]
#
# Signals per file:
#   churn         commits touching the file within the window
#   fix_commits   commits in the window messaged fix/hotfix/revert touching it
#   recency_days  days since the file was last touched (-1 if unknown)
#   loc           line count
#   dependents    rough count of tracked files referencing the file's basename
#                 (only computed with --with-dependents; it is O(n) git-greps)

set -euo pipefail

WINDOW_DAYS="${1:-30}"
ROOT="${2:-.}"
WITH_DEPENDENTS="no"
for arg in "$@"; do
  [ "$arg" = "--with-dependents" ] && WITH_DEPENDENTS="yes"
done

cd "$ROOT"

# Portable "N days ago" (GNU date vs BSD/macOS date).
if date -v-1d >/dev/null 2>&1; then
  SINCE="$(date -v-"${WINDOW_DAYS}"d +%Y-%m-%d)"
else
  SINCE="$(date -d "-${WINDOW_DAYS} days" +%Y-%m-%d)"
fi
NOW="$(date +%s)"

# Minimal JSON string escaper (handles backslash and double-quote).
esc() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }

# Candidate files: tracked source files, excluding obvious noise.
git ls-files \
  | grep -Ev '(^|/)(node_modules|dist|build|out|vendor|third_party|\.min\.|\.lock$|package-lock\.json|yarn\.lock|\.svg$|\.png$|\.jpe?g$|\.gif$|\.map$)' \
  | grep -Ei '\.(c|cc|cpp|cxx|h|hpp|hh|go|rs|py|js|mjs|cjs|ts|tsx|jsx|java|kt|rb|php|cs|swift|scala|m)$' \
  | while IFS= read -r f; do
      [ -f "$f" ] || continue

      churn="$(git log --since="$SINCE" --oneline -- "$f" 2>/dev/null | wc -l | tr -d ' ')"
      fix_commits="$(git log --since="$SINCE" -i \
                       --grep='fix' --grep='hotfix' --grep='revert' \
                       --oneline -- "$f" 2>/dev/null | wc -l | tr -d ' ')"

      last_ct="$(git log -1 --format=%ct -- "$f" 2>/dev/null || echo 0)"
      if [ "${last_ct:-0}" -gt 0 ] 2>/dev/null; then
        recency_days=$(( (NOW - last_ct) / 86400 ))
      else
        recency_days=-1
      fi

      loc="$(wc -l < "$f" | tr -d ' ')"

      dependents=-1
      if [ "$WITH_DEPENDENTS" = "yes" ]; then
        base="$(basename "$f")"
        stem="${base%.*}"
        # files that mention the stem, minus the file itself.
        # `|| true` guards each stage: a no-match git grep / grep returns rc=1,
        # which would otherwise trip `set -e` + `pipefail` and abort the sweep.
        dependents="$( { git grep -lI -- "$stem" 2>/dev/null || true; } \
                       | { grep -vxF "$f" || true; } \
                       | wc -l | tr -d ' ')"
      fi

      printf '{"path":"%s","churn":%s,"fix_commits":%s,"recency_days":%s,"loc":%s,"dependents":%s}\n' \
        "$(esc "$f")" "$churn" "$fix_commits" "$recency_days" "$loc" "$dependents"
    done
