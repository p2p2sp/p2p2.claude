#!/usr/bin/env bash
# collect_edges.sh - cheap, deterministic ARTIFACT-PAIR discovery for the
# edge track. Emits one JSON object per candidate pair to stdout (JSONL).
# These are PRIORS for edge-scout, not the verdict itself.
#
# Usage:
#   bash collect_edges.sh [repo_root] [--max-fanout K]
#
# A pair is two swept files that both mention the same path-like literal
# (a filename token such as "user.dto.ts" or "schema.sql") - the literal is
# evidence the two files share a contract (one produces what the other
# consumes, or both reference a common artifact). Candidate discovery reuses
# collect_signals.sh's universe (same deny-list, same noise filter, same
# two-pass extension discovery) so the edge sweep covers exactly the files
# the file sweep covers - no language-specific parsing, no jq.
#
# Fields per pair:
#   a, b      the two paths, always a < b lexicographically
#   via       the linking literal chosen for this pair (see tie-break below)
#   fanout    count[via] - the number of distinct files that mention `via`
#   shared    number of distinct literals linking this exact pair
#
# A literal is dropped as noise before pairing if: its extension matches
# DENY_EXT (case-insensitive), or it equals the mentioning file's own
# basename (self-reference, not a cross-file link), or its post-dot tail
# exceeds 8 characters (e.g. "com.example.UserServiceImpl") - such a token is
# SKIPPED WHOLE, never truncated to an 8-char stand-in, because a truncated
# token names nothing in either endpoint and would fabricate a pair out of
# two unrelated literals that merely share a long prefix. A literal mentioned
# by only one file produces no pair. A literal mentioned by more files than
# --max-fanout (default 8) is dropped as ambient (package.json, README.md -
# everything references it, so it carries no pairing signal) and counted on
# stderr, alongside the count of literals actually kept.
#
# A pair can be linked by more than one literal (`shared` counts them); the
# emitted `via`/`fanout` are the LOWEST-fanout linking literal (the most
# specific one), ties broken by lexicographically smaller literal - both for
# determinism, since the lowest-fanout literal is the strongest evidence of
# an intentional producer/consumer relationship.
#
# --max-fanout is stripped out of the positional stream before repo_root is
# bound, the same way collect_signals.sh strips --with-dependents, so it may
# appear anywhere on the command line and repo_root may still be omitted.
#
# Edge cases:
#   - Unborn HEAD (no commits yet) - one explanatory stderr line, exit 1, no
#     stdout, before any work - same contract as collect_signals.sh.
#   - No pairs found - empty stdout, exit 0. A valid result, not an error.
#   - A file grep cannot read - one stderr warning naming the file, the
#     stream continues instead of aborting.
#   - Every grep / pipeline stage is guarded so a no-match rc=1 does not trip
#     `set -euo pipefail`.
#   - Non-ASCII paths - `-c core.quotePath=false` on both `git ls-files`
#     passes, as in collect_signals.sh.

set -euo pipefail

