#!/bin/sh
# viber - skills/code-auditor/scripts/diff-overlay.sh
# Lays the working tree's uncommitted changes onto a clean checkout of HEAD.
#
# Why it exists: `worktree.sh add` checks out HEAD, so a hunter or critic that
# replays a claim there sees none of the diff the user asked to audit. This
# script carries the staged, unstaged and untracked changes into that checkout,
# without touching the target (no stash, no checkout, no index write), so the
# caller never branches on git's own behaviour.
#
# Carried: every tracked path that differs from HEAD (staged or unstaged, binary
# files included, byte-for-byte; a path gone from the working tree is removed
# from the checkout) and every untracked path that is not ignored. Never carried:
# an ignored path, and anything under `.temp/viber/code-auditor/` (the run
# workspace). A path holding a newline is not carried. A directory entry
# (submodule, nested repository) is skipped.
#
# Order: every path git reports deleted is removed first, then every other path
# is written, replacing whatever stands at it in the checkout (a directory
# included). So a file that became a directory, or a directory that became a
# file, lands as the working tree has it, and a case-only rename keeps the new
# spelling. A path that vanishes between listing and copy fails the copy.
#
# Contract:
#   argv   : <target-root> <worktree-path> - the repository whose working tree is
#            read, and a checkout `worktree.sh add` just printed WORKTREE_READY
#            for. Any other argument count -> OVERLAY_FAILED.
#   cwd    : irrelevant - every path derives from argv (git -C), so cwd only ever
#            resolves a relative argument.
#   env    : GIT_OPTIONAL_LOCKS=0 is set for every git call, so reading the target
#            never rewrites its index.
#   file   : reads the target's working tree and index; writes only inside
#            <worktree-path> and one temp directory it removes on exit.
#   stdout : exactly one line -
#              OVERLAY_APPLIED <n>     n = paths written or removed in the checkout
#              OVERLAY_FAILED <reason> not a git repository, <worktree-path> is not
#                                      a linked worktree, or a git, remove or copy
#                                      step failed (a path gone since the listing
#                                      included)
#   exit   : 0 on OVERLAY_APPLIED, 1 on OVERLAY_FAILED. git's own stderr is relayed
#            on stderr; stdout stays one line either way.
set -u

GIT_OPTIONAL_LOCKS=0
export GIT_OPTIONAL_LOCKS

tmp=""
cleanup() {
  [ -z "$tmp" ] || rm -rf "$tmp"
}
trap cleanup EXIT

fail() {
  printf 'OVERLAY_FAILED %s\n' "$1"
  exit 1
}

root=${1:-}
wt=${2:-}
[ $# -eq 2 ] && [ -n "$root" ] && [ -n "$wt" ] || fail "usage: diff-overlay.sh <target-root> <worktree-path>"

git -C "$root" rev-parse --git-dir >/dev/null 2>&1 || fail "not a git repository: $root"
top=$(git -C "$root" rev-parse --show-toplevel 2>/dev/null) || fail "not a git repository: $root"

# A linked worktree carries a `.git` file; the main checkout carries a directory,
# and a plain directory carries nothing. Only the first is a clean HEAD checkout.
[ -f "$wt/.git" ] || fail "not a git worktree: $wt"
inside=$(git -C "$wt" rev-parse --is-inside-work-tree 2>/dev/null) || inside=""
[ "$inside" = "true" ] || fail "not a git worktree: $wt"

tmp=$(mktemp -d "${TMPDIR:-/tmp}/diff-overlay.XXXXXX") || fail "cannot create a temp directory"

# NUL-separated by git so a quoted or spaced name arrives literally, turned into
# lines after. Deletions come from git, never from an existence test: on a
# case-insensitive filesystem the old spelling of a case-only rename still exists.
git -C "$top" diff HEAD --name-only --no-renames --diff-filter=D -z > "$tmp/del.raw" || fail "git diff failed in $top"
git -C "$top" diff HEAD --name-only --no-renames --diff-filter=d -z > "$tmp/put.raw" || fail "git diff failed in $top"
git -C "$top" ls-files --others --exclude-standard --full-name -z >> "$tmp/put.raw" || fail "git ls-files failed in $top"
for kind in del put; do
  tr '\000' '\n' < "$tmp/$kind.raw" | grep -v '^\.temp/viber/code-auditor/' | LC_ALL=C sort -u > "$tmp/$kind" || true
done

count=0
# Deletions first, so a path that turned from a file or symlink into a directory
# is free before the files under it are written.
while IFS= read -r rel; do
  [ -n "$rel" ] || continue
  [ -d "$wt/$rel" ] && [ ! -L "$wt/$rel" ] && continue
  rm -f "$wt/$rel" || fail "cannot remove $rel"
  count=$((count + 1))
done < "$tmp/del"

while IFS= read -r rel; do
  [ -n "$rel" ] || continue
  src="$top/$rel"
  dst="$wt/$rel"
  [ -d "$src" ] && [ ! -L "$src" ] && continue
  mkdir -p "$(dirname "$dst")" || fail "cannot create the directory of $rel"
  if [ -d "$dst" ] && [ ! -L "$dst" ]; then
    rm -rf "$dst" || fail "cannot remove the directory $rel"
  else
    rm -f "$dst" || fail "cannot remove $rel"
  fi
  cp -pP "$src" "$dst" || fail "cannot copy $rel"
  count=$((count + 1))
done < "$tmp/put"

printf 'OVERLAY_APPLIED %s\n' "$count"
