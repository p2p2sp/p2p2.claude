#!/usr/bin/env bash
# collect_signals.sh - cheap, deterministic signal collection for the
# Impact x Opportunity sweep. Emits one JSON object per candidate source file to
# stdout (JSONL). These are PRIORS for the scouts, not the score itself.
#
# Usage:
#   bash collect_signals.sh [window_days] [repo_root] [--with-dependents] [--scope <dir>]
#
# Signals per file:
#   churn            commits touching the file within the window
#   fix_commits      commits in the window messaged fix/hotfix/revert touching it
#   recency_days     days since the file was last touched (-1 if unknown)
#   loc              line count
#   dependents       rough count of tracked files referencing the file's counting
#                    literal (only computed with --with-dependents; it is O(n)
#                    git-greps), -1 when it was not computed or the file has no
#                    literal of its own
#   dependents_stem  the literal dependents was counted by (null when -1)
#
# A per-file probe (churn, fix_commits, recency, loc) that fails - e.g. an
# unreadable tracked file - emits one stderr warning naming the file and
# skips it; the stream continues instead of the whole sweep aborting mid-write.
# A repo with no commits yet (unborn HEAD) has no churn/fix/recency data to
# compute at all, so the script exits non-zero with one explanatory stderr
# message and no stdout output before doing any work.
#
# --with-dependents counts by a LOCKSTEP-UNIQUE LITERAL, not by a bare basename
# stem. The literal is decided over the whole noise-filtered tracked set,
# repo-wide and regardless of --scope, so a scoped record stays byte-identical
# to the unscoped one. A file's starting literal is its basename with the last
# extension stripped - a dotfile (a basename with no dot other than its leading
# one, e.g. .gitignore) keeps its full basename, because the empty string a
# naive `${base%.*}` produces would make `git grep` match every tracked file.
# Literals are compared as WHOLE STRINGS, never as suffixes. When two or more
# files land on the same literal, every member of that colliding group extends
# its literal by one further directory segment from the right in the same round
# (`index` -> `a/index` -> `lib/a/index`) and the comparison is repeated over
# the group (lockstep); a member whose literal has become unique is finalised,
# a member whose path has no segment left drops out with `dependents: -1` and
# `dependents_stem: null`, and the remaining members keep extending. A path the
# map does not know (a file that appeared between the two `git ls-files`
# passes) warns on stderr and is emitted with -1/null as well. The map is built
# once per run into a `mktemp` file removed by an EXIT trap; when `mktemp`
# fails the script exits 1 with one stderr line and no stdout. The lookup is one
# awk join before the probe loop (map read once, each candidate printed as
# `path<TAB>=literal` or `path<TAB>?`), not one awk per file.
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
# A path containing `"` or `\` is C-quoted by git regardless of
# core.quotePath=false - that setting only controls non-ASCII bytes, not the
# quoting syntax's own special characters. The pass-2 `awk` filter detects a
# leading `"` and warns-and-skips it before the extension test, since a quoted
# line's parsed extension (e.g. `md"`) never matches a real kept extension
# anyway. As a result, `esc()` below never sees a raw `"` or `\` in a path
# today - both are filtered out upstream. The literal map skips such a path the
# same way, which is also what keeps its TAB-separated records unambiguous (a
# path carrying a TAB is C-quoted by git too).
#
# The `--with-dependents` `git grep` also runs with `-c core.quotePath=false`
# so its output stays directly comparable (via `grep -vxF`) to the raw `$f`
# paths pass 2 already produced unquoted.
#
# --with-dependents is stripped out of the positional stream before
# window_days/repo_root are bound, so it may appear anywhere on the command
# line and either positional argument may be omitted.
#
# --scope <dir> narrows the EMITTED RECORD SET to the files under <dir>, and
# nothing else about the sweep: pass 1 (extension discovery) and every
# per-file probe (churn, fix_commits, recency, loc, dependents) keep running
# over the whole repo, so a scoped file's record is byte-identical to the one
# an unscoped run emits for it. A path `p` is kept iff `p` equals <dir> or
# starts with `<dir>/`, so a sibling sharing the prefix (srcx next to src) is
# never swept in. <dir> is repo-root-relative: a leading `./` and any trailing
# `/` are tolerated, and `.` (or an empty value) means the whole repo. An
# absolute path (a bare `/` or `//` included - a root is never read as "no
# scope"), a `..` segment, or a `--scope` with no value is rejected with
# exit 2 and no stdout. A scope matching zero tracked files is a valid empty
# sweep - exit 0, empty stdout - because the caller validates the directory's
# existence before invoking this script. Like --with-dependents, `--scope` is
# read out of the positional stream (as two tokens) before window_days and
# repo_root are bound, so it may appear anywhere on the command line.

