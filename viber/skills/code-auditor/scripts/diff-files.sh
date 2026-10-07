#!/bin/sh
# viber - skills/code-auditor/scripts/diff-files.sh
# Prints the diff base and the changed files of the "current diff" audit scope.
#
# Why it exists: the audit scope "the current diff" has edge cases a model gets
# wrong when it improvises them - the default branch (origin/HEAD, main or
# master), unpushed commits on the default branch, a detached HEAD, an orphan
# branch, a repository with no commit, deleted files, paths with spaces or
# non-ASCII characters. One script answers them the same way every run, and the
# caller trusts its output without re-checking it.
#
# Base rules, in order:
#   1. An explicit <base> (any commit-ish) wins over every rule below, even on
#      the default branch.
#   2. No commit yet -> `BASE none`.
#   3. The default branch is the target of refs/remotes/origin/HEAD, else local
#      main, else local master. None -> `BASE HEAD`.
#   4. A detached HEAD, a current branch that IS the default branch (its short
#      name, or origin/HEAD's target without the `origin/` prefix) - so unpushed
#      commits there are not printed - or a current branch sharing no merge base
#      with the default branch -> `BASE HEAD`.
#   5. Otherwise `BASE <merge-base of HEAD and the default branch>`.
#
# Contract:
#   argv   : <repo-root> [<base>]. <repo-root> is the directory every printed
#            path is relative to; an absent or empty one is a usage error
#            (exit 2). <base> is optional; an empty one means absent.
#   cwd    : irrelevant. Every git call is anchored with `git -C <repo-root>`,
#            so cwd only ever resolves a relative <repo-root>.
#   env    : none read beyond what git itself reads.
#   files  : none written; git's repository state is only read.
#   stdout : the base line, then the paths, one per line:
#              BASE <full sha> | BASE HEAD | BASE none
#              <root-relative path>   sorted bytewise, unique, raw (no quoting)
#            Paths are those changed between the base and the working tree
#            (added, modified, renamed to; deleted excluded), plus staged, plus
#            untracked files not ignored. Paths under .temp/viber/code-auditor/
#            are never printed. A path holding a newline is not supported.
#            With nothing changed only the base line is printed.
#   exit   : 0 on success. 1 with the single stdout line `NOT_A_REPO <repo-root>`
#            when <repo-root> is no git repository, or `BAD_BASE <base>` when
#            <base> names no commit. 2 on a missing <repo-root>, with the usage
#            on stderr and nothing on stdout.
set -u

root=${1:-}
explicit=${2:-}

if [ -z "$root" ]; then
  echo "usage: diff-files.sh <repo-root> [<base>]" >&2
  exit 2
fi

if ! git -C "$root" rev-parse --git-dir >/dev/null 2>&1; then
  printf 'NOT_A_REPO %s\n' "$root"
  exit 1
fi

# resolve <ref> -> stdout: the full sha of the commit it names, empty status 1
# when it names none.
resolve() {
  git -C "$root" rev-parse --verify -q "$1^{commit}" 2>/dev/null
}

head_sha=$(resolve HEAD) || head_sha=""

label=HEAD
base_sha=$head_sha

if [ -n "$explicit" ]; then
  case $explicit in
    -*) printf 'BAD_BASE %s\n' "$explicit"; exit 1 ;;
  esac
  if ! sha=$(resolve "$explicit") || [ -z "$sha" ]; then
    printf 'BAD_BASE %s\n' "$explicit"
    exit 1
  fi
  label=$sha
  base_sha=$sha
elif [ -z "$head_sha" ]; then
  label=none
  base_sha=""
else
  default_ref=""
  default_short=""
  origin_head=$(git -C "$root" symbolic-ref -q refs/remotes/origin/HEAD 2>/dev/null) || origin_head=""
  if [ -n "$origin_head" ] && resolve "$origin_head" >/dev/null; then
    default_ref=$origin_head
    default_short=${origin_head#refs/remotes/origin/}
  elif resolve refs/heads/main >/dev/null; then
    default_ref=refs/heads/main
    default_short=main
  elif resolve refs/heads/master >/dev/null; then
    default_ref=refs/heads/master
    default_short=master
  fi
  current=$(git -C "$root" symbolic-ref -q --short HEAD 2>/dev/null) || current=""
  if [ -n "$default_ref" ] && [ -n "$current" ] && [ "$current" != "$default_short" ]; then
    if merge_base=$(git -C "$root" merge-base HEAD "$default_ref" 2>/dev/null) && [ -n "$merge_base" ]; then
      label=$merge_base
      base_sha=$merge_base
    fi
  fi
fi

printf 'BASE %s\n' "$label"

{
  if [ -n "$base_sha" ]; then
    git -C "$root" diff --name-only --diff-filter=ACMR --relative -z "$base_sha" -- 2>/dev/null
  else
    git -C "$root" diff --cached --name-only --diff-filter=ACMR --relative -z -- 2>/dev/null
  fi
  git -C "$root" ls-files --others --exclude-standard -z 2>/dev/null
} | tr '\0' '\n' | sed -e '/^$/d' -e '\#^\.temp/viber/code-auditor/#d' | LC_ALL=C sort -u

exit 0