MAX_FANOUT=8
positional=()
args=("$@")
i=0
while [ $i -lt ${#args[@]} ]; do
  arg="${args[$i]}"
  if [ "$arg" = "--max-fanout" ]; then
    i=$((i + 1))
    MAX_FANOUT="${args[$i]:-8}"
  else
    positional+=("$arg")
  fi
  i=$((i + 1))
done
ROOT="${positional[0]:-.}"

cd "$ROOT"

# An unborn HEAD (a repo with no commits yet) has nothing tracked worth
# pairing in a meaningful, repeatable way - fail fast with one message and
# no output, same contract as collect_signals.sh.
if ! git rev-parse --verify -q HEAD >/dev/null 2>&1; then
  echo 'collect_edges.sh: HEAD has no commits yet (unborn HEAD) - nothing to sweep' >&2
  exit 1
fi

# Minimal JSON string escaper (handles backslash and double-quote).
esc() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }

# Extensions that are never worth a scout's look: binaries, media, fonts,
# archives, office docs, locks, sourcemaps, logs/backups. Everything else the
# repo actually contains gets swept. Copied verbatim from collect_signals.sh
# so both sweeps cover the same universe.
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

# Pass 2 - candidates: files whose extension was kept, plus extensionless
# files. kept_exts is handed to awk via ENVIRON, not `-v` - a `-v` value
# containing a newline (any multi-extension repo) aborts BSD/macOS awk.
# For each candidate, extract path-like literals and emit "path<TAB>token"
# lines: the literal's extension must not be denied, and it must not be the
# file's own basename (a self-reference carries no cross-file signal).
raw_pairs="$(
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
        if [ ! -r "$f" ]; then
          printf 'collect_edges.sh: warning: skipping %s (unreadable)\n' "$f" >&2
          continue
        fi
        base="$(basename "$f")"
        # Trailing `([^A-Za-z0-9_.-]|$)` forces the match to end at a real
        # token boundary. Without it, POSIX leftmost-longest matching backs
        # an over-long tail (>8 chars past the last dot) off onto an earlier
        # dot and truncates - e.g. "com.example.UserServiceImpl" would match
        # as "com.example.UserServ", a token absent from both endpoints. With
        # the boundary required, no dot in that token can both satisfy
        # `{1,8}` and be followed by a non-continuation character, so the
        # whole token is skipped - never truncated - and the emitted literal
        # always equals a real substring bounded by real delimiters.
        tokens="$(grep -oE '[A-Za-z0-9_][A-Za-z0-9_.-]*\.[A-Za-z0-9]{1,8}([^A-Za-z0-9_.-]|$)' "$f" 2>/dev/null || true)"
        [ -n "$tokens" ] || continue
        while IFS= read -r tok; do
          # Strip the captured boundary char (present unless the match hit
          # end-of-line, where the `$` alternative consumes nothing).
          case "$tok" in
            (*[!A-Za-z0-9_.-]) tok="${tok%?}" ;;
          esac
          [ -n "$tok" ] || continue
          [ "$tok" = "$base" ] && continue
          tok_ext="${tok##*.}"
          tok_ext_lc="$(printf '%s' "$tok_ext" | tr '[:upper:]' '[:lower:]')"
          if printf '%s' "$tok_ext_lc" | grep -Eq "^(${DENY_EXT})$"; then
            continue
          fi
          printf '%s\t%s\n' "$f" "$tok"
        done <<< "$tokens"
      done
)"

sorted_pairs="$(printf '%s\n' "$raw_pairs" | sort -u)"

# Count distinct files per literal, then, for literals kept (fanout in
# [2, MAX_FANOUT]), emit every unordered distinct pair those files form -
# aggregated so each pair appears once regardless of how many literals link
# it, with `via`/`fanout` set to the lowest-fanout linking literal (ties
# broken lexicographically) and `shared` the count of distinct linking
# literals. Iterating only within each split()'s own 1..n range (rather than
# relying on `delete array`, a non-portable extension) keeps this working
# across awk implementations (BSD/macOS awk and gawk alike).
pair_tsv="$(
  awk -F'\t' -v max_fanout="$MAX_FANOUT" '
    NF < 2 || $1 == "" || $2 == "" { next }
    {
      files[$2] = files[$2] $1 "\n"
      count[$2]++
    }
    END {
      kept_tokens = 0
      dropped_ambient = 0
      for (tok in count) {
        if (count[tok] < 2) continue
        if (count[tok] > max_fanout) { dropped_ambient++; continue }
        kept_tokens++
        n = split(files[tok], arr, "\n")
        for (i = 1; i <= n; i++) {
          if (arr[i] == "") continue
          for (j = i + 1; j <= n; j++) {
            if (arr[j] == "") continue
            if (arr[i] < arr[j]) { pa = arr[i]; pb = arr[j] } else { pa = arr[j]; pb = arr[i] }
            pkey = pa SUBSEP pb
            pair_a[pkey] = pa
            pair_b[pkey] = pb
            tkey = pkey SUBSEP tok
            if (!(tkey in tokseen)) { tokseen[tkey] = 1; pair_shared[pkey]++ }
            curf = count[tok]
            if (!(pkey in pair_fanout) || curf < pair_fanout[pkey] || (curf == pair_fanout[pkey] && tok < pair_via[pkey])) {
              pair_fanout[pkey] = curf
              pair_via[pkey] = tok
            }
          }
        }
      }
      for (pkey in pair_a) {
        printf "%s\t%s\t%s\t%d\t%d\n", pair_a[pkey], pair_b[pkey], pair_via[pkey], pair_fanout[pkey], pair_shared[pkey]
      }
      printf "collect_edges.sh: literals: %d kept, %d dropped as ambient (fanout>%d)\n", kept_tokens, dropped_ambient, max_fanout > "/dev/stderr"
    }
  ' <<< "$sorted_pairs" | sort
)"

[ -n "$pair_tsv" ] || exit 0

while IFS=$'\t' read -r a b via fanout shared; do
  [ -n "$a" ] || continue
  printf '{"a":"%s","b":"%s","via":"%s","fanout":%s,"shared":%s}\n' \
    "$(esc "$a")" "$(esc "$b")" "$(esc "$via")" "$fanout" "$shared"
done <<< "$pair_tsv"
