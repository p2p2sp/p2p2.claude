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
#
# Candidate selection is DISCOVERED, not hardcoded: pass 1 scans the tracked tree
# for every extension actually present, drops a deny-list of no-value ones
# (binaries, media, fonts, archives, locks, generated maps), and pass 2 sweeps
# every file whose extension survived — plus extensionless files (scripts,
# Makefile, hooks). The kept extension set is echoed to stderr so each run is
# honest about its coverage. This keeps the sweep stack-agnostic: a repo of
# markdown+shell+json is covered exactly like a C++ or JS tree.

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

# Extensions that are never worth a scout's look: binaries, media, fonts,
# archives, office docs, locks, sourcemaps, logs/backups. Everything else the
# repo actually contains gets swept.
DENY_EXT='png|jpe?g|gif|bmp|ico|icns|svg|webp|avif|woff2?|ttf|otf|eot|mp3|mp4|wav|ogg|avi|mov|webm|zip|tar|gz|tgz|bz2|xz|7z|rar|jar|pdf|docx?|xlsx?|pptx?|odt|ods|exe|dll|so|dylib|bin|o|a|obj|class|pyc|pyo|wasm|lock|sum|map|min|log|tmp|bak|swp|ds_store'

# Noise paths dropped before either pass (dirs, lockfiles, minified bundles).
# `|| true`: an all-filtered stream must not trip `set -e` + `pipefail`.
noise_filter() {
  grep -Ev '(^|/)(node_modules|dist|build|out|vendor|third_party)(/|$)|\.min\.|(^|/)package-lock\.json$|(^|/)yarn\.lock$' || true
}

# Pass 1 — discover the repo's own extension set, minus the deny-list.
kept_exts="$(
  git ls-files | noise_filter \
    | sed -n 's/.*\.\([A-Za-z0-9_]\{1,\}\)$/\1/p' \
    | tr '[:upper:]' '[:lower:]' | sort -u \
    | { grep -Ev "^(${DENY_EXT})$" || true; }
)"
printf 'sweep extensions:%s\n' "$(printf '%s' "$kept_exts" | tr '\n' ' ' | sed 's/[[:space:]]*$//; s/^/ /')" >&2

# Pass 2 — candidates: files whose extension was kept, plus extensionless files.
git ls-files | noise_filter \
  | awk -v exts="$kept_exts" '
      BEGIN { n = split(exts, a, "\n"); for (i = 1; i <= n; i++) if (a[i] != "") keep[a[i]] = 1 }
      {
        base = $0; sub(/.*\//, "", base)
        if (base ~ /\./) { ext = base; sub(/.*\./, "", ext); ext = tolower(ext) }
        else ext = ""
        if (ext == "" || (ext in keep)) print
      }' \
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
