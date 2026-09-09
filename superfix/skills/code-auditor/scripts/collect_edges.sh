#!/usr/bin/env bash
# collect_edges.sh - cheap, deterministic ARTIFACT-PAIR discovery for the
# edge track. Emits one JSON object per candidate pair to stdout (JSONL).
# These are PRIORS for edge-scout, not the verdict itself; downstream,
# rank_edges.ts joins them against edge-scout's verdicts and projects `via`
# (never `vias`) verbatim into its own gate output, edges.json / edges.md.
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
#   vias      up to 3 linking literals for this pair, ranked by the same
#             tie-break as `via` (best first) - a scout-facing list of
#             candidates, not just the single winner
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
# A pair can be linked by more than one literal (`shared` counts them, `vias`
# lists up to 3, best first). The emitted `via`/`fanout` are the linking
# literal with the HIGHEST artifact evidence: scored 2 when the literal names
# a real tracked file (an artifact one side writes and the other reads), 1
# when its extension is merely one the repo actually carries, 0 otherwise
# (syntax noise, e.g. a method call like "Array.from" that only looks
# path-like) - ties within a score broken by lower fanout, then
# lexicographically smaller literal. Lowest-fanout is the right tie-break
# only among literals of comparable evidence; used alone as the PRIMARY key
# it is INVERTED for a code-to-code pair, since a rare method name can carry
# a lower fanout than a real shared artifact yet says nothing about a
# producer/consumer contract.
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
#   - A path containing `"` or `\` is C-quoted by git regardless of
#     core.quotePath=false (that setting only controls non-ASCII bytes, not
#     the quoting syntax's own special characters). The pass-2 `awk` filter
#     inside `raw_pairs` detects a leading `"` and warns-and-skips it before
#     the extension test, since a quoted line's parsed extension never
#     matches a real kept extension anyway. As a result, `esc()` below never
#     sees a raw `"` or `\` in a path today - both are filtered out upstream.

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

