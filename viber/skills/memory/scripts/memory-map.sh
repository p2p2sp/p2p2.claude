#!/usr/bin/env bash
#
# memory-map.sh - maps the host project's CLAUDE.md cascade, and on --reset
# deletes the nodes it is handed. It is what the memory command loads before
# it decides anything: the routing, the budgets and the uncommitted-work check
# are deterministic, so the model is handed a map instead of walking the tree
# itself and guessing at sizes.
#
# Contract:
#   argv   : none                       -> the map.
#            --reset <path> [<path>...] -> delete those nodes, all or none.
#   cwd    : any directory inside the host project - the repository root is
#            resolved here, every path printed is relative to it, and every
#            path handed to --reset is read relative to it. Outside a
#            repository the cwd IS the root and nothing is tracked there.
#   env    : none.
#   stdout : map mode, in this order, one line each:
#              # viber memory map
#              id: 2026-09-22-17-06-39
#              state: none | partial | complete
#              node: docs/CLAUDE.md 4210 chain 11880 ok | OVER-NODE | OVER-CHAIN
#              orphan: docs/legacy/CLAUDE.md
#              cand: src/api files 37 bytes 91204 toolchain | plain
#              dirty: CLAUDE.md modified | untracked
#              total: nodes 7
#            --reset, one line per target in the order given:
#              removed: docs/CLAUDE.md
#              removed: 2
#            or, when the call is refused and NOTHING was deleted:
#              refused: docs/CLAUDE.md modified | untracked | not-a-node
#   exit   : map mode ALWAYS 0. It is a `!` preload, where a non-zero exit
#            aborts the whole skill load, so a directory that is no repository
#            at all is the empty map rather than an error.
#            --reset: 0 once every target is deleted; 2 on unusable argv (no
#            path, or an unknown first argument - usage on stderr, nothing
#            printed on stdout); 3 when the call was refused.
#
# id      - this run's stamp, which the caller spends as .temp/viber/<id>/.
# state   - "none" when no CLAUDE.md is tracked anywhere, "complete" when a
#           root node exists and every candidate directory carries its own
#           node, "partial" otherwise.
# node    - one line per tracked CLAUDE.md still present in the working tree,
#           root first then depth order. The first count is `wc -c` on the
#           file, "chain" that plus every ancestor node up to the root - what
#           a reader loads by the time it reaches this one. OVER-NODE past
#           12000 bytes, OVER-CHAIN past 32000 on the chain, OVER-NODE
#           winning when both hold. A node deleted but not yet committed -
#           staged with `git rm` or plainly `rm`'d - is no node at all: no
#           line here, no dirty line, not counted toward total or state, and
#           its directory is a plain candidate again once it qualifies.
# orphan  - a node with no other tracked file anywhere beneath its directory:
#           it documents nothing.
# cand    - a directory that deserves a node and has none: tracked, at depth 1
#           or 2, no path segment starting with ".", at least three tracked
#           files beneath it. "toolchain" when it directly holds one of
#           package.json, pyproject.toml, setup.py, requirements.txt, go.mod,
#           Cargo.toml, pom.xml, build.gradle, build.gradle.kts, Gemfile,
#           composer.json, mix.exs, pubspec.yaml, CMakeLists.txt, Makefile, or
#           any *.csproj / *.sln; "plain" otherwise. "files" and "bytes" count
#           every tracked file beneath it.
# dirty   - one line per node the git index reports modified, or present in
#           the tree and untracked. An untracked node is no node anywhere else
#           in the map: it is neither counted nor sized. A node deleted but
#           not yet committed carries no working-tree file either way, so it
#           is absent rather than dirty - `--reset` alone still treats its
#           uncommitted deletion as "modified" and refuses to touch it again.
#
# A section with nothing to report prints no line at all; "total:" always
# prints. --reset judges every target before deleting the first one, so one
# modified or untracked file in the list leaves the whole cascade untouched -
# a user never loses half a layer.
#
set -u

NL='
'
NODE_BUDGET=12000
CHAIN_BUDGET=32000
MANIFESTS='package.json pyproject.toml setup.py requirements.txt go.mod Cargo.toml pom.xml build.gradle build.gradle.kts Gemfile composer.json mix.exs pubspec.yaml CMakeLists.txt Makefile'

mode="map"
if [ "$#" -gt 0 ]; then
  case "$1" in
    --reset) mode="reset"; shift ;;
    *) printf 'usage: memory-map.sh [--reset <path> [<path>...]]\n' >&2; exit 2 ;;
  esac
fi

root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$root" ] || [ ! -d "$root" ]; then
  root="$(pwd)"
fi
cd "$root" || exit 0

