#!/usr/bin/env bash
# collect_edges.sh - cheap, deterministic ARTIFACT-PAIR discovery for the
# edge track. Emits one JSON object per candidate pair to stdout (JSONL).
# These are PRIORS for edge-scout, not the verdict itself; downstream,
# rank_edges.ts joins them against edge-scout's verdicts and projects `via`
# (never `vias`) verbatim into its own gate output, edges.json / edges.md.
#
# Usage:
#   bash collect_edges.sh [repo_root] [--max-fanout K] [--max-seconds S] [--scope <dir>]
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
# --max-fanout, --max-seconds and --scope are stripped out of the positional
# stream before repo_root is bound, the same way collect_signals.sh strips
# --with-dependents, so each may appear anywhere on the command line and
# repo_root may still be omitted.
#
# Algorithm - a fixed number of processes, whatever the token count:
#   1. Candidates: every tracked, noise-filtered file whose extension
#      survived pass 1 (kept_exts), plus extensionless files.
#   2. extract (newline paths in, "path<TAB>literal" lines out) is one
#      pipeline: a builtin-only feeder loop over the paths, ONE
#      `xargs -0 grep -oHE --null` over every path it fed, `tr` and one awk
#      applying the noise rules above. Its process count depends on the
#      path count (xargs batches), never on how many literals a file holds.
#   3. Unscoped: extract over every candidate, then the pairing awk, then
#      one output awk writing the JSONL.
#   4. Scoped: see --scope below.
#
# --scope <dir> narrows the EMITTED PAIRS to those with at least one endpoint
# under <dir>: a pair survives iff `a` or `b` equals <dir> or starts with
# `<dir>/`, which is deliberate - an edge whose other endpoint sits outside
# the scope is exactly the contract a scoped audit must still see. A sibling
# sharing the prefix (srcx next to src) is never read as being under the
# scope. Under a scope the sweep reads only the scope and the files that can
# share a literal with it, never the whole repo:
#   a. scope files = the candidates under <dir>; extract runs over them, and
#      their distinct literals go to a `mktemp` file (the lits set) removed
#      by an EXIT trap. `mktemp` failing exits 1 with one stderr line and no
#      stdout.
#   b. One `git grep -l -F -f -`, fed the lits set on stdin, lists every
#      tracked file holding any of those literals as a substring; a git grep
#      exit above 1 (a failed search) makes every candidate a hit, so the
#      result never depends on it. git grep reads only plain regular index
#      entries from the working tree: it skips a symlink and a skip-worktree
#      entry and reads an assume-unchanged one from the index, so one
#      `git ls-files -s -v` adds every entry of those kinds (a tag other than
#      H/M or a mode other than 100644/100755) unconditionally. The scan set
#      is those hits and added entries that are candidates and not scope
#      files. extract runs over the scan set, and only the literals in the
#      lits set are kept from it.
#   c. Both results are merged and paired exactly as an unscoped run would.
#   An empty lits set skips step b (git grep would exit 128 on an empty
#   pattern list) and pairs nothing.
# Why the surviving pairs are byte-identical to the unscoped ones: a pair
# survives only with an endpoint in scope, so each of its linking literals
# occurs in a scope file and is in the lits set. A literal's fanout is the
# number of candidate files whose extraction yields it, and each such file
# either is one of the entries step b adds unconditionally or holds the
# literal as a substring of the working-tree copy git grep reads, so it is a
# `git grep -F` hit; either way it is extracted in this run too: for every
# literal in the lits set the count is the full-scan count. Hence `fanout`,
# `shared`, `via` and `vias` of every surviving pair equal the full-scan
# values. A `-F` substring hit the regex
# would not extract (`Value.cs` inside `MyValue.cs`) costs one extra file
# read and nothing else: extraction discards it. Under a scope the
# `literals:` stderr line counts only the literals reachable from the scope;
# stdout is unchanged. <dir> is repo-root-relative and is normalised and
# validated exactly as in collect_signals.sh: a leading `./` and any trailing
# `/` are tolerated, `.` (or an empty value) means the whole repo, and an
# absolute path (a bare `/` or `//` included - a root is never read as "no
# scope"), a `..` segment, or a `--scope` with no value is rejected with exit
# 2 and no stdout. `--scope` is read out of the positional stream as two
# tokens.
#
# --max-seconds S (default 0 = no limit) bounds the sweep by wall time. The
# extract feeder checks bash's builtin $SECONDS (seconds since the script
# started) before each path; once it reaches S the feeder stops feeding,
# prints `collect_edges.sh: deadline of <S>s exceeded - edge sweep abandoned`
# to stderr and the script exits 3 with no stdout (stdout is written only at
# the very end, so nothing partial leaks). Nothing is killed from outside, so
# no xargs/grep child is orphaned. Not covered by the check: every step
# outside the feeder (the `git ls-files` passes, `git grep`, the sorts and
# the awks) and the paths already fed into the pipe buffer, which xargs
# still greps before the exit. A value that is not a non-negative integer
# is rejected with exit 2 and no stdout; a missing value means 0.
#
# Progress on stderr: `collect_edges.sh: pass2 <i>/<N>` every 10% of an
# extract list of 1000 paths or more; under a scope also
# `collect_edges.sh: scope: <k> literals from <m> files` and
# `collect_edges.sh: pass2 <N> files to scan` (N = the scan set of step b).
#
# Exit codes: 0 success (an empty stdout included), 1 unborn HEAD or a
# failed `mktemp`, 2 a bad --scope or --max-seconds value, 3 the
# --max-seconds deadline passed.
#
# Edge cases:
#   - Unborn HEAD (no commits yet) - one explanatory stderr line, exit 1, no
#     stdout, before any work - same contract as collect_signals.sh.
#   - No pairs found - empty stdout, exit 0. A valid result, not an error.
#   - A --scope matching no pair - the same empty result (exit 0, empty
#     stdout), reported as one `scope: <dir> (0 pairs)` line on stderr; the
#     caller validates that the directory exists before invoking this script.
#   - A tracked path that is not a regular file (`[ -f ]` fails: deleted,
#     a directory) is skipped silently. A file the feeder cannot OPEN - a real
#     open attempt, not `[ -r ]`, which answers from the permission bits a
#     Windows ACL entry never reaches - gets one stderr warning naming it and
#     is skipped; the stream continues instead of aborting.
#   - A path starting with `-` reaches grep after `--`, never as an option.
#   - A binary file yields no literal: GNU grep 3.0 and BSD grep print a
#     `Binary file X matches` line on stdout, which carries no NUL and is
#     dropped; newer GNU grep prints it on stderr, which is discarded.
#   - Every grep / pipeline stage is guarded so a no-match rc=1 (xargs: 123)
#     does not trip `set -euo pipefail`.
#   - Non-ASCII paths - `-c core.quotePath=false` on every `git ls-files`
#     pass and on `git grep`, as in collect_signals.sh.
#   - A path containing `"` or `\` is C-quoted by git regardless of
#     core.quotePath=false (that setting only controls non-ASCII bytes, not
#     the quoting syntax's own special characters). The candidate filter
#     detects a leading `"` and warns-and-skips it before the extension test,
#     since a quoted line's parsed extension never matches a real kept
#     extension anyway. The output awk still escapes `\` and `"` in every
#     string field, though neither reaches it today. A path never holds a
#     TAB or a newline either (git C-quotes both), which is what makes TAB
#     a safe field separator.