set -euo pipefail

WITH_DEPENDENTS="no"
SCOPE=""
literal_map_file=""
positional=()
args=("$@")
i=0
while [ $i -lt ${#args[@]} ]; do
  arg="${args[$i]}"
  if [ "$arg" = "--with-dependents" ]; then
    WITH_DEPENDENTS="yes"
  elif [ "$arg" = "--scope" ]; then
    i=$((i + 1))
    if [ $i -ge ${#args[@]} ]; then
      echo 'collect_signals.sh: --scope requires a directory argument' >&2
      exit 2
    fi
    SCOPE="${args[$i]}"
  else
    positional+=("$arg")
  fi
  i=$((i + 1))
done
WINDOW_DAYS="${positional[0]:-30}"
ROOT="${positional[1]:-.}"

cd "$ROOT"

# Validate and normalise the scope before any repo work, so a bad --scope
# always exits 2 with nothing on stdout, whatever state the repo is in.
# Rejected: an absolute path (POSIX `/...` or a Windows drive `C:...`) and any
# `..` segment - both name something outside the repo-root-relative subtree the
# scope is defined over.
scope_reject() {
  printf 'collect_signals.sh: --scope must be a repo-root-relative directory: %s\n' "$1" >&2
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

# An unborn HEAD (a repo with no commits yet) has no churn, fix, or recency
# data to compute - a sweep of it would be meaningless rather than merely
# incomplete, so fail fast with one message and no output.
if ! git rev-parse --verify -q HEAD >/dev/null 2>&1; then
  echo 'collect_signals.sh: HEAD has no commits yet (unborn HEAD) - nothing to sweep' >&2
  exit 1
fi

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

# Keeps only the paths under $SCOPE (the path itself, or anything below it),
# and is a plain `cat` when no scope was given. It sits at the very END of
# pass 2, after the extension filter, so pass 1 and every per-file probe still
# see the whole repo - the scope shrinks the emitted record set, nothing else.
# `awk -v` is safe for this value: a scope carrying a newline cannot reach
# here (a `..`-free, non-absolute single argument), which is the only input
# BSD/macOS awk aborts on.
scope_filter() {
  if [ -z "$SCOPE" ]; then
    cat
  else
    awk -v d="$SCOPE" '$0 == d || index($0, d "/") == 1'
  fi
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

# The literal map - one `path<TAB>literal` line per tracked, noise-filtered
# path (the literal empty when that path exhausted itself while still
# colliding). Built over the UNSCOPED universe on purpose: uniqueness is a
# property of the repo, not of the slice being emitted. Only --with-dependents
# needs it, so an ordinary sweep pays nothing for it.
if [ "$WITH_DEPENDENTS" = "yes" ]; then
  if ! literal_map_file="$(mktemp)"; then
    echo 'collect_signals.sh: cannot create literal map temp file' >&2
    exit 1
  fi
  trap 'rm -f "$literal_map_file"' EXIT
  git -c core.quotePath=false ls-files | noise_filter \
    | awk '
        # The starting literal of a path: its last segment with the final
        # extension stripped, a dotfile keeping its whole basename (the
        # `${base%.*}` rule the probe used before the map existed).
        function stem_of(b,   t) {
          t = b
          sub(/\.[^.]*$/, "", t)
          if (t == "") t = b
          return t
        }
        # The literal of path i at depth d: its last d+1 segments joined by
        # "/", only the last of them stripped of its extension.
        function literal_of(i, d,   start, s, j) {
          start = nseg[i] - d
          if (start < 1) start = 1
          s = ""
          for (j = start; j <= nseg[i]; j++) {
            if (j < nseg[i]) s = s segs[i, j] "/"
            else s = s stem_of(segs[i, j])
          }
          return s
        }
        {
          # A C-quoted path is skipped exactly as pass 2 skips it, which also
          # guarantees no TAB can reach a map record.
          if (substr($0, 1, 1) == "\"") next
          n++
          paths[n] = $0
          nseg[n] = split($0, part, "/")
          for (j = 1; j <= nseg[n]; j++) segs[n, j] = part[j]
          active[n] = 1
        }
        END {
          remaining = n
          depth = 0
          # Lockstep: every still-colliding path extends by one segment per
          # round, so a whole colliding group is always compared at one depth.
          while (remaining > 0) {
            split("", cnt)
            for (i = 1; i <= n; i++) {
              if (!active[i]) continue
              lit[i] = literal_of(i, depth)
              cnt[lit[i]]++
            }
            for (i = 1; i <= n; i++) {
              if (!active[i]) continue
              if (cnt[lit[i]] == 1) {
                result[i] = lit[i]; active[i] = 0; remaining--
              } else if (nseg[i] <= depth + 1) {
                # No segment left to add - this one leaves the group with no
                # literal at all; the others keep extending.
                result[i] = ""; active[i] = 0; remaining--
              }
            }
            depth++
          }
          for (i = 1; i <= n; i++) printf "%s\t%s\n", paths[i], result[i]
        }
      ' > "$literal_map_file"
fi

# Pass 2 - candidates: files whose extension was kept, plus extensionless files.
# kept_exts is handed to awk via ENVIRON, not `-v` - a `-v` value containing a
# newline (any multi-extension repo) aborts BSD/macOS awk outright.
# The result is materialised instead of streamed straight into the probe loop
# so the scoped file count is known before the first record is written, which
# is what lets the `scope:` line below sit next to the `sweep extensions:` one.
candidates="$(
  git -c core.quotePath=false ls-files | noise_filter \
    | KEPT_EXTS="$kept_exts" awk '
        BEGIN { n = split(ENVIRON["KEPT_EXTS"], a, "\n"); for (i = 1; i <= n; i++) if (a[i] != "") keep[a[i]] = 1 }
        {
          if (substr($0, 1, 1) == "\"") {
            printf "collect_signals.sh: warning: skipping quoted path %s\n", $0 > "/dev/stderr"
            next
          }
          base = $0; sub(/.*\//, "", base)
          if (base ~ /\./) { ext = base; sub(/.*\./, "", ext); ext = tolower(ext) }
          else ext = ""
          if (ext == "" || (ext in keep)) print
        }' \
    | scope_filter
)"

# One honest line about the narrowed coverage, mirroring `sweep extensions:`.
# A zero here is a legitimate empty sweep, not an error.
if [ -n "$SCOPE" ]; then
  if [ -n "$candidates" ]; then
    scoped_files="$(printf '%s\n' "$candidates" | wc -l | tr -d ' ')"
  else
    scoped_files=0
  fi
  printf 'scope: %s (%s files)\n' "$SCOPE" "$scoped_files" >&2
fi

# An empty candidate list still feeds this loop one empty line (`<<<` on an
# empty string), hence the explicit emptiness guard ahead of the `-f` test.
loop_input="$candidates"
if [ "$WITH_DEPENDENTS" = "yes" ] && [ -n "$candidates" ]; then
  # One join instead of one awk per file: the map is read once, then every
  # candidate is printed as `path<TAB>=literal` (known) or `path<TAB>?`
  # (absent). No apostrophe in the awk block: it sits in single quotes.
  loop_input="$(printf '%s\n' "$candidates" | MAP_FILE="$literal_map_file" awk '
      BEGIN {
        mf = ENVIRON["MAP_FILE"]
        while ((getline line < mf) > 0) {
          t = index(line, "\t")
          if (t == 0) continue
          p = substr(line, 1, t - 1)
          if (!(p in lit)) lit[p] = substr(line, t + 1)
        }
        close(mf)
      }
      { if ($0 in lit) print $0 "\t=" lit[$0]; else print $0 "\t?" }')"
fi

while IFS=$'\t' read -r f lit_field; do
  [ -n "$f" ] || continue
  [ -f "$f" ] || continue

  # Each probe below is guarded individually: a failure (e.g. an
  # unreadable tracked file) warns on stderr, naming the file, and skips
  # straight to the next one - it must not abort the whole stream under
  # `set -euo pipefail`.
  if ! churn="$(git log --since="$SINCE" --oneline -- "$f" 2>/dev/null | wc -l | tr -d ' ')"; then
    printf 'collect_signals.sh: warning: skipping %s (churn probe failed)\n' "$f" >&2
    continue
  fi
  if ! fix_commits="$(git log --since="$SINCE" -i \
                   --grep='fix' --grep='hotfix' --grep='revert' \
                   --oneline -- "$f" 2>/dev/null | wc -l | tr -d ' ')"; then
    printf 'collect_signals.sh: warning: skipping %s (fix_commits probe failed)\n' "$f" >&2
    continue
  fi

  if ! last_ct="$(git log -1 --format=%ct -- "$f" 2>/dev/null)"; then
    printf 'collect_signals.sh: warning: skipping %s (last_ct probe failed)\n' "$f" >&2
    continue
  fi
  if [ "${last_ct:-0}" -gt 0 ] 2>/dev/null; then
    recency_days=$(( (NOW - last_ct) / 86400 ))
  else
    recency_days=-1
  fi

  if ! loc="$(wc -l 2>/dev/null < "$f" | tr -d ' ')"; then
    printf 'collect_signals.sh: warning: skipping %s (loc probe failed)\n' "$f" >&2
    continue
  fi

  dependents=-1
  dependents_stem_json='null'
  if [ "$WITH_DEPENDENTS" = "yes" ]; then
    # The counting literal was decided repo-wide before this loop (the
    # lockstep rule in the header). An empty literal is not a probe failure:
    # it means the path ran out of segments while still colliding, which the
    # contract reports as -1 / null.
    # `lit_field` came from the one join before the loop: `=<literal>` for a
    # known path, `?` for one the map does not hold.
    if [ "$lit_field" = "?" ] || [ -z "$lit_field" ]; then
      # Only reachable when a file appeared between the two `git ls-files`
      # passes, i.e. it was never offered a literal at all.
      printf 'collect_signals.sh: warning: no literal for %s\n' "$f" >&2
      stem=""
    else
      stem="${lit_field#=}"
    fi
    # files that mention the literal, minus the file itself. The grep is
    # deliberately repo-wide even under --scope: a dependent outside the
    # scope still depends on the file, so narrowing it here would make a
    # scoped record disagree with the unscoped one.
    # `|| true` guards each stage: a no-match git grep / grep returns rc=1,
    # which would otherwise trip `set -e` + `pipefail` and abort the sweep.
    # An empty literal skips the probe entirely rather than matching every
    # tracked file.
    if [ -n "$stem" ]; then
      dependents="$( { git -c core.quotePath=false grep -lI -- "$stem" 2>/dev/null || true; } \
                     | { grep -vxF "$f" || true; } \
                     | wc -l | tr -d ' ')"
    fi
    # The two fields move together: a counted record always names the literal
    # it was counted by, an uncounted one always carries null.
    if [ "$dependents" != "-1" ]; then
      dependents_stem_json="\"$(esc "$stem")\""
    fi
  fi

  printf '{"path":"%s","churn":%s,"fix_commits":%s,"recency_days":%s,"loc":%s,"dependents":%s,"dependents_stem":%s}\n' \
    "$(esc "$f")" "$churn" "$fix_commits" "$recency_days" "$loc" "$dependents" "$dependents_stem_json"
done <<< "$loop_input"