# --- the tracked tree ------------------------------------------------------
# Read with -z: without it git C-quotes and octal-escapes any path carrying a
# non-ASCII character, which would hide that path behind an opening quote.
# One tr pass rather than a read loop appending entry by entry: every append
# copies the whole string, which bash 3.2 (the macOS system shell) turns into
# seconds on a repository of a few thousand files. The command substitution
# strips the final newline, so it is put back: every entry ends in $NL.
tracked="$(git ls-files -z 2>/dev/null | tr '\0' '\n')"
[ -z "$tracked" ] || tracked="$tracked$NL"

is_tracked() {
  case "$NL$tracked" in
    *"$NL$1$NL"*) return 0 ;;
  esac
  return 1
}

is_node() {
  case "$1" in
    CLAUDE.md | */CLAUDE.md) return 0 ;;
  esac
  return 1
}

# The bytes of one file, 0 when it cannot be read.
chars_of() {
  size="$(wc -c < "$1" 2>/dev/null | tr -d '[:space:]')"
  case "$size" in
    '' | *[!0-9]*) printf '0' ;;
    *) printf '%s' "$size" ;;
  esac
}

# True when some tracked file other than $2 lives under the prefix $1 ("" is
# the repository root). A node is an orphan when nothing does: it documents
# no subtree, not even one held in a directory below it.
holds_other() {
  # One awk pass over the list rather than a shell substitution on it: a host
  # repository holds thousands of tracked files, and bash 3.2 (the macOS
  # system shell) takes seconds to minutes for one ${var/pattern/} over a blob
  # that size, once per node. The prefix is compared with substr() because
  # index() with an empty needle (the root node) answers 1 in BWK awk and 0 in
  # gawk. A prefix ends in "/", so no tracked file ever equals it. awk reads
  # to the end instead of exiting on the first match: an early exit breaks the
  # pipe under printf, which can then print a write error on stderr.
  printf '%s' "$tracked" | awk -v p="$1" -v n="$2" '
    !found && $0 != "" && $0 != n && substr($0, 1, length(p)) == p { found = 1 }
    END { exit !found }'
}

# The nodes carrying uncommitted work, as "<path> modified" / "<path>
# untracked" lines.
# -uall: the default collapses an untracked directory to its name alone, and
# an untracked node would never be seen. A rename's second record is the old
# path with no status code in front, recognised by the missing separator
# space and skipped.
dirty_nodes=""
while IFS= read -r -d '' record; do
  [ -n "$record" ] || continue
  [ "${record:2:1}" = " " ] || continue
  code="${record:0:2}"
  path="${record:3}"
  is_node "$path" || continue
  if [ "$code" = "??" ]; then
    dirty_nodes="$dirty_nodes$path untracked$NL"
  else
    dirty_nodes="$dirty_nodes$path modified$NL"
  fi
done < <(git status --porcelain -z -uall 2>/dev/null || true)

# --- reset mode ------------------------------------------------------------
# The reason a node cannot be reset, out of the dirty list; nothing at all
# when it carries no uncommitted work.
dirty_reason() {
  while IFS= read -r entry; do
    case "$entry" in
      "$1 "*) printf '%s' "${entry#* }"; return 0 ;;
    esac
  done < <(printf '%s\n' "$dirty_nodes")
  return 1
}

# All or nothing: every target is judged before the first one is deleted, so a
# refused call leaves the cascade exactly as it was.
if [ "$mode" = "reset" ]; then
  if [ "$#" -eq 0 ]; then
    printf 'usage: memory-map.sh --reset <path> [<path>...]\n' >&2
    exit 2
  fi
  targets=""
  refused=""
  for target in "$@"; do
    norm="${target#./}"
    reason=""
    if ! is_node "$norm"; then
      reason="not-a-node"
    else
      reason="$(dirty_reason "$norm" || true)"
      if [ -z "$reason" ] && ! is_tracked "$norm"; then
        reason="not-a-node"
      fi
    fi
    if [ -n "$reason" ]; then
      refused="$refused$(printf 'refused: %s %s' "$norm" "$reason")$NL"
    fi
    targets="$targets$norm$NL"
  done
  if [ -n "$refused" ]; then
    printf '%s' "$refused"
    exit 3
  fi
  removed=0
  while IFS= read -r target; do
    [ -n "$target" ] || continue
    rm -f "$target"
    printf 'removed: %s\n' "$target"
    removed=$(( removed + 1 ))
  done < <(printf '%s\n' "$targets")
  printf 'removed: %d\n' "$removed"
  exit 0
fi

# Every tracked CLAUDE.md still present in the working tree, prefixed with
# its zero-padded depth so a plain `sort` puts the root node first and the
# rest in depth order. One deleted but not yet committed - staged with
# `git rm` or plainly `rm`'d - is skipped here: it is no node at all.
node_lines="$(
  printf '%s' "$tracked" | while IFS= read -r entry; do
    is_node "$entry" || continue
    [ -e "$entry" ] || continue
    slashes="${entry//[!\/]/}"
    printf '%03d %s\n' "${#slashes}" "$entry"
  done | sort
)"