# Tracked-basename set - a linking literal that names a real tracked file is
# ARTIFACT evidence (a filename one side writes, the other reads); one that
# only looks path-like (a method call such as "Array.from") is syntax noise.
# Built the same way kept_exts is above and handed to the pairing awk below
# via ENVIRON, for the same BSD/macOS-awk-aborts-on-newline-in--v reason.
tracked_basenames="$(
  git -c core.quotePath=false ls-files | noise_filter \
    | awk -F/ '{ print $NF }' \
    | sort -u
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
          if (substr($0, 1, 1) == "\"") {
            printf "collect_edges.sh: warning: skipping quoted path %s\n", $0 > "/dev/stderr"
            next
          }
          base = $0; sub(/.*\//, "", base)
          if (base ~ /\./) { ext = base; sub(/.*\./, "", ext); ext = tolower(ext) }
          else ext = ""
          if (ext == "" || (ext in keep)) print
        }' \
    | while IFS= read -r f; do
        [ -f "$f" ] || continue
        base="$(basename "$f")"
        # Trailing `([^A-Za-z0-9_.-]|\.[^A-Za-z0-9_-]|\.$|$)` forces the
        # match to end at a real token boundary. Without it, POSIX
        # leftmost-longest matching backs an over-long tail (>8 chars past
        # the last dot) off onto an earlier dot and truncates - e.g.
        # "com.example.UserServiceImpl" would match as "com.example.UserServ",
        # a token absent from both endpoints. With the boundary required, no
        # dot in that token can both satisfy `{1,8}` and be followed by a
        # non-continuation character, so the whole token is skipped - never
        # truncated - and the emitted literal always equals a real substring
        # bounded by real delimiters. The two `\.`-prefixed alternatives
        # re-admit a sentence-final dot without weakening that guarantee: a
        # real extension never itself contains a dot, so a dot immediately
        # after the `{1,8}` extension chars is punctuation, not part of the
        # token - whether it ends the line ("report.md." at EOL, `\.$`) or
        # is followed by a non-continuation character ("report.md. Then"
        # mid-line, `\.[^A-Za-z0-9_-]`). `-` and `_` stay continuation
        # characters, not sentence punctuation, so a hyphenated literal like
        # "report.md-based" is unaffected - it is a distinct token, never
        # truncated at the hyphen.
        # A read that FAILED and a read that matched NOTHING are different
        # outcomes, so the grep status is kept: 1 is "no literals here"
        # (silent skip), >=2 is "could not read it" (warn, then skip). The
        # attempt itself is the readability test - `[ -r ]` answers from the
        # permission bits, which a Windows ACL entry never reaches, so a file
        # this loop cannot open would otherwise be dropped silently there.
        grep_status=0
        tokens="$(grep -oE '[A-Za-z0-9_][A-Za-z0-9_.-]*\.[A-Za-z0-9]{1,8}([^A-Za-z0-9_.-]|\.[^A-Za-z0-9_-]|\.$|$)' "$f" 2>/dev/null)" || grep_status=$?
        if [ "$grep_status" -ge 2 ]; then
          printf 'collect_edges.sh: warning: skipping %s (unreadable)\n' "$f" >&2
          continue
        fi
        [ -n "$tokens" ] || continue
        while IFS= read -r tok; do
          # Strip every trailing boundary character, not just one: the real
          # token always ends alphanumeric (the extension is
          # `[A-Za-z0-9]{1,8}`), so any non-alphanumeric tail - one char from
          # the plain boundary alternative, or up to two from a
          # `\.`-prefixed one (e.g. a sentence-final "..." or "report.md.)")
          # - is captured punctuation, never part of the literal.
          while true; do
            case "$tok" in
              (*[!A-Za-z0-9]) tok="${tok%?}" ;;
              (*) break ;;
            esac
          done
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
# it. Each linking literal is scored ARTIFACT-first via via_score() (2 =
# names a tracked file, 1 = extension the repo carries, 0 = syntax noise);
# `via`/`fanout` come from the highest-scoring literal, ties broken by lower
# fanout then lexicographically smaller literal, and `vias` carries up to 3
# literals ordered by that same key - `via` is always `vias[0]`. Iterating
# only within each split()'s own 1..n range (rather than relying on `delete
# array`, a non-portable extension) keeps this working across awk
# implementations (BSD/macOS awk and gawk alike).
pair_tsv="$(
  KEPT_EXTS="$kept_exts" TRACKED_BASENAMES="$tracked_basenames" awk -F'\t' -v max_fanout="$MAX_FANOUT" '
    BEGIN {
      n = split(ENVIRON["KEPT_EXTS"], ea, "\n"); for (i = 1; i <= n; i++) if (ea[i] != "") kept_ext[ea[i]] = 1
      n = split(ENVIRON["TRACKED_BASENAMES"], ba, "\n"); for (i = 1; i <= n; i++) if (ba[i] != "") tracked_base[ba[i]] = 1
    }
    function via_score(tok,    ext) {
      if (tok in tracked_base) return 2
      ext = tok
      sub(/.*\./, "", ext)
      ext = tolower(ext)
      if (ext in kept_ext) return 1
      return 0
    }
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
            if (!(tkey in tokseen)) {
              tokseen[tkey] = 1
              pair_shared[pkey]++
              idx = ++pair_n[pkey]
              pair_tok[pkey, idx] = tok
              pair_fan[pkey, idx] = count[tok]
            }
          }
        }
      }
      # Selection sort the linking-literal list of each pair by the SAME
      # comparator that picks `via`, so `via` (position 1) and `vias`
      # (positions 1..3) never disagree: higher via_score first, then lower
      # fanout, then lexicographically smaller literal.
      for (pkey in pair_a) {
        n = pair_n[pkey]
        for (x = 1; x <= n; x++) {
          best = x
          bs = via_score(pair_tok[pkey, x])
          for (y = x + 1; y <= n; y++) {
            ys = via_score(pair_tok[pkey, y])
            swap = 0
            if (ys > bs) swap = 1
            else if (ys == bs && pair_fan[pkey, y] < pair_fan[pkey, best]) swap = 1
            else if (ys == bs && pair_fan[pkey, y] == pair_fan[pkey, best] && pair_tok[pkey, y] < pair_tok[pkey, best]) swap = 1
            if (swap) { best = y; bs = ys }
          }
          if (best != x) {
            t = pair_tok[pkey, x]; pair_tok[pkey, x] = pair_tok[pkey, best]; pair_tok[pkey, best] = t
            f = pair_fan[pkey, x]; pair_fan[pkey, x] = pair_fan[pkey, best]; pair_fan[pkey, best] = f
          }
        }
        cap = (n < 3 ? n : 3)
        vias = "[\"" pair_tok[pkey, 1] "\""
        for (x = 2; x <= cap; x++) vias = vias ",\"" pair_tok[pkey, x] "\""
        vias = vias "]"
        printf "%s\t%s\t%s\t%d\t%d\t%s\n", pair_a[pkey], pair_b[pkey], pair_tok[pkey, 1], pair_fan[pkey, 1], pair_shared[pkey], vias
      }
      printf "collect_edges.sh: literals: %d kept, %d dropped as ambient (fanout>%d)\n", kept_tokens, dropped_ambient, max_fanout > "/dev/stderr"
    }
  ' <<< "$sorted_pairs" | sort
)"

[ -n "$pair_tsv" ] || exit 0

while IFS=$'\t' read -r a b via fanout shared vias; do
  [ -n "$a" ] || continue
  printf '{"a":"%s","b":"%s","via":"%s","fanout":%s,"shared":%s,"vias":%s}\n' \
    "$(esc "$a")" "$(esc "$b")" "$(esc "$via")" "$fanout" "$shared" "$vias"
done <<< "$pair_tsv"