set -euo pipefail

MAX_FANOUT=8
MAX_SECONDS=0
SCOPE=""
positional=()
args=("$@")
i=0
while [ $i -lt ${#args[@]} ]; do
  arg="${args[$i]}"
  if [ "$arg" = "--max-fanout" ]; then
    i=$((i + 1))
    MAX_FANOUT="${args[$i]:-8}"
  elif [ "$arg" = "--max-seconds" ]; then
    i=$((i + 1))
    MAX_SECONDS="${args[$i]:-0}"
  elif [ "$arg" = "--scope" ]; then
    i=$((i + 1))
    if [ $i -ge ${#args[@]} ]; then
      echo 'collect_edges.sh: --scope requires a directory argument' >&2
      exit 2
    fi
    SCOPE="${args[$i]}"
  else
    positional+=("$arg")
  fi
  i=$((i + 1))
done
ROOT="${positional[0]:-.}"

# The feeder compares $MAX_SECONDS arithmetically before every path, so a
# non-integer would fail that test once per path; reject it up front.
case "$MAX_SECONDS" in
  '' | *[!0-9]*)
    printf 'collect_edges.sh: --max-seconds must be a non-negative integer: %s\n' "$MAX_SECONDS" >&2
    exit 2
    ;;
esac

cd "$ROOT"

# Validate and normalise the scope before any repo work, so a bad --scope
# always exits 2 with nothing on stdout, whatever state the repo is in -
# the unborn-HEAD check below included. Rejected: an absolute path (POSIX
# `/...` or a Windows drive `C:...`) and any `..` segment, both naming
# something outside the repo-root-relative subtree the scope is defined over.
scope_reject() {
  printf 'collect_edges.sh: --scope must be a repo-root-relative directory: %s\n' "$1" >&2
  exit 2
}

# The absolute half runs on the RAW value, BEFORE normalisation: the
# trailing-slash strip below collapses a bare root (`/`, `//`) to the empty
# string, which the guards downstream read as "no scope" - so a bare root
# would fail open into a whole-repo sweep with exit 0 instead of being
# rejected. The raw value is also what the message names, since the
# normalised one can be empty.
case "$SCOPE" in
  /* | [A-Za-z]:*) scope_reject "$SCOPE" ;;
esac

# A leading `./` and every trailing `/` are noise, and `.` is the whole repo,
# i.e. no scope at all.
while [ "${SCOPE#./}" != "$SCOPE" ]; do SCOPE="${SCOPE#./}"; done
while [ "${SCOPE%/}" != "$SCOPE" ]; do SCOPE="${SCOPE%/}"; done
if [ "$SCOPE" = "." ]; then SCOPE=""; fi
if [ -n "$SCOPE" ]; then
  # The `..` patterns are checked on the normalised value; the absolute ones
  # are repeated here because normalisation can produce an absolute path the
  # raw check never saw (`.//foo` -> `/foo`).
  case "$SCOPE" in
    /* | [A-Za-z]:* | .. | ../* | */../* | */..) scope_reject "$SCOPE" ;;
  esac
fi

# An unborn HEAD (a repo with no commits yet) has nothing tracked worth
# pairing in a meaningful, repeatable way - fail fast with one message and
# no output, same contract as collect_signals.sh.
if ! git rev-parse --verify -q HEAD >/dev/null 2>&1; then
  echo 'collect_edges.sh: HEAD has no commits yet (unborn HEAD) - nothing to sweep' >&2
  exit 1
fi

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
candidates="$(
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
        }'
)"