# --- the cascade -----------------------------------------------------------
nodes=0
node_out=""
orphan_out=""
while IFS= read -r line; do
  [ -n "$line" ] || continue
  node="${line#* }"
  nodes=$(( nodes + 1 ))
  own="$(chars_of "$node")"
  chain="$own"
  # Walk up from the node's own directory, adding every ancestor node a
  # reader would already have loaded before reaching this one.
  parent="${node%CLAUDE.md}"
  parent="${parent%/}"
  while [ -n "$parent" ]; do
    case "$parent" in
      */*) parent="${parent%/*}"; ancestor="$parent/CLAUDE.md" ;;
      *) parent=""; ancestor="CLAUDE.md" ;;
    esac
    if is_tracked "$ancestor"; then
      chain=$(( chain + $(chars_of "$ancestor") ))
    fi
  done
  # The node's own budget wins when both are past: it is the one the reader
  # can act on, and shrinking it shortens every chain below it too.
  budget="ok"
  if [ "$chain" -gt "$CHAIN_BUDGET" ]; then
    budget="OVER-CHAIN"
  fi
  if [ "$own" -gt "$NODE_BUDGET" ]; then
    budget="OVER-NODE"
  fi
  node_out="$node_out$(printf 'node: %s %s chain %s %s' "$node" "$own" "$chain" "$budget")$NL"
  if ! holds_other "${node%CLAUDE.md}" "$node"; then
    orphan_out="$orphan_out$(printf 'orphan: %s' "$node")$NL"
  fi
done < <(printf '%s\n' "$node_lines")

# --- the directories that deserve a node -----------------------------------
# One `wc -c` pass over the whole index, attributed to depth-1 and depth-2
# directories inside awk: a host repository holds thousands of tracked files,
# and a `wc` per file would be thousands of processes.
cand_out=""
if [ -n "$tracked" ]; then
  cand_out="$(
    git ls-files -z 2>/dev/null | xargs -0 wc -c 2>/dev/null | awk -v manifests="$MANIFESTS" '
      function is_manifest(base,   i, n, list) {
        n = split(manifests, list, " ")
        for (i = 1; i <= n; i++) if (base == list[i]) return 1
        return (base ~ /\.csproj$/ || base ~ /\.sln$/)
      }
      function add(dir, size, base, direct) {
        files[dir] += 1
        bytes[dir] += size
        if (direct && base == "CLAUDE.md") node[dir] = 1
        if (direct && is_manifest(base)) tool[dir] = 1
      }
      function dotted(dir,   i, n, seg) {
        n = split(dir, seg, "/")
        for (i = 1; i <= n; i++) if (substr(seg[i], 1, 1) == ".") return 1
        return 0
      }
      {
        size = $1 + 0
        sub(/^[ \t]*[0-9]+[ \t]+/, "")
        path = $0
        n = split(path, seg, "/")
        if (n < 2) next
        add(seg[1], size, seg[n], n == 2)
        if (n >= 3) add(seg[1] "/" seg[2], size, seg[n], n == 3)
      }
      END {
        for (dir in files) {
          if (files[dir] < 3 || (dir in node) || dotted(dir)) continue
          printf "cand: %s files %d bytes %d %s\n", dir, files[dir], bytes[dir], (dir in tool) ? "toolchain" : "plain"
        }
      }
    ' | sort
  )"
  [ -z "$cand_out" ] || cand_out="$cand_out$NL"
fi

# A node deleted but not yet committed carries no working-tree file either
# way - staged with `git rm` or plainly `rm`'d - so it is no dirty entry: it
# is absent, not modified. --reset still judges it through $dirty_nodes
# itself, unfiltered, so its own refusal is unchanged.
dirty_out=""
while IFS= read -r entry; do
  [ -n "$entry" ] || continue
  path="${entry% *}"
  [ -e "$path" ] || continue
  dirty_out="$dirty_out$(printf 'dirty: %s' "$entry")$NL"
done < <(printf '%s\n' "$dirty_nodes")

# --- the state of the layer ------------------------------------------------
# "complete" is the root node plus a node on every directory that deserves
# one - which is exactly "no candidate left".
state="none"
if [ "$nodes" -gt 0 ]; then
  state="partial"
  if is_tracked "CLAUDE.md" && [ -z "$cand_out" ]; then
    state="complete"
  fi
fi

# --- output ----------------------------------------------------------------
# A section with nothing to report prints no line at all.
printf '# viber memory map\n'
printf 'id: %s\n' "$(date +%Y-%m-%d-%H-%M-%S)"
printf 'state: %s\n' "$state"
printf '%s' "$node_out"
printf '%s' "$orphan_out"
printf '%s' "$cand_out"
printf '%s' "$dirty_out"
printf 'total: nodes %d\n' "$nodes"
exit 0
