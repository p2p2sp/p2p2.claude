#!/usr/bin/env bash
# collect_signals.sh - cheap, deterministic signal collection for the
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
# every file whose extension survived - plus extensionless files (scripts,
# Makefile, hooks). The kept extension set is echoed to stderr so each run is
# honest about its coverage. This keeps the sweep stack-agnostic: a repo of
# markdown+shell+json is covered exactly like a C++ or JS tree.
#
# Both `git ls-files` passes run with `-c core.quotePath=false` so paths with
# non-ASCII bytes are listed raw instead of C-quoted - otherwise a quoted path
# never matches its real extension or its own `[ -f "$f" ]` check. The pass-1
# extension list is handed to the pass-2 `awk` filter via an exported
# environment variable (ENVIRON), never `awk -v` - BSD/macOS awk aborts on a
# `-v` assignment whose value contains a newline, which a multi-extension repo
# always produces.
#
# --with-dependents is stripped out of the positional stream before
# window_days/repo_root are bound, so it may appear anywhere on the command
# line and either positional argument may be omitted.

set -euo pipefail

WITH_DEPENDENTS="no"
positional=()
for arg in "$@"; do
  if [ "$arg" = "--with-dependents" ]; then
    WITH_DEPENDENTS="yes"
  else
    positional+=("$arg")
  fi
done
WINDOW_DAYS="${positional[0]:-30}"
ROOT="${positional[1]:-.}"

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

# Pass 1 - discover the repo's own extension set, minus the deny-list.
# `-c core.quotePath=false`: never let a non-ASCII path reach us C-quoted.
kept_exts="$(
  git -c core.quotePath=false ls-files | noise_filter \
    | sed -n 's/.*\.\([A-Za-z0-9_]\{1,\}\)$/\1/p' \
    | tr '[:upper:]' '[:lower:]' | sort -u \
    | { grep -Ev "^(${DENY_EXT})$" || true; }
)"
printf 'sweep extensions:%s\n' "$(printf '%s' "$kept_exts" | tr '\n' ' ' | sed 's/[[:space:]]*$//; s/^/ /')" >&2

# Pass 2 - candidates: files whose extension was kept, plus extensionless files.
# kept_exts is handed to awk via ENVIRON, not `-v` - a `-v` value containing a
# newline (any multi-extension repo) aborts BSD/macOS awk outright.
git -c core.quotePath=false ls-files | noise_filter \
  | KEPT_EXTS="$kept_exts" awk '
      BEGIN { n = split(ENVIRON["KEPT_EXTS"], a, "\n"); for (i = 1; i <= n; i++) if (a[i] != "") keep[a[i]] = 1 }
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