# extract - stdin: newline-separated paths; stdout: one "path<TAB>literal"
# line per literal occurrence (duplicates included; callers sort -u). The
# literal's extension must not be denied, and it must not be the file's own
# basename (a self-reference carries no cross-file signal).
#
# The feeder loop uses builtins only (zero forks per path): `[ -f ]`, then a
# real open as the readability test - `[ -r ]` answers from the permission
# bits, which a Windows ACL entry never reaches, so a file this sweep cannot
# open would otherwise be dropped silently there. The open runs on `true`,
# not `:`: a redirection error on a special builtin exits a bash running in
# POSIX mode (POSIXLY_CORRECT set). Testing the open here, not
# grep's status, leaves grep running in the caller's locale: `LC_ALL=C` would
# change which files GNU grep treats as binary. The same loop prints the
# progress lines and enforces --max-seconds (exit 3, carried out by
# pipefail).
#
# grep runs once per xargs batch: `-H --null` prefixes every match with its
# path and a NUL (`--null`, not `-Z`: BSD/macOS grep reads `-Z` as
# decompress); `|| true` because xargs returns 123 when any batch matched
# nothing; `--` keeps a path starting with `-` from being read as an option.
# `tr` turns the NUL into a TAB before awk, since BSD awk cannot hold a NUL.
#
# Trailing `([^A-Za-z0-9_.-]|\.[^A-Za-z0-9_-]|\.$|$)` forces the match to
# end at a real token boundary. Without it, POSIX leftmost-longest matching
# backs an over-long tail (>8 chars past the last dot) off onto an earlier
# dot and truncates - e.g. "com.example.UserServiceImpl" would match as
# "com.example.UserServ", a token absent from both endpoints. With the
# boundary required, no dot in that token can both satisfy `{1,8}` and be
# followed by a non-continuation character, so the whole token is skipped -
# never truncated - and the emitted literal always equals a real substring
# bounded by real delimiters. The two `\.`-prefixed alternatives re-admit a
# sentence-final dot without weakening that guarantee: a real extension never
# itself contains a dot, so a dot immediately after the `{1,8}` extension
# chars is punctuation, not part of the token - whether it ends the line
# ("report.md." at EOL, `\.$`) or is followed by a non-continuation character
# ("report.md. Then" mid-line, `\.[^A-Za-z0-9_-]`). `-` and `_` stay
# continuation characters, not sentence punctuation, so a hyphenated literal
# like "report.md-based" is unaffected - it is a distinct token, never
# truncated at the hyphen. The boundary character the match captures is
# stripped again in awk, so a literal never carries it.
extract() {
  {
    local f paths total step n
    paths=()
    while IFS= read -r f; do
      [ -n "$f" ] && paths+=("$f")
    done
    total=${#paths[@]}
    step=0
    if [ "$total" -ge 1000 ]; then step=$((total / 10)); fi
    n=0
    for f in ${paths[@]+"${paths[@]}"}; do
      if [ "$MAX_SECONDS" -gt 0 ] && [ "$SECONDS" -ge "$MAX_SECONDS" ]; then
        printf 'collect_edges.sh: deadline of %ss exceeded - edge sweep abandoned\n' "$MAX_SECONDS" >&2
        exit 3
      fi
      n=$((n + 1))
      if [ "$step" -gt 0 ] && [ $((n % step)) -eq 0 ]; then
        printf 'collect_edges.sh: pass2 %d/%d\n' "$n" "$total" >&2
      fi
      [ -f "$f" ] || continue
      if ! { true < "$f"; } 2>/dev/null; then
        printf 'collect_edges.sh: warning: skipping %s (unreadable)\n' "$f" >&2
        continue
      fi
      printf '%s\0' "$f"
    done
  } \
    | { xargs -0 grep -oHE --null -- '[A-Za-z0-9_][A-Za-z0-9_.-]*\.[A-Za-z0-9]{1,8}([^A-Za-z0-9_.-]|\.[^A-Za-z0-9_-]|\.$|$)' 2>/dev/null || true; } \
    | tr '\0' '\t' \
    | DENY_EXT="$DENY_EXT" awk '
        BEGIN { deny = "^(" ENVIRON["DENY_EXT"] ")$" }
        {
          # Split at the FIRST tab: the path never holds one, the literal
          # may end in a TAB boundary character. A line with no tab is the
          # grep 3.0 / BSD "Binary file X matches" message: no literal.
          t = index($0, "\t")
          if (t == 0) next
          path = substr($0, 1, t - 1)
          tok = substr($0, t + 1)
          # Strip every trailing boundary character: the real literal always
          # ends alphanumeric (the extension is [A-Za-z0-9]{1,8}), so any
          # non-alphanumeric tail - one char from the plain boundary
          # alternative, or up to two from a dot-prefixed one (a
          # sentence-final "..." or "report.md.)") - is punctuation.
          sub(/[^A-Za-z0-9]+$/, "", tok)
          if (tok == "") next
          base = path; sub(/.*\//, "", base)
          if (tok == base) next
          ext = tok; sub(/.*\./, "", ext)
          if (tolower(ext) ~ deny) next
          printf "%s\t%s\n", path, tok
        }'
}

# Line count of a newline-separated list held in a variable (0 when empty).
count_lines() {
  if [ -z "$1" ]; then
    echo 0
  else
    printf '%s\n' "$1" | awk 'END { print NR }'
  fi
}

sorted_pairs=""
if [ -z "$SCOPE" ]; then
  if [ -n "$candidates" ]; then
    sorted_pairs="$(extract <<< "$candidates" | sort -u)"
  fi
else
  if ! lits_file="$(mktemp)"; then
    echo 'collect_edges.sh: cannot create literal list temp file' >&2
    exit 1
  fi
  trap 'rm -f "$lits_file"' EXIT

  scope_files="$(
    printf '%s\n' "$candidates" \
      | SCOPE="$SCOPE" awk 'BEGIN { d = ENVIRON["SCOPE"] } $0 == d || index($0, d "/") == 1'
  )"
  scope_pairs=""
  if [ -n "$scope_files" ]; then
    scope_pairs="$(extract <<< "$scope_files" | sort -u)"
  fi
  printf '%s\n' "$scope_pairs" | awk -F'\t' 'NF >= 2 && $2 != "" { print $2 }' | sort -u > "$lits_file"
  printf 'collect_edges.sh: scope: %s literals from %s files\n' \
    "$(awk 'END { print NR }' "$lits_file")" "$(count_lines "$scope_files")" >&2

  scan=""
  if [ -s "$lits_file" ]; then
    # One call over the whole tree. Never run on an empty pattern list (`-s`
    # above): git grep exits 128 on one. `--no-color` and
    # `grep.fullName=false`: a user `color.ui=always` or `grep.fullName=true`
    # would otherwise print paths no candidate equals. `-f -` takes the
    # patterns on stdin: a temp path handed to git may not resolve (Git for
    # Windows under MSYS_NO_PATHCONV). rc 1 is "no file matched"; above 1 the
    # search failed, so every candidate becomes a hit.
    hits_rc=0
    hits="$(git -c core.quotePath=false -c grep.fullName=false grep --no-color -l -F -f - < "$lits_file")" || hits_rc=$?
    if [ "$hits_rc" -gt 1 ]; then hits="$candidates"; fi
    # git grep reads only the working-tree copy of a regular, plain index
    # entry: it skips a symlink (mode 120000) and a skip-worktree entry and
    # reads an assume-unchanged one from the index, while extract reads all
    # three through the working tree. Every such entry joins the scan set
    # unconditionally (one `ls-files -s -v`: a tag other than H/M, or a mode
    # other than 100644/100755).
    unsure="$(
      git -c core.quotePath=false ls-files -s -v \
        | awk '{ t = index($0, "\t"); if (t == 0) next; split(substr($0, 1, t - 1), h, " ")
                 if ((h[1] != "H" && h[1] != "M") || (h[2] != "100644" && h[2] != "100755")) print substr($0, t + 1) }'
    )"
    # Scan set = hits and unsure entries that are candidates, minus the scope
    # files. One stream: the candidates, an empty separator line (a path is
    # never empty), then the hits and the unsure entries.
    scan="$(
      { printf '%s\n' "$candidates"; printf '\n'; printf '%s\n' "$hits" "$unsure"; } \
        | SCOPE="$SCOPE" awk '
            BEGIN { d = ENVIRON["SCOPE"] }
            !sep { if ($0 == "") sep = 1; else cand[$0] = 1; next }
            $0 == "" || !($0 in cand) || ($0 in seen) { next }
            $0 == d || index($0, d "/") == 1 { next }
            { seen[$0] = 1; print }'
    )"
  fi
  printf 'collect_edges.sh: pass2 %s files to scan\n' "$(count_lines "$scan")" >&2

  outside_pairs=""
  if [ -n "$scan" ]; then
    outside_pairs="$(
      extract <<< "$scan" \
        | awk -F'\t' 'FNR == NR { lit[$0] = 1; next } NF >= 2 && ($2 in lit)' "$lits_file" -
    )"
  fi
  sorted_pairs="$(printf '%s\n%s\n' "$scope_pairs" "$outside_pairs" | sort -u)"
fi

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

# Output stage - one awk. Under a scope it keeps only the pairs with at
# least one endpoint under $SCOPE (the pairing above already ran over the
# scope-reachable literals; this drops the pairs both of whose endpoints sit
# outside) and reports their count on stderr; a zero there is a legitimate
# empty result, not an error. JSON escaping builds each string from split()
# and concatenation, never gsub with a backslash replacement, which gawk,
# mawk and BSD awk read differently; quoted paths are filtered upstream, so
# neither a backslash nor a double quote reaches it today.
printf '%s\n' "$pair_tsv" | SCOPE="$SCOPE" awk -F'\t' '
  function esc(s,    n, p, i, out) {
    n = split(s, p, "\\")
    out = p[1]
    for (i = 2; i <= n; i++) out = out "\\\\" p[i]
    n = split(out, p, "\"")
    out = p[1]
    for (i = 2; i <= n; i++) out = out "\\\"" p[i]
    return out
  }
  BEGIN { d = ENVIRON["SCOPE"]; kept = 0 }
  $1 == "" { next }
  d != "" && !($1 == d || index($1, d "/") == 1 || $2 == d || index($2, d "/") == 1) { next }
  {
    kept++
    printf "{\"a\":\"%s\",\"b\":\"%s\",\"via\":\"%s\",\"fanout\":%s,\"shared\":%s,\"vias\":%s}\n", esc($1), esc($2), esc($3), $4, $5, $6
  }
  END { if (d != "") printf "scope: %s (%d pairs)\n", d, kept > "/dev/stderr" }
'
